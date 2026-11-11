import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Activity,
  Bug,
  Info
} from 'lucide-react';
import type { CodeHealthStatus } from '../utils/codeHealth';

interface CodeHealthBarProps {
  health: CodeHealthStatus;
  onFixSyntax?: () => void;
}

export const CodeHealthBar: React.FC<CodeHealthBarProps> = ({ health }) => {
  return (
    <div className="bg-slate-950 border-t border-slate-800 px-4 py-2.5 shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
      {/* Left: Health summary indicators */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-400">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>Code Health:</span>
        </div>

        {/* Syntax Status */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
          <span className="text-[11px] text-slate-400">Syntax:</span>
          {health.syntaxStatus === 'valid' && (
            <span className="flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
              <CheckCircle2 className="w-3 h-3" /> Valid
            </span>
          )}
          {health.syntaxStatus === 'invalid' && (
            <span className="flex items-center gap-1 text-rose-400 font-medium text-[11px]">
              <XCircle className="w-3 h-3" /> Syntax Error
            </span>
          )}
          {health.syntaxStatus === 'unknown' && (
            <span className="text-slate-400 text-[11px]">Unchecked</span>
          )}
        </div>

        {/* Execution Status */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
          <span className="text-[11px] text-slate-400">Execution:</span>
          {health.executionStatus === 'success' && (
            <span className="flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
              <CheckCircle2 className="w-3 h-3" /> Passed
            </span>
          )}
          {health.executionStatus === 'runtime_error' && (
            <span className="flex items-center gap-1 text-rose-400 font-medium text-[11px]">
              <XCircle className="w-3 h-3" /> Runtime Error
            </span>
          )}
          {health.executionStatus === 'syntax_error' && (
            <span className="flex items-center gap-1 text-rose-400 font-medium text-[11px]">
              <XCircle className="w-3 h-3" /> Syntax Error
            </span>
          )}
          {health.executionStatus === 'timeout' && (
            <span className="flex items-center gap-1 text-amber-400 font-medium text-[11px]">
              <AlertTriangle className="w-3 h-3" /> Timeout
            </span>
          )}
          {health.executionStatus === 'idle' && (
            <span className="text-slate-400 text-[11px]">Not Executed</span>
          )}
        </div>

        {/* Overall Status Badge */}
        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              health.badgeColor === 'emerald'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : health.badgeColor === 'amber'
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : health.badgeColor === 'rose'
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {health.badgeLabel}
          </span>
        </div>
      </div>

      {/* Right: Detected Errors or Quality Tips */}
      <div className="flex items-center gap-2 overflow-x-auto max-w-full text-[11px]">
        {health.detectedErrors.length > 0 ? (
          <div className="flex items-center gap-1.5 text-rose-300">
            <Bug className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="font-mono truncate max-w-xs md:max-w-md">
              {health.detectedErrors[0]}
            </span>
          </div>
        ) : health.qualityTips.length > 0 ? (
          <div className="flex items-center gap-1.5 text-slate-400">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-xs md:max-w-md">
              {health.qualityTips[0]}
            </span>
          </div>
        ) : (
          <span className="text-slate-400">No active anomalies detected</span>
        )}
      </div>
    </div>
  );
};
