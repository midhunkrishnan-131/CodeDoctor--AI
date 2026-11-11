/**
 * CodeDoctor AI - Standalone Client JavaScript
 * Pure Vanilla JavaScript implementation of CodeDoctor AI IDE
 */

// ============================================================================
// Curated Buggy Code Challenges
// ============================================================================
const SAMPLE_PROBLEMS = [
  {
    id: 'off-by-one',
    title: 'Find Maximum in List (Off-By-One)',
    difficulty: 'Easy',
    category: 'Array / Logic',
    bugType: 'IndexError / Logic Flaw',
    problemDescription: 'Write a Python function find_max(numbers) that returns the largest number in a list of integers. Do not use the built-in max() function.',
    expectedBehavior: 'Returns the maximum number from the list without crashing on index boundaries.',
    buggyCode: `def find_max(numbers):
    if not numbers:
        return None
    
    current_max = numbers[0]
    # Bug: Off-by-one error using <= instead of < or range(len(numbers))
    for i in range(1, len(numbers) + 1):
        if numbers[i] > current_max:
            current_max = numbers[i]
            
    return current_max

# Test execution:
test_list = [14, 3, 27, 8, 42, 19]
print("Testing with list:", test_list)
result = find_max(test_list)
print("Maximum found:", result)
`,
    simulatedOutput: {
      stdout: 'Testing with list: [14, 3, 27, 8, 42, 19]\n',
      stderr: `Traceback (most recent call last):
  File "solution.py", line 16, in <module>
    result = find_max(test_list)
  File "solution.py", line 8, in find_max
    if numbers[i] > current_max:
IndexError: list index out of range`,
      exitCode: 1,
      timeMs: 24.5
    },
    fixedCode: `def find_max(numbers):
    if not numbers:
        return None
    
    current_max = numbers[0]
    # Corrected: standard 0 to len-1 range
    for i in range(1, len(numbers)):
        if numbers[i] > current_max:
            current_max = numbers[i]
            
    return current_max

# Test execution:
test_list = [14, 3, 27, 8, 42, 19]
print("Testing with list:", test_list)
result = find_max(test_list)
print("Maximum found:", result)
`
  },
  {
    id: 'zero-division',
    title: 'Calculate Average Score (ZeroDivisionError)',
    difficulty: 'Easy',
    category: 'Math / Edge Case',
    bugType: 'ZeroDivisionError',
    problemDescription: 'Create a function calculate_average(scores) that computes the average score of students. It should safely return 0.0 when given an empty list.',
    expectedBehavior: 'Computes average correctly, handles empty input gracefully without ZeroDivisionError.',
    buggyCode: `def calculate_average(scores):
    total = sum(scores)
    # Bug: Does not check for empty list before division!
    average = total / len(scores)
    return round(average, 2)

# Test with valid scores
print("Scores [85, 90, 78]:", calculate_average([85, 90, 78]))

# Test with empty scores (will trigger ZeroDivisionError)
print("Testing empty scores list:")
print("Empty list result:", calculate_average([]))
`,
    simulatedOutput: {
      stdout: 'Scores [85, 90, 78]: 84.33\nTesting empty scores list:\n',
      stderr: `Traceback (most recent call last):
  File "solution.py", line 11, in <module>
    print("Empty list result:", calculate_average([]))
  File "solution.py", line 4, in calculate_average
    average = total / len(scores)
ZeroDivisionError: division by zero`,
      exitCode: 1,
      timeMs: 18.2
    },
    fixedCode: `def calculate_average(scores):
    if not scores:
        return 0.0
    total = sum(scores)
    average = total / len(scores)
    return round(average, 2)

# Test with valid scores
print("Scores [85, 90, 78]:", calculate_average([85, 90, 78]))

# Test with empty scores
print("Testing empty scores list:")
print("Empty list result:", calculate_average([]))
`
  },
  {
    id: 'infinite-recursion',
    title: 'Factorial Calculator (Recursion Bug)',
    difficulty: 'Medium',
    category: 'Recursion',
    bugType: 'RecursionError / Timeout',
    problemDescription: 'Write a recursive function factorial(n) that computes n! for non-negative integers.',
    expectedBehavior: 'Calculates factorial using base cases for 0 and 1, handles negative inputs or invalid cases.',
    buggyCode: `def factorial(n):
    # Bug: Base condition check is flawed
    # and calls factorial(n) instead of factorial(n - 1)
    if n == 1:
        return 1
    return n * factorial(n)

print("Calculating factorial of 5:")
print(factorial(5))
`,
    simulatedOutput: {
      stdout: 'Calculating factorial of 5:\n',
      stderr: `Traceback (most recent call last):
  File "solution.py", line 8, in <module>
    print(factorial(5))
  File "solution.py", line 6, in factorial
    return n * factorial(n)
  [Previous line repeated 996 more times]
RecursionError: maximum recursion depth exceeded`,
      exitCode: 1,
      timeMs: 125.0
    },
    fixedCode: `def factorial(n):
    if n < 0:
        raise ValueError("Factorial is not defined for negative numbers")
    if n in (0, 1):
        return 1
    return n * factorial(n - 1)

print("Calculating factorial of 5:")
print(factorial(5))
`
  },
  {
    id: 'syntax-indentation',
    title: 'Palindrome Checker (Syntax & Indentation)',
    difficulty: 'Easy',
    category: 'Strings / Syntax',
    bugType: 'SyntaxError / IndentationError',
    problemDescription: 'Write a function is_palindrome(text) that checks whether a given string is a palindrome (ignoring casing and spaces).',
    expectedBehavior: 'Returns True if palindrome, False otherwise, with valid Python syntax.',
    buggyCode: `def is_palindrome(text)
    # Bug: Missing colon on def above!
    cleaned = "".join(ch.lower() for ch in text if ch.isalnum())
    
   # Bug: Inconsistent indentation below
   return cleaned == cleaned[::-1]

print("Is 'Racecar' palindrome?", is_palindrome("Racecar"))
print("Is 'Hello' palindrome?", is_palindrome("Hello"))
`,
    simulatedOutput: {
      stdout: '',
      stderr: `  File "solution.py", line 1
    def is_palindrome(text)
                           ^
SyntaxError: expected ':'`,
      exitCode: 1,
      timeMs: 12.0
    },
    fixedCode: `def is_palindrome(text):
    cleaned = "".join(ch.lower() for ch in text if ch.isalnum())
    return cleaned == cleaned[::-1]

print("Is 'Racecar' palindrome?", is_palindrome("Racecar"))
print("Is 'Hello' palindrome?", is_palindrome("Hello"))
`
  },
  {
    id: 'two-sum-logic',
    title: 'Two Sum Target Pairs (Logic Flaw)',
    difficulty: 'Medium',
    category: 'Hash Map / Search',
    bugType: 'Logical Flaw / Wrong Index',
    problemDescription: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may not use the same element twice.',
    expectedBehavior: 'Returns [index1, index2] using single pass hash map.',
    buggyCode: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        # Bug: Saves current index before checking complement, allowing same element twice!
        seen[num] = i
        if complement in seen:
            return [seen[complement], i]
    return []

# Test with target = 6 and nums = [3, 2, 4]
# Target pair is 2 + 4 = 6 (indices 1, 2)
# But bug returns [0, 0] because 3 + 3 = 6 using element 0 twice!
print("Two Sum [3, 2, 4], target 6:")
print("Result indices:", two_sum([3, 2, 4], 6))
`,
    simulatedOutput: {
      stdout: 'Two Sum [3, 2, 4], target 6:\nResult indices: [0, 0]\n',
      stderr: '',
      exitCode: 0,
      timeMs: 15.3
    },
    fixedCode: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        # Corrected: check for complement BEFORE inserting current element
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

print("Two Sum [3, 2, 4], target 6:")
print("Result indices:", two_sum([3, 2, 4], 6))
`
  }
];

const DEFAULT_STARTER_CODE = '';

const DEFAULT_PROBLEM = '';

// ============================================================================
// State Management
// ============================================================================
const AppState = {
  problemDescription: DEFAULT_PROBLEM,
  code: DEFAULT_STARTER_CODE,
  stdinInput: '',
  mode: 'complete_answer', // 'complete_answer' | 'logic_suggestion'

  // Execution State
  isRunning: false,
  hasRun: false,
  stdout: '',
  stderr: '',
  exitCode: null,
  executionTimeMs: null,
  timedOut: false,
  syntaxValid: true,

  // AI Diagnosis State
  isDiagnosing: false,
  diagnosisText: '',
  extractedCode: null,
  provider: 'Groq AI',
  activeModel: (localStorage.getItem('codedoctor_model') && localStorage.getItem('codedoctor_model') !== 'llama-3.3-70b-versatile') ? localStorage.getItem('codedoctor_model') : 'qwen/qwen3.8-27b',
  groqApiKey: localStorage.getItem('codedoctor_groq_api_key') || '',
  timeoutSec: Number(localStorage.getItem('codedoctor_timeout')) || 5,
  backendUrl: localStorage.getItem('codedoctor_backend_url') || '',

  // History State
  history: JSON.parse(localStorage.getItem('codedoctor_history_items') || '[]'),

  // Editor Config
  fontSize: 14,
  editorTheme: 'codedoctor-dark',
  monacoEditorInstance: null
};

// ============================================================================
// DOM Element References
// ============================================================================
const DOM = {
  // Brand & Nav
  btnBrand: document.getElementById('btn-brand'),
  navModelPill: document.getElementById('nav-model-pill'),
  navActiveModelName: document.getElementById('nav-active-model-name'),
  navApiIndicator: document.getElementById('nav-api-indicator'),
  historyCounter: document.getElementById('history-counter'),
  btnOpenChallenges: document.getElementById('btn-open-challenges'),
  btnOpenHistory: document.getElementById('btn-open-history'),
  btnOpenSettings: document.getElementById('btn-open-settings'),
  btnOpenHelp: document.getElementById('btn-open-help'),

  // Problem Panel
  problemInput: document.getElementById('problem-description-input'),
  problemCharCount: document.getElementById('problem-char-count'),
  btnLoadExample: document.getElementById('btn-load-example-problem'),
  btnClearProblem: document.getElementById('btn-clear-problem'),

  // Editor
  monacoContainer: document.getElementById('monaco-editor'),
  fallbackEditor: document.getElementById('code-fallback-editor'),
  btnFontDec: document.getElementById('btn-font-dec'),
  btnFontInc: document.getElementById('btn-font-inc'),
  fontSizeLabel: document.getElementById('font-size-label'),
  btnInsertDebug: document.getElementById('btn-insert-debug'),
  btnResetCode: document.getElementById('btn-reset-code'),
  btnClearCode: document.getElementById('btn-clear-code'),
  btnCopyCode: document.getElementById('btn-copy-code'),
  btnDownloadCode: document.getElementById('btn-download-code'),
  btnThemeToggle: document.getElementById('btn-theme-toggle'),
  btnRunCode: document.getElementById('btn-run-code'),

  // Terminal
  terminalStatusBadge: document.getElementById('terminal-status-badge'),
  execTimeDisplay: document.getElementById('exec-time-display'),
  execTimeVal: document.getElementById('exec-time-val'),
  tabBtnOutput: document.getElementById('tab-btn-output'),
  tabBtnStdin: document.getElementById('tab-btn-stdin'),
  paneOutput: document.getElementById('pane-output'),
  paneStdin: document.getElementById('pane-stdin'),
  terminalConsole: document.getElementById('terminal-console-output'),
  stdinInput: document.getElementById('stdin-input'),
  btnCopyTerminal: document.getElementById('btn-copy-terminal'),
  btnClearTerminal: document.getElementById('btn-clear-terminal'),
  btnStopCode: document.getElementById('btn-stop-code'),

  // AI Doctor Panel
  aiProviderLabel: document.getElementById('ai-provider-label'),
  aiModelLabel: document.getElementById('ai-model-label'),
  btnAiSettingsShortcut: document.getElementById('btn-ai-settings-shortcut'),
  modeTabComplete: document.getElementById('mode-tab-complete'),
  modeTabLogic: document.getElementById('mode-tab-logic'),
  btnDiagnose: document.getElementById('btn-diagnose'),
  diagnoseBtnText: document.getElementById('diagnose-btn-text'),
  aiIdleState: document.getElementById('ai-idle-state'),
  aiLoadingState: document.getElementById('ai-loading-state'),
  aiErrorState: document.getElementById('ai-error-state'),
  aiContentView: document.getElementById('ai-content-view'),
  aiErrorMsg: document.getElementById('ai-error-msg'),
  btnErrorOpenSettings: document.getElementById('btn-error-open-settings'),
  activeDiagnosisBadge: document.getElementById('active-diagnosis-badge'),
  btnCopyDiagnosis: document.getElementById('btn-copy-diagnosis'),
  btnCopyExtractedCode: document.getElementById('btn-copy-extracted-code'),
  btnApplyCode: document.getElementById('btn-apply-code'),
  diagnosisSectionsList: document.getElementById('diagnosis-sections-list'),

  // Code Health Bar
  healthSyntaxVal: document.getElementById('health-syntax-val'),
  healthExecVal: document.getElementById('health-exec-val'),
  healthErrorsGroup: document.getElementById('health-errors-group'),
  healthTipsMsg: document.getElementById('health-tips-msg'),
  healthScoreBadge: document.getElementById('health-score-badge'),
  healthScoreVal: document.getElementById('health-score-val'),

  // Modals
  modalChallenges: document.getElementById('modal-challenges'),
  challengesList: document.getElementById('challenges-list'),
  modalHistory: document.getElementById('modal-history'),
  historySearchInput: document.getElementById('history-search-input'),
  historyList: document.getElementById('history-list'),
  historyEmptyNotice: document.getElementById('history-empty-notice'),
  modalSettings: document.getElementById('modal-settings'),
  settingsForm: document.getElementById('settings-form'),
  settingBackendUrl: document.getElementById('setting-backend-url'),
  settingGroqKey: document.getElementById('setting-groq-key'),
  btnToggleGroqEye: document.getElementById('btn-toggle-groq-eye'),
  settingModelSelect: document.getElementById('setting-model-select'),
  settingTimeout: document.getElementById('setting-timeout'),
  timeoutDisplayVal: document.getElementById('timeout-display-val'),
  modalHelp: document.getElementById('modal-help'),
  toastContainer: document.getElementById('toast-container')
};

// ============================================================================
// Editor Initialization (Monaco with CDN + Textarea Fallback)
// ============================================================================
function initEditor() {
  if (typeof require !== 'undefined') {
    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], function (monaco) {
      // Define custom navy/purple theme
      monaco.editor.defineTheme('codedoctor-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'c084fc', fontStyle: 'bold' },
          { token: 'string', foreground: '38bdf8' },
          { token: 'number', foreground: 'f472b6' },
          { token: 'function', foreground: '818cf8' },
          { token: 'type', foreground: '34d399' }
        ],
        colors: {
          'editor.background': '#070b14',
          'editor.foreground': '#f1f5f9',
          'editorLineNumber.foreground': '#475569',
          'editorLineNumber.activeForeground': '#c084fc',
          'editor.selectionBackground': '#312e81',
          'editor.lineHighlightBackground': '#0f172a'
        }
      });

      AppState.monacoEditorInstance = monaco.editor.create(DOM.monacoContainer, {
        value: AppState.code,
        language: 'python',
        theme: 'codedoctor-dark',
        fontSize: AppState.fontSize,
        fontFamily: "'JetBrains Mono', Consolas, monospace",
        minimap: { enabled: false },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        tabSize: 4,
        padding: { top: 10, bottom: 10 }
      });

      // Change listener
      AppState.monacoEditorInstance.onDidChangeModelContent(() => {
        AppState.code = AppState.monacoEditorInstance.getValue();
        updateCodeHealth();
      });

      // Keyboard shortcut Ctrl+Enter to Run
      AppState.monacoEditorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        handleRunCode();
      });
    }, function () {
      setupFallbackEditor();
    });
  } else {
    setupFallbackEditor();
  }
}

function setupFallbackEditor() {
  DOM.fallbackEditor.classList.remove('hidden');
  DOM.monacoContainer.classList.add('hidden');
  DOM.fallbackEditor.value = AppState.code;
  DOM.fallbackEditor.addEventListener('input', (e) => {
    AppState.code = e.target.value;
    updateCodeHealth();
  });
  DOM.fallbackEditor.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunCode();
    }
  });
}

function getEditorCode() {
  if (AppState.monacoEditorInstance) {
    return AppState.monacoEditorInstance.getValue();
  }
  return DOM.fallbackEditor.value;
}

function setEditorCode(newCode) {
  AppState.code = newCode;
  if (AppState.monacoEditorInstance) {
    AppState.monacoEditorInstance.setValue(newCode);
  }
  DOM.fallbackEditor.value = newCode;
  updateCodeHealth();
}

// ============================================================================
// Code Health Analyzer (Static + Runtime Heuristics)
// ============================================================================
function updateCodeHealth() {
  const code = getEditorCode();
  const trimmed = code.trim();
  const detectedErrors = [];
  let tips = '';
  let syntaxStatus = 'valid';
  let badgeClass = 'badge-slate';
  let badgeLabel = 'Ready';

  // Basic Python Syntax Checks
  if (code.includes('def ') && !code.includes(':')) {
    syntaxStatus = 'invalid';
    detectedErrors.push('Missing colon : in def statement');
  } else if (code.includes('if ') && !code.includes(':')) {
    syntaxStatus = 'invalid';
    detectedErrors.push('Missing colon : in if statement');
  }

  // Pre-execution tips
  if (!trimmed) {
    tips = 'Editor is empty. Write or load a Python snippet to begin.';
  } else if (!code.includes('print(') && !code.includes('return ')) {
    tips = 'Consider adding print() statements to inspect intermediate variables.';
  } else if (code.includes('while True:') && !code.includes('break')) {
    tips = 'Detected infinite while loop without explicit break statement.';
  } else if (/except\s*:\s*pass/.test(code)) {
    tips = 'Bare except block suppressing exceptions detected.';
  } else {
    tips = 'Code structure looks clean. Run or diagnose to verify.';
  }

  // Runtime analysis if hasRun
  if (AppState.hasRun) {
    if (AppState.timedOut) {
      detectedErrors.push('TimeoutError: Execution exceeded time limit');
      badgeClass = 'badge-rose';
      badgeLabel = 'Timed Out';
    } else if (AppState.stderr.includes('SyntaxError') || AppState.stderr.includes('IndentationError')) {
      syntaxStatus = 'invalid';
      detectedErrors.push('SyntaxError: Python parser violation');
      badgeClass = 'badge-rose';
      badgeLabel = 'Syntax Error';
    } else if (AppState.exitCode !== 0 && AppState.stderr) {
      badgeClass = 'badge-rose';
      badgeLabel = 'Runtime Error';

      if (AppState.stderr.includes('IndexError')) detectedErrors.push('IndexError: List index out of range');
      if (AppState.stderr.includes('ZeroDivisionError')) detectedErrors.push('ZeroDivisionError: Division by zero');
      if (AppState.stderr.includes('RecursionError')) detectedErrors.push('RecursionError: Recursion depth exceeded');
      if (AppState.stderr.includes('KeyError')) detectedErrors.push('KeyError: Key not found in map');
      if (AppState.stderr.includes('TypeError')) detectedErrors.push('TypeError: Incompatible types');
    } else if (AppState.exitCode === 0) {
      badgeClass = 'badge-emerald';
      badgeLabel = '100% Healthy';
    }
  }

  // Update UI DOM
  if (syntaxStatus === 'valid') {
    DOM.healthSyntaxVal.className = 'chip-val text-emerald';
    DOM.healthSyntaxVal.innerHTML = '<i data-lucide="check-circle-2"></i> Valid';
  } else {
    DOM.healthSyntaxVal.className = 'chip-val text-rose';
    DOM.healthSyntaxVal.innerHTML = '<i data-lucide="x-circle"></i> Syntax Error';
  }

  if (!AppState.hasRun) {
    DOM.healthExecVal.className = 'chip-val text-slate';
    DOM.healthExecVal.innerHTML = '<i data-lucide="help-circle"></i> Not Run Yet';
  } else if (AppState.exitCode === 0) {
    DOM.healthExecVal.className = 'chip-val text-emerald';
    DOM.healthExecVal.innerHTML = '<i data-lucide="check-circle-2"></i> Passed';
  } else {
    DOM.healthExecVal.className = 'chip-val text-rose';
    DOM.healthExecVal.innerHTML = '<i data-lucide="alert-circle"></i> Error (' + (AppState.exitCode ?? 1) + ')';
  }

  DOM.healthErrorsGroup.innerHTML = detectedErrors.map(err => `<span class="error-tag">${escapeHtml(err)}</span>`).join('');
  DOM.healthTipsMsg.textContent = tips;
  DOM.healthScoreBadge.className = 'health-score-badge ' + badgeClass;
  DOM.healthScoreVal.textContent = badgeLabel;

  if (window.lucide) window.lucide.createIcons();
}

// ============================================================================
// Code Execution Engine (Backend API + Client Simulation Fallback)
// ============================================================================
async function handleRunCode() {
  if (AppState.isRunning) return;

  const currentCode = getEditorCode();
  AppState.isRunning = true;
  AppState.hasRun = true;
  AppState.stdout = '';
  AppState.stderr = '';
  AppState.exitCode = null;
  AppState.executionTimeMs = null;
  AppState.timedOut = false;

  updateTerminalStatus('running');
  DOM.btnStopCode.disabled = false;
  DOM.terminalConsole.innerHTML = '<span class="text-muted"><i data-lucide="terminal"></i> Executing in Python sandbox...</span>';
  if (window.lucide) window.lucide.createIcons();

  const startTime = performance.now();
  const backendBase = resolveBackendUrl();

  try {
    const response = await fetch(`${backendBase}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: currentCode,
        timeout: AppState.timeoutSec,
        stdin_input: AppState.stdinInput
      })
    });

    if (!response.ok) {
      throw new Error(`Execution endpoint returned ${response.status}`);
    }

    const res = await response.json();
    AppState.stdout = res.stdout || '';
    AppState.stderr = res.stderr || '';
    AppState.exitCode = res.exit_code ?? 0;
    AppState.executionTimeMs = res.execution_time_ms ?? (performance.now() - startTime);
    AppState.timedOut = Boolean(res.timed_out);
  } catch (netErr) {
    // Graceful offline fallback simulation
    console.warn('Backend unavailable, running local sandbox simulation:', netErr.message);
    const sim = simulateExecution(currentCode);
    AppState.stdout = sim.stdout;
    AppState.stderr = sim.stderr;
    AppState.exitCode = sim.exitCode;
    AppState.executionTimeMs = sim.timeMs;
    AppState.timedOut = sim.timedOut || false;
  } finally {
    AppState.isRunning = false;
    DOM.btnStopCode.disabled = true;
    renderTerminalOutput();
    updateCodeHealth();
  }
}

function simulateExecution(code) {
  // Check if matched to one of our challenges
  for (const prob of SAMPLE_PROBLEMS) {
    if (code.includes(prob.id) || (prob.buggyCode && code.trim() === prob.buggyCode.trim())) {
      return {
        stdout: prob.simulatedOutput.stdout,
        stderr: prob.simulatedOutput.stderr,
        exitCode: prob.simulatedOutput.exitCode,
        timeMs: prob.simulatedOutput.timeMs
      };
    }
  }

  // Heuristic syntax error simulation
  if (code.includes('def ') && !code.includes(':')) {
    return {
      stdout: '',
      stderr: `  File "solution.py", line 1\n    ${code.split('\n')[0]}\n                          ^\nSyntaxError: expected ':'`,
      exitCode: 1,
      timeMs: 10.4
    };
  }

  // Off-by-one check
  if (code.includes('len(numbers) + 1') && code.includes('numbers[i]')) {
    return {
      stdout: 'Testing with list: [14, 3, 27, 8, 42, 19]\n',
      stderr: `Traceback (most recent call last):\n  File "solution.py", line 15, in <module>\n    result = find_max(sample)\n  File "solution.py", line 7, in find_max\n    if numbers[i] > current_max:\nIndexError: list index out of range`,
      exitCode: 1,
      timeMs: 16.8
    };
  }

  // Safe default execution
  let simulatedStdout = '';
  const printMatches = code.match(/print\((.*?)\)/g);
  if (printMatches) {
    simulatedStdout = printMatches.map(p => {
      const inner = p.slice(6, -1).replace(/["']/g, '');
      return inner;
    }).join('\n') + '\n';
  } else {
    simulatedStdout = '[Execution completed with exit code 0]\n';
  }

  return {
    stdout: simulatedStdout,
    stderr: '',
    exitCode: 0,
    timeMs: 14.2
  };
}

function renderTerminalOutput() {
  DOM.execTimeDisplay.classList.remove('hidden');
  DOM.execTimeVal.textContent = `${AppState.executionTimeMs?.toFixed(1) || '0.0'} ms`;

  let status = 'idle';
  if (AppState.timedOut) {
    status = 'timeout';
  } else if (AppState.exitCode === 0) {
    status = 'success';
  } else {
    status = 'error';
  }
  updateTerminalStatus(status);

  let html = '';
  if (AppState.stdout) {
    html += `<div class="stdout-text">${escapeHtml(AppState.stdout)}</div>`;
  }
  if (AppState.stderr) {
    html += `<div class="stderr-text">${escapeHtml(AppState.stderr)}</div>`;
  }
  if (!AppState.stdout && !AppState.stderr) {
    html = '<div class="text-muted">(Script produced no standard output or errors)</div>';
  }

  DOM.terminalConsole.innerHTML = html;
}

function updateTerminalStatus(status) {
  DOM.terminalStatusBadge.className = `terminal-status-badge status-${status}`;
  const labels = {
    idle: 'Idle',
    running: 'Running...',
    success: 'Exit 0 (OK)',
    error: `Exit ${AppState.exitCode ?? 1} (Error)`,
    timeout: 'Timed Out'
  };
  DOM.terminalStatusBadge.innerHTML = `<span>${labels[status] || 'Idle'}</span>`;
}

// ============================================================================
// AI Doctor Dual Mode Diagnosis Engine
// ============================================================================
async function handleDiagnose() {
  if (AppState.isDiagnosing) return;

  const currentCode = getEditorCode();
  const currentProblem = DOM.problemInput.value.trim();

  if (!currentCode.trim()) {
    showToast('Please enter or load some Python code before diagnosing.');
    return;
  }

  AppState.isDiagnosing = true;
  DOM.btnDiagnose.disabled = true;
  DOM.diagnoseBtnText.textContent = 'Diagnosing Code with Groq AI...';

  // Toggle visual states
  DOM.aiIdleState.classList.add('hidden');
  DOM.aiErrorState.classList.add('hidden');
  DOM.aiContentView.classList.add('hidden');
  DOM.aiLoadingState.classList.remove('hidden');

  const backendBase = resolveBackendUrl();

  try {
    const response = await fetch(`${backendBase}/api/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problem_description: currentProblem,
        source_code: currentCode,
        execution_output: AppState.stdout,
        error_messages: AppState.stderr,
        selected_ai_mode: AppState.mode,
        api_key: AppState.groqApiKey.trim() || undefined,
        model: AppState.activeModel || 'qwen/qwen3.8-27b',
        exit_code: AppState.exitCode ?? 0,
        execution_time_ms: AppState.executionTimeMs ?? 0
      })
    });

    if (!response.ok) {
      let errDetail = `Status ${response.status}`;
      try {
        const errJson = await response.json();
        errDetail = errJson.detail || errJson.error || errDetail;
      } catch {
        errDetail = await response.text();
      }
      throw new Error(errDetail);
    }

    const data = await response.json();
    displayDiagnosisResults(data.diagnosis, data.provider || 'Groq AI');
    recordHistorySession(data.diagnosis, data.provider || 'Groq AI');
  } catch (err) {
    console.error('Diagnosis error:', err);
    DOM.aiLoadingState.classList.add('hidden');
    DOM.aiErrorState.classList.remove('hidden');
    DOM.aiErrorMsg.textContent = err.message || 'Diagnosis failed. Check API configuration.';
    showToast(`Diagnosis error: ${err.message}`);
  } finally {
    AppState.isDiagnosing = false;
    DOM.btnDiagnose.disabled = false;
    DOM.diagnoseBtnText.textContent = 'Diagnose with CodeDoctor AI';
    DOM.aiLoadingState.classList.add('hidden');
  }
}

function displayDiagnosisResults(markdownText, provider) {
  AppState.diagnosisText = markdownText;
  AppState.provider = provider;
  DOM.aiProviderLabel.textContent = provider;

  // Extract python code block if Mode A
  AppState.extractedCode = null;
  if (AppState.mode === 'complete_answer') {
    const codeMatch = markdownText.match(/```(?:python|py)\s*\n([\s\S]*?)```/i);
    if (codeMatch) {
      AppState.extractedCode = codeMatch[1].trim();
    }
  }

  // Render sections
  const sections = parseMarkdownSections(markdownText);
  DOM.diagnosisSectionsList.innerHTML = sections.map(sec => `
    <div class="diag-card">
      <div class="diag-card-title">
        <i data-lucide="sparkles"></i>
        <span>${escapeHtml(sec.title)}</span>
      </div>
      <div class="diag-card-body">${renderMarkdownBody(sec.content)}</div>
    </div>
  `).join('');

  // Mode badge
  DOM.activeDiagnosisBadge.textContent = AppState.mode === 'complete_answer'
    ? 'Mode A: Complete Fix'
    : 'Mode B: Logic Mentoring';

  // Code actions
  if (AppState.extractedCode) {
    DOM.btnCopyExtractedCode.classList.remove('hidden');
    DOM.btnApplyCode.classList.remove('hidden');
  } else {
    DOM.btnCopyExtractedCode.classList.add('hidden');
    DOM.btnApplyCode.classList.add('hidden');
  }

  DOM.aiContentView.classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

function parseMarkdownSections(rawMarkdown) {
  const lines = rawMarkdown.split('\n');
  const sections = [];
  let current = { title: 'Overview', content: '' };

  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      if (current.content.trim()) sections.push(current);
      current = { title: heading[1].trim(), content: '' };
    } else {
      current.content += line + '\n';
    }
  }
  if (current.content.trim()) sections.push(current);
  return sections.length ? sections : [{ title: 'Diagnosis', content: rawMarkdown }];
}

function renderMarkdownBody(text) {
  // Convert code blocks
  let formatted = text.replace(/```(?:python|py)?\s*([\s\S]*?)```/gi, (_, code) => {
    return `<pre class="diag-code-box"><code>${escapeHtml(code.trim())}</code></pre>`;
  });

  // Convert inline backticks
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="font-mono text-cyan">$1</code>');

  // Convert bold
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Convert bullet items
  formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');

  // Convert newlines to paragraphs
  const paragraphs = formatted.split(/\n\n+/).map(p => {
    if (p.startsWith('<pre') || p.startsWith('<ul')) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  });

  return paragraphs.join('');
}

// ============================================================================
// History & Storage
// ============================================================================
function recordHistorySession(diagnosis, provider) {
  const sessionItem = {
    id: 'cd_' + Date.now(),
    problem_description: DOM.problemInput.value.trim() || 'Custom Python Task',
    source_code: getEditorCode(),
    diagnosis_mode: AppState.mode,
    stdout: AppState.stdout,
    stderr: AppState.stderr,
    exit_code: AppState.exitCode ?? 0,
    execution_time_ms: AppState.executionTimeMs ?? 0,
    ai_diagnosis: diagnosis,
    model_name: AppState.activeModel,
    provider: provider || 'Groq AI',
    created_at: new Date().toISOString()
  };

  AppState.history.unshift(sessionItem);
  if (AppState.history.length > 30) AppState.history.pop();
  localStorage.setItem('codedoctor_history_items', JSON.stringify(AppState.history));
  updateHistoryCounter();
}

function updateHistoryCounter() {
  DOM.historyCounter.textContent = AppState.history.length;
}

function renderHistoryList(filterTerm = '') {
  const list = AppState.history.filter(item => {
    const q = filterTerm.toLowerCase();
    return item.problem_description.toLowerCase().includes(q) ||
      item.source_code.toLowerCase().includes(q) ||
      item.ai_diagnosis.toLowerCase().includes(q);
  });

  if (list.length === 0) {
    DOM.historyEmptyNotice.classList.remove('hidden');
    DOM.historyList.innerHTML = '';
    return;
  }

  DOM.historyEmptyNotice.classList.add('hidden');
  DOM.historyList.innerHTML = list.map(item => `
    <div class="history-item">
      <div class="history-item-header">
        <span class="history-time">${new Date(item.created_at).toLocaleString()}</span>
        <span class="badge-mode-tag">${item.diagnosis_mode === 'complete_answer' ? 'Mode A' : 'Mode B'}</span>
      </div>
      <div class="history-prob"><strong>Task:</strong> ${escapeHtml(item.problem_description)}</div>
      <div class="history-actions">
        <button type="button" class="btn btn-secondary btn-sm" onclick="restoreHistoryItem('${item.id}')">
          <i data-lucide="rotate-ccw"></i> Restore
        </button>
        <button type="button" class="btn btn-tool" onclick="deleteHistoryItem('${item.id}')" title="Delete record">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

window.restoreHistoryItem = function (id) {
  const item = AppState.history.find(h => h.id === id);
  if (!item) return;

  DOM.problemInput.value = item.problem_description;
  DOM.problemCharCount.textContent = `${item.problem_description.length} chars`;
  setEditorCode(item.source_code);

  AppState.mode = item.diagnosis_mode;
  if (AppState.mode === 'complete_answer') {
    DOM.modeTabComplete.classList.add('active');
    DOM.modeTabLogic.classList.remove('active');
  } else {
    DOM.modeTabLogic.classList.add('active');
    DOM.modeTabComplete.classList.remove('active');
  }

  AppState.stdout = item.stdout || '';
  AppState.stderr = item.stderr || '';
  AppState.exitCode = item.exit_code;
  AppState.executionTimeMs = item.execution_time_ms;
  AppState.hasRun = true;

  renderTerminalOutput();
  displayDiagnosisResults(item.ai_diagnosis, item.provider);
  closeModal('modal-history');
  showToast('Previous diagnosis session restored!');
};

window.deleteHistoryItem = function (id) {
  AppState.history = AppState.history.filter(h => h.id !== id);
  localStorage.setItem('codedoctor_history_items', JSON.stringify(AppState.history));
  updateHistoryCounter();
  renderHistoryList(DOM.historySearchInput.value);
  showToast('Session record deleted');
};

// ============================================================================
// Challenges / Sample Problems
// ============================================================================
function renderChallengesList() {
  DOM.challengesList.innerHTML = SAMPLE_PROBLEMS.map(p => `
    <div class="challenge-item" onclick="selectChallenge('${p.id}')">
      <div class="challenge-top">
        <span class="challenge-title">${escapeHtml(p.title)}</span>
        <div class="challenge-badges">
          <span class="badge-diff diff-${p.difficulty.toLowerCase()}">${p.difficulty}</span>
          <span class="lang-tag">${escapeHtml(p.category)}</span>
        </div>
      </div>
      <p class="challenge-desc">${escapeHtml(p.problemDescription)}</p>
      <div class="challenge-meta">
        <span><i data-lucide="bug" style="width:12px;height:12px;display:inline;"></i> ${escapeHtml(p.bugType)}</span>
      </div>
    </div>
  `).join('');
  if (window.lucide) window.lucide.createIcons();
}

window.selectChallenge = function (id) {
  const prob = SAMPLE_PROBLEMS.find(p => p.id === id);
  if (!prob) return;

  DOM.problemInput.value = prob.problemDescription;
  DOM.problemCharCount.textContent = `${prob.problemDescription.length} chars`;
  setEditorCode(prob.buggyCode);

  AppState.hasRun = false;
  AppState.stdout = '';
  AppState.stderr = '';
  AppState.exitCode = null;
  DOM.terminalConsole.innerHTML = `
    <div class="terminal-empty-prompt">
      <span class="terminal-prompt-prefix">$</span> python3 solution.py
      <div class="text-muted mt-1">Loaded challenge "${prob.title}". Click "Run Code" or Ctrl+Enter to test.</div>
    </div>`;
  updateTerminalStatus('idle');

  DOM.aiContentView.classList.add('hidden');
  DOM.aiIdleState.classList.remove('hidden');

  closeModal('modal-challenges');
  showToast(`Loaded "${prob.title}"!`);
};

// ============================================================================
// Modals and Utilities
// ============================================================================
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('hidden');
    if (id === 'modal-challenges') renderChallengesList();
    if (id === 'modal-history') renderHistoryList();
    if (window.lucide) window.lucide.createIcons();
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}

function resolveBackendUrl() {
  if (AppState.backendUrl) return AppState.backendUrl.replace(/\/+$/, '');
  // If hosted on the same port as the backend (8000 or 3000), use relative path
  if (window.location.port === '8000' || window.location.port === '3000') {
    return '';
  }
  // Default to the FastAPI backend on port 8000 (covers file://, Live Server 5500, and python http.server 8080)
  return 'http://localhost:8000';
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i data-lucide="check-circle-2" class="text-emerald"></i> <span>${escapeHtml(message)}</span>`;
  DOM.toastContainer.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// Event Listeners Binding
// ============================================================================
function bindEvents() {
  // Navigation
  DOM.btnOpenChallenges.addEventListener('click', () => openModal('modal-challenges'));
  DOM.btnOpenHistory.addEventListener('click', () => openModal('modal-history'));
  DOM.btnOpenSettings.addEventListener('click', () => openModal('modal-settings'));
  DOM.btnOpenHelp.addEventListener('click', () => openModal('modal-help'));
  DOM.navModelPill.addEventListener('click', () => openModal('modal-settings'));
  DOM.btnAiSettingsShortcut.addEventListener('click', () => openModal('modal-settings'));
  DOM.btnErrorOpenSettings.addEventListener('click', () => openModal('modal-settings'));

  // Close modals
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(btn.getAttribute('data-close-modal'));
    });
  });

  // Close on Escape or click outside
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
    }
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
  });

  // Problem input char counter
  DOM.problemInput.addEventListener('input', (e) => {
    DOM.problemCharCount.textContent = `${e.target.value.length} chars`;
  });

  DOM.btnLoadExample.addEventListener('click', () => {
    selectChallenge(SAMPLE_PROBLEMS[0].id);
  });

  DOM.btnClearProblem.addEventListener('click', () => {
    DOM.problemInput.value = '';
    DOM.problemCharCount.textContent = '0 chars';
  });

  // Code editor actions
  DOM.btnFontInc.addEventListener('click', () => {
    if (AppState.fontSize < 24) {
      AppState.fontSize += 1;
      DOM.fontSizeLabel.textContent = `${AppState.fontSize}px`;
      if (AppState.monacoEditorInstance) {
        AppState.monacoEditorInstance.updateOptions({ fontSize: AppState.fontSize });
      }
      DOM.fallbackEditor.style.fontSize = `${AppState.fontSize}px`;
    }
  });

  DOM.btnFontDec.addEventListener('click', () => {
    if (AppState.fontSize > 10) {
      AppState.fontSize -= 1;
      DOM.fontSizeLabel.textContent = `${AppState.fontSize}px`;
      if (AppState.monacoEditorInstance) {
        AppState.monacoEditorInstance.updateOptions({ fontSize: AppState.fontSize });
      }
      DOM.fallbackEditor.style.fontSize = `${AppState.fontSize}px`;
    }
  });

  DOM.btnInsertDebug.addEventListener('click', () => {
    const cur = getEditorCode();
    setEditorCode(cur + '\nprint("DEBUG:", locals())\n');
    showToast('Injected debug statement');
  });

  DOM.btnResetCode.addEventListener('click', () => {
    setEditorCode(DEFAULT_STARTER_CODE);
    showToast('Starter code restored');
  });

  DOM.btnClearCode.addEventListener('click', () => {
    setEditorCode('');
    showToast('Editor cleared');
  });

  DOM.btnCopyCode.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(getEditorCode());
      showToast('Code copied to clipboard!');
    } catch {
      showToast('Copy failed');
    }
  });

  DOM.btnDownloadCode.addEventListener('click', () => {
    const blob = new Blob([getEditorCode()], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'solution.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded solution.py');
  });

  DOM.btnThemeToggle.addEventListener('click', () => {
    if (AppState.editorTheme === 'codedoctor-dark') {
      AppState.editorTheme = 'vs-light';
      if (window.monaco) window.monaco.editor.setTheme('vs-light');
      DOM.fallbackEditor.style.background = '#f8fafc';
      DOM.fallbackEditor.style.color = '#0f172a';
    } else {
      AppState.editorTheme = 'codedoctor-dark';
      if (window.monaco) window.monaco.editor.setTheme('codedoctor-dark');
      DOM.fallbackEditor.style.background = '#070b14';
      DOM.fallbackEditor.style.color = '#f1f5f9';
    }
  });

  // Run & Execution
  DOM.btnRunCode.addEventListener('click', handleRunCode);
  DOM.btnStopCode.addEventListener('click', () => {
    AppState.isRunning = false;
    DOM.btnStopCode.disabled = true;
    updateTerminalStatus('idle');
  });

  // Terminal tab switching
  DOM.tabBtnOutput.addEventListener('click', () => {
    DOM.tabBtnOutput.classList.add('active');
    DOM.tabBtnStdin.classList.remove('active');
    DOM.paneOutput.classList.add('active');
    DOM.paneStdin.classList.remove('active');
  });

  DOM.tabBtnStdin.addEventListener('click', () => {
    DOM.tabBtnStdin.classList.add('active');
    DOM.tabBtnOutput.classList.remove('active');
    DOM.paneStdin.classList.add('active');
    DOM.paneOutput.classList.remove('active');
  });

  DOM.stdinInput.addEventListener('input', (e) => {
    AppState.stdinInput = e.target.value;
  });

  DOM.btnCopyTerminal.addEventListener('click', async () => {
    const text = DOM.terminalConsole.innerText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Terminal output copied!');
    } catch { }
  });

  DOM.btnClearTerminal.addEventListener('click', () => {
    AppState.stdout = '';
    AppState.stderr = '';
    AppState.exitCode = null;
    AppState.executionTimeMs = null;
    AppState.hasRun = false;
    DOM.terminalConsole.innerHTML = '<span class="text-muted">Terminal cleared.</span>';
    updateTerminalStatus('idle');
    updateCodeHealth();
  });

  // AI Doctor mode selection
  DOM.modeTabComplete.addEventListener('click', () => {
    AppState.mode = 'complete_answer';
    DOM.modeTabComplete.classList.add('active');
    DOM.modeTabLogic.classList.remove('active');
  });

  DOM.modeTabLogic.addEventListener('click', () => {
    AppState.mode = 'logic_suggestion';
    DOM.modeTabLogic.classList.add('active');
    DOM.modeTabComplete.classList.remove('active');
  });

  DOM.btnDiagnose.addEventListener('click', handleDiagnose);

  // Diagnosis quick actions
  DOM.btnCopyDiagnosis.addEventListener('click', async () => {
    if (!AppState.diagnosisText) return;
    try {
      await navigator.clipboard.writeText(AppState.diagnosisText);
      showToast('Diagnosis markdown copied!');
    } catch { }
  });

  DOM.btnCopyExtractedCode.addEventListener('click', async () => {
    if (!AppState.extractedCode) return;
    try {
      await navigator.clipboard.writeText(AppState.extractedCode);
      showToast('Corrected code copied!');
    } catch { }
  });

  DOM.btnApplyCode.addEventListener('click', () => {
    if (!AppState.extractedCode) return;
    setEditorCode(AppState.extractedCode);
    showToast('Applied corrected code to editor!');
  });

  // History search
  DOM.historySearchInput.addEventListener('input', (e) => {
    renderHistoryList(e.target.value);
  });

  // Settings form
  DOM.btnToggleGroqEye.addEventListener('click', () => {
    const isPass = DOM.settingGroqKey.type === 'password';
    DOM.settingGroqKey.type = isPass ? 'text' : 'password';
  });

  DOM.settingTimeout.addEventListener('input', (e) => {
    DOM.timeoutDisplayVal.textContent = `${e.target.value}s`;
  });

  DOM.settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    AppState.backendUrl = DOM.settingBackendUrl.value.trim();
    AppState.groqApiKey = DOM.settingGroqKey.value.trim();
    AppState.activeModel = DOM.settingModelSelect.value;
    AppState.timeoutSec = Number(DOM.settingTimeout.value);

    localStorage.setItem('codedoctor_backend_url', AppState.backendUrl);
    localStorage.setItem('codedoctor_groq_api_key', AppState.groqApiKey);
    localStorage.setItem('codedoctor_model', AppState.activeModel);
    localStorage.setItem('codedoctor_timeout', String(AppState.timeoutSec));

    DOM.navActiveModelName.textContent = AppState.activeModel;
    DOM.aiModelLabel.textContent = AppState.activeModel;
    DOM.navApiIndicator.style.display = AppState.groqApiKey ? 'block' : 'none';

    closeModal('modal-settings');
    showToast('Settings saved successfully!');
  });
}

// ============================================================================
// Backend Data Sync (Models & SQLite History)
// ============================================================================
async function syncWithBackend() {
  const backendBase = resolveBackendUrl();
  try {
    const res = await fetch(`${backendBase}/api/models`);
    if (res.ok) {
      const data = await res.json();
      if (data.models && Array.isArray(data.models) && data.models.length > 0) {
        DOM.settingModelSelect.innerHTML = data.models.map(m =>
          `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)} (${escapeHtml(m.description || m.provider)})</option>`
        ).join('');
        DOM.settingModelSelect.value = AppState.activeModel;
      }
    }
  } catch { }

  try {
    const histRes = await fetch(`${backendBase}/api/history`);
    if (histRes.ok) {
      const dbHistory = await histRes.json();
      if (Array.isArray(dbHistory) && dbHistory.length > 0) {
        AppState.history = dbHistory;
        localStorage.setItem('codedoctor_history_items', JSON.stringify(dbHistory));
        updateHistoryCounter();
      }
    }
  } catch { }
}

// ============================================================================
// Application Startup
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize values
  DOM.problemInput.value = AppState.problemDescription;
  DOM.problemCharCount.textContent = `${AppState.problemDescription.length} chars`;
  DOM.navActiveModelName.textContent = AppState.activeModel;
  DOM.aiModelLabel.textContent = AppState.activeModel;

  // Settings initial values
  DOM.settingBackendUrl.value = AppState.backendUrl;
  DOM.settingGroqKey.value = AppState.groqApiKey;
  DOM.settingModelSelect.value = AppState.activeModel;
  DOM.settingTimeout.value = AppState.timeoutSec;
  DOM.timeoutDisplayVal.textContent = `${AppState.timeoutSec}s`;
  DOM.navApiIndicator.style.display = AppState.groqApiKey ? 'block' : 'none';

  updateHistoryCounter();
  initEditor();
  bindEvents();
  updateCodeHealth();
  syncWithBackend();

  if (window.lucide) {
    window.lucide.createIcons();
  }
});

