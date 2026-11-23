import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play,
  Square,
  RotateCcw,
  Save,
  Download,
  Trash2,
  Terminal,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCode2,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';

const DEFAULT_R_CODE = `# Real R Programming Execution Environment
# Active dataset is automatically loaded as 'active_dataset' if selected

# Example: Vector & Statistical Summary
sales <- c(120, 240, 310, 450, 190, 890, 540, 620, 780, 950)
total_sales <- sum(sales)
average_sales <- mean(sales)
sales_sd <- sd(sales)

cat("=== Summary Statistics ===\\n")
cat("Total Sales:   $", total_sales, "\\n")
cat("Average Sales: $", round(average_sales, 2), "\\n")
cat("Std Deviation: $", round(sales_sd, 2), "\\n")

# If an active dataset is present, examine its dimensions
if (exists("active_dataset")) {
  cat("\\n=== Active Dataset Dimensions ===\\n")
  cat("Rows:", nrow(active_dataset), "| Columns:", ncol(active_dataset), "\\n")
  print(head(active_dataset[, c("InvoiceNo", "Quantity", "UnitPrice", "Country")], 3))
}
`;

export const RProgrammingStudio = ({ activeDataset }) => {
  const [code, setCode] = useState(DEFAULT_R_CODE);
  const [isRunning, setIsRunning] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [executionResult, setExecutionResult] = useState(null);
  const [activeTab, setActiveTab] = useState('stdout'); // stdout, stderr, plots
  const { addToast } = useToast();

  const handleRunCode = async () => {
    if (!code.trim()) {
      addToast("Please enter R code to execute.", "info");
      return;
    }
    setIsRunning(true);
    setExecutionResult(null);

    try {
      const res = await api.executeRCode({
        code,
        dataset_id: activeDataset || undefined,
        analysis_type: "Interactive R Studio Session"
      });
      setExecutionResult(res.data);
      setCurrentJobId(res.data.job_id);
      if (res.data.success) {
        addToast(`Execution completed in ${res.data.duration}s (Exit code: 0)`, "success");
        setActiveTab('stdout');
      } else {
        addToast(`Execution exited with error code ${res.data.exit_code}`, "error");
        setActiveTab('stderr');
      }
    } catch (err) {
      addToast("Failed to run R script: " + err.message, "error");
    } finally {
      setIsRunning(false);
    }
  };

  const handleStopExecution = async () => {
    if (!currentJobId) return;
    try {
      await api.stopJob(currentJobId);
      addToast("Stop signal sent to Rscript subprocess", "info");
      setIsRunning(false);
    } catch (err) {
      addToast("Failed to stop process: " + err.message, "error");
    }
  };

  const handleResetCode = () => {
    setCode(DEFAULT_R_CODE);
    addToast("Code reset to default template", "info");
  };

  const handleDownloadScript = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analysis_script_${Date.now()}.R`;
    link.click();
    URL.revokeObjectURL(url);
    addToast("R Script downloaded successfully", "success");
  };

  const handleSaveScript = async () => {
    const title = prompt("Enter a title for this R script:", "Custom R Analytics");
    if (!title) return;
    try {
      await api.saveScript({ title, code, category: "Custom", description: "Saved from R Programming Studio" });
      addToast(`Script "${title}" saved to library!`, "success");
    } catch (err) {
      addToast("Failed to save script: " + err.message, "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] p-5 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-sky-400" />
            <span>R Programming Studio</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Write, debug, and execute actual R code through the Rscript analytical engine in an isolated environment.
          </p>
        </div>

        {/* Buttons Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-pulse' : ''}`} />
            <span>{isRunning ? "Executing..." : "Run Code"}</span>
          </button>

          {isRunning && (
            <button
              onClick={handleStopExecution}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop</span>
            </button>
          )}

          <button
            onClick={handleResetCode}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            title="Reset code template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={handleSaveScript}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            title="Save script to library"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          <button
            onClick={handleDownloadScript}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            title="Download R file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .R</span>
          </button>
        </div>
      </div>

      {/* Editor & Console Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Monaco Code Editor */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 flex flex-col h-[560px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400" />
              <span>script.R (R v4.4.2)</span>
            </span>
            <span className="text-slate-500 font-mono text-[11px]">Monaco Editor</span>
          </div>

          <div className="flex-1 rounded-lg overflow-hidden border border-slate-800/80">
            <Editor
              height="100%"
              defaultLanguage="r"
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true
              }}
            />
          </div>
        </div>

        {/* Right: Output & Result Panel */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 flex flex-col h-[560px]">
          {/* Output Header Tabs */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('stdout')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === 'stdout'
                    ? 'bg-blue-600/20 text-sky-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Standard Output
              </button>
              <button
                onClick={() => setActiveTab('stderr')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === 'stderr'
                    ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Errors & Warnings
              </button>
              {executionResult?.output_files?.length > 0 && (
                <button
                  onClick={() => setActiveTab('plots')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    activeTab === 'plots'
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Plots ({executionResult.output_files.length})
                </button>
              )}
            </div>

            {/* Status Pill */}
            {executionResult && (
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3" />
                  {executionResult.duration}s
                </span>
                {executionResult.success ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Exit 0
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Exit {executionResult.exit_code}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Output Display Body */}
          <div className="flex-1 bg-slate-950 rounded-lg p-4 font-mono text-xs overflow-y-auto border border-slate-800 text-slate-200">
            {isRunning ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Rscript process running...</span>
              </div>
            ) : !executionResult ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center">
                <Terminal className="w-8 h-8 mb-2 opacity-50" />
                <p>Output from real R execution will appear here.</p>
                <p className="text-[11px] mt-1 text-slate-600">Click "Run Code" above to execute.</p>
              </div>
            ) : activeTab === 'stdout' ? (
              <pre className="whitespace-pre-wrap leading-relaxed text-slate-200 font-mono">
                {executionResult.stdout || "[Process finished with empty standard output]"}
              </pre>
            ) : activeTab === 'stderr' ? (
              <pre className="whitespace-pre-wrap leading-relaxed text-rose-300 font-mono">
                {executionResult.stderr || "[No standard errors reported by Rscript]"}
              </pre>
            ) : (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-300">Generated Visualizations:</h4>
                <div className="grid grid-cols-1 gap-4">
                  {executionResult.output_files.map((fileUrl, idx) => (
                    <div key={idx} className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/60 p-2">
                      <img src={fileUrl} alt={`Plot ${idx + 1}`} className="w-full object-contain rounded" />
                      <div className="mt-2 flex justify-between items-center text-[11px] text-slate-400">
                        <span>{fileUrl.split('/').pop()}</span>
                        <a href={fileUrl} download className="text-sky-400 hover:underline">Download</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
