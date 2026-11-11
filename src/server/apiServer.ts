/**
 * CodeDoctor AI - Server-side API Handler
 * Connects frontend requests directly to Python execution sandbox, SQLite, and Groq/Gemini AI.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { getSystemPrompt, buildUserPrompt, DiagnosisMode } from '../utils/promptBuilder';
import { parseAiDiagnosis } from '../utils/markdownParser';

// Resolve project root
const getProjectRoot = () => {
  return process.cwd();
};

export interface ExecuteResult {
  stdout: string;
  stderr: string;
  execution_status: 'success' | 'error' | 'timeout';
  exit_code: number;
  execution_time_ms: number;
  timed_out: boolean;
  error_type?: string | null;
  syntax_valid: boolean;
  syntax_error?: any;
}

export async function runPythonCode(
  sourceCode: string,
  timeoutSec: number = 5.0,
  stdinInput: string = ''
): Promise<ExecuteResult> {
  const runnerPath = path.join(getProjectRoot(), 'backend', 'execution', 'runner.py');

  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdoutBuffer = '';
    let stderrBuffer = '';

    const pyProc = spawn('python3', [runnerPath], {
      cwd: getProjectRoot(),
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    pyProc.stdout.on('data', (data) => {
      stdoutBuffer += data.toString();
    });

    pyProc.stderr.on('data', (data) => {
      stderrBuffer += data.toString();
    });

    pyProc.on('error', (err) => {
      resolve({
        stdout: '',
        stderr: `Failed to spawn Python runner: ${err.message}`,
        execution_status: 'error',
        exit_code: -1,
        execution_time_ms: Date.now() - startTime,
        timed_out: false,
        error_type: 'RunnerError',
        syntax_valid: false,
        syntax_error: null
      });
    });

    pyProc.on('close', (code) => {
      try {
        const parsed = JSON.parse(stdoutBuffer.trim());
        resolve({
          stdout: parsed.stdout || '',
          stderr: parsed.stderr || '',
          execution_status: parsed.success ? 'success' : (parsed.timed_out ? 'timeout' : 'error'),
          exit_code: parsed.exit_code ?? code ?? 0,
          execution_time_ms: parsed.execution_time_ms || (Date.now() - startTime),
          timed_out: Boolean(parsed.timed_out),
          error_type: parsed.error_type || null,
          syntax_valid: Boolean(parsed.syntax_valid),
          syntax_error: parsed.syntax_error || null
        });
      } catch (e) {
        resolve({
          stdout: stdoutBuffer,
          stderr: stderrBuffer || (e instanceof Error ? e.message : 'Unknown error'),
          execution_status: code === 0 ? 'success' : 'error',
          exit_code: code ?? -1,
          execution_time_ms: Date.now() - startTime,
          timed_out: false,
          syntax_valid: false,
          syntax_error: null
        });
      }
    });

    // Write input payload to stdin
    const payload = JSON.stringify({
      code: sourceCode,
      timeout: timeoutSec,
      stdin: stdinInput
    });
    pyProc.stdin.write(payload);
    pyProc.stdin.end();
  });
}

// Database helper functions using Python SQLite CLI bridge
export async function getDbHistory(): Promise<any[]> {
  const dbScript = path.join(getProjectRoot(), 'backend', 'database', 'db.py');
  return new Promise((resolve) => {
    const py = spawn('python3', [dbScript, 'list'], { cwd: getProjectRoot() });
    let out = '';
    py.stdout.on('data', (d) => { out += d.toString(); });
    py.on('close', () => {
      try {
        resolve(JSON.parse(out));
      } catch {
        resolve([]);
      }
    });
  });
}

export async function deleteDbRecord(id: string): Promise<boolean> {
  const dbScript = path.join(getProjectRoot(), 'backend', 'database', 'db.py');
  return new Promise((resolve) => {
    const py = spawn('python3', [dbScript, 'delete', id], { cwd: getProjectRoot() });
    let out = '';
    py.stdout.on('data', (d) => { out += d.toString(); });
    py.on('close', () => {
      try {
        const res = JSON.parse(out);
        resolve(Boolean(res.deleted));
      } catch {
        resolve(false);
      }
    });
  });
}

export async function saveDiagnosisToDb(record: {
  problemDescription: string;
  sourceCode: string;
  mode: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  aiDiagnosis: string;
  model: string;
  provider: string;
}): Promise<string> {
  const dbScript = path.join(getProjectRoot(), 'backend', 'database', 'db.py');
  const pyCode = `
import sys, json
from backend.database.db import save_record
payload = json.loads(sys.stdin.read())
rec = save_record(
    problem_description=payload['problemDescription'],
    source_code=payload['sourceCode'],
    diagnosis_mode=payload['mode'],
    stdout=payload['stdout'],
    stderr=payload['stderr'],
    exit_code=payload['exitCode'],
    execution_time_ms=payload['executionTimeMs'],
    ai_diagnosis=payload['aiDiagnosis'],
    model_name=payload['model'],
    provider=payload['provider']
)
print(json.dumps(rec))
`;

  return new Promise((resolve) => {
    const py = spawn('python3', ['-c', pyCode], { cwd: getProjectRoot() });
    let out = '';
    py.stdout.on('data', (d) => { out += d.toString(); });
    py.on('close', () => {
      try {
        const res = JSON.parse(out);
        resolve(res.id || '');
      } catch {
        resolve('');
      }
    });
    py.stdin.write(JSON.stringify(record));
    py.stdin.end();
  });
}

// AI Diagnosis Runner with Groq API and Gemini fallback
export async function runDiagnosis(params: {
  problemDescription: string;
  sourceCode: string;
  executionOutput?: string;
  errorMessages?: string;
  selectedAiMode: DiagnosisMode;
  apiKey?: string;
  model?: string;
  exitCode?: number;
  executionTimeMs?: number;
}): Promise<{
  diagnosis: string;
  mode: DiagnosisMode;
  model: string;
  provider: string;
  extractedCode?: string;
  historyId?: string;
  sections?: any[];
}> {
  const systemPrompt = getSystemPrompt(params.selectedAiMode);
  const userPrompt = buildUserPrompt({
    problemDescription: params.problemDescription,
    sourceCode: params.sourceCode,
    stdout: params.executionOutput,
    stderr: params.errorMessages,
    exitCode: params.exitCode,
    executionTimeMs: params.executionTimeMs
  });

  const groqKey = (params.apiKey || process.env.GROQ_API_KEY || '').trim();
  const selectedModel = params.model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  let rawContent = '';
  let providerUsed = 'Groq';
  let modelUsed = selectedModel;

  if (groqKey) {
    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CodeDoctor-AI/1.0'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2500
      })
    });

    if (!response.ok) {
      let errText = '';
      try {
        const errJson = await response.json();
        errText = errJson?.error?.message || response.statusText;
      } catch {
        errText = await response.text();
      }

      if (response.status === 401) {
        throw new Error(`Invalid Groq API Key: ${errText}`);
      } else if (response.status === 429) {
        throw new Error(`Groq Rate Limit Exceeded: ${errText}`);
      } else {
        throw new Error(`Groq API Error (${response.status}): ${errText}`);
      }
    }

    const data = await response.json();
    rawContent = data.choices?.[0]?.message?.content || '';
    modelUsed = data.model || selectedModel;
    providerUsed = 'Groq';
  } else {
    // Fallback to Gemini if GROQ_API_KEY is not configured yet
    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!geminiKey) {
      throw new Error('No API key configured. Please enter your Groq API key in Settings or set GROQ_API_KEY. (You can obtain a free key at https://console.groq.com/keys)');
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`;
    const resp = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2500 }
      })
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`AI Provider Error: ${err}`);
    }

    const geminiData = await resp.json();
    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    rawContent = parts.map((p: any) => p.text || '').join('');
    modelUsed = 'gemini-3.8-flash';
    providerUsed = 'Gemini (AI Studio Built-in)';
  }

  // Parse structured sections and extracted code
  const parsed = parseAiDiagnosis(rawContent, params.selectedAiMode);

  // Persist to database
  const historyId = await saveDiagnosisToDb({
    problemDescription: params.problemDescription,
    sourceCode: params.sourceCode,
    mode: params.selectedAiMode,
    stdout: params.executionOutput || '',
    stderr: params.errorMessages || '',
    exitCode: params.exitCode || 0,
    executionTimeMs: params.executionTimeMs || 0,
    aiDiagnosis: rawContent,
    model: modelUsed,
    provider: providerUsed
  });

  return {
    diagnosis: rawContent,
    mode: params.selectedAiMode,
    model: modelUsed,
    provider: providerUsed,
    extractedCode: parsed.extractedCode,
    historyId,
    sections: parsed.sections
  };
}
