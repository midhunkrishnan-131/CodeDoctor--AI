import React from 'react';
import {
  HelpCircle,
  X,
  Code2,
  Lightbulb,
  ShieldCheck,
  Terminal,
  Cpu,
  Sparkles
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">CodeDoctor AI Guide & Architecture</h2>
              <p className="text-xs text-slate-400">
                Understanding AI Modes, Execution Sandboxing, and Debugging Workflow
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-300 leading-relaxed">
          {/* Section 1: The Two AI Diagnosis Modes */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Two Core AI Diagnosis Modes</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-purple-300">
                  <Code2 className="w-4 h-4" />
                  <span>Mode A: Complete Answer Mode</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Designed for when you need the exact solution. The AI analyzes your error, identifies every mistake, generates the full corrected code snippet, and provides test cases. You can apply the code directly to your Monaco editor with one click.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/40 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                  <Lightbulb className="w-4 h-4" />
                  <span>Mode B: Logic Suggestion Mode</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Designed to sharpen your debugging intuition without spoiling the answer. The AI is strictly prohibited from writing the solution. Instead, it provides mental models, points to the faulty lines, and asks guiding Socratic questions.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Sandboxed Python Execution Engine */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h3 className="font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sandboxed Execution Engine</span>
            </h3>
            <p className="text-slate-400 text-[11px]">
              Code is executed via an isolated Python 3.10 subprocess. It enforces:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1 text-[11px]">
              <li>Configurable execution timeout (2–15s) to terminate infinite loops</li>
              <li>256 MB virtual memory limit via Linux system resource controls</li>
              <li>Temporary directory isolation per run</li>
              <li>Output size truncation to prevent buffer overflow attacks</li>
            </ul>
          </div>

          {/* Section 3: Recommended Workflow */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h3 className="font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Recommended Workflow</span>
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1 text-[11px]">
              <li>Type or load your programming question in the Problem Panel.</li>
              <li>Write your Python solution in the Monaco Editor.</li>
              <li>Click <strong>Run Code</strong> (or press <kbd className="px-1 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px]">Ctrl+Enter</kbd>) to observe the terminal output and error trace.</li>
              <li>Select your preferred AI Mode (Complete Answer or Logic Suggestion).</li>
              <li>Click <strong>Diagnose Code</strong> to trigger AI analysis with full error context.</li>
              <li>Refine your code and re-run!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
