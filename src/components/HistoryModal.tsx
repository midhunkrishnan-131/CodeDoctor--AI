import React, { useState } from 'react';
import {
  History,
  X,
  Trash2,
  Code2,
  Lightbulb,
  ArrowRight,
  Clock,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export interface HistoryItemData {
  id: string;
  problem_description: string;
  source_code: string;
  diagnosis_mode: string;
  stdout: string;
  stderr: string;
  exit_code: number;
  execution_time_ms: number;
  ai_diagnosis: string;
  model_name: string;
  provider: string;
  created_at: string;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: HistoryItemData[];
  onDeleteItem: (id: string) => Promise<void>;
  onRestore: (item: HistoryItemData) => void;
  isLoading: boolean;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  items,
  onDeleteItem,
  onRestore,
  isLoading
}) => {
  const [selectedItem, setSelectedItem] = useState<HistoryItemData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredItems = items.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.problem_description.toLowerCase().includes(q) ||
      item.source_code.toLowerCase().includes(q) ||
      item.ai_diagnosis.toLowerCase().includes(q)
    );
  });

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this diagnosis record?')) return;
    setDeletingId(id);
    try {
      await onDeleteItem(id);
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Diagnosis Session History</h2>
              <p className="text-xs text-slate-400">
                Saved in SQLite database • {items.length} recorded sessions
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

        {/* Search */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search saved problems, code, or diagnosis text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none font-sans"
          />
        </div>

        {/* Content body: 2-column or list view */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Item list */}
          <div className="w-full md:w-2/5 border-r border-slate-800 overflow-y-auto p-2 space-y-1.5">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading history records from database...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No diagnosis records found. Run a diagnosis to save your session.
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                const isComplete = item.diagnosis_mode === 'complete_answer';

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800/90 border-purple-500/50 shadow-md'
                        : 'bg-slate-950/60 border-slate-800/70 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isComplete
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {isComplete ? <Code2 className="w-3 h-3" /> : <Lightbulb className="w-3 h-3" />}
                        {isComplete ? 'Complete Answer' : 'Logic Suggestion'}
                      </span>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(item.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <button
                          onClick={(e) => handleDelete(e, item.id)}
                          disabled={deletingId === item.id}
                          className="p-1 text-slate-400 hover:text-rose-400 transition-colors ml-1"
                          title="Delete record"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">
                      {item.problem_description || 'Unspecified Python Problem'}
                    </h4>

                    <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 font-mono">
                      <span className="truncate max-w-[120px]">{item.model_name || 'Groq AI'}</span>
                      <span>•</span>
                      <span>{item.execution_time_ms ? `${item.execution_time_ms.toFixed(0)}ms` : '0ms'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Selected item detail view */}
          <div className="hidden md:flex flex-1 flex-col bg-slate-950 overflow-y-auto p-4 space-y-4">
            {selectedItem ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                      Problem Context
                    </h3>
                    <p className="text-xs text-slate-200 mt-1">
                      {selectedItem.problem_description || 'No description provided'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onRestore(selectedItem);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-900/30 transition-all hover:scale-[1.02] active:scale-95 shrink-0"
                  >
                    <span>Load Into Editor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Saved Source Code
                  </h4>
                  <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-40">
                    {selectedItem.source_code}
                  </pre>
                </div>

                <div className="flex-1">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    AI Diagnosis Output
                  </h4>
                  <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                    {selectedItem.ai_diagnosis}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                <History className="w-8 h-8 opacity-40 mb-2" />
                <p>Select a history item from the left to view details or load code</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
