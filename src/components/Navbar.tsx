import React from 'react';
import {
  Stethoscope,
  BookOpen,
  History,
  Settings,
  HelpCircle,
  Cpu,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface NavbarProps {
  onOpenPresets: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  historyCount: number;
  activeModel: string;
  hasGroqKey: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenPresets,
  onOpenHistory,
  onOpenSettings,
  onOpenHelp,
  historyCount,
  activeModel,
  hasGroqKey
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0">
      {/* Left: Branding */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent tracking-tight">
                CodeDoctor <span className="text-cyan-400">AI</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                IDE
              </span>
            </div>
          </div>
        </div>

        {/* Engine and Sandbox Badges */}
        <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Python 3.10 Sandbox</span>
          </div>

          <div
            onClick={onOpenSettings}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onOpenSettings()}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors text-slate-300"
            title="Click to configure AI Engine or switch models"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-mono text-[11px] truncate max-w-[140px]">{activeModel}</span>
            {hasGroqKey ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Groq API Active" />
            ) : (
              <span className="text-[10px] px-1 bg-amber-500/20 text-amber-300 rounded font-medium">Built-in AI</span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onOpenPresets}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 transition-all hover:border-slate-700"
          title="Load pre-built buggy code challenges to test CodeDoctor AI"
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Challenges</span>
        </button>

        <button
          onClick={onOpenHistory}
          className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 transition-all hover:border-slate-700"
          title="View diagnosis session history"
        >
          <History className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">History</span>
          {historyCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {historyCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 transition-all hover:border-slate-700"
          title="Configure Groq API Key and execution settings"
        >
          <Settings className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Settings</span>
        </button>

        <button
          onClick={onOpenHelp}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="How CodeDoctor AI works"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <div className="hidden lg:flex items-center pl-2 ml-1 border-l border-slate-800 text-[11px] text-slate-400">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-cyan-300/80">
            BCA Portfolio
          </span>
        </div>
      </div>
    </header>
  );
};
