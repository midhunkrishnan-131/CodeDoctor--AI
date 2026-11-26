# CodeDoctor AI

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)](https://www.python.org/)

CodeDoctor AI is an in-browser Python workspace for running a snippet and reading a diagnosis of what went wrong. It is for students and developers who want the editor, the traceback, and an explanation in one page.

You write Python, or load one of the built-in buggy challenges, and the app runs it in a local Python process. You can then ask for a full corrected program, or for hints that are instructed to withhold the solution.

## Features

- **Python editor.** [Monaco](https://microsoft.github.io/monaco-editor/) with syntax highlighting, line numbers, folding, and auto-closing brackets and quotes. The toolbar copies the buffer, downloads it as `solution.py`, resets it, clears it, or appends a `print("DEBUG:", locals())` line. `Ctrl+Enter` (or `Cmd+Enter`) runs the code.
- **Local execution.** `POST /api/execute` writes the snippet to a temp directory and runs it with `python3`. The runner checks syntax with `compile`, passes stdin through, and reports stdout, stderr, exit code, and elapsed milliseconds. Settings sets the timeout from 2 to 15 seconds (default 5). On non-Windows systems the child process also gets a 256 MB address-space limit and a CPU limit. Stdout and stderr are truncated at 50,000 characters.
- **Two diagnosis modes.** Complete Answer asks for the root cause, a full corrected Python program, an explanation of the edits, and test cases. The panel can apply the extracted Python block to the editor. Logic Suggestion uses a system prompt that forbids the full solution and asks for hints and questions instead.
- **Code health bar.** After a run it labels the result as not run, passed, runtime error, syntax error, or timed out. It names common exceptions in the traceback (`ZeroDivisionError`, `IndexError`, `KeyError`, `RecursionError`, `TypeError`, `NameError`, `AttributeError`) and flags an empty buffer, no `print` or `return`, `while True` without `break`, and a bare `except: pass`.
- **Five challenges.** Off-by-one, division by zero, broken recursion, a syntax and indentation error, and a two-sum logic bug. Open them from Challenges, or load the first one from the problem panel.
- **Diagnosis history.** Each diagnosis is stored in SQLite at `backend/database/codedoctor.db` (problem text, source, stdout, stderr, exit code, timing, reply, model, and provider). History can search those fields, restore a session into the editor, or delete a row.
- **Groq, with a Gemini fallback.** A Groq key saved in Settings (browser `localStorage`) is sent with the diagnose request. If that field is empty, the server uses `GROQ_API_KEY`. If neither key is set, it calls the Gemini API when `GEMINI_API_KEY` is set. With `npm run dev` or `npm start`, the model list is Llama 3.3 70B Versatile, Llama 3.1 8B Instant, Mixtral 8x7B, and a Gemini entry. The FastAPI process exposes a separate catalog from `backend/ai/groq_client.py`, and retries a Groq model HTTP 404 against `qwen/qwen3.8-27b`.

Running code does not call an AI provider. Diagnosis does.

## Tech stack

- React and TypeScript, bundled with Vite, styled with Tailwind CSS
- Monaco Editor, Express for the production server (`server.ts`)
- Python 3 standard library for the runner and for SQLite
- Optional FastAPI app in `backend/` with the same `/api` routes
- Groq chat completions, and Gemini `generateContent` when no Groq key is available

Package versions live in `package.json` and `backend/requirements.txt`.

## Prerequisites

- Node.js 20.19+ or 22.12+ (the range Vite declares) and npm. These steps were run with Node.js 22.
- Python 3 on `PATH` as `python3`. The Node API spawns that executable. These steps were run with Python 3.12. On Debian or Ubuntu, install the `python3-venv` package before creating the virtualenv below.
- A Groq API key or a Gemini API key, only if you want diagnosis.
- A Unix-like system if you want the memory and CPU limits. On Windows the runner skips `resource` limits. `run_app.bat` starts the FastAPI server with `python`.

## Installation

```bash
git clone https://github.com/midhunkrishnan-131/CodeDoctor--AI.git
cd CodeDoctor--AI
npm install
cp .env.example .env
```

Edit `.env` before you diagnose from environment variables. Leave it empty if you will paste a Groq key into Settings instead. `.env` is gitignored.

The optional FastAPI server needs its own environment:

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
```

## Configuration

Set these names in `.env` or in the process environment. Keep the values out of git.

| Name | Read by | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | Vite dev API, Express, FastAPI | Groq key used when Settings does not send one |
| `GROQ_MODEL` | Vite dev API, Express, FastAPI | Model id used when the request omits one |
| `GEMINI_API_KEY` | Vite dev API, Express, FastAPI | Fallback used only when no Groq key is available |
| `PORT` | Express (`npm start`) | Listen port for the production server |
| `DISABLE_HMR` | Vite | When the value is `true`, hot reload and file watching stay off |

`npm run dev`, `npm start`, and the FastAPI app all load a project-root `.env` file. A variable already set in the process environment is left as-is.

Settings can also store a Groq key, the selected model, and the timeout in `localStorage`. A key saved there is sent on diagnose requests and is the one the server uses first.

## Run and build

Development UI and API, on port 3000:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production build, then the Express server (API plus `dist/`). It listens on `PORT`, or port 3000 when `PORT` is unset:

```bash
npm run build
npm start
```

`npm run preview` serves the built files at [http://localhost:4173](http://localhost:4173). That preview does not mount the API. Use `npm run dev` or `npm start` when you need `/api`.

Typecheck:

```bash
npm run lint
```

Optional FastAPI server, from the repository root, after the venv install above:

```bash
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Open [http://localhost:8000](http://localhost:8000). `/` redirects to the static client mounted from `html-css-js/` at `/vanilla`. Interactive docs are at [http://localhost:8000/docs](http://localhost:8000/docs).

`html-css-js/` and `vanilla/` are the same static client (HTML, CSS, and JavaScript, Monaco loaded from a CDN). Open either `index.html` in a browser, or serve the folder yourself. Unless the page is already on port 8000 or 3000, it calls `http://localhost:8000`, and Settings can point it at another base URL. If that host is down, the page simulates execution in the browser. `run_app.bat` opens the browser and starts the FastAPI server on port 8000.

## Usage

1. Start the dev server and open the app.
2. Describe the task in the problem panel, or load a challenge.
3. Run with `Ctrl+Enter` / `Cmd+Enter`. If the program reads `input()`, put that text in the terminal's stdin field first.
4. Choose Complete Answer or Logic Suggestion, then diagnose.
5. In Complete Answer mode, apply the extracted program to the editor and run it again.
6. Open History to search, restore, or delete a saved diagnosis.

The dev and production servers expose:

| Method | Path | Role |
| --- | --- | --- |
| `GET` | `/api/health` | Process status |
| `GET` | `/api/models` | Model catalog |
| `POST` | `/api/execute` | Run Python |
| `POST` | `/api/diagnose` | Diagnose the current code and output |
| `GET` | `/api/history` | List saved diagnoses |
| `DELETE` | `/api/history/{id}` | Delete one row |

The FastAPI server also implements `GET /api/history/{id}`.

```bash
curl -s http://localhost:3000/api/health

curl -s -X POST http://localhost:3000/api/execute \
  -H 'Content-Type: application/json' \
  -d '{"source_code":"print(2 + 2)\n","timeout":5,"stdin_input":""}'
```

A diagnose body accepts `problem_description`, `source_code`, `execution_output`, `error_messages`, `selected_ai_mode` (`complete_answer` or `logic_suggestion`), and optional `api_key`, `model`, `exit_code`, and `execution_time_ms`.

## Project structure

```
CodeDoctor--AI/
├── index.html                 # Vite entry
├── server.ts                  # Express production server (API + dist/)
├── vite.config.ts             # React, Tailwind, and the dev API plugin
├── package.json
├── .env.example
├── run_app.bat                # Windows launcher for the FastAPI server
├── src/
│   ├── App.tsx                # Editor, terminal, diagnosis, history
│   ├── components/            # Navbar, editor, panels, modals, health bar
│   ├── data/sampleProblems.ts # Five buggy challenges
│   ├── server/
│   │   ├── apiServer.ts       # Python spawn, SQLite bridge, Groq/Gemini
│   │   └── viteMiddleware.ts  # /api routes on the Vite dev server
│   └── utils/                 # Prompts, health checks, markdown parsing, tests
├── backend/
│   ├── main.py                # FastAPI app
│   ├── config.py              # Environment loading
│   ├── routes/api.py
│   ├── services/              # Execute and diagnose
│   ├── ai/                    # Groq client, prompts, response parsing
│   ├── execution/runner.py    # Subprocess sandbox
│   ├── database/db.py         # SQLite history (codedoctor.db)
│   └── requirements.txt
├── html-css-js/               # Static client served at /vanilla
└── vanilla/                   # Same static client as html-css-js/
```

## Testing

```bash
npx tsx --test src/utils/logic.test.ts
python3 backend/execution/runner.py --self-test
```

The Node tests cover the two system prompts, prompt assembly, code-health classification, and markdown code extraction. The Python self-test runs a short `print` snippet through the runner and prints JSON.

## Contributing

Issues and pull requests are welcome.

1. Fork the repository and branch from `main`.
2. Run `npm install`. If you change the FastAPI app, install `backend/requirements.txt` in a virtualenv.
3. Before opening a pull request, run `npm run lint`, the Node tests, and the Python self-test above.
4. Leave secrets and local databases out of git. `.env` and `*.db` are already ignored.

## License

This repository does not include a license file. All rights stay with the copyright holder until one is added.
