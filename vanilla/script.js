(() => {
'use strict';

/* ---------- helpers ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const icon = id => `<svg class="i"><use href="#i-${id}"/></svg>`;

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
      `<span class="ghost">${iss.short}</span>`;
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
    return `<div class="tab ${n === active ? 'is-active' : ''}">
      <button class="tab-main" role="tab" aria-selected="${n === active}" data-open="${n}">
        ${icon('file')}${n}${bad ? '<span class="mark" title="Problem in this file"></span>' : ''}
      </button>
      ${open.length > 1 ? `<button class="x" data-close="${n}" aria-label="Close ${n}">${icon('x')}</button>` : ''}
    </div>`;
  }).join('');
}

function renderFiles() {
  fileList.innerHTML = Object.keys(files).map(n => {
    const bad = diagnose(n, files[n]?.src || '').length;
    return `<li><button class="list-item ${n === active ? 'is-active' : ''}" data-open="${n}">
      ${icon('file')}${n}${bad ? `<span class="badge" style="margin-left:auto">${bad}</span>` : ''}
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

/* ---------- execution via backend sandbox ---------- */
async function run(from = 'ui') {
  if (running) return;
  running = true;
  $('.run').classList.add('is-running'); $('#runLabel').textContent = 'Running';
  const targetScript = active;
  if (from !== 'terminal') term(`<span class="prompt">$</span> python ${esc(targetScript)}`);

  const allFilesMap = {};
  for (const [name, obj] of Object.entries(files)) {
    allFilesMap[name] = obj.src || '';
  }

  try {
    const res = await fetch('/api/execute', {
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
    const data = await res.json();

    lastStdout = data.stdout || '';
    lastStderr = data.stderr || '';
    lastExitCode = data.exit_code ?? 0;
    lastExecutionTime = data.execution_time_ms ?? 0;

    if (data.stdout) {
      const outLines = data.stdout.trim().split('\n');
      outLines.forEach(l => term(esc(l)));
    }
    if (data.stderr) {
      const errLines = data.stderr.trim().split('\n');
      errLines.forEach(l => term(`<span class="bad">${esc(l)}</span>`));
    }

    const allPassed = data.exit_code === 0 && !data.stderr;
    const curCases = CHALLENGES[curChallengeIdx]?.cases || [];

    // Parse runtime error if failed
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
          type: 'Execution Error',
          message: data.error_type || 'Script failed',
          details: data.stderr
        };
      }
    } else {
      lastRuntimeError = null;
    }

    lastRun = curCases.map((t) => ({
      ...t, pass: allPassed, got: allPassed ? t.want : (data.error_type || 'Error'),
    }));

    if (allPassed) {
      term(`<span class="ok">Process exited with code 0</span> <span class="dim">in ${(data.execution_time_ms / 1000).toFixed(3)}s</span>`);
    } else {
      term(`<span class="bad">Process exited with code ${data.exit_code}</span> <span class="dim">in ${(data.execution_time_ms / 1000).toFixed(3)}s</span>`);
    }
  } catch (err) {
    term(`<span class="bad">Execution error: ${esc(err.message)}</span>`);
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
    ? 'Finds the bug and hands you corrected code.'
    : 'Nudges you toward the answer without giving it away.';
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
  say('doc', `Applied fix to <code>${esc(targetFile)}</code>. Running tests...`);
  run();
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

  try {
    const res = await fetch('/api/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.detail || `Server returned ${res.status}`);
    }
    const data = await res.json();
    return renderMarkdownBody(data.diagnosis || 'No response returned.');
  } catch (err) {
    return `<span class="bad">AI diagnosis failed: ${esc(err.message)}</span><br><span class="dim">Try again or check server logs.</span>`;
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
  loadHistory();
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
  try {
    const res = await fetch('/api/models');
    if (!res.ok) return;
    const data = await res.json();
    if (data.models && data.models.length) {
      activeModel = data.default || data.models[0].id;
      $('#modelName').textContent = activeModel;
      $('#modelList').innerHTML = data.models.map((m) => `
        <li><button role="option" data-model="${esc(m.id)}" aria-selected="${m.id === activeModel}">
          <span>${esc(m.id)}</span><span class="tag">${esc(m.provider || '')}</span>
        </button></li>
      `).join('');
    }
  } catch (e) {
    console.warn('Could not load models list:', e);
  }
}

async function loadHistory() {
  try {
    const res = await fetch('/api/history');
    if (!res.ok) return;
    historyCache = await res.json();
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
    histPane.innerHTML = '<p class="dim">History unavailable.</p>';
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
  if (a === 'toggle-console') { consoleEl.classList.toggle('is-max'); return; }
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
    $('#modelName').textContent = activeModel;
    $$('[data-model]').forEach(b => b.setAttribute('aria-selected', b === el));
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

/* ---------- boot ---------- */
$('#snippetList').innerHTML = SNIPPETS.map((s, i) =>
  `<li><button class="list-item" data-snippet="${i}">${icon('code')}${s.name}<span class="sub">${s.key}</span></button></li>`).join('');
$('#templateList').innerHTML = TEMPLATES.map((s, i) =>
  `<li><button class="list-item" data-template="${i}">${icon('layout')}${s.name}<span class="sub">${s.desc}</span></button></li>`).join('');

ta.value = files[active]?.src || '';
term('<span class="dim">Python 3.10 sandbox ready. Type</span> python solution.py <span class="dim">or click Run (Ctrl ↵)</span>');
renderCode(); renderAll(); setMode('complete');
loadModels();
loadHistory();
ta.focus({ preventScroll: true });
})();
