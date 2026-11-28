/**
 * CodeDoctor AI - Production Express Server
 */
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { runPythonCode, runDiagnosis, getDbHistory, deleteDbRecord } from './src/server/apiServer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

const AVAILABLE_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', provider: 'Groq', description: 'Recommended: Deep code analysis & fixes' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', provider: 'Groq', description: 'Ultra-fast response for instant logic hints' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B 32k', provider: 'Groq', description: 'Extended 32k context for long scripts' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Gemini', description: 'AI Studio fallback engine' }
];

// API Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'CodeDoctor AI Engine',
    execution_sandbox: 'Active (Python 3.10)',
    database: 'SQLite (codedoctor.db)'
  });
});

app.get('/api/models', (req, res) => {
  res.json({
    models: AVAILABLE_MODELS,
    default: 'llama-3.3-70b-versatile',
    has_groq_env: Boolean(process.env.GROQ_API_KEY),
    has_gemini_env: Boolean(process.env.GEMINI_API_KEY)
  });
});

app.post('/api/execute', async (req, res) => {
  try {
    const { source_code, timeout, stdin_input, filename, files } = req.body || {};
    const result = await runPythonCode(
      source_code || '',
      Number(timeout) || 5.0,
      stdin_input || '',
      filename || 'solution.py',
      files && typeof files === 'object' ? files : {}
    );
    // Sandbox always returns structured JSON; 500 only for runner infra failure
    const status = result.error_type === 'RunnerError' ? 500 : 200;
    res.status(status).json(result);
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Sandbox execution failed',
      stdout: '',
      stderr: err.message || 'Sandbox execution failed',
      execution_status: 'error',
      exit_code: -1,
      execution_time_ms: 0,
      timed_out: false,
      syntax_valid: false,
    });
  }
});

app.post('/api/diagnose', async (req, res) => {
  try {
    const {
      problem_description,
      source_code,
      execution_output,
      error_messages,
      selected_ai_mode,
      api_key,
      model,
      exit_code,
      execution_time_ms
    } = req.body;

    const result = await runDiagnosis({
      problemDescription: problem_description || '',
      sourceCode: source_code || '',
      executionOutput: execution_output || '',
      errorMessages: error_messages || '',
      selectedAiMode: selected_ai_mode || 'complete_answer',
      apiKey: api_key,
      model,
      exitCode: Number(exit_code) || 0,
      executionTimeMs: Number(execution_time_ms) || 0
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const history = await getDbHistory();
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/history/:id', async (req, res) => {
  try {
    const success = await deleteDbRecord(req.params.id);
    res.json({ success, id: req.params.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend dist if built
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CodeDoctor AI production server listening on port ${PORT}`);
});
