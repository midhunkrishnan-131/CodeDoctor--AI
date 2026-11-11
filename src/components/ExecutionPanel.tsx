import React, { useState } from 'react';
import {
  Play,
  Square,
  Terminal,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  CornerDownLeft
} from 'lucide-react';

interface ExecutionPanelProps {
  onRun: () => void;
  onStop: () => void;
  isRunning: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTimeMs: number | null;
  status: 'idle' | 'running' | 'success' | 'error' | 'timeout';
  onClear: () => void;
  stdinInput: string;
  onStdinChange: (val: string) => void;
}

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({
  onRun,
  onStop,
  isRunning,
  stdout,
  stderr,
  exitCode,
  executionTimeMs,
  status,
  onClear,
  stdinInput,
  onStdinChange
}) => {
  const [activeTab, setActiveTab] = useState<'output' | 'stdin'>('output');
  const [copied, setCopied] = useState(false);

  const handleCopyOutput = async () => {
    const fullOutput = [
      stdout ? `[STDOUT]\n${stdout}` : '',
      stderr ? `[STDERR]\n${stderr}` : ''
    ].filter(Boolean).join('\n\n');

    if (!fullOutput) return;

    try {
      await navigator.clipboard.writeText(fullOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-[280px]">
      {/* Panel Header */}
      <div className="h-10 px-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Execution Terminal</span>
          </div>

          {/* Status Badge */}
          {status === 'running' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              Running...
            </span>
          )}
          {status === 'success' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Exit 0 (OK)
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <AlertCircle className="w-3 h-3 text-rose-400" />
              Exit {exitCode ?? 1} (Error)
            </span>
          )}
          {status === 'timeout' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Clock className="w-3 h-3 text-amber-400" />
              Timed Out
            </span>
          )}

          {/* Execution Time */}
          {executionTimeMs !== null && executionTimeMs !== undefined && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 font-mono">
              <Clock className="w-3 h-3" />
              {executionTimeMs.toFixed(1)} ms
            </span>
          )}
        </div>

        {/* Tab & Action Controls */}
        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-[11px]">
            <button
              onClick={() => setActiveTab('output')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                activeTab === 'output' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Output
            </button>
            <button
              onClick={() => setActiveTab('stdin')}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors flex items-center gap-1 ${
                activeTab === 'stdin' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Stdin</span>
              {stdinInput.trim() && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
            </button>
          </div>

          {/* Copy */}
          {(stdout || stderr) && (
            <button
              onClick={handleCopyOutput}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Copy terminal output"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Clear */}
          <button
            onClick={onClear}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Clear terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Primary Action Button: Run / Stop */}
          {isRunning ? (
            <button
              onClick={onStop}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/30 transition-all active:scale-95"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={onRun}
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-md shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Code</span>
            </button>
          )}
        </div>
      </div>

      {/* Terminal View Body */}
      <div className="flex-1 bg-[#050811] p-3 font-mono text-xs overflow-y-auto select-text">
        {activeTab === 'stdin' ? (
          <div className="h-full flex flex-col gap-2">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3 text-cyan-400" />
              <span>Standard Input (will be passed to sys.stdin / input()):</span>
            </div>
            <textarea
              value={stdinInput}
              onChange={(e) => onStdinChange(e.target.value)}
              placeholder="Enter inputs here (one per line, e.g. for input() calls)..."
              className="flex-1 w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/80 resize-none"
            />
          </div>
        ) : (
          <div className="space-y-2">
            {status === 'idle' && !stdout && !stderr && (
              <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-slate-400 text-center gap-2">
                <Terminal className="w-8 h-8 opacity-40 text-slate-400" />
                <p className="text-xs">Click <strong className="text-emerald-400">Run Code</strong> or press <kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300">Ctrl+Enter</kbd> to execute</p>
                <p className="text-[11px] text-slate-400">Execution runs in an isolated Python 3.10 sandbox with memory and timeout limits.</p>
              </div>
            )}

            {isRunning && (
              <div className="flex items-center gap-2 text-indigo-400 py-2">
                <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span>Executing Python script in sandbox...</span>
              </div>
            )}

            {/* Standard Output */}
            {stdout && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Standard Output:
                </div>
                <pre className="text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-900">
                  {stdout}
                </pre>
              </div>
            )}

            {/* Standard Error */}
            {stderr && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-400 mb-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  Standard Error / Traceback:
                </div>
                <pre className="text-rose-300 whitespace-pre-wrap leading-relaxed bg-rose-950/20 p-2 rounded border border-rose-900/40 font-mono text-[11px]">
                  {stderr}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
