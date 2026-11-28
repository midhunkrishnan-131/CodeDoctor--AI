(() => {
'use strict';

/* ---------- helpers ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const icon = id => `<svg class="i"><use href="#i-${id}"/></svg>`;

/* ---------- environment / API ---------- */
/**
 * Modes:
 *  - demo: GitHub Pages / static / file:// — offline simulation, no API calls
 *  - local: loopback or known dev ports — use same-origin or local FastAPI
 *  - connected: explicit localStorage.codedoctor_api_base URL
 * Override: localStorage.codedoctor_api_base = "https://api…" | "" | "demo"
 */
const ENV = (() => {
  let stored = null;
  try { stored = localStorage.getItem('codedoctor_api_base'); } catch { /* ignore */ }

  // Drop corrupted terminal caches from older builds (keep unrelated keys).
  try {
    ['codedoctor_term_log', 'codedoctor_terminal', 'codedoctor_term_history', 'codedoctor_last_exec'].forEach((k) => {
      const v = localStorage.getItem(k);
      if (v && /Unexpected token|not valid JSON|<html|Execution error/i.test(v)) {
        localStorage.removeItem(k);
      }
    });
  } catch { /* ignore */ }

  const host = location.hostname || '';
  const port = String(location.port || '');
  const isPages = /\.github\.io$/i.test(host);
  const isFile = location.protocol === 'file:';
  const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  const s = stored == null ? null : String(stored).trim();

  if (s === 'demo' || s === 'offline') {
    return { mode: 'demo', apiBase: null, label: 'Browser demo' };
  }

  // Static hosts never call loopback — even if a leftover localStorage override points there.
  if (isPages || isFile) {
    if (s && !/^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])\b/i.test(s)) {
      return { mode: 'connected', apiBase: s.replace(/\/$/, ''), label: 'Connected backend' };
    }
    return { mode: 'demo', apiBase: null, label: 'Browser demo' };
  }

  if (s) {
    return { mode: 'connected', apiBase: s.replace(/\/$/, ''), label: 'Connected backend' };
  }
  // Empty string override = same-origin API.
  if (stored === '') {
    return { mode: 'local', apiBase: '', label: 'Local backend' };
  }
  if (port === '8000' || port === '3000' || port === '5173') {
    return { mode: 'local', apiBase: '', label: 'Local backend' };
  }
  if (isLoopback) {
    return { mode: 'local', apiBase: 'http://localhost:8000', label: 'Local backend' };
  }
  // Public/static host without an explicit API → offline demo (do not call localhost).
  return { mode: 'demo', apiBase: null, label: 'Browser demo' };
})();

function isDemoMode() { return ENV.mode === 'demo'; }
function getApiBase() { return ENV.apiBase == null ? '' : ENV.apiBase; }

function apiUrl(path) {
  const base = getApiBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

function ApiUserError(userMessage, technical) {
  const err = new Error(userMessage);
  err.userMessage = userMessage;
  err.technical = technical || '';
  err.isApiUserError = true;
  return err;
}

/**
 * Read a response as JSON only when content looks like JSON.
 * Never surfaces raw `Unexpected token '<'` to the user.
 */
async function parseApiJson(res, label = 'API') {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  let text = '';
  try {
    text = await res.text();
  } catch {
    throw ApiUserError(
      'Could not read the server response.',
      `Network error while reading ${label} body.`
    );
  }

  const trimmed = text.trim();
  const looksHtml = trimmed.startsWith('<!') || trimmed.startsWith('<html') || contentType.includes('text/html');
  const looksJson =
    contentType.includes('application/json') ||
    trimmed.startsWith('{') ||
    trimmed.startsWith('[');

  if (looksHtml || (!looksJson && trimmed)) {
    const origin = getApiBase() || location.origin;
    throw ApiUserError(
      'Python execution isn\'t available from this page — the API returned a web page instead of JSON.',
      `${label} HTTP ${res.status} from ${origin}${res.url ? ` (${res.url})` : ''}. ` +
      `Body starts with: ${trimmed.slice(0, 120).replace(/\s+/g, ' ')}`
    );
  }

  if (!trimmed) {
    throw ApiUserError(
      'The execution service returned an empty response.',
      `${label} HTTP ${res.status}, empty body.`
    );
  }

  let data;
  try {
    data = JSON.parse(trimmed);
  } catch (e) {
    throw ApiUserError(
      'The execution service returned invalid data.',
      `${label} HTTP ${res.status}: ${e && e.message ? e.message : 'JSON parse failed'}. ` +
      `Body starts with: ${trimmed.slice(0, 120).replace(/\s+/g, ' ')}`
    );
  }

  if (!res.ok) {
    const detail = data.detail ?? data.error ?? data.message ?? data.stderr;
    let msg;
    if (typeof detail === 'string') msg = detail;
    else if (detail && typeof detail === 'object') {
      msg = detail.message || detail.error || JSON.stringify(detail);
    } else {
      msg = `${label} failed with HTTP ${res.status}`;
    }
    if (res.status === 408 || data.timed_out || data.execution_status === 'timeout') {
      throw ApiUserError('Sandbox timeout: execution exceeded the time limit.', msg);
    }
    if (res.status >= 500) {
      throw ApiUserError('The Python sandbox failed. Try again or check the backend logs.', msg);
    }
    throw ApiUserError(msg, `${label} HTTP ${res.status}`);
  }

  return data;
}

async function apiFetch(path, options) {
  if (isDemoMode()) {
    throw ApiUserError(
      'Python execution isn\'t available in this browser demo.',
      `Skipped fetch to ${path} while ENV.mode=demo.`
    );
  }
  const url = apiUrl(path);
  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    const origin = getApiBase() || location.origin;
    throw ApiUserError(
      'Could not reach the Python backend. Connect a local API or stay in demo mode.',
      `Network error reaching ${url} (expected API at ${origin}): ${err && err.message ? err.message : err}`
    );
  }
  return res;
}

function normalizePy(src) {
  return String(src || '').replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trim();
}

/** Evaluate a single simple print(...) call for demo mode. Returns string or null if unsupported. */
function demoEvalPrint(call) {
  const m = String(call).match(/^print\s*\((.*)\)\s*$/);
  if (!m) return null;
  const argsSrc = m[1].trim();
  if (!argsSrc) return '';

  const args = [];
  let i = 0;
  const s = argsSrc;
  while (i < s.length) {
    while (i < s.length && /[\s,]/.test(s[i])) i++;
    if (i >= s.length) break;
    const ch = s[i];
    if (ch === '"' || ch === "'") {
      let out = '';
      const q = ch; i++;
      while (i < s.length) {
        if (s[i] === '\\' && i + 1 < s.length) { out += s[i + 1]; i += 2; continue; }
        if (s[i] === q) { i++; break; }
        out += s[i++];
      }
      args.push(out);
      continue;
    }
    if (s[i] === '[') {
      let depth = 0; let start = i;
      while (i < s.length) {
        if (s[i] === '[') depth++;
        else if (s[i] === ']') { depth--; if (depth === 0) { i++; break; } }
        i++;
      }
      const lit = s.slice(start, i);
      try {
        args.push(JSON.stringify(JSON.parse(lit.replace(/'/g, '"'))).replace(/,/g, ', '));
      } catch { return null; }
      continue;
    }
    if (s[i] === '(') return null;
    const start = i;
    while (i < s.length && s[i] !== ',') i++;
    const tok = s.slice(start, i).trim();
    if (/^-?\d+(\.\d+)?$/.test(tok) || tok === 'True' || tok === 'False' || tok === 'None') {
      args.push(tok === 'True' ? 'True' : tok === 'False' ? 'False' : tok === 'None' ? 'None' : tok);
      continue;
    }
    return null;
  }
  return args.join(' ');
}

function demoCannedChallenge(filename) {
  const ch = CHALLENGES[curChallengeIdx];
  if (!ch) return null;
  const src = files[filename]?.src || '';
  if (filename === 'solution.py' && normalizePy(src) === normalizePy(ch.solution)) {
    if (ch.id === 'two-sum') {
      return { stdout: 'two_sum([2, 7, 11, 15], 9) => [0, 1]\n', exit_code: 0 };
    }
    if (ch.id === 'off-by-one') {
      return { stdout: 'List: [14, 3, 27, 8, 42, 19]\nMaximum found: 42\n', exit_code: 0 };
    }
    if (ch.id === 'zero-division') {
      return {
        stdout: 'Valid scores [85, 90, 78]: 84.33\nEmpty list result: 0.0\n',
        exit_code: 0
      };
    }
  }
  if (filename === 'test_cases.py' && normalizePy(src) === normalizePy(ch.tests)
      && normalizePy(files['solution.py']?.src || '') === normalizePy(ch.solution)) {
    if (ch.id === 'two-sum') {
      return {
        stdout:
          'two_sum([2, 7, 11, 15], 9) => [0, 1] (expected [0, 1])\n' +
          'two_sum([3, 2, 4], 6) => [1, 2] (expected [1, 2])\n' +
          'two_sum([4, 5, 1, 9], 9) => [0, 1] (expected [0, 1])\n' +
          'two_sum([1, 2], 7) => [] (expected [])\n' +
          'two_sum([6, 2, 3, 1], 5) => [1, 2] (expected [1, 2])\n' +
          'All Two Sum tests passed!\n',
        exit_code: 0
      };
    }
    if (ch.id === 'off-by-one') {
      return { stdout: 'All maximum checks passed!\n', exit_code: 0 };
    }
    if (ch.id === 'zero-division') {
      return { stdout: 'All average tests passed!\n', exit_code: 0 };
    }
  }
  return null;
}

/**
 * Limited offline Python simulation for GitHub Pages demo mode.
 * Supports simple print-only scripts and stock challenge samples — not a full interpreter.
 */
function simulatePythonExecution(source, filename) {
  const canned = demoCannedChallenge(filename);
  if (canned) {
    return { ...canned, simulated: true, unsupported: false, canned: true };
  }

  const stripped = String(source || '')
    .replace(/\r\n/g, '\n')
    .replace(/^\s*#.*$/gm, '')
    .replace(/"""[\s\S]*?"""/g, '')
    .replace(/'''[\s\S]*?'''/g, '')
    .trim();

  if (!stripped) {
    return { stdout: '', exit_code: 0, simulated: true, unsupported: false };
  }

  const lines = stripped.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length && lines.every((l) => /^print\s*\(/.test(l))) {
    const out = [];
    for (const line of lines) {
      const val = demoEvalPrint(line);
      if (val == null) {
        return {
          unsupported: true,
          simulated: true,
          exit_code: 1,
          stdout: '',
          message: 'Demo mode cannot execute this Python program yet. Connect a Python backend for real execution.'
        };
      }
      out.push(val);
    }
    return {
      stdout: out.length ? out.join('\n') + '\n' : '',
      exit_code: 0,
      simulated: true,
      unsupported: false
    };
  }

  return {
    unsupported: true,
    simulated: true,
    exit_code: 1,
    stdout: '',
    message: 'Demo mode cannot execute this Python program yet. Connect a Python backend for real execution.'
  };
}

/* ---------- challenges data ---------- */
const CHALLENGES = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    diff: 'Easy',
    desc: 'Return the indices of the two numbers that add up to target.',
    solution: `# Challenge 01: Two Sum
# Return the indices of the two numbers that add up to target
def two_sum(nums, target):
    seen = {}
    for i in range(len(nums)):
        need = target - nums[i]
        if need in seen:
            return [seen[need], i]
        seen[nums[i]] = i
    return []

if __name__ == "__main__":
    print("two_sum([2, 7, 11, 15], 9) =>", two_sum([2, 7, 11, 15], 9))
`,
    tests: `from solution import two_sum

CASES = [
    ([2, 7, 11, 15], 9, [0, 1]),
    ([3, 2, 4], 6, [1, 2]),
    ([4, 5, 1, 9], 9, [0, 1]),
    ([1, 2], 7, []),
    ([6, 2, 3, 1], 5, [1, 2]),
]

for nums, target, want in CASES:
    res = two_sum(nums, target)
    print(f"two_sum({nums}, {target}) => {res} (expected {want})")
    assert res == want

print("All Two Sum tests passed!")
`,
    cases: [
      { call: 'two_sum([2, 7, 11, 15], 9)', want: '[0, 1]' },
      { call: 'two_sum([3, 2, 4], 6)',      want: '[1, 2]' },
      { call: 'two_sum([4, 5, 1, 9], 9)',   want: '[0, 1]' },
      { call: 'two_sum([1, 2], 7)',         want: '[]'     },
      { call: 'two_sum([6, 2, 3, 1], 5)',   want: '[1, 2]' },
    ]
  },
  {
    id: 'off-by-one',
    title: 'Find Maximum (Off-by-One)',
    diff: 'Easy',
    desc: 'Find the largest number in a list without using max().',
    solution: `def find_max(numbers):
    if not numbers:
        return None
    current_max = numbers[0]
    # Iterates correctly through all indices
    for i in range(1, len(numbers)):
        if numbers[i] > current_max:
            current_max = numbers[i]
    return current_max

if __name__ == "__main__":
    test_list = [14, 3, 27, 8, 42, 19]
    print("List:", test_list)
    print("Maximum found:", find_max(test_list))
`,
    tests: `from solution import find_max

assert find_max([1, 5, 2, 9, 3]) == 9
assert find_max([42]) == 42
assert find_max([]) is None
print("All maximum checks passed!")
`,
    cases: [
      { call: 'find_max([1, 5, 2, 9, 3])', want: '9' },
      { call: 'find_max([42])', want: '42' },
      { call: 'find_max([])', want: 'None' }
    ]
  },
  {
    id: 'zero-division',
    title: 'Calculate Average (Zero Division)',
    diff: 'Easy',
    desc: 'Calculate average score safely, returning 0.0 if empty.',
    solution: `def calculate_average(scores):
    if not scores:
        return 0.0
    total = sum(scores)
    average = total / len(scores)
    return round(average, 2)

if __name__ == "__main__":
    print("Valid scores [85, 90, 78]:", calculate_average([85, 90, 78]))
    print("Empty list result:", calculate_average([]))
`,
    tests: `from solution import calculate_average

assert calculate_average([10, 20, 30]) == 20.0
assert calculate_average([]) == 0.0 or calculate_average([]) == 0
print("All average tests passed!")
`,
    cases: [
      { call: 'calculate_average([10, 20, 30])', want: '20.0' },
      { call: 'calculate_average([])', want: '0.0' }
    ]
  }
];

let curChallengeIdx = 0;

const SNIPPETS = [
  { name: 'for loop',     key: 'for',   code: 'for i in range(n):\n    ' },
  { name: 'dict counter', key: 'count', code: 'counts = {}\nfor x in items:\n    counts[x] = counts.get(x, 0) + 1\n' },
  { name: 'try / except', key: 'try',   code: 'try:\n    pass\nexcept Exception as e:\n    print(e)\n' },
  { name: 'main guard',   key: 'main',  code: 'if __name__ == "__main__":\n    main()\n' },
];

const TEMPLATES = [
  { name: 'Blank script',      desc: '.py',      src: '# Write your Python code here\n' },
  { name: 'Challenge starter', desc: 'fn + test', src: 'def solve(x):\n    pass\n\n\nif __name__ == "__main__":\n    print(solve(0))\n' },
  { name: 'Class skeleton',    desc: 'OOP',       src: 'class Solution:\n    def __init__(self):\n        pass\n' },
];

/* ---------- state ---------- */
const files = {
  'solution.py':   { src: CHALLENGES[0].solution },
  'test_cases.py': { src: CHALLENGES[0].tests },
};
let open = ['solution.py', 'test_cases.py'];
let active = 'solution.py';
let mode = 'complete';
let hint = 1;
let lastRun = null;
let lastStdout = '';
let lastStderr = '';
let lastExitCode = null;
let lastExecutionTime = 0;
let lastProposedFix = '';
let lastRuntimeError = null;
let untitled = 0;
let running = false;
let busy = false;
let activeModel = 'openai/gpt-oss-120b';
let historyCache = [];

/* ---------- elements ---------- */
const ta = $('#code'), layer = $('#layer'), gutter = $('#gutter'), curline = $('#curline'), scroller = $('#editorScroll');
const tabsEl = $('#tabs'), fileList = $('#fileList');
const termLog = $('#termLog'), termIn = $('#termIn'), consoleEl = $('#console'), consoleBody = $('#consoleBody');
const outPane = $('#cp-output'), probPane = $('#cp-problems'), probBadge = $('#probBadge'), histPane = $('#historyList');
const chat = $('#chat'), verdict = $('#verdict'), verdictSub = $('#verdictSub'), diagnosis = $('#diagnosis'), thread = $('#thread');
const askBox = $('#ask'), sendBtn = $('#send'), modeDesc = $('#modeDesc');

/* ---------- comprehensive bug diagnosis ---------- */
function diagnose(name, src) {
  const out = [];
  if (!src) return out;

  // 1. Check Two Sum off-by-one bug
  if (/range\(\s*len\(\s*nums\s*\)\s*-\s*1\s*\)/.test(src)) {
    src.split('\n').forEach((l, i) => {
      const m = /range\(\s*len\(\s*nums\s*\)\s*-\s*1\s*\)/.exec(l);
      if (m) out.push({
        line: i + 1, start: m.index, end: m.index + m[0].length,
        title: 'Loop stops one element early',
        short: 'skips last index',
        why: 'range(len(nums) - 1) stops before the final index, missing pairs that end on the last element.',
        from: l.trim(),
        to: l.trim().replace(/range\(\s*len\(\s*nums\s*\)\s*-\s*1\s*\)/, 'range(len(nums))'),
      });
    });
  }

  // 2. Check Find Maximum off-by-one bug
  if (/range\(\s*1\s*,\s*len\(numbers\)\s*\+\s*1\s*\)/.test(src)) {
    src.split('\n').forEach((l, i) => {
      const m = /range\(\s*1\s*,\s*len\(numbers\)\s*\+\s*1\s*\)/.exec(l);
      if (m) out.push({
        line: i + 1, start: m.index, end: m.index + m[0].length,
        title: 'IndexError: range exceeds list length',
        short: 'range out of bounds',
        why: 'range(1, len(numbers) + 1) generates index equal to len(numbers), causing IndexError: list index out of range.',
        from: l.trim(),
        to: l.trim().replace(/len\(numbers\)\s*\+\s*1/, 'len(numbers)'),
      });
    });
  }

  // 3. Check Calculate Average zero division bug
  if (/total\s*\/\s*len\(scores\)/.test(src) && !/if\s+(?:not\s+)?scores/.test(src)) {
    src.split('\n').forEach((l, i) => {
      const m = /total\s*\/\s*len\(scores\)/.exec(l);
      if (m) out.push({
        line: i + 1, start: m.index, end: m.index + m[0].length,
        title: 'ZeroDivisionError: division by zero',
        short: 'missing empty check',
        why: 'When scores is empty ([]), len(scores) is 0, causing ZeroDivisionError: division by zero.',
        from: l.trim(),
        to: 'average = total / len(scores) if scores else 0.0',
      });
    });
  }

  // 4. Runtime error detected from last run
  if (lastRuntimeError && (name === active || name === 'solution.py')) {
    out.push({
      line: lastRuntimeError.line || 1,
      start: 0,
      end: 0,
      title: lastRuntimeError.type || 'Runtime Error',
      short: lastRuntimeError.message || 'script crashed',
      why: lastRuntimeError.details || lastStderr,
      from: '',
      to: ''
    });
  }

  return out;
}

const allIssues = () => Object.keys(files).flatMap(n => diagnose(n, files[n]?.src || '').map(i => ({ ...i, file: n })));

/* ---------- syntax highlighting ---------- */
const KW = new Set('def return for in if elif else while import from as class not and or is None True False pass break continue with try except raise lambda assert'.split(' '));
const BI = new Set('range len print enumerate sum min max sorted dict list set int str zip map abs round'.split(' '));
const TOK = /(#.*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g;

function hl(text) {
  let out = '', last = 0, m;
  TOK.lastIndex = 0;
  while ((m = TOK.exec(text))) {
    out += esc(text.slice(last, m.index));
    const [all, com, str, num, word] = m;
    if (com)      out += `<span class="t-com">${esc(all)}</span>`;
    else if (str) out += `<span class="t-str">${esc(all)}</span>`;
    else if (num) out += `<span class="t-num">${all}</span>`;
    else if (KW.has(word)) out += `<span class="t-kw">${word}</span>`;
    else if (BI.has(word)) out += `<span class="t-bi">${word}</span>`;
    else if (/\bdef\s+$/.test(text.slice(0, m.index))) out += `<span class="t-fn">${word}</span>`;
    else out += word;
    last = TOK.lastIndex;
  }
  return out + esc(text.slice(last));
}

/* ---------- editor ---------- */
function renderCode() {
  const src = files[active]?.src || '';
  const lines = src.split('\n');
  const issues = diagnose(active, src);
  layer.innerHTML = lines.map((l, i) => {
    const iss = issues.find(x => x.line === i + 1);
    if (!iss || !iss.start) return hl(l);
    return hl(l.slice(0, iss.start)) +
      `<span class="sq">${hl(l.slice(iss.start, iss.end))}</span>` +
      hl(l.slice(iss.end)) +
      `<span class="ghost">${esc(iss.short)}</span>`;
  }).join('\n') + '\n';
  gutter.innerHTML = lines.map((_, i) =>
    `<div data-n="${i + 1}" class="${issues.some(x => x.line === i + 1) ? 'has-err' : ''}">${i + 1}</div>`).join('');
  markCursor();
}

function markCursor() {
  const pos = ta.selectionStart || 0, before = ta.value.slice(0, pos);
  const ln = before.split('\n').length, col = pos - before.lastIndexOf('\n');
  const top = 16 + (ln - 1) * 22;
  curline.style.top = top + 'px';
  $$('div', gutter).forEach(d => d.classList.toggle('is-cur', +d.dataset.n === ln));
  $('#ln').textContent = ln; $('#col').textContent = col;
  if (top < scroller.scrollTop) scroller.scrollTop = top - 16;
  else if (top + 38 > scroller.scrollTop + scroller.clientHeight) scroller.scrollTop = top + 38 - scroller.clientHeight;
}

function insertText(t) {
  ta.setRangeText(t, ta.selectionStart, ta.selectionEnd, 'end');
  ta.dispatchEvent(new Event('input'));
}

ta.addEventListener('input', () => {
  if (!files[active]) files[active] = { src: '' };
  files[active].src = ta.value;
  lastRuntimeError = null;
  renderCode(); renderAll();
});
ta.addEventListener('keydown', e => {
  if (e.key === 'Tab') { e.preventDefault(); insertText('    '); }
  else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    e.preventDefault();
    const before = ta.value.slice(0, ta.selectionStart);
    const line = before.slice(before.lastIndexOf('\n') + 1);
    let ind = line.match(/^\s*/)[0];
    if (/:\s*$/.test(line)) ind += '    ';
    insertText('\n' + ind);
  }
});
document.addEventListener('selectionchange', () => { if (document.activeElement === ta) markCursor(); });
scroller.addEventListener('mousedown', e => {
  if (!e.target.closest('textarea')) { e.preventDefault(); ta.focus(); }
});

/* ---------- files and tabs ---------- */
function renderTabs() {
  tabsEl.innerHTML = open.map(n => {
    const bad = diagnose(n, files[n]?.src || '').length;
    const safe = esc(n);
    return `<div class="tab ${n === active ? 'is-active' : ''}">
      <button class="tab-main" role="tab" aria-selected="${n === active}" data-open="${safe}">
        ${icon('file')}${safe}${bad ? '<span class="mark" title="Problem in this file"></span>' : ''}
      </button>
      ${open.length > 1 ? `<button class="x" data-close="${safe}" aria-label="Close ${safe}">${icon('x')}</button>` : ''}
    </div>`;
  }).join('');
}

function renderFiles() {
  fileList.innerHTML = Object.keys(files).map(n => {
    const bad = diagnose(n, files[n]?.src || '').length;
    const safe = esc(n);
    return `<li><button class="list-item ${n === active ? 'is-active' : ''}" data-open="${safe}">
      ${icon('file')}${safe}${bad ? `<span class="badge" style="margin-left:auto">${bad}</span>` : ''}
    </button></li>`;
  }).join('');
}

function openFile(n) {
  if (!open.includes(n)) open.push(n);
  active = n;
  ta.value = files[n]?.src || '';
  renderCode(); renderAll(); ta.focus();
}

function closeFile(n) {
  if (open.length < 2) return;
  const i = open.indexOf(n); open.splice(i, 1);
  if (active === n) { active = open[Math.max(0, i - 1)]; ta.value = files[active]?.src || ''; renderCode(); }
  renderAll();
}

function newFile(src = '') {
  const name = `untitled-${++untitled}.py`;
  files[name] = { src };
  openFile(name);
}

function format() {
  const f = files[active];
  if (!f) return;
  f.src = f.src.split('\n').map(l => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n*$/, '\n');
  ta.value = f.src; renderCode(); renderAll();
  term('<span class="dim">Formatted code cleanly.</span>');
}

/* ---------- console ---------- */
function setCp(name) {
  $$('.ctab').forEach(b => { const on = b.dataset.cp === name; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', on); });
  $$('.cpane').forEach(p => p.classList.toggle('is-active', p.id === 'cp-' + name));
}

function term(h) {
  termLog.insertAdjacentHTML('beforeend', `<div>${h}</div>`);
  consoleBody.scrollTop = consoleBody.scrollHeight;
}

function termFriendlyError(userMessage, technical) {
  term(`<span class="bad">${esc(userMessage)}</span>`);
  if (technical) {
    term(
      `<details style="margin:4px 0 8px"><summary class="dim" style="cursor:pointer">Technical Details</summary>` +
      `<pre class="snip" style="margin-top:6px;white-space:pre-wrap">${esc(technical)}</pre></details>`
    );
  }
}

function applyExecutionResult(data, { simulated = false, mapChallengeCases = true } = {}) {
  lastStdout = data.stdout || '';
  lastStderr = data.stderr || '';
  lastExitCode = data.exit_code ?? 0;
  lastExecutionTime = data.execution_time_ms ?? (simulated ? 1 : 0);

  if (data.timed_out || data.execution_status === 'timeout') {
    term(`<span class="bad">Sandbox timeout: execution exceeded the time limit.</span>`);
  }

  if (data.stdout) {
    data.stdout.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').forEach((l) => term(esc(l)));
  }
  if (data.stderr) {
    data.stderr.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').forEach((l) => {
      term(`<span class="bad">${esc(l)}</span>`);
    });
  }

  const allPassed = data.exit_code === 0 && !data.stderr && !data.timed_out;
  const curCases = CHALLENGES[curChallengeIdx]?.cases || [];

  if (!allPassed && data.stderr) {
    const errMatch = data.stderr.match(/(?:File "[^"]+", line (\d+)[^\n]*\n(?:[^\n]*\n)*?([A-Za-z]+Error|Exception):\s*([^\n]+))/);
    if (errMatch) {
      lastRuntimeError = {
        line: parseInt(errMatch[1], 10),
        type: errMatch[2],
        message: errMatch[3],
        details: data.stderr
      };
    } else {
      lastRuntimeError = {
        line: 1,
        type: data.timed_out ? 'TimeoutError' : 'Execution Error',
        message: data.error_type || 'Script failed',
        details: data.stderr
      };
    }
  } else {
    lastRuntimeError = null;
  }

  if (mapChallengeCases && curCases.length) {
    lastRun = curCases.map((t) => ({
      ...t, pass: allPassed, got: allPassed ? t.want : (data.error_type || 'Error'),
    }));
  } else {
    lastRun = null;
  }

  const timing = `${(lastExecutionTime / 1000).toFixed(3)}s`;
  if (allPassed) {
    term(
      `<span class="ok">Process exited with code 0</span> ` +
      `<span class="dim">in ${timing}${simulated ? ' · simulated demo output' : ''}</span>`
    );
  } else {
    term(
      `<span class="bad">Process exited with code ${data.exit_code}</span> ` +
      `<span class="dim">in ${timing}${simulated ? ' · simulated demo' : ''}</span>`
    );
  }
}

/* ---------- execution via backend sandbox (or offline demo) ---------- */
async function run(from = 'ui') {
  if (running) return;
  // Only explicit user actions call run() — never from boot/init.
  running = true;
  $('.run').classList.add('is-running'); $('#runLabel').textContent = 'Running';
  const targetScript = active;
  if (from !== 'terminal') term(`<span class="prompt">$</span> python ${esc(targetScript)}`);

  try {
    if (isDemoMode()) {
      await sleep(120);
      const sim = simulatePythonExecution(files[targetScript]?.src || '', targetScript);
      if (sim.unsupported) {
        lastStdout = '';
        lastStderr = sim.message || '';
        lastExitCode = 1;
        lastRuntimeError = null;
        lastRun = null;
        term(`<span class="bad">${esc(sim.message)}</span>`);
        term(`<span class="dim">Tip: try print("Hello World") or the stock challenge sample.</span>`);
        return;
      }
      applyExecutionResult({
        stdout: sim.stdout || '',
        stderr: '',
        exit_code: sim.exit_code ?? 0,
        execution_time_ms: 1
      }, { simulated: true, mapChallengeCases: !!sim.canned });
      return;
    }

    const allFilesMap = {};
    for (const [name, obj] of Object.entries(files)) {
      allFilesMap[name] = obj.src || '';
    }

    const res = await apiFetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: files[targetScript]?.src || '',
        filename: targetScript,
        files: allFilesMap,
        timeout: 5.0,
        stdin_input: ''
      })
    });
    const data = await parseApiJson(res, 'Execution API');
    applyExecutionResult(data, { simulated: false });
  } catch (err) {
    const userMsg = err && err.userMessage
      ? err.userMessage
      : (isDemoMode()
        ? 'Python execution isn\'t available in this browser demo.'
        : 'Python execution failed. Check that a backend is running.');
    const technical = (err && err.technical) || (err && err.message) || String(err);
    // Never show raw JSON parse crashes as the primary message.
    const safeUser = /Unexpected token/i.test(userMsg)
      ? 'Python execution isn\'t available in this browser demo.'
      : userMsg;
    const tip = isDemoMode() || /isn\'t available|could not reach|web page instead/i.test(safeUser)
      ? 'Connect a Python backend to execute code, or use the demo mode to explore the editor.'
      : '';

    lastStdout = '';
    lastStderr = [safeUser, tip, technical].filter(Boolean).join('\n');
    lastExitCode = -1;
    lastRuntimeError = {
      line: 1,
      type: 'API Error',
      message: safeUser,
      details: technical
    };
    termFriendlyError(safeUser, technical);
    if (tip) term(`<span class="dim">${esc(tip)}</span>`);
  } finally {
    running = false;
    $('.run').classList.remove('is-running'); $('#runLabel').textContent = 'Run';
    if (from !== 'terminal') setCp(lastExitCode === 0 ? 'output' : 'terminal');
    renderAll();
  }
}

termIn.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const v = termIn.value.trim(); termIn.value = '';
  term(`<span class="prompt">$</span> ${esc(v)}`);
  if (!v) return;
  if (v === 'clear') termLog.innerHTML = '';
  else if (v === 'help') term('<span class="dim">Commands: python solution.py, python test_cases.py, clear, diagnose</span>');
  else if (/^python3?\s+([a-zA-Z0-9_\-\.]+\.py)$/.test(v)) {
    const match = v.match(/^python3?\s+([a-zA-Z0-9_\-\.]+\.py)$/);
    if (match && files[match[1]]) {
      active = match[1]; ta.value = files[active].src; renderCode(); renderAll();
    }
    run('terminal');
  } else if (v === 'diagnose') {
    ask('Find bugs & root cause');
  } else {
    term(`<span class="bad">sh: ${esc(v.split(' ')[0])}: not available in the sandbox</span>`);
  }
});

function renderOutput() {
  if (lastRun === null && !lastStdout && !lastStderr) {
    outPane.innerHTML = '<p class="dim">Nothing has run yet. Press Run or Ctrl + Enter.</p>';
    return;
  }
  let html = '';
  if (lastStdout) {
    html += `<div style="margin-bottom:12px"><strong>Standard Output:</strong><pre class="snip">${esc(lastStdout)}</pre></div>`;
  }
  if (lastStderr) {
    html += `<div style="margin-bottom:12px"><strong class="bad">Standard Error:</strong><pre class="snip" style="border-color:var(--err)">${esc(lastStderr)}</pre></div>`;
  }
  if (lastRun && lastRun.length) {
    const p = lastRun.filter(r => r.pass).length;
    html += `<div class="out-sum ${p === lastRun.length ? 'ok' : 'bad'}">${p} of ${lastRun.length} challenge tests passing</div>
     <table class="tests">${lastRun.map(r => `<tr>
       <td class="st ${r.pass ? 'ok' : 'bad'}">${r.pass ? 'PASS' : 'FAIL'}</td>
       <td>${esc(r.call)}</td>
       <td class="dim">${r.pass ? 'matches expected' : `expected ${r.want}, got ${esc(r.got)}`}</td></tr>`).join('')}</table>`;
  }
  outPane.innerHTML = html;
}

function renderProblems() {
  const all = allIssues();
  probBadge.hidden = !all.length; probBadge.textContent = all.length;
  probPane.innerHTML = all.length
    ? all.map(i => `<div class="prob"><span class="bad">${icon('alert')}</span>
        <span class="prob-t">${esc(i.title)} <span class="dim">· ${esc(i.short)}</span></span>
        <span class="dim">${i.file}:${i.line}</span></div>`).join('')
    : '<p class="dim">No problems detected in the workspace.</p>';
}

function renderChallenge() {
  const c = CHALLENGES[curChallengeIdx];
  if (c) {
    $('#challengeNum').textContent = `Challenge 0${curChallengeIdx + 1}`;
    $('#challengeDiff').textContent = c.diff;
    $('#challengeTitle').textContent = c.title;
  }
  const curCases = CHALLENGES[curChallengeIdx]?.cases || [];
  $('#segs').innerHTML = curCases.map(() => `<span></span>`).join('');
  $$('#segs span').forEach((s, i) => { s.className = lastRun && lastRun[i] ? (lastRun[i].pass ? 'ok' : 'bad') : ''; });
  
  if (lastRun) {
    const p = lastRun.filter(r => r.pass).length;
    $('#challengeFoot').textContent = `${p} of ${lastRun.length} tests passing`;
  } else {
    $('#challengeFoot').textContent = 'Click to switch challenge';
  }
}

function renderStatus() {
  const total = allIssues().length;
  $('#stIssues').innerHTML = total
    ? `<span class="st-err">${icon('alert')}${total} problem${total > 1 ? 's' : ''}</span>`
    : `<span>${icon('check')}No problems</span>`;
  $('#ctxName').textContent = active; $('#readName').textContent = active;
  const wsActiveFile = $('#wsActiveFile');
  if (wsActiveFile) wsActiveFile.textContent = active || 'untitled';
  $('#ctxLines').textContent = (files[active]?.src || '').replace(/\n$/, '').split('\n').length;
}

/* ---------- doctor AI panel ---------- */
const NUM = ['No', 'One', 'Two', 'Three', 'Four', 'Five'];

function renderDoctor() {
  const targetCheck = files['solution.py'] ? 'solution.py' : active;
  const iss = diagnose(targetCheck, files[targetCheck]?.src || '');
  const n = iss.length;

  const v = n ? `${NUM[Math.min(n, 5)]} ${n === 1 ? 'thing is' : 'things are'} <em>off.</em>` : 'Looks <em>healthy.</em>';
  if (verdict._h !== v) { verdict.innerHTML = v; verdict._h = v; }
  verdictSub.textContent = `${targetCheck} · ${n ? `${n} issue${n > 1 ? 's' : ''}` : 'no issues'}`;

  let card = '';
  if (n) {
    const i = iss[0];
    if (mode === 'complete') {
      card = `<article class="card">
        <div class="card-head"><span class="sev">Issue Detected</span><span class="loc">${targetCheck}:${i.line}</span></div>
        <h3 class="card-title">${i.title}</h3>
        <p class="card-body">${esc(i.why)}</p>
        ${i.from && i.to ? `<div class="diff"><div class="del">- ${esc(i.from)}</div><div class="add">+ ${esc(i.to)}</div></div>` : ''}
        <div class="card-actions">
          <button class="btn btn--primary" data-act="apply">Apply fix</button>
          <button class="btn" data-act="explain">Explain why</button>
        </div></article>`;
    } else {
      const HINTS = [
        'Trace the indexes your loop actually visits. Does it reach the last valid index?',
        `Look at line ${i.line}. How many values does it produce compared with len()?`,
        'range(n) already stops before n. Make sure boundaries match list indexing.',
      ];
      card = `<article class="card">
        <div class="card-head"><span class="sev sev--hint">Hint ${hint} of 3</span><span class="loc">${targetCheck}:${i.line}</span></div>
        <ol class="hints">${HINTS.slice(0, hint).map(h => `<li>${esc(h)}</li>`).join('')}</ol>
        <div class="card-actions">${hint < 3
          ? '<button class="btn btn--primary" data-act="hint">Next hint</button>'
          : '<button class="btn btn--primary" data-act="reveal">Show me the fix</button>'}</div></article>`;
    }
  } else {
    const done = lastRun && lastRun.length && lastRun.every(r => r.pass);
    card = `<article class="card">
      <div class="card-head"><span class="sev sev--ok">${done ? 'All clear' : 'Ready'}</span><span class="loc">${targetCheck}</span></div>
      <h3 class="card-title">${done ? `${lastRun.length} of ${lastRun.length} tests passing` : 'No immediate bugs flagged'}</h3>
      <p class="card-body">${done ? 'Optimal solution confirmed. All tests passed!' : 'Click "Run" or ask Doctor to analyze any code.'}</p>
      ${done ? '' : '<div class="card-actions"><button class="btn btn--primary" data-action="run">Run Code</button></div>'}
    </article>`;
  }
  if (diagnosis._h !== card) { diagnosis.innerHTML = card; diagnosis._h = card; }
}

function setMode(m) {
  mode = m; hint = 1;
  $$('.mode button').forEach(b => { const on = b.dataset.mode === m; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', on); });
  modeDesc.textContent = m === 'complete'
    ? 'Get a clear explanation and fixed code you can use.'
    : 'Get helpful hints so you can figure it out yourself.';
  renderDoctor();
}

function applyFix(customCode) {
  const targetFile = files['solution.py'] ? 'solution.py' : active;
  const f = files[targetFile];
  if (!f) return;
  if (customCode) {
    f.src = customCode;
  } else {
    let fixed = f.src;
    fixed = fixed.replace(/range\(\s*len\(\s*nums\s*\)\s*-\s*1\s*\)/g, 'range(len(nums))');
    fixed = fixed.replace(/range\(\s*1\s*,\s*len\(numbers\)\s*\+\s*1\s*\)/g, 'range(1, len(numbers))');
    fixed = fixed.replace(/average\s*=\s*total\s*\/\s*len\(scores\)/g, 'average = total / len(scores) if scores else 0.0');
    f.src = fixed;
  }
  lastRuntimeError = null;
  lastRun = null;
  hint = 1;
  ta.value = files[active]?.src || '';
  renderCode(); renderAll();
  say('doc', `Applied fix to <code>${esc(targetFile)}</code>. ${isDemoMode() ? 'Ready — click Run to verify.' : 'Running tests...'}`);
  if (!isDemoMode()) run();
}

function say(role, html) {
  thread.insertAdjacentHTML('beforeend', role === 'me'
    ? `<div class="msg msg--me">${esc(html)}</div>`
    : `<div class="msg"><span class="msg-who">Doctor</span><div>${html}</div></div>`);
  chat.scrollTop = chat.scrollHeight;
}

function renderMarkdownBody(text) {
  const codeBlocks = [];
  let placeholderText = text.replace(/```(?:python|py)?\s*([\s\S]*?)```/gi, (_, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(code.trim());
    return `__CODE_BLOCK_${idx}__`;
  });

  let formatted = esc(placeholderText);

  formatted = formatted.replace(/((?:^\|.+?\|\s*$\n?)+)/gm, (match) => {
    const rows = match.trim().split('\n').filter(r => !/^[\|\s\-:]+$/.test(r));
    if (!rows.length) return '';
    let tableHtml = '<table class="tests" style="margin:8px 0;width:100%;border-collapse:collapse">';
    rows.forEach((row, idx) => {
      const cells = row.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
      const tag = idx === 0 ? 'th' : 'td';
      tableHtml += '<tr>' + cells.map(c => `<${tag} style="padding:6px;border:1px solid var(--line-2)">${c}</${tag}>`).join('') + '</tr>';
    });
    tableHtml += '</table>';
    return tableHtml;
  });

  formatted = formatted.replace(/^#{1,3}\s+(.+)$/gm, '<h4 style="margin:12px 0 6px;color:var(--tx);font-size:14px;font-weight:600">$1</h4>');
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');

  formatted = formatted.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => {
    const rawCode = codeBlocks[+idx];
    lastProposedFix = rawCode;
    return `<pre class="snip"><code>${esc(rawCode)}</code></pre><button class="btn btn--primary btn--sm" data-act="apply-extracted" style="margin:4px 0 10px">Apply this code to editor</button>`;
  });

  const paragraphs = formatted.split(/\n\n+/).map(p => {
    if (p.startsWith('<pre') || p.startsWith('<ul') || p.startsWith('<table') || p.startsWith('<h4')) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  });
  return paragraphs.join('');
}

async function callAiDoctor(userPromptText) {
  const currentCode = files[active]?.src || files['solution.py']?.src || '';
  const currentChallenge = CHALLENGES[curChallengeIdx];
  const payload = {
    problem_description: userPromptText || `Challenge: ${currentChallenge?.title || 'Custom Task'}`,
    source_code: currentCode,
    execution_output: lastStdout,
    error_messages: lastStderr,
    selected_ai_mode: mode === 'complete' ? 'complete_answer' : 'logic_suggestion',
    model: activeModel
  };

  if (isDemoMode()) {
    return (
      `<span class="dim">AI diagnosis needs a connected backend.</span><br>` +
      `<span class="dim">This browser demo can explore the editor and run supported sample programs offline. ` +
      `Run locally with the API for Doctor features.</span>`
    );
  }

  try {
    const res = await apiFetch('/api/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await parseApiJson(res, 'Diagnosis API');
    return renderMarkdownBody(data.diagnosis || 'No response returned.');
  } catch (err) {
    const userMsg = err && err.userMessage ? err.userMessage : 'AI diagnosis failed.';
    const tech = (err && err.technical) || (err && err.message) || '';
    return (
      `<span class="bad">${esc(userMsg)}</span><br>` +
      `<span class="dim">Connect a backend or check server logs.</span>` +
      (tech
        ? `<details style="margin-top:8px"><summary class="dim" style="cursor:pointer">Technical Details</summary>` +
          `<pre class="snip" style="margin-top:6px;white-space:pre-wrap">${esc(tech)}</pre></details>`
        : '')
    );
  }
}

async function ask(text) {
  text = text.trim();
  if (!text || busy) return;
  busy = true;
  say('me', text);

  const l = document.createElement('div');
  l.className = 'msg';
  l.innerHTML = `<span class="msg-who">Doctor</span><svg class="pulse" viewBox="0 0 56 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Thinking"><path d="M0 10h14l4-8 6 16 4-8h28"/></svg>`;
  thread.appendChild(l); chat.scrollTop = chat.scrollHeight;

  const responseHtml = await callAiDoctor(text);
  l.remove();
  say('doc', responseHtml);
  busy = false;
  if (!isDemoMode()) loadHistory();
}

askBox.addEventListener('input', () => {
  askBox.style.height = 'auto';
  askBox.style.height = Math.min(askBox.scrollHeight, 120) + 'px';
  sendBtn.disabled = !askBox.value.trim();
});
askBox.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});
sendBtn.addEventListener('click', send);
function send() {
  const v = askBox.value; if (!v.trim()) return;
  askBox.value = ''; askBox.style.height = 'auto'; sendBtn.disabled = true;
  ask(v);
}

/* ---------- model menu & fetching ---------- */
function toggleMenu() {
  const l = $('#modelList'), opening = l.hidden;
  l.hidden = !opening; $('#modelBtn').setAttribute('aria-expanded', opening);
}
function closeMenu() { $('#modelList').hidden = true; $('#modelBtn').setAttribute('aria-expanded', false); }

async function loadModels() {
  if (isDemoMode()) return;
  try {
    const res = await apiFetch('/api/models');
    const data = await parseApiJson(res, 'Models API');
    if (data.models && data.models.length) {
      activeModel = data.default || data.models[0].id;
      $('#modelName').textContent = activeModel;
      const homeModelLabel = $('#homeModelLabel');
      if (homeModelLabel) homeModelLabel.textContent = activeModel;
      $('#modelList').innerHTML = data.models.map((m) => `
        <li><button role="option" data-model="${esc(m.id)}" aria-selected="${m.id === activeModel}">
          <span>${esc(m.id)}</span><span class="tag">${esc(m.provider || '')}</span>
        </button></li>
      `).join('');
      const homeModelMenu = $('#homeModelMenu');
      if (homeModelMenu) {
        homeModelMenu.innerHTML = data.models.map((m) =>
          `<button type="button" role="option" data-home-model="${esc(m.id)}" aria-selected="${m.id === activeModel}">${esc(m.id)}</button>`
        ).join('');
      }
    }
  } catch (e) {
    console.warn('Could not load models list:', e && (e.userMessage || e.message) ? (e.userMessage || e.message) : e);
  }
}

async function loadHistory() {
  if (isDemoMode()) {
    historyCache = [];
    histPane.innerHTML = '<p class="dim">Diagnosis history needs a connected backend. Demo mode keeps the editor offline.</p>';
    return;
  }
  try {
    const res = await apiFetch('/api/history');
    const data = await parseApiJson(res, 'History API');
    historyCache = Array.isArray(data) ? data : [];
    if (!historyCache.length) {
      histPane.innerHTML = '<p class="dim">No diagnosis history stored yet.</p>';
      return;
    }
    histPane.innerHTML = historyCache.slice(0, 15).map((it, idx) => `
      <div class="hist-item" data-hist-idx="${idx}">
        <div class="hist-title">
          <span>${esc(it.problem_description || 'Diagnosis Session')}</span>
          <span class="tag">${esc(it.model_name || '')}</span>
        </div>
        <div class="hist-meta">${new Date(it.created_at || Date.now()).toLocaleTimeString()} · Mode: ${esc(it.diagnosis_mode || 'complete')} · Click to restore</div>
      </div>
    `).join('');
  } catch (e) {
    histPane.innerHTML = '<p class="dim">History unavailable — connect a backend to sync diagnosis sessions.</p>';
  }
}

function restoreHistory(idx) {
  const item = historyCache[idx];
  if (!item) return;
  files['solution.py'] = { src: item.source_code || '' };
  openFile('solution.py');
  say('doc', `<strong>Restored history session:</strong> ${esc(item.problem_description)}<br>${renderMarkdownBody(item.ai_diagnosis || '')}`);
  term(`<span class="dim">Restored session from history (${item.model_name})</span>`);
}

function loadChallenge(idx) {
  curChallengeIdx = idx % CHALLENGES.length;
  const c = CHALLENGES[curChallengeIdx];
  files['solution.py'] = { src: c.solution };
  files['test_cases.py'] = { src: c.tests };
  lastRun = null;
  lastStdout = '';
  lastStderr = '';
  lastExitCode = null;
  lastRuntimeError = null;
  openFile('solution.py');
  term(`<span class="dim">Loaded Challenge 0${curChallengeIdx + 1}: ${esc(c.title)}</span>`);
  renderAll();
}

/* ---------- sidebar panes ---------- */
function setPane(p) {
  $$('.seg-tabs button').forEach(b => { const on = b.dataset.pane === p; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', on); });
  $$('.pane').forEach(el => el.classList.toggle('is-active', el.id === 'pane-' + p));
}

/* ---------- actions and delegation ---------- */
function action(a) {
  if (a === 'new-file') return newFile('');
  if (a === 'run') return run();
  if (a === 'run-diagnose') return ask('Find bugs & root cause');
  if (a === 'format') return format();
  if (a === 'toggle-model') return toggleMenu();
  if (a === 'clear-term') { termLog.innerHTML = ''; return; }
  if (a === 'focus-term') { setCp('terminal'); termIn.focus(); return; }
  if (a === 'toggle-console') {
    if (workspaceApp) workspaceApp.classList.toggle('is-console-collapsed');
    consoleEl.classList.toggle('is-max');
    return;
  }
}

function docAct(a) {
  if (a === 'apply') return applyFix();
  if (a === 'apply-extracted') return applyFix(lastProposedFix);
  if (a === 'explain') return ask('Find bugs & root cause');
  if (a === 'hint') { hint = Math.min(3, hint + 1); return renderDoctor(); }
  if (a === 'reveal') return setMode('complete');
}

document.addEventListener('click', e => {
  const t = e.target; let el;
  if ((el = t.closest('[data-close]')))    return closeFile(el.dataset.close);
  if ((el = t.closest('[data-open]')))     return openFile(el.dataset.open);
  if ((el = t.closest('[data-model]'))) {
    activeModel = el.dataset.model;
    syncModelLabels();
    return closeMenu();
  }
  if ((el = t.closest('[data-action]')))   return action(el.dataset.action);
  if ((el = t.closest('[data-pane]')))     return setPane(el.dataset.pane);
  if ((el = t.closest('[data-cp]')))       return setCp(el.dataset.cp);
  if ((el = t.closest('[data-mode]')))     return setMode(el.dataset.mode);
  if ((el = t.closest('[data-act]')))      return docAct(el.dataset.act);
  if ((el = t.closest('[data-chip]')))     return ask(el.dataset.chip);
  if ((el = t.closest('[data-snippet]')))  return (ta.focus(), insertText(SNIPPETS[+el.dataset.snippet].code));
  if ((el = t.closest('[data-template]'))) return newFile(TEMPLATES[+el.dataset.template].src);
  if ((el = t.closest('[data-hist-idx]'))) return restoreHistory(+el.dataset.histIdx);
  if ((el = t.closest('.challenge')))      return loadChallenge(curChallengeIdx + 1);
  if ((el = t.closest('[data-nav]'))) {
    const navVal = el.dataset.nav;
    $$('.nav-item').forEach(b => b.classList.toggle('is-active', b === el));
    if (navVal === 'history') { setCp('history'); consoleEl.classList.add('is-max'); loadHistory(); }
    else if (navVal === 'challenges') { loadChallenge(curChallengeIdx + 1); }
    else if (navVal === 'settings') { toggleMenu(); }
    return;
  }
  if (!t.closest('.menu')) closeMenu();
});

document.addEventListener('keydown', e => {
  if (!workspaceEntered) {
    if (e.key === 'Escape') closeHomeMenus();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
  else if (e.altKey && !e.shiftKey && e.code === 'KeyN') { e.preventDefault(); newFile(''); }
  else if (e.altKey && e.shiftKey && e.code === 'KeyF') { e.preventDefault(); format(); }
  else if (e.key === 'Escape') closeMenu();
});

/* ---------- render all ---------- */
function renderAll() {
  renderTabs(); renderFiles(); renderProblems(); renderOutput();
  renderChallenge(); renderStatus(); renderDoctor();
}

/* ---------- multi-page router ---------- */
const PAGE_TITLES = {
  home: 'Home',
  workspace: 'Workspace',
  learn: 'Learn',
  challenges: 'Challenges',
  history: 'History',
  templates: 'Templates',
  snippets: 'Snippets',
  settings: 'Settings',
  doctor: 'AI Doctor'
};

const LEARN_TOPICS = [
  { id: 'variables', title: 'Variables & types', blurb: 'int, str, list, dict' },
  { id: 'loops', title: 'Loops', blurb: 'for, while, range' },
  { id: 'functions', title: 'Functions', blurb: 'def, return, arguments' },
  { id: 'conditionals', title: 'Conditionals', blurb: 'if / elif / else' },
  { id: 'errors', title: 'Errors & debugging', blurb: 'Tracebacks and fixes' },
  { id: 'files', title: 'Working with files', blurb: 'open, read, write' }
];

let workspaceEntered = false;
let homeIntentMode = 'create';
let pendingLearnTopic = '';
const pendingHomeFiles = [];
let userSnippets = [];
try {
  userSnippets = JSON.parse(localStorage.getItem('codedoctor_user_snippets') || '[]');
  if (!Array.isArray(userSnippets)) userSnippets = [];
} catch { userSnippets = []; }

const homeRoot = $('#home');
const homePrompt = $('#homePrompt');
const homeSendBtn = $('#homeSendBtn');
const homePromptForm = $('#homePromptForm');
const homeAttachList = $('#homeAttachList');
const homeFileInput = $('#homeFileInput');
const homeModeBtn = $('#homeModeBtn');
const homeModeMenu = $('#homeModeMenu');
const homeModeLabel = $('#homeModeLabel');
const homeModelBtn = $('#homeModelBtn');
const homeModelMenu = $('#homeModelMenu');
const homeModelLabel = $('#homeModelLabel');
const workspaceApp = $('#workspaceApp') || $('.app');
const shellPageTitle = $('#shellPageTitle');
const shellModelLabel = $('#shellModelLabel');
const appShell = $('#appShell');

function getRoute() {
  const raw = (location.hash || '#/home').replace(/^#/, '');
  const path = raw.split('?')[0].replace(/^\/+/, '') || 'home';
  const page = path.split('/')[0] || 'home';
  return PAGE_TITLES[page] ? page : 'home';
}

function navigate(page, { replace = false } = {}) {
  const next = PAGE_TITLES[page] ? page : 'home';
  const hash = '#/' + next;
  if (replace) location.replace(hash);
  else if (location.hash !== hash) location.hash = hash;
  else renderRoute(next);
}

function setNavOpen(open) {
  document.body.classList.toggle('nav-open', !!open);
  const bd = $('#shellNavBackdrop');
  if (bd) bd.hidden = !open;
}

function syncModelLabels() {
  const mn = $('#modelName');
  if (mn) mn.textContent = activeModel;
  if (homeModelLabel) homeModelLabel.textContent = activeModel;
  if (shellModelLabel) shellModelLabel.textContent = activeModel;
  const settingsModel = $('#settingsModel');
  if (settingsModel && settingsModel.value !== activeModel) settingsModel.value = activeModel;
  $$('#modelList [data-model]').forEach((b) => b.setAttribute('aria-selected', b.dataset.model === activeModel));
  $$('#homeModelMenu [data-home-model]').forEach((b) => b.setAttribute('aria-selected', b.dataset.homeModel === activeModel));
}

function closeHomeMenus() {
  if (homeModeMenu) homeModeMenu.hidden = true;
  if (homeModelMenu) homeModelMenu.hidden = true;
  if (homeModeBtn) homeModeBtn.setAttribute('aria-expanded', 'false');
  if (homeModelBtn) homeModelBtn.setAttribute('aria-expanded', 'false');
  if (homeModeBtn) homeModeBtn.classList.remove('is-open');
  if (homeModelBtn) homeModelBtn.classList.remove('is-open');
}

function setHomeIntentMode(next) {
  homeIntentMode = next;
  if (homeModeLabel) {
    homeModeLabel.textContent = next === 'fix' ? 'Fix' : next === 'learn' ? 'Learn' : 'Create';
  }
  $$('#homeModeMenu [data-home-mode]').forEach((b) => {
    b.setAttribute('aria-selected', b.dataset.homeMode === next);
  });
  closeHomeMenus();
}

function renderHomeAttachments() {
  if (!homeAttachList) return;
  if (!pendingHomeFiles.length) {
    homeAttachList.hidden = true;
    homeAttachList.innerHTML = '';
    return;
  }
  homeAttachList.hidden = false;
  homeAttachList.innerHTML = pendingHomeFiles.map((f, i) =>
    `<span class="home-attach-chip"><svg class="i"><use href="#i-file"/></svg>${esc(f.name)}` +
    `<button type="button" data-home-detach="${i}" aria-label="Remove ${esc(f.name)}"><svg class="i"><use href="#i-x"/></svg></button></span>`
  ).join('');
}

function readHomeFiles(fileList) {
  const list = [...(fileList || [])];
  if (!list.length) return Promise.resolve();
  return Promise.all(list.map((file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      pendingHomeFiles.push({ name: file.name, src: String(reader.result || '') });
      resolve();
    };
    reader.onerror = () => resolve();
    reader.readAsText(file);
  }))).then(() => renderHomeAttachments());
}

function seedFromHomeIntent(opts = {}) {
  const intent = opts.mode || homeIntentMode;
  const attached = opts.attached || [...pendingHomeFiles];

  if (attached.length) {
    Object.keys(files).forEach((k) => { delete files[k]; });
    open.length = 0;
    attached.forEach((f, idx) => {
      let name = f.name || `upload-${idx + 1}.txt`;
      if (files[name]) name = `${idx + 1}-${name}`;
      files[name] = { src: f.src || '' };
      open.push(name);
    });
    active = open[0];
    return;
  }

  if (opts.keepChallenge) return;

  if (intent === 'create') {
    Object.keys(files).forEach((k) => { delete files[k]; });
    open.length = 0;
    files['main.py'] = {
      src: '# CodeDoctor\n# Describe what you want in the Doctor chat — or write code here.\n\ndef main():\n    print("Hello from CodeDoctor")\n\n\nif __name__ == "__main__":\n    main()\n'
    };
    open.push('main.py');
    active = 'main.py';
    return;
  }

  if (intent === 'fix') {
    Object.keys(files).forEach((k) => { delete files[k]; });
    open.length = 0;
    files['solution.py'] = {
      src: '# Paste the code you want fixed here\n\ndef main():\n    pass\n\n\nif __name__ == "__main__":\n    main()\n'
    };
    open.push('solution.py');
    active = 'solution.py';
    return;
  }

  Object.keys(files).forEach((k) => { delete files[k]; });
  open.length = 0;
  files['learn.py'] = {
    src: '# Learning sandbox\n# Ask Doctor to explain any concept in simple words.\n\nprint("Ready to learn")\n'
  };
  open.push('learn.py');
  active = 'learn.py';
}

function prepareWorkspaceShell() {
  termLog.innerHTML = '';
  const stEnv = $('#stEnv');
  const banner = $('#web-demo-banner');
  if (isDemoMode()) {
    if (stEnv) stEnv.textContent = 'Demo · Simulated Python';
    if (banner) banner.style.display = 'flex';
    document.body.classList.add('has-demo-banner');
    if (appShell) appShell.classList.add('has-banner');
    term('<strong>CodeDoctor Demo Environment</strong>');
    term('<span class="dim">Ready to explore.</span>');
    term('<span class="dim">Click Run to try the sample code.</span>');
  } else {
    if (stEnv) stEnv.textContent = 'Python 3.10 Sandbox';
    if (banner) banner.style.display = 'none';
    document.body.classList.remove('has-demo-banner');
    if (appShell) appShell.classList.remove('has-banner');
    term('<span class="dim">Python 3.10 sandbox ready. Type</span> python ' + esc(active) + ' <span class="dim">or click Run (Ctrl ↵)</span>');
  }
  ta.value = files[active]?.src || '';
  renderCode();
  renderAll();
}

function openWorkspace(opts = {}) {
  const promptText = (opts.prompt || '').trim();
  const intent = opts.mode || homeIntentMode;
  const via = opts.via || 'prompt';

  if (intent === 'learn') setMode('logic');
  else setMode('complete');

  if (!workspaceEntered) {
    if (via === 'challenges') {
      seedFromHomeIntent({ mode: intent, keepChallenge: true, attached: [] });
    } else if (via === 'keep') {
      /* keep current files */
    } else {
      seedFromHomeIntent({ mode: intent, attached: [...pendingHomeFiles] });
    }
    prepareWorkspaceShell();
  } else if (pendingHomeFiles.length) {
    seedFromHomeIntent({ mode: intent, attached: [...pendingHomeFiles] });
    prepareWorkspaceShell();
  } else if (via === 'challenges') {
    /* loadChallenge below */
  } else if (!opts.skipPrepare && via === 'workspace' && !workspaceEntered) {
    prepareWorkspaceShell();
  }

  pendingHomeFiles.length = 0;
  renderHomeAttachments();
  closeHomeMenus();
  workspaceEntered = true;

  if (via === 'challenges' && opts.challengeIndex != null) {
    loadChallenge(opts.challengeIndex);
  } else if (via === 'challenges') {
    loadChallenge(curChallengeIdx);
  }

  if (promptText) {
    let framed = promptText;
    if (intent === 'create') framed = `Create / build this for me (complete working code when possible):\n\n${promptText}`;
    else if (intent === 'fix') framed = `Fix this problem and explain the root cause clearly:\n\n${promptText}`;
    else if (intent === 'learn') framed = `Explain this in simple words for a beginner. Guide me step by step:\n\n${promptText}`;
    setTimeout(() => {
      ask(framed);
      if (askBox) askBox.focus({ preventScroll: true });
    }, 220);
  } else if (opts.focusEditor !== false) {
    setTimeout(() => ta.focus({ preventScroll: true }), 160);
  }

  navigate('workspace');
}

function updateHomeSendState() {
  if (!homeSendBtn || !homePrompt) return;
  homeSendBtn.disabled = !homePrompt.value.trim() && pendingHomeFiles.length === 0;
}

function renderLearnPage() {
  const list = $('#learnTopicList');
  if (!list) return;
  list.innerHTML = LEARN_TOPICS.map((t) =>
    `<button type="button" class="feature-row" data-learn-topic="${esc(t.id)}"><div class="meta"><strong>${esc(t.title)}</strong><span>${esc(t.blurb)}</span></div><span class="tag">Learn</span></button>`
  ).join('');
  if (pendingLearnTopic) {
    const q = $('#learnQuery');
    const topic = LEARN_TOPICS.find((t) => t.id === pendingLearnTopic);
    if (q && topic) q.value = topic.title;
  }
}

async function explainLearn(text) {
  const box = $('#learnExplain');
  if (!box || !text.trim()) return;
  setMode('logic');
  box.innerHTML = '<span class="dim">Thinking…</span>';
  const framed = `Explain this in simple words for a beginner. Use short steps and a tiny Python example:\n\n${text.trim()}`;
  const html = await callAiDoctor(framed);
  box.innerHTML = html;
}

function renderChallengesPage() {
  const list = $('#challengesList');
  if (!list) return;
  list.innerHTML = CHALLENGES.map((c, i) =>
    `<button type="button" class="feature-row" data-open-challenge="${i}"><div class="meta"><strong>${esc(c.title)}</strong><span>Challenge ${String(i + 1).padStart(2, '0')}</span></div><span class="tag">${esc(c.diff || 'Practice')}</span></button>`
  ).join('');
}

function renderTemplatesPage() {
  const list = $('#pageTemplateList');
  if (!list) return;
  list.innerHTML = TEMPLATES.map((t, i) =>
    `<button type="button" class="feature-row" data-use-template="${i}"><div class="meta"><strong>${esc(t.name)}</strong><span>${esc(t.desc)}</span></div><span class="tag">Use</span></button>`
  ).join('');
}

function allSnippets() {
  return [
    ...SNIPPETS.map((s, i) => ({ ...s, id: 'builtin-' + i, builtin: true })),
    ...userSnippets.map((s, i) => ({ ...s, id: 'user-' + i, builtin: false, userIndex: i }))
  ];
}

function saveUserSnippets() {
  localStorage.setItem('codedoctor_user_snippets', JSON.stringify(userSnippets));
}

function renderSnippetsPage(filter = '') {
  const list = $('#pageSnippetList');
  if (!list) return;
  const q = filter.trim().toLowerCase();
  const items = allSnippets().filter((s) => !q || s.name.toLowerCase().includes(q) || (s.key || '').toLowerCase().includes(q));
  list.innerHTML = items.map((s) =>
    `<div class="feature-row" style="cursor:default"><div class="meta"><strong>${esc(s.name)}</strong><span>${esc(s.key || (s.builtin ? 'built-in' : 'saved'))}</span></div>
      <button type="button" class="btn-quiet" data-insert-snippet="${esc(s.id)}">Insert</button>
      ${s.builtin ? '' : `<button type="button" class="btn-quiet" data-delete-snippet="${s.userIndex}">Delete</button>`}
    </div>`
  ).join('') || '<p class="lead">No snippets yet.</p>';
}

function renderHistoryPage(filter = '') {
  const list = $('#pageHistoryList');
  if (!list) return;
  const q = filter.trim().toLowerCase();
  const items = (historyCache || []).filter((h) => {
    const blob = `${h.problem_description || ''} ${h.source_code || ''} ${h.ai_diagnosis || ''}`.toLowerCase();
    return !q || blob.includes(q);
  });
  if (!items.length) {
    list.innerHTML = `<p class="lead">${isDemoMode() ? 'History needs a connected backend. Demo mode keeps sessions offline.' : 'No diagnosis history stored yet.'}</p>`;
    return;
  }
  list.innerHTML = items.map((h, i) => {
    const idx = historyCache.indexOf(h);
    return `<button type="button" class="feature-row" data-restore-history="${idx}"><div class="meta"><strong>${esc((h.problem_description || 'Session').slice(0, 80))}</strong><span>${esc(h.model_name || h.provider || '')} · ${esc(h.created_at || '')}</span></div><span class="tag">Open</span></button>`;
  }).join('');
}

function renderSettingsPage() {
  const modelSel = $('#settingsModel');
  const apiInput = $('#settingsApiBase');
  const timeoutInput = $('#settingsTimeout');
  if (modelSel) {
    const opts = $$('#modelList [data-model]').map((b) => b.dataset.model);
    const models = opts.length ? opts : [activeModel];
    modelSel.innerHTML = models.map((m) => `<option value="${esc(m)}" ${m === activeModel ? 'selected' : ''}>${esc(m)}</option>`).join('');
  }
  if (apiInput) {
    try { apiInput.value = localStorage.getItem('codedoctor_api_base') ?? ''; } catch { apiInput.value = ''; }
  }
  if (timeoutInput) {
    try { timeoutInput.value = localStorage.getItem('codedoctor_timeout') || '5'; } catch { timeoutInput.value = '5'; }
  }
}

function renderDoctorPage() {
  /* thread already live via doctorPageThread + handlers */
}

async function renderRoute(page) {
  const route = PAGE_TITLES[page] ? page : 'home';
  document.body.dataset.page = route;
  document.body.classList.add('app-shell');
  document.body.classList.remove('view-home', 'view-workspace');
  if (shellPageTitle) shellPageTitle.textContent = PAGE_TITLES[route];

  $$('.page').forEach((el) => {
    const on = el.dataset.page === route;
    el.classList.toggle('is-active', on);
    el.hidden = !on;
  });
  $$('.shell-nav-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.route === route));
  $$('.nav-item[data-route]').forEach((b) => b.classList.toggle('is-active', b.dataset.route === route));
  setNavOpen(false);

  if (route === 'workspace') {
    if (!workspaceEntered) {
      prepareWorkspaceShell();
      workspaceEntered = true;
    }
    if (workspaceApp) {
      workspaceApp.hidden = false;
      workspaceApp.classList.remove('is-workspace-hidden');
    }
  }

  if (route === 'learn') {
    renderLearnPage();
    if (pendingLearnTopic) {
      const topic = LEARN_TOPICS.find((t) => t.id === pendingLearnTopic);
      pendingLearnTopic = '';
      if (topic) await explainLearn(topic.title + ' — ' + topic.blurb);
    }
  }
  if (route === 'challenges') renderChallengesPage();
  if (route === 'templates') renderTemplatesPage();
  if (route === 'snippets') renderSnippetsPage(($('#snippetSearch') || {}).value || '');
  if (route === 'history') {
    await loadHistory();
    renderHistoryPage(($('#historySearch') || {}).value || '');
  }
  if (route === 'settings') renderSettingsPage();
  if (route === 'doctor') renderDoctorPage();
  if (route === 'home' && homePrompt) homePrompt.focus({ preventScroll: true });
}

function handleHomePromptSubmit() {
  const text = (homePrompt && homePrompt.value) || '';
  if (!text.trim() && !pendingHomeFiles.length) return;
  if (homeSendBtn) homeSendBtn.classList.add('is-loading');

  if (homeIntentMode === 'learn') {
    pendingLearnTopic = '';
    sessionStorage.setItem('codedoctor_learn_q', text.trim());
    navigate('learn');
    setTimeout(() => {
      const q = $('#learnQuery');
      if (q) q.value = text.trim();
      explainLearn(text.trim());
    }, 50);
  } else {
    openWorkspace({ prompt: text, mode: homeIntentMode, via: 'prompt' });
  }

  if (homePrompt) {
    homePrompt.value = '';
    homePrompt.style.height = 'auto';
  }
  updateHomeSendState();
  if (homeSendBtn) homeSendBtn.classList.remove('is-loading');
}

/* home prompt listeners */
if (homePrompt) {
  homePrompt.addEventListener('input', () => {
    homePrompt.style.height = 'auto';
    homePrompt.style.height = Math.min(homePrompt.scrollHeight, 180) + 'px';
    updateHomeSendState();
  });
  homePrompt.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (homePromptForm) homePromptForm.requestSubmit();
    }
  });
}

if (homePromptForm) {
  homePromptForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleHomePromptSubmit();
  });
}

const homeAttachBtn = $('#homeAttachBtn');
if (homeAttachBtn) {
  homeAttachBtn.addEventListener('click', () => homeFileInput && homeFileInput.click());
}

if (homeFileInput) {
  homeFileInput.addEventListener('change', async () => {
    await readHomeFiles(homeFileInput.files);
    homeFileInput.value = '';
    updateHomeSendState();
  });
}

if (homeAttachList) {
  homeAttachList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-home-detach]');
    if (!btn) return;
    const idx = Number(btn.dataset.homeDetach);
    if (!Number.isNaN(idx)) {
      pendingHomeFiles.splice(idx, 1);
      renderHomeAttachments();
      updateHomeSendState();
    }
  });
}

if (homeModeBtn) {
  homeModeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = homeModeMenu && homeModeMenu.hidden;
    closeHomeMenus();
    if (open && homeModeMenu) {
      homeModeMenu.hidden = false;
      homeModeBtn.setAttribute('aria-expanded', 'true');
      homeModeBtn.classList.add('is-open');
    }
  });
}

if (homeModeMenu) {
  homeModeMenu.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-home-mode]');
    if (!btn) return;
    setHomeIntentMode(btn.dataset.homeMode);
  });
}

if (homeModelBtn) {
  homeModelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = homeModelMenu && homeModelMenu.hidden;
    closeHomeMenus();
    if (open && homeModelMenu) {
      homeModelMenu.hidden = false;
      homeModelBtn.setAttribute('aria-expanded', 'true');
      homeModelBtn.classList.add('is-open');
    }
  });
}

if (homeModelMenu) {
  homeModelMenu.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-home-model]');
    if (!btn) return;
    activeModel = btn.dataset.homeModel;
    syncModelLabels();
    closeHomeMenus();
  });
}

const homeNewBtn = $('#homeNewBtn');
if (homeNewBtn) {
  homeNewBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (homePrompt) {
      homePrompt.value = '';
      homePrompt.style.height = 'auto';
      homePrompt.focus();
    }
    pendingHomeFiles.length = 0;
    renderHomeAttachments();
    updateHomeSendState();
    setHomeIntentMode('create');
    navigate('home');
  });
}

/* global route clicks */
document.addEventListener('click', (e) => {
  const routeEl = e.target.closest('[data-route]');
  if (routeEl) {
    e.preventDefault();
    const route = routeEl.dataset.route;
    if (route === 'workspace') openWorkspace({ via: 'keep', mode: homeIntentMode, focusEditor: true });
    else navigate(route);
    return;
  }

  const learnTopic = e.target.closest('[data-learn-topic]');
  if (learnTopic) {
    const id = learnTopic.dataset.learnTopic;
    const topic = LEARN_TOPICS.find((t) => t.id === id);
    navigate('learn');
    setTimeout(() => {
      const q = $('#learnQuery');
      if (q && topic) q.value = topic.title;
      if (topic) explainLearn(topic.title + ' — ' + topic.blurb);
    }, 40);
    return;
  }

  const ch = e.target.closest('[data-open-challenge]');
  if (ch) {
    openWorkspace({ via: 'challenges', challengeIndex: Number(ch.dataset.openChallenge), mode: 'fix' });
    return;
  }

  const tmpl = e.target.closest('[data-use-template]');
  if (tmpl) {
    const t = TEMPLATES[Number(tmpl.dataset.useTemplate)];
    if (t) {
      openWorkspace({ via: 'keep', mode: 'create', focusEditor: false });
      newFile(t.src);
    }
    return;
  }

  const ins = e.target.closest('[data-insert-snippet]');
  if (ins) {
    const id = ins.dataset.insertSnippet;
    const snip = allSnippets().find((s) => s.id === id);
    openWorkspace({ via: 'keep', focusEditor: true });
    setTimeout(() => {
      if (snip) insertText(snip.code || '');
    }, 120);
    return;
  }

  const del = e.target.closest('[data-delete-snippet]');
  if (del) {
    userSnippets.splice(Number(del.dataset.deleteSnippet), 1);
    saveUserSnippets();
    renderSnippetsPage(($('#snippetSearch') || {}).value || '');
    return;
  }

  const hist = e.target.closest('[data-restore-history]');
  if (hist) {
    restoreHistory(Number(hist.dataset.restoreHistory));
    navigate('workspace');
    return;
  }

  const docMode = e.target.closest('[data-doc-mode]');
  if (docMode) {
    setMode(docMode.dataset.docMode);
    return;
  }

  if (!e.target.closest('.home-mode-menu, .home-model-menu, #homeModeBtn, #homeModelBtn')) {
    closeHomeMenus();
  }
});

$('#learnAskBtn')?.addEventListener('click', () => {
  const q = $('#learnQuery');
  explainLearn((q && q.value) || '');
});
$('#learnQuery')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    explainLearn(e.target.value || '');
  }
});
$('#historyRefreshBtn')?.addEventListener('click', async () => {
  await loadHistory();
  renderHistoryPage(($('#historySearch') || {}).value || '');
});
$('#historySearch')?.addEventListener('input', (e) => renderHistoryPage(e.target.value || ''));
$('#snippetSearch')?.addEventListener('input', (e) => renderSnippetsPage(e.target.value || ''));
$('#snippetAddBtn')?.addEventListener('click', () => {
  const name = prompt('Snippet name');
  if (!name) return;
  const code = prompt('Snippet code');
  if (code == null) return;
  userSnippets.push({ name, key: 'custom', code });
  saveUserSnippets();
  renderSnippetsPage(($('#snippetSearch') || {}).value || '');
});
$('#settingsSaveBtn')?.addEventListener('click', () => {
  const modelSel = $('#settingsModel');
  const apiInput = $('#settingsApiBase');
  const timeoutInput = $('#settingsTimeout');
  if (modelSel) activeModel = modelSel.value;
  try {
    if (apiInput) localStorage.setItem('codedoctor_api_base', apiInput.value.trim());
    if (timeoutInput) localStorage.setItem('codedoctor_timeout', String(timeoutInput.value || '5'));
    localStorage.setItem('codedoctor_model', activeModel);
  } catch { /* ignore */ }
  syncModelLabels();
  const st = $('#settingsStatus');
  if (st) st.textContent = 'Saved. Reload the page if you changed the API base URL.';
});
$('#settingsDemoBtn')?.addEventListener('click', () => {
  try { localStorage.setItem('codedoctor_api_base', 'demo'); } catch { /* ignore */ }
  const st = $('#settingsStatus');
  if (st) st.textContent = 'Demo mode selected. Reload the page to apply.';
});
$('#doctorPageSend')?.addEventListener('click', async () => {
  const input = $('#doctorPageAsk');
  const thread = $('#doctorPageThread');
  const text = (input && input.value || '').trim();
  if (!text || !thread) return;
  thread.insertAdjacentHTML('beforeend', `<div style="margin:8px 0"><strong>You</strong><div>${esc(text)}</div></div>`);
  input.value = '';
  const thinking = document.createElement('div');
  thinking.innerHTML = '<span class="dim">Doctor is thinking…</span>';
  thread.appendChild(thinking);
  const html = await callAiDoctor(text);
  thinking.remove();
  thread.insertAdjacentHTML('beforeend', `<div style="margin:8px 0"><strong>Doctor</strong><div>${html}</div></div>`);
  thread.scrollTop = thread.scrollHeight;
});
$('#doctorPageAsk')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#doctorPageSend')?.click();
  }
});
$('#shellMenuBtn')?.addEventListener('click', () => setNavOpen(true));
$('#homeMenuBtn')?.addEventListener('click', () => setNavOpen(true));
$('#wsMenuBtn')?.addEventListener('click', () => setNavOpen(true));
$('#shellNavBackdrop')?.addEventListener('click', () => setNavOpen(false));
$('#shellModelBtn')?.addEventListener('click', () => navigate('settings'));

$('#btnToggleFiles')?.addEventListener('click', () => {
  workspaceApp?.classList.toggle('is-files-open');
  $('#btnToggleFiles')?.classList.toggle('is-on', workspaceApp?.classList.contains('is-files-open'));
});
$('#btnToggleDoctor')?.addEventListener('click', () => {
  workspaceApp?.classList.toggle('is-doctor-collapsed');
  $('#btnToggleDoctor')?.classList.toggle('is-on', !workspaceApp?.classList.contains('is-doctor-collapsed'));
});
$('#btnCollapseDoctor')?.addEventListener('click', () => {
  workspaceApp?.classList.add('is-doctor-collapsed');
  $('#btnToggleDoctor')?.classList.remove('is-on');
});

function setWsView(view) {
  if (!workspaceApp) return;
  const next = view === 'ai' || view === 'output' ? view : 'editor';
  workspaceApp.dataset.wsView = next;
  $$('#wsMobileViews .ws-view-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.wsView === next);
  });
  if (next === 'output') {
    workspaceApp.classList.remove('is-console-collapsed');
    const outTab = document.querySelector('.ctab[data-cp="output"]');
    if (outTab) outTab.click();
  }
  if (next === 'ai') {
    workspaceApp.classList.remove('is-doctor-collapsed');
    $('#btnToggleDoctor')?.classList.add('is-on');
  }
}

$('#wsMobileViews')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-ws-view]');
  if (!btn) return;
  setWsView(btn.dataset.wsView);
});

/* Compact terminal height via drag */
(() => {
  const handle = $('#consoleResizer');
  if (!handle || !workspaceApp) return;
  let dragging = false;
  let startY = 0;
  let startH = 148;
  const applyH = (px) => {
    const h = Math.max(96, Math.min(320, px));
    workspaceApp.style.setProperty('--ws-console', `${h}px`);
  };
  handle.addEventListener('pointerdown', (e) => {
    if (workspaceApp.classList.contains('is-console-collapsed')) return;
    dragging = true;
    startY = e.clientY;
    startH = parseFloat(getComputedStyle(workspaceApp).getPropertyValue('--ws-console')) || 148;
    handle.classList.add('is-dragging');
    handle.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });
  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    applyH(startH - (e.clientY - startY));
  });
  const endDrag = () => {
    dragging = false;
    handle.classList.remove('is-dragging');
  };
  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);
})();

function syncWorkspaceChrome() {
  const mobileViews = $('#wsMobileViews');
  const w = window.innerWidth;
  if (mobileViews) mobileViews.hidden = w > 700;
  if (!workspaceApp) return;
  if (w <= 700) {
    if (!workspaceApp.dataset.wsView) setWsView('editor');
    workspaceApp.classList.remove('is-doctor-collapsed');
  } else {
    delete workspaceApp.dataset.wsView;
  }
}
window.addEventListener('resize', syncWorkspaceChrome);

// Default layout: AI open on desktop, collapsed on tablet for editor focus.
if (workspaceApp) {
  if (window.innerWidth > 700 && window.innerWidth <= 1100) {
    workspaceApp.classList.add('is-doctor-collapsed');
    $('#btnToggleDoctor')?.classList.remove('is-on');
  } else {
    workspaceApp.classList.remove('is-doctor-collapsed');
    $('#btnToggleDoctor')?.classList.add('is-on');
  }
  syncWorkspaceChrome();
}

window.addEventListener('hashchange', () => renderRoute(getRoute()));

/* compatibility alias */
function enterWorkspace(opts) { openWorkspace(opts || {}); }

/* ---------- boot ---------- */
$('#snippetList').innerHTML = SNIPPETS.map((s, i) =>
  `<li><button class="list-item" data-snippet="${i}">${icon('code')}${s.name}<span class="sub">${s.key}</span></button></li>`).join('');
$('#templateList').innerHTML = TEMPLATES.map((s, i) =>
  `<li><button class="list-item" data-template="${i}">${icon('layout')}${s.name}<span class="sub">${s.desc}</span></button></li>`).join('');

ta.value = files[active]?.src || '';
termLog.innerHTML = '';
renderCode(); renderAll(); setMode('complete');
setHomeIntentMode('create');
syncModelLabels();
updateHomeSendState();
{
  const banner = $('#web-demo-banner');
  if (isDemoMode()) {
    if (banner) banner.style.display = 'flex';
    document.body.classList.add('has-demo-banner');
    if (appShell) appShell.classList.add('has-banner');
  } else if (banner) {
    banner.style.display = 'none';
  }
}
if (!isDemoMode()) loadModels();
if (!location.hash || location.hash === '#') navigate('home', { replace: true });
else renderRoute(getRoute());
})();
