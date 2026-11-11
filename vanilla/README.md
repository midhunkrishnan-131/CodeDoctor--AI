# CodeDoctor AI - Standalone HTML, CSS & JavaScript Version

This folder contains the complete, standalone version of the **CodeDoctor AI** platform separated cleanly into standard HTML, CSS, and JavaScript.

No Node.js, React build step, or npm packages are required to view or run this frontend.

---

## 📁 File Structure

```
html-css-js/
├── index.html     # Semantic HTML5 markup (IDE layout, Panels, Modals)
├── style.css      # Modern dark developer theme CSS (Tailwind Slate/Navy palette)
├── script.js      # Full interactive vanilla JavaScript client
└── README.md      # Documentation & quick start guide
```

---

## 🚀 How to Run

### Option 1: Direct Browser Launch (Easiest)
Simply double-click `index.html` or drag and drop it into any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari).

### Option 2: With VS Code Live Server
1. Open this folder in VS Code.
2. Right-click on `index.html`.
3. Select **"Open with Live Server"**.

### Option 3: With Python Built-in Web Server
In PowerShell / Terminal:
```bash
cd "html-css-js"
python -m http.server 8080
```
Then visit `http://localhost:8080` in your browser.

---

## 🔌 Connecting to the Python Backend (Optional)

The application includes built-in offline simulation for immediate testing. To connect to the real Python execution sandbox & Groq AI engine:

1. Start the Python backend:
   ```bash
   cd ../backend
   pip install -r requirements.txt
   uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. In the CodeDoctor UI, click **Settings** (gear icon) and verify the backend URL is set to `http://localhost:8000`.

---

## ✨ Features Included

- **Python Monaco Code Editor**: Syntax highlighting, custom dark theme, bracket matching, indentation, font resizing, copy, and download `solution.py`.
- **Keyboard Shortcuts**: `Ctrl + Enter` (or `Cmd + Enter`) to run code.
- **Execution Terminal**: Console output, stderr traceback formatting, exit codes, microsecond timing, and standard input (stdin) tab.
- **Dual AI Diagnosis Modes**:
  - **Mode A (Complete Answer)**: Root cause analysis, verified solution, line-by-line explanation, and 1-click **Apply to Editor**.
  - **Mode B (Logic Suggestion)**: Socratic hints, mental models, and guiding questions without revealing the answer.
- **Code Health Status Bar**: Live syntax status, anomaly detection (`ZeroDivisionError`, `IndexError`, `RecursionError`), and quality tips.
- **Curated Challenges**: 5 pre-built buggy code challenges ready to load and test.
- **Diagnosis History**: SQLite & localStorage session records with search and 1-click restore.
- **Fully Responsive**: Adapts seamlessly to laptops, tablets, and mobile screens.

