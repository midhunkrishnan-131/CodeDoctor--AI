# CodeDoctor AI - Intelligent Code Debugging & Logic Diagnosis

An AI-powered online coding and debugging platform featuring dual AI diagnosis modes, a sandboxed Python execution engine, live terminal output, Monaco code editor, SQLite persistence, and Groq API integration.

## 🚀 Features

### 1. Monaco Code Editor
- Full Python syntax highlighting, code indentation, and bracket auto-closing
- Line numbering, font scaling, and custom dark developer theme
- Integrated shortcuts: `Ctrl+Enter` / `Cmd+Enter` to run code
- Actions: Copy code, Download `solution.py`, reset to starter template, clear, and inject debug statements

### 2. Isolated Python Execution Sandbox
- Executes user Python scripts in an isolated subprocess
- Configurable execution timeout (2–15s) with loop protection
- 256MB virtual memory cap via Linux `resource` limits
- Standard input (`sys.stdin` / `input()`) support
- Microsecond execution time measurement and real-time exit code reporting

### 3. Dual AI Diagnosis Modes
- **Mode A: Complete Answer Mode**: Identifies exact root cause, detects specific bug categories (Off-by-one, ZeroDivision, Recursion, Syntax), generates the complete corrected code with one-click **Apply to Editor**, explains line-by-line corrections, and provides edge-case test cases.
- **Mode B: Logic Suggestion Mode**: Socratic mentoring mode. **Strictly prohibits revealing the final code or full solution**. Provides mental models, hints, guiding questions, and walk-through steps to help developers discover the solution independently.

### 4. Code Health Bar
- Real-time syntax validation
- Execution status (`Passed`, `Runtime Error`, `Syntax Error`, `Timed Out`)
- Anomaly detector identifying errors (`ZeroDivisionError`, `IndexError`, `KeyError`, `RecursionError`, `SyntaxError`)
- Quality tips (infinite loop detection, bare excepts, missing print outputs)

### 5. Diagnosis Session History (SQLite)
- Persists all past problem descriptions, submitted code, execution logs, and AI diagnoses to `codedoctor.db`
- Search and filter past sessions
- One-click restore to reload previous problem and code back into the Monaco editor
- Delete records with instant database synchronization

### 6. Groq API & Fallback
- Supports configurable Groq models: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768`
- User-configurable API key in Settings modal with local storage persistence
- Seamless fallback to Gemini 2.5 Flash if Groq API key is not yet provided

---

## 🛠️ Project Structure

```
CodeDoctor-AI/
├── frontend/ (and src/)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── ProblemPanel.tsx
│   │   │   ├── CodeEditor.tsx
│   │   │   ├── ExecutionPanel.tsx
│   │   │   ├── AiDoctorPanel.tsx
│   │   │   ├── CodeHealthBar.tsx
│   │   │   ├── HistoryModal.tsx
│   │   │   ├── SettingsModal.tsx
│   │   │   ├── PresetsModal.tsx
│   │   │   └── HelpModal.tsx
│   │   ├── data/
│   │   │   └── sampleProblems.ts
│   │   ├── utils/
│   │   │   ├── promptBuilder.ts
│   │   │   ├── codeHealth.ts
│   │   │   └── markdownParser.ts
│   │   ├── server/
│   │   │   ├── apiServer.ts
│   │   │   └── viteMiddleware.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── tsconfig.json
│
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── routes/
│   │   └── api.py
│   ├── services/
│   │   ├── execution_service.py
│   │   └── diagnosis_service.py
│   ├── ai/
│   │   ├── groq_client.py
│   │   ├── prompts.py
│   │   └── response_handler.py
│   ├── execution/
│   │   └── runner.py
│   ├── database/
│   │   └── db.py
│   ├── schemas/
│   │   └── schemas.py
│   └── requirements.txt
│
├── server.ts
├── .env.example
└── README.md
```

---

## 💻 Installation & Setup

### Option 1: Running the Unified Web Application
```bash
# 1. Install Node.js dependencies
npm install

# 2. Start development server (serves frontend + integrated API backend)
npm run dev

# 3. Open in browser at http://localhost:3000
```

### Option 2: Running Standalone FastAPI Backend
```bash
# 1. Install Python requirements
pip install -r backend/requirements.txt

# 2. Configure environment variables (optional)
export GROQ_API_KEY="your_groq_api_key_here"
export GROQ_MODEL="llama-3.3-70b-versatile"

# 3. Start FastAPI server
python3 backend/main.py
# Or with uvicorn:
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🧪 Unit Testing

Run unit tests via Node's native test runner:
```bash
npx --yes tsx --test src/utils/logic.test.ts
```

Self-test the Python execution sandbox:
```bash
python3 backend/execution/runner.py --self-test
```
