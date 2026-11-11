import React from 'react';
import { HelpCircle, Sparkles, RotateCcw, FileText } from 'lucide-react';

interface ProblemPanelProps {
  problemDescription: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onLoadExample: () => void;
}

export const ProblemPanel: React.FC<ProblemPanelProps> = ({
  problemDescription,
  onChange,
  onClear,
  onLoadExample
}) => {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 shadow-md flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-400">
            <FileText className="w-4 h-4" />
          </div>
          <label htmlFor="problem-desc-input" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Programming Problem / Task
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLoadExample}
            className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
            title="Load sample problem"
          >
            <Sparkles className="w-3 h-3" />
            <span>Example</span>
          </button>
          {problemDescription && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
              title="Clear description"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <textarea
          id="problem-desc-input"
          value={problemDescription}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your programming question or assignment prompt here..."
          rows={3}
          className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500/80 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-y transition-all"
        />
        <div className="absolute right-2 bottom-2 text-[10px] text-slate-400 font-mono pointer-events-none">
          {problemDescription.length} chars
        </div>
      </div>
    </div>
  );
};
