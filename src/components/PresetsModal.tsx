import React from 'react';
import {
  BookOpen,
  X,
  ArrowRight,
  Bug,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { SAMPLE_PROBLEMS, SampleProblem } from '../data/sampleProblems';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProblem: (problem: SampleProblem) => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  isOpen,
  onClose,
  onSelectProblem
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Curated Buggy Code Challenges</h2>
              <p className="text-xs text-slate-400">
                Test CodeDoctor AI across various common Python bug patterns
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

        {/* Problems list */}
        <div className="p-4 overflow-y-auto space-y-3">
          {SAMPLE_PROBLEMS.map((prob) => (
            <div
              key={prob.id}
              onClick={() => {
                onSelectProblem(prob);
                onClose();
              }}
              className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                    {prob.title}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                    {prob.category}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-cyan-400 group-hover:translate-x-1 transition-transform">
                  <span className="text-[11px] font-medium hidden sm:inline">Load Challenge</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-2.5 line-clamp-2">
                {prob.problemDescription}
              </p>

              <div className="flex items-center gap-2 text-[10px] text-rose-300 font-mono">
                <Bug className="w-3 h-3 text-rose-400" />
                <span>Simulated Bug: {prob.bugType}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
