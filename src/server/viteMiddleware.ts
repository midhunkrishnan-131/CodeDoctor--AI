import type { Plugin, ViteDevServer } from 'vite';
import { runPythonCode, runDiagnosis, getDbHistory, deleteDbRecord } from './apiServer';

const AVAILABLE_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', provider: 'Groq', description: 'Recommended: Deep code analysis & fixes' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', provider: 'Groq', description: 'Ultra-fast response for instant logic hints' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B 32k', provider: 'Groq', description: 'Extended 32k context for long scripts' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Gemini', description: 'AI Studio fallback engine' }
];

export function apiPlugin(): Plugin {
  return {
    name: 'codedoctor-api-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] || '';

        if (!url.startsWith('/api/')) {
          return next();
        }

        // Helper to send JSON
        const sendJson = (status: number, data: any) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        };

        // Helper to parse JSON body
        const getBody = (): Promise<any> => {
          return new Promise((resolve) => {
            let bodyStr = '';
            req.on('data', (chunk) => { bodyStr += chunk.toString(); });
            req.on('end', () => {
              try {
                resolve(bodyStr ? JSON.parse(bodyStr) : {});
              } catch {
                resolve({});
              }
            });
          });
        };

        try {
          if (req.method === 'GET' && url === '/api/health') {
            return sendJson(200, {
              status: 'healthy',
              service: 'CodeDoctor AI Engine',
              execution_sandbox: 'Active (Python 3.10)',
              database: 'SQLite (codedoctor.db)'
            });
          }

          if (req.method === 'GET' && url === '/api/models') {
            return sendJson(200, {
              models: AVAILABLE_MODELS,
              default: 'llama-3.3-70b-versatile',
              has_groq_env: Boolean(process.env.GROQ_API_KEY),
              has_gemini_env: Boolean(process.env.GEMINI_API_KEY)
            });
          }

          if (req.method === 'POST' && url === '/api/execute') {
            const body = await getBody();
            const sourceCode = body.source_code || '';
            const timeout = Number(body.timeout) || 5.0;
            const stdinInput = body.stdin_input || '';

            const execResult = await runPythonCode(sourceCode, timeout, stdinInput);
            return sendJson(200, execResult);
          }

          if (req.method === 'POST' && url === '/api/diagnose') {
            const body = await getBody();
            const diagnosis = await runDiagnosis({
              problemDescription: body.problem_description || '',
              sourceCode: body.source_code || '',
              executionOutput: body.execution_output || '',
              errorMessages: body.error_messages || '',
              selectedAiMode: body.selected_ai_mode || 'complete_answer',
              apiKey: body.api_key,
              model: body.model,
              exitCode: body.exit_code,
              executionTimeMs: body.execution_time_ms
            });
            return sendJson(200, diagnosis);
          }

          if (req.method === 'GET' && url === '/api/history') {
            const records = await getDbHistory();
            return sendJson(200, records);
          }

          if (req.method === 'DELETE' && url.startsWith('/api/history/')) {
            const recordId = url.replace('/api/history/', '');
            const deleted = await deleteDbRecord(recordId);
            return sendJson(200, { success: deleted, id: recordId });
          }

          return sendJson(404, { error: 'API route not found' });
        } catch (err: any) {
          console.error('[CodeDoctor API Error]:', err);
          return sendJson(500, {
            error: err.message || 'Internal server error',
            details: err.stack
          });
        }
      });
    }
  };
}
