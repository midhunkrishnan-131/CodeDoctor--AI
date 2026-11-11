import test from 'node:test';
import assert from 'node:assert/strict';
import { getSystemPrompt, buildUserPrompt, COMPLETE_ANSWER_PROMPT, LOGIC_SUGGESTION_PROMPT } from './promptBuilder';
import { analyzeCodeHealth } from './codeHealth';
import { parseAiDiagnosis, extractPythonCode } from './markdownParser';

test('Mode A system prompt enforces complete corrected code and test cases', () => {
  const prompt = getSystemPrompt('complete_answer');
  assert.equal(prompt, COMPLETE_ANSWER_PROMPT);
  assert.ok(prompt.includes('CORRECTED COMPLETE CODE'));
  assert.ok(prompt.includes('SUGGESTED TEST CASES'));
  assert.ok(prompt.includes('COMPLETE ANSWER MODE'));
});

test('Mode B system prompt enforces STRICT negative constraints (no full solution)', () => {
  const prompt = getSystemPrompt('logic_suggestion');
  assert.equal(prompt, LOGIC_SUGGESTION_PROMPT);
  assert.ok(prompt.includes('NEVER PROVIDE THE COMPLETE CORRECTED CODE'));
  assert.ok(prompt.includes('NEVER REVEAL THE ENTIRE FINAL IMPLEMENTATION') || prompt.includes('NEVER WRITE OUT THE ENTIRE FINAL IMPLEMENTATION'));
  assert.ok(prompt.includes('LOGIC SUGGESTION MODE'));
  assert.ok(prompt.includes('Complete Answer Mode'));
});

test('buildUserPrompt aggregates problem, code and execution metrics', () => {
  const prompt = buildUserPrompt({
    problemDescription: 'Find maximum element',
    sourceCode: 'def find_max(arr): return max(arr)',
    stdout: 'Result: 99',
    stderr: '',
    exitCode: 0,
    executionTimeMs: 12.5
  });

  assert.ok(prompt.includes('Find maximum element'));
  assert.ok(prompt.includes('def find_max(arr)'));
  assert.ok(prompt.includes('Result: 99'));
  assert.ok(prompt.includes('Exit Code: 0'));
  assert.ok(prompt.includes('12.5 ms'));
});

test('analyzeCodeHealth accurately categorizes ZeroDivisionError', () => {
  const health = analyzeCodeHealth({
    code: 'x = 10 / 0',
    hasRun: true,
    exitCode: 1,
    stdout: '',
    stderr: 'Traceback (most recent call last):\n  File "solution.py", line 1, in <module>\n    x = 10 / 0\nZeroDivisionError: division by zero',
    syntaxValid: true
  });

  assert.equal(health.executionStatus, 'runtime_error');
  assert.ok(health.detectedErrors.some(e => e.includes('ZeroDivisionError')));
  assert.equal(health.badgeColor, 'rose');
});

test('analyzeCodeHealth handles syntax error and timeout', () => {
  const syntaxFail = analyzeCodeHealth({
    code: 'def bad_func(',
    hasRun: true,
    exitCode: 1,
    syntaxValid: false,
    syntaxError: { line: 1, message: 'unexpected EOF while parsing' }
  });
  assert.equal(syntaxFail.syntaxStatus, 'invalid');
  assert.equal(syntaxFail.executionStatus, 'syntax_error');

  const timeoutFail = analyzeCodeHealth({
    code: 'while True: pass',
    hasRun: true,
    timedOut: true,
    exitCode: -1
  });
  assert.equal(timeoutFail.executionStatus, 'timeout');
  assert.equal(timeoutFail.badgeColor, 'amber');
});

test('extractPythonCode extracts fenced python snippet correctly', () => {
  const md = `Here is the corrected code:
\`\`\`python
def add(a, b):
    return a + b
\`\`\`
Hope this helps!`;

  const code = extractPythonCode(md);
  assert.equal(code, 'def add(a, b):\n    return a + b');
});

test('parseAiDiagnosis suppresses extracted code in logic suggestion mode', () => {
  const md = `### Step 1
Consider how the pointer moves.
\`\`\`python
# sample snippet
\`\`\``;

  const res = parseAiDiagnosis(md, 'logic_suggestion');
  assert.equal(res.isLogicMode, true);
  assert.equal(res.hasCorrectedCode, false);
  assert.equal(res.extractedCode, undefined);
});
