export interface CodeHealthStatus {
  syntaxStatus: 'valid' | 'invalid' | 'unknown';
  syntaxDetails?: {
    line?: number;
    offset?: number;
    message?: string;
  };
  executionStatus: 'idle' | 'success' | 'runtime_error' | 'timeout' | 'syntax_error';
  detectedErrors: string[];
  qualityTips: string[];
  badgeColor: 'emerald' | 'amber' | 'rose' | 'slate';
  badgeLabel: string;
}

export function analyzeCodeHealth(params: {
  code: string;
  hasRun: boolean;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  timedOut?: boolean;
  syntaxValid?: boolean;
  syntaxError?: {
    line?: number;
    offset?: number;
    message?: string;
  } | null;
}): CodeHealthStatus {
  const { code, hasRun, exitCode, stdout = '', stderr = '', timedOut, syntaxValid, syntaxError } = params;

  const detectedErrors: string[] = [];
  const qualityTips: string[] = [];

  // Syntax check evaluation
  let syntaxStatus: 'valid' | 'invalid' | 'unknown' = 'unknown';
  if (syntaxValid === false || syntaxError) {
    syntaxStatus = 'invalid';
    detectedErrors.push(`SyntaxError: ${syntaxError?.message || 'Syntax violation'}${syntaxError?.line ? ` on line ${syntaxError.line}` : ''}`);
  } else if (syntaxValid === true) {
    syntaxStatus = 'valid';
  }

  // Pre-execution heuristic scans on source code
  const trimmed = code.trim();
  if (!trimmed) {
    qualityTips.push('Editor is empty. Write or load a Python snippet to begin.');
  }

  if (trimmed.includes('print(') === false && !trimmed.includes('return ')) {
    qualityTips.push('Code does not print or return any value. Consider adding print statements to inspect results.');
  }

  // Check for common bugs in code
  if (code.includes('while True:') && !code.includes('break')) {
    qualityTips.push('Detected infinite while loop without explicit break statement.');
  }

  if (code.match(/except\s*:\s*pass/)) {
    qualityTips.push('Bare except block suppressing all exceptions detected (anti-pattern).');
  }

  // Execution status
  let executionStatus: 'idle' | 'success' | 'runtime_error' | 'timeout' | 'syntax_error' = 'idle';

  if (!hasRun) {
    executionStatus = 'idle';
    return {
      syntaxStatus,
      syntaxDetails: syntaxError || undefined,
      executionStatus,
      detectedErrors,
      qualityTips,
      badgeColor: 'slate',
      badgeLabel: 'Not Run Yet'
    };
  }

  if (timedOut) {
    executionStatus = 'timeout';
    detectedErrors.push('TimeoutError: Execution exceeded time limit. Check for infinite recursion or unbounded loops.');
  } else if (syntaxStatus === 'invalid' || stderr.includes('SyntaxError') || stderr.includes('IndentationError')) {
    executionStatus = 'syntax_error';
    if (!detectedErrors.some(e => e.includes('SyntaxError') || e.includes('IndentationError'))) {
      detectedErrors.push('SyntaxError or IndentationError detected in execution trace.');
    }
  } else if (exitCode !== 0 || (stderr.trim() && !stdout.trim())) {
    executionStatus = 'runtime_error';

    // Parse error types from stderr
    if (stderr.includes('ZeroDivisionError')) {
      detectedErrors.push('ZeroDivisionError: Division by zero encountered.');
    }
    if (stderr.includes('IndexError')) {
      detectedErrors.push('IndexError: List index out of range.');
    }
    if (stderr.includes('KeyError')) {
      detectedErrors.push('KeyError: Mapping key not found in dictionary.');
    }
    if (stderr.includes('RecursionError')) {
      detectedErrors.push('RecursionError: Maximum recursion depth exceeded.');
    }
    if (stderr.includes('TypeError')) {
      detectedErrors.push('TypeError: Incompatible types or incorrect function arguments.');
    }
    if (stderr.includes('NameError')) {
      detectedErrors.push('NameError: Variable or function name is not defined.');
    }
    if (stderr.includes('AttributeError')) {
      detectedErrors.push('AttributeError: Object has no such attribute.');
    }

    if (detectedErrors.length === 0) {
      detectedErrors.push(`Process exited with non-zero status code: ${exitCode}`);
    }
  } else {
    executionStatus = 'success';
  }

  // Determine badge color and label
  let badgeColor: 'emerald' | 'amber' | 'rose' | 'slate' = 'emerald';
  let badgeLabel = 'Healthy (0 Errors)';

  if (executionStatus === 'success') {
    badgeColor = 'emerald';
    badgeLabel = 'Execution Passed';
  } else if (executionStatus === 'timeout') {
    badgeColor = 'amber';
    badgeLabel = 'Timed Out';
  } else if (executionStatus === 'syntax_error') {
    badgeColor = 'rose';
    badgeLabel = 'Syntax Error';
  } else if (executionStatus === 'runtime_error') {
    badgeColor = 'rose';
    badgeLabel = `Runtime Error (${detectedErrors.length})`;
  }

  return {
    syntaxStatus,
    syntaxDetails: syntaxError || undefined,
    executionStatus,
    detectedErrors,
    qualityTips,
    badgeColor,
    badgeLabel
  };
}
