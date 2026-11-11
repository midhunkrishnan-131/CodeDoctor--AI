import React, { useState } from 'react';
import {
  Settings,
  X,
  Key,
  Cpu,
  Clock,
  ShieldCheck,
  Check,
  ExternalLink,
  Sparkles,
  Info
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groqApiKey: string;
  onSaveGroqApiKey: (key: string) => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  timeoutSec: number;
  onSetTimeout: (sec: number) => void;
  availableModels: Array<{ id: string; name: string; provider: string; description: string }>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  groqApiKey,
  onSaveGroqApiKey,
  selectedModel,
  onSelectModel,
  timeoutSec,
  onSetTimeout,
  availableModels
}) => {
  const [keyInput, setKeyInput] = useState(groqApiKey);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveGroqApiKey(keyInput.trim());
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">CodeDoctor AI Settings</h2>
              <p className="text-xs text-slate-400">
                Configure Groq API integration and execution engine
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-5">
          {/* Groq API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="groq-api-key-input" className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-purple-400" />
                <span>Groq API Key</span>
              </label>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                <span>Get free Groq key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <input
              id="groq-api-key-input"
              type="password"
              placeholder="gsk_..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            />
            <p className="text-[11px] text-slate-400">
              Your key is stored securely in your browser and used solely for backend Groq API requests. If left blank, the app will use the pre-configured Gemini fallback.
            </p>
          </div>

          {/* Model Selector */}
          <div className="space-y-2">
            <label htmlFor="ai-model-select" className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Active AI Model</span>
            </label>

            <select
              id="ai-model-select"
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg p-2.5 text-xs text-slate-200 font-sans focus:outline-none"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider}) - {m.description}
                </option>
              ))}
            </select>
          </div>

          {/* Execution Sandbox Limits */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <label htmlFor="timeout-slider" className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Execution Timeout Limit</span>
              </label>
              <span className="font-mono text-xs font-bold text-emerald-400">
                {timeoutSec} seconds
              </span>
            </div>

            <input
              id="timeout-slider"
              type="range"
              min="2"
              max="15"
              step="1"
              value={timeoutSec}
              onChange={(e) => onSetTimeout(Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-950 rounded-lg h-1.5 cursor-pointer"
            />

            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Sandbox enforces 256MB memory cap and process isolation to prevent system hangs.
              </span>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30 transition-all active:scale-95"
            >
              {savedNotice ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{savedNotice ? 'Saved!' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
