import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Code2,
  Play,
  Copy,
  ExternalLink,
  Tag,
  Check,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';

export const RScriptLibrary = ({ activeDataset }) => {
  const [scripts, setScripts] = useState([]);
  const [selectedScript, setSelectedScript] = useState(null);
  const [category, setCategory] = useState('All');
  const [executing, setExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const fetchScripts = async () => {
    try {
      const res = await api.getScripts();
      setScripts(res.data);
      if (res.data.length > 0 && !selectedScript) {
        setSelectedScript(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchScripts();
  }, []);

  const categories = ['All', 'Fundamentals', 'Data Wrangling', 'Statistical Analysis', 'Sales Analytics', 'Customer Analytics', 'Machine Learning', 'Time-Series', 'Visualizations'];

  const filteredScripts = category === 'All'
    ? scripts
    : scripts.filter(s => s.category.toLowerCase() === category.toLowerCase());

  const handleOpenInStudio = (script) => {
    // Save to local storage or navigate with state
    localStorage.setItem('monaco_r_code', script.code);
    navigate('/r-studio');
    addToast(`Loaded "${script.title}" into R Programming Studio`, "info");
  };

  const handleDirectExecute = async (script) => {
    setExecuting(true);
    try {
      const res = await api.executeRCode({
        code: script.code,
        dataset_id: activeDataset || undefined,
        analysis_type: script.title
      });
      if (res.data.success) {
        addToast(`Executed "${script.title}" in ${res.data.duration}s!`, "success");
        navigate('/r-console');
      } else {
        addToast(`Execution failed: ${res.data.stderr}`, "error");
      }
    } catch (err) {
      addToast("Failed to execute script: " + err.message, "error");
    } finally {
      setExecuting(false);
    }
  };

  const handleCopyCode = () => {
    if (!selectedScript) return;
    navigator.clipboard.writeText(selectedScript.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast("Script code copied to clipboard", "info");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] p-5 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <span>Curated R Script Library</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            12 academic reference scripts spanning R calculations, data wrangling, RFM scoring, K-Means, forecasting, and ggplot2.
          </p>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              category === cat
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid: Script List and Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scripts List */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 lg:col-span-1 flex flex-col h-[620px]">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Reference Programs ({filteredScripts.length})
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredScripts.map(s => (
              <div
                key={s.id}
                onClick={() => setSelectedScript(s)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedScript?.id === s.id
                    ? 'bg-blue-600/15 border-blue-500/40 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-white">{s.title}</span>
                  <span className="text-[10px] text-sky-400 bg-sky-950/60 border border-sky-800/40 px-2 py-0.5 rounded">
                    {s.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">{s.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Script Code Inspector */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 lg:col-span-2 flex flex-col h-[620px]">
          {selectedScript ? (
            <>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedScript.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedScript.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                  <button
                    onClick={() => handleOpenInStudio(selectedScript)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Studio</span>
                  </button>
                  <button
                    onClick={() => handleDirectExecute(selectedScript)}
                    disabled={executing}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{executing ? "Running in R..." : "Execute in R"}</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-slate-950 rounded-lg p-4 font-mono text-xs overflow-y-auto border border-slate-800 text-sky-200">
                <pre className="whitespace-pre leading-relaxed">{selectedScript.code}</pre>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              Select a script from the library to inspect its code
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
