import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { ProblemPanel } from './components/ProblemPanel';
import { CodeEditor } from './components/CodeEditor';
import { ExecutionPanel } from './components/ExecutionPanel';
import { AiDoctorPanel } from './components/AiDoctorPanel';
import { CodeHealthBar } from './components/CodeHealthBar';
import { HistoryModal, HistoryItemData } from './components/HistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { PresetsModal } from './components/PresetsModal';
import { HelpModal } from './components/HelpModal';
import { SAMPLE_PROBLEMS, SampleProblem } from './data/sampleProblems';
import { analyzeCodeHealth } from './utils/codeHealth';
import { parseAiDiagnosis, ParsedSection } from './utils/markdownParser';
import type { DiagnosisMode } from './utils/promptBuilder';

const DEFAULT_STARTER_CODE = '';
const DEFAULT_PROBLEM = '';

export default function App() {
  // Core IDE State
  const [problemDescription, setProblemDescription] = useState<string>(DEFAULT_PROBLEM);
  const [code, setCode] = useState<string>(DEFAULT_STARTER_CODE);
  const [stdinInput, setStdinInput] = useState<string>('');
  const [mode, setMode] = useState<DiagnosisMode>('complete_answer');

  // Execution State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hasRun, setHasRun] = useState<boolean>(false);
  const [stdout, setStdout] = useState<string>('');
  const [stderr, setStderr] = useState<string>('');
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState<boolean>(false);
  const [syntaxValid, setSyntaxValid] = useState<boolean | undefined>(undefined);
  const [syntaxErrorDetail, setSyntaxErrorDetail] = useState<any>(null);

  // AI Doctor Diagnosis State
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [diagnosisText, setDiagnosisText] = useState<string>('');
  const [diagnosisSections, setDiagnosisSections] = useState<ParsedSection[]>([]);
  const [extractedCode, setExtractedCode] = useState<string | undefined>(undefined);
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);
  const [providerUsed, setProviderUsed] = useState<string>('Groq AI');

  // Settings & Configuration
  const [groqApiKey, setGroqApiKey] = useState<string>(() => {
    return localStorage.getItem('codedoctor_groq_api_key') || '';
  });
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('codedoctor_model') || 'llama-3.3-70b-versatile';
  });
  const [timeoutSec, setTimeoutSec] = useState<number>(() => {
    const saved = localStorage.getItem('codedoctor_timeout');
    return saved ? Number(saved) : 5;
  });

  // History State
  const [historyItems, setHistoryItems] = useState<HistoryItemData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Modals
  const [isPresetsOpen, setIsPresetsOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Available models from backend
  const [availableModels, setAvailableModels] = useState<any[]>([
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', provider: 'Groq', description: 'Recommended: Deep code analysis & fixes' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', provider: 'Groq', description: 'Ultra-fast response for instant logic hints' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B 32k', provider: 'Groq', description: 'Extended 32k context for long scripts' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Gemini', description: 'AI Studio fallback engine' }
  ]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch models & history on initial mount
  useEffect(() => {
    fetchModels();
    fetchHistory();
  }, []);

  const fetchModels = async () => {
    try {
      const resp = await fetch('/api/models');
      if (resp.ok) {
        const data = await resp.json();
        if (data.models) {
          setAvailableModels(data.models);
        }
      }
    } catch {}
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const resp = await fetch('/api/history');
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) {
          setHistoryItems(data);
        }
      }
    } catch {} finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSaveGroqApiKey = (key: string) => {
    setGroqApiKey(key);
    localStorage.setItem('codedoctor_groq_api_key', key);
  };

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('codedoctor_model', modelId);
  };

  const handleSetTimeout = (sec: number) => {
    setTimeoutSec(sec);
    localStorage.setItem('codedoctor_timeout', String(sec));
  };

  // Run Code in Python Sandbox
  const handleRunCode = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setHasRun(true);
    setStdout('');
    setStderr('');
    setExitCode(null);
    setExecutionTimeMs(null);
    setTimedOut(false);
    setSyntaxValid(undefined);
    setSyntaxErrorDetail(null);

    try {
      const resp = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_code: code,
          timeout: timeoutSec,
          stdin_input: stdinInput
        })
      });

      if (!resp.ok) {
        throw new Error(`Execution service returned status ${resp.status}`);
      }

      const res = await resp.json();
      setStdout(res.stdout || '');
      setStderr(res.stderr || '');
      setExitCode(res.exit_code ?? 0);
      setExecutionTimeMs(res.execution_time_ms ?? 0);
      setTimedOut(Boolean(res.timed_out));
      setSyntaxValid(res.syntax_valid);
      setSyntaxErrorDetail(res.syntax_error);
    } catch (err: any) {
      setStderr(`CodeDoctor Execution Error: ${err.message}`);
      setExitCode(-1);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStopCode = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsRunning(false);
  };

  // Run AI Doctor Diagnosis
  const handleDiagnose = async () => {
    if (isDiagnosing) return;

    setIsDiagnosing(true);
    setDiagnosisError(null);

    try {
      const resp = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_description: problemDescription,
          source_code: code,
          execution_output: stdout,
          error_messages: stderr,
          selected_ai_mode: mode,
          api_key: groqApiKey.trim() || undefined,
          model: selectedModel,
          exit_code: exitCode ?? 0,
          execution_time_ms: executionTimeMs ?? 0
        })
      });

      if (!resp.ok) {
        let errMessage = `Error ${resp.status}`;
        try {
          const errData = await resp.json();
          errMessage = errData.error || errData.detail || errMessage;
        } catch {
          errMessage = await resp.text();
        }
        throw new Error(errMessage);
      }

      const result = await resp.json();
      setDiagnosisText(result.diagnosis || '');
      setProviderUsed(result.provider || 'Groq AI');

      // Parse structured sections
      const parsed = parseAiDiagnosis(result.diagnosis || '', mode);
      setDiagnosisSections(parsed.sections);
      setExtractedCode(parsed.extractedCode);

      // Refresh history records from database
      fetchHistory();
    } catch (err: any) {
      setDiagnosisError(err.message || 'Diagnosis failed. Check API configuration.');
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Apply Corrected Code directly to Monaco
  const handleApplyCode = (newCode: string) => {
    setCode(newCode);
    // Mark as unverified until the user runs it again
    setHasRun(false);
    setStdout('');
    setStderr('');
    setExitCode(null);
  };

  // Load Curated Challenge
  const handleSelectProblem = (problem: SampleProblem) => {
    setProblemDescription(problem.problemDescription);
    setCode(problem.buggyCode);
    setHasRun(false);
    setStdout('');
    setStderr('');
    setExitCode(null);
    setDiagnosisText('');
    setDiagnosisSections([]);
    setExtractedCode(undefined);
  };

  // Restore previous history session
  const handleRestoreHistory = (item: HistoryItemData) => {
    setProblemDescription(item.problem_description);
    setCode(item.source_code);
    setMode(item.diagnosis_mode as DiagnosisMode);
    setStdout(item.stdout || '');
    setStderr(item.stderr || '');
    setExitCode(item.exit_code);
    setExecutionTimeMs(item.execution_time_ms);
    setHasRun(true);
    setDiagnosisText(item.ai_diagnosis);

    const parsed = parseAiDiagnosis(item.ai_diagnosis, item.diagnosis_mode as DiagnosisMode);
    setDiagnosisSections(parsed.sections);
    setExtractedCode(parsed.extractedCode);
    setProviderUsed(item.provider || 'Groq AI');
  };

  // Delete history item
  const handleDeleteHistoryItem = async (id: string) => {
    try {
      const resp = await fetch(`/api/history/${id}`, { method: 'DELETE' });
      if (resp.ok) {
        setHistoryItems((prev) => prev.filter((i) => i.id !== id));
      }
    } catch {}
  };

  // Clear Terminal Output
  const handleClearTerminal = () => {
    setStdout('');
    setStderr('');
    setExitCode(null);
    setExecutionTimeMs(null);
    setHasRun(false);
  };

  // Calculate Code Health
  const codeHealth = useMemo(() => {
    return analyzeCodeHealth({
      code,
      hasRun,
      exitCode: exitCode ?? undefined,
      stdout,
      stderr,
      timedOut,
      syntaxValid,
      syntaxError: syntaxErrorDetail
    });
  }, [code, hasRun, exitCode, stdout, stderr, timedOut, syntaxValid, syntaxErrorDetail]);

  // Terminal Status calculation
  const terminalStatus = isRunning
    ? 'running'
    : timedOut
    ? 'timeout'
    : exitCode !== null
    ? exitCode === 0
      ? 'success'
      : 'error'
    : 'idle';

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-purple-600/30 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        historyCount={historyItems.length}
        activeModel={selectedModel}
        hasGroqKey={Boolean(groqApiKey.trim())}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 p-3 sm:p-4 flex flex-col gap-3 overflow-hidden">
        {/* Top: Problem Description Panel */}
        <ProblemPanel
          problemDescription={problemDescription}
          onChange={setProblemDescription}
          onClear={() => setProblemDescription('')}
          onLoadExample={() => {
            const first = SAMPLE_PROBLEMS[0];
            handleSelectProblem(first);
          }}
        />

        {/* Center: 2-Column Responsive Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
          {/* Left Column (Monaco Editor & Terminal): 7 cols on desktop */}
          <div className="lg:col-span-7 flex flex-col gap-3 min-h-[500px]">
            {/* Monaco Python Code Editor */}
            <CodeEditor
              code={code}
              onChange={setCode}
              onRun={handleRunCode}
              isRunning={isRunning}
              onClear={() => setCode('')}
              onReset={() => setCode(DEFAULT_STARTER_CODE)}
            />

            {/* Execution / Terminal Panel */}
            <ExecutionPanel
              onRun={handleRunCode}
              onStop={handleStopCode}
              isRunning={isRunning}
              stdout={stdout}
              stderr={stderr}
              exitCode={exitCode}
              executionTimeMs={executionTimeMs}
              status={terminalStatus}
              onClear={handleClearTerminal}
              stdinInput={stdinInput}
              onStdinChange={setStdinInput}
            />
          </div>

          {/* Right Column (AI Doctor Panel): 5 cols on desktop */}
          <div className="lg:col-span-5 flex flex-col min-h-[500px]">
            <AiDoctorPanel
              mode={mode}
              onModeChange={setMode}
              onDiagnose={handleDiagnose}
              isLoading={isDiagnosing}
              diagnosis={diagnosisText}
              sections={diagnosisSections}
              extractedCode={extractedCode}
              error={diagnosisError}
              onApplyCode={handleApplyCode}
              activeModel={selectedModel}
              provider={providerUsed}
              onOpenSettings={() => setIsSettingsOpen(true)}
              hasRun={hasRun}
            />
          </div>
        </div>
      </main>

      {/* Bottom Code Health Status Bar */}
      <CodeHealthBar health={codeHealth} />

      {/* Modals */}
      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onSelectProblem={handleSelectProblem}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        items={historyItems}
        onDeleteItem={handleDeleteHistoryItem}
        onRestore={handleRestoreHistory}
        isLoading={isLoadingHistory}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        groqApiKey={groqApiKey}
        onSaveGroqApiKey={handleSaveGroqApiKey}
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
        timeoutSec={timeoutSec}
        onSetTimeout={handleSetTimeout}
        availableModels={availableModels}
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}
