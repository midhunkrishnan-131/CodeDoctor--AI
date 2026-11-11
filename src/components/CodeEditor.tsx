import React, { useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import {
  Copy,
  Check,
  Download,
  Trash2,
  FileCode,
  RotateCcw,
  Sun,
  Moon,
  Terminal,
  Play
} from 'lucide-react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  onRun: () => void;
  isRunning: boolean;
  onClear: () => void;
  onReset: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  onRun,
  isRunning,
  onClear,
  onReset
}) => {
  const [copied, setCopied] = useState(false);
  const [editorTheme, setEditorTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  const [fontSize, setFontSize] = useState<number>(14);
  const editorRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define custom dark theme matching the navy/purple aesthetic
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
        'editorLineNumber.activeForeground': '#a855f7',
        'editor.selectionBackground': '#312e81',
        'editor.lineHighlightBackground': '#0f172a'
      }
    });

    monaco.editor.setTheme('codedoctor-dark');

    // Add keyboard shortcut for Run: Ctrl+Enter or Cmd+Enter
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRun();
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'solution.py';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleInsertPrint = () => {
    const printSnippet = '\nprint("DEBUG:", locals())\n';
    onChange(code + printSnippet);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Editor Toolbar */}
      <div className="h-10 px-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/80 text-cyan-400 font-mono text-[11px] font-medium">
            <FileCode className="w-3.5 h-3.5" />
            <span>solution.py</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            Python 3.10
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Quick Insert Print */}
          <button
            onClick={handleInsertPrint}
            className="hidden md:flex items-center gap-1 px-2 py-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-[11px] transition-colors"
            title="Insert debug print statement"
          >
            <span>+ Debug Print</span>
          </button>

          {/* Copy Code */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-[11px] transition-colors"
            title="Copy code to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-[11px] transition-colors"
            title="Download solution.py"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Reset to default code"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Clear */}
          <button
            onClick={onClear}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Clear editor"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Monaco Container */}
      <div className="flex-1 min-h-[320px] relative bg-[#070b14]">
        <Editor
          height="100%"
          language="python"
          value={code}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorDidMount}
          theme={editorTheme === 'light' ? 'light' : 'vs-dark'}
          options={{
            fontSize: fontSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            lineNumbers: 'on',
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            formatOnType: true,
            formatOnPaste: true,
            tabSize: 4,
            insertSpaces: true,
            folding: true,
            renderWhitespace: 'selection',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            padding: { top: 12, bottom: 12 }
          }}
          loading={
            <div className="h-full flex items-center justify-center text-slate-400 text-xs gap-2">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading Python Code Editor...</span>
            </div>
          }
        />
      </div>

      {/* Editor Footer / Hotkey Hint */}
      <div className="h-7 px-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-3">
          <span>Lines: {code.split('\n').length}</span>
          <span>Chars: {code.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-slate-400">Run code:</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
            Ctrl + Enter
          </kbd>
        </div>
      </div>
    </div>
  );
};
