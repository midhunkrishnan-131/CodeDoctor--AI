import React, { useState } from 'react';
import {
  Sparkles,
  Stethoscope,
  Lightbulb,
  Code2,
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Zap
} from 'lucide-react';
import type { DiagnosisMode } from '../utils/promptBuilder';
import type { ParsedSection } from '../utils/markdownParser';

interface AiDoctorPanelProps {
  mode: DiagnosisMode;
  onModeChange: (mode: DiagnosisMode) => void;
  onDiagnose: () => void;
  isLoading: boolean;
  diagnosis: string;
  sections?: ParsedSection[];
  extractedCode?: string;
  error?: string | null;
  onApplyCode: (code: string) => void;
  activeModel: string;
  provider: string;
  onOpenSettings: () => void;
  hasRun: boolean;
}

export const AiDoctorPanel: React.FC<AiDoctorPanelProps> = ({
  mode,
  onModeChange,
  onDiagnose,
  isLoading,
  diagnosis,
  sections,
  extractedCode,
  error,
  onApplyCode,
  activeModel,
  provider,
  onOpenSettings,
  hasRun
}) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleCopyAll = async () => {
    if (!diagnosis) return;
    try {
      await navigator.clipboard.writeText(diagnosis);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {}
  };

  const handleCopyCode = async () => {
    if (!extractedCode) return;
    try {
      await navigator.clipboard.writeText(extractedCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  const handleApply = () => {
    if (!extractedCode) return;
    onApplyCode(extractedCode);
    setApplied(true);
    setTimeout(() => setApplied(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Panel Top Header: AI Mode Selectors */}
      <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-purple-400 border border-purple-500/30">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                AI Doctor Diagnosis
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <span>{provider || 'Groq'}</span>
                <span>•</span>
                <span className="truncate max-w-[130px]">{activeModel}</span>
              </div>
            </div>
          </div>

          {/* Action button: Diagnose Code */}
          <button
            onClick={onDiagnose}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-lg transition-all active:scale-95 ${
              isLoading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02]'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                <span>Diagnosing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 fill-current animate-pulse text-yellow-300" />
                <span>Diagnose Code</span>
              </>
            )}
          </button>
        </div>

        {/* Mode Selector Pill Buttons */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => onModeChange('complete_answer')}
            className={`flex flex-col text-left px-3 py-2 rounded-md transition-all ${
              mode === 'complete_answer'
                ? 'bg-gradient-to-br from-purple-950/80 to-indigo-950/80 border border-purple-500/40 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Code2 className={`w-3.5 h-3.5 ${mode === 'complete_answer' ? 'text-purple-400' : 'text-slate-500'}`} />
              <span>Complete Answer Mode</span>
            </div>
            <span className="text-[10px] text-slate-400 leading-tight mt-0.5">
              Full fix, corrected code snippet & test cases
            </span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange('logic_suggestion')}
            className={`flex flex-col text-left px-3 py-2 rounded-md transition-all ${
              mode === 'logic_suggestion'
                ? 'bg-gradient-to-br from-cyan-950/80 to-indigo-950/80 border border-cyan-500/40 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Lightbulb className={`w-3.5 h-3.5 ${mode === 'logic_suggestion' ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span>Logic Suggestion Mode</span>
            </div>
            <span className="text-[10px] text-slate-400 leading-tight mt-0.5">
              Socratic hints & guidance — strictly no full solution
            </span>
          </button>
        </div>
      </div>

      {/* Mode Explanatory Notice */}
      <div className="px-3 py-1.5 bg-slate-950/60 border-b border-slate-800/60 flex items-center justify-between text-[11px]">
        {mode === 'complete_answer' ? (
          <div className="flex items-center gap-1.5 text-purple-300">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span>Mode A: Provides problem root cause, complete working code, and verification tests.</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Mode B: Solves nothing directly. Asks questions and nudges you to fix your own logic.</span>
          </div>
        )}

        {diagnosis && !isLoading && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-[10px] transition-colors"
              title="Copy entire AI response"
            >
              {copiedAll ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedAll ? 'Copied' : 'Copy All'}</span>
            </button>
            <button
              onClick={onDiagnose}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-[10px] transition-colors"
              title="Re-run diagnosis"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Main Diagnosis Content Body */}
      <div className="flex-1 p-4 overflow-y-auto bg-[#070b14] space-y-4">
        {/* Error Notice */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/60 text-xs text-rose-200 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-300">Diagnosis Request Failed</p>
                <p className="text-[11px] text-rose-200/90 mt-0.5">{error}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onOpenSettings}
                className="px-2.5 py-1 rounded bg-rose-900/40 hover:bg-rose-800/50 border border-rose-700/50 text-[11px] font-medium text-white transition-colors"
              >
                Open Settings & API Keys
              </button>
              <button
                onClick={onDiagnose}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-4 py-6">
            <div className="flex items-center justify-center flex-col gap-3 text-center">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-400 animate-pulse flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Stethoscope className="w-6 h-6 text-slate-950 animate-bounce" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  {mode === 'complete_answer'
                    ? 'CodeDoctor is analyzing mistakes and formulating complete corrected code...'
                    : 'CodeDoctor is reviewing your logic and preparing Socratic guidance hints...'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Querying {provider || 'Groq'} ({activeModel})
                </p>
              </div>
            </div>

            {/* Skeleton lines */}
            <div className="space-y-2.5 pt-2 max-w-lg mx-auto">
              <div className="h-3 bg-slate-800/60 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-slate-800/40 rounded animate-pulse w-full" />
              <div className="h-3 bg-slate-800/50 rounded animate-pulse w-5/6" />
              <div className="h-16 bg-slate-800/30 rounded animate-pulse w-full border border-slate-800" />
            </div>
          </div>
        )}

        {/* Empty State when no diagnosis yet */}
        {!isLoading && !diagnosis && !error && (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mb-3 text-purple-400">
              <Sparkles className="w-6 h-6 opacity-75" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">AI Doctor Ready</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              {hasRun
                ? 'Your code has executed. Click "Diagnose Code" to receive an in-depth diagnosis.'
                : 'Enter your problem description, run your code, then click "Diagnose Code" to inspect errors and get guidance.'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px]">
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                Mode A: Full Solutions
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                Mode B: Logic & Socratic Hints
              </span>
            </div>
          </div>
        )}

        {/* Diagnosis Result View */}
        {!isLoading && diagnosis && (
          <div className="space-y-4 text-xs text-slate-200">
            {/* If Mode A and Extracted Code Available: Provide Apply / Copy Banner */}
            {mode === 'complete_answer' && extractedCode && (
              <div className="bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-slate-950 border border-purple-500/30 rounded-xl p-3 shadow-md space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-xs text-purple-200">
                      Verified Corrected Code Available
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 transition-colors"
                      title="Copy corrected code"
                    >
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                    </button>
                    <button
                      onClick={handleApply}
                      className={`flex items-center gap-1 px-3 py-1 rounded font-semibold text-[11px] transition-all shadow-md ${
                        applied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/30 active:scale-95'
                      }`}
                      title="Replace current editor content with the corrected code"
                    >
                      {applied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Applied to Editor!</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>Apply to Editor</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-lg bg-slate-950 border border-slate-800 p-2.5 font-mono text-[11px] text-slate-300">
                  <pre className="whitespace-pre-wrap">{extractedCode}</pre>
                </div>
              </div>
            )}

            {/* Structured Sections or Raw Markdown Breakdown */}
            <div className="space-y-3 font-sans">
              {sections && sections.length > 0 ? (
                sections.map((sec, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-2"
                  >
                    <h4 className="font-bold text-xs uppercase tracking-wider text-cyan-300 flex items-center gap-1.5 border-b border-slate-800/60 pb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      {sec.title}
                    </h4>
                    <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                      {sec.content.trim()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 whitespace-pre-wrap leading-relaxed">
                  {diagnosis}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
