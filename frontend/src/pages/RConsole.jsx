import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Copy,
  Download,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';

export const RConsole = () => {
  const [history, setHistory] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await api.getHistory({ analysis_type: 'Ad-hoc R Script' });
      const scriptJobs = res.data;
      setHistory(scriptJobs);
      if (scriptJobs.length > 0 && !selectedJob) {
        loadJobDetail(scriptJobs[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadJobDetail = async (id) => {
    try {
      const res = await api.getHistoryDetail(id);
      setSelectedJob(res.data);
    } catch (err) {
      addToast("Failed to load job details: " + err.message, "error");
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleCopy = () => {
    if (!selectedJob) return;
    const text = `=== STDOUT ===\n${selectedJob.result_data?.stdout || ""}\n\n=== STDERR ===\n${selectedJob.result_data?.stderr || ""}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast("Console output copied to clipboard", "info");
  };

  const handleDownloadLog = () => {
    if (!selectedJob) return;
    const logContent = `Rscript Execution Log\nJob ID: ${selectedJob.id}\nDuration: ${selectedJob.execution_duration}s\nTimestamp: ${selectedJob.created_at}\n\n=== STDOUT ===\n${selectedJob.result_data?.stdout || ""}\n\n=== STDERR ===\n${selectedJob.result_data?.stderr || ""}`;
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `r_execution_${selectedJob.id.slice(0, 8)}.log`;
    link.click();
    URL.revokeObjectURL(url);
    addToast("Execution log downloaded", "success");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] p-5 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Terminal className="w-5 h-5 text-sky-400" />
            <span>R Console & Output Stream</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time execution log audit, standard input/output inspection, and error telemetry.
          </p>
        </div>
        <button
          onClick={fetchJobs}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Execution Run History List */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 lg:col-span-1 flex flex-col h-[600px]">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Recent Executions ({history.length})
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {history.length === 0 ? (
              <div className="text-xs text-slate-500 py-8 text-center">No script runs logged yet.</div>
            ) : (
              history.map(job => (
                <div
                  key={job.id}
                  onClick={() => loadJobDetail(job.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedJob?.id === job.id
                      ? 'bg-blue-600/15 border-blue-500/40'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white truncate max-w-[170px]">
                      {job.analysis_name}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {job.execution_duration}s
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{job.created_at ? new Date(job.created_at).toLocaleTimeString() : ''}</span>
                    <span className="capitalize text-emerald-300">{job.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Console Log Viewer */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 lg:col-span-2 flex flex-col h-[600px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold text-white block">
                {selectedJob ? selectedJob.analysis_name : "Live Terminal"}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {selectedJob ? `Job ID: ${selectedJob.id}` : "Select a job from the left"}
              </span>
            </div>
            {selectedJob && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
                  title="Copy log to clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[11px]">{copied ? "Copied" : "Copy"}</span>
                </button>
                <button
                  onClick={handleDownloadLog}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
                  title="Download execution log"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Download</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 bg-slate-950 rounded-lg p-4 font-mono text-xs overflow-y-auto border border-slate-800 text-slate-200">
            {selectedJob ? (
              <div className="space-y-4">
                <div>
                  <span className="text-sky-400 text-[11px] font-bold block mb-1">--- STANDARD OUTPUT ---</span>
                  <pre className="whitespace-pre-wrap leading-relaxed text-slate-200">
                    {selectedJob.result_data?.stdout || "[Process produced no standard output]"}
                  </pre>
                </div>

                {selectedJob.result_data?.stderr && (
                  <div>
                    <span className="text-rose-400 text-[11px] font-bold block mb-1">--- ERROR OUTPUT ---</span>
                    <pre className="whitespace-pre-wrap leading-relaxed text-rose-300">
                      {selectedJob.result_data.stderr}
                    </pre>
                  </div>
                )}

                {selectedJob.chart_paths?.length > 0 && (
                  <div>
                    <span className="text-emerald-400 text-[11px] font-bold block mb-2">--- GENERATED ARTIFACTS ---</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedJob.chart_paths.map((imgUrl, i) => (
                        <div key={i} className="border border-slate-800 rounded bg-slate-900 p-2">
                          <img src={imgUrl} alt={`Chart ${i}`} className="w-full object-contain rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                Select an execution log to inspect console outputs
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
