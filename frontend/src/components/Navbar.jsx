import React, { useEffect, useState } from 'react';
import { Database, RefreshCw, Terminal, ExternalLink, Activity } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from './ToastContext';

export const Navbar = ({ activeDataset, setActiveDataset, onRefresh }) => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const fetchDatasets = async () => {
    try {
      const res = await api.getDatasets();
      setDatasets(res.data);
      if (!activeDataset && res.data.length > 0) {
        const def = res.data.find(d => d.is_default) || res.data[0];
        setActiveDataset(def.id);
      }
    } catch (err) {
      console.error("Failed to fetch datasets", err);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetchDatasets();
      if (onRefresh) await onRefresh();
      addToast("System state refreshed", "info");
    } catch (err) {
      addToast("Refresh failed: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-[#0F172A]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6">
      {/* Active Dataset Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg">
          <Database className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold text-slate-300">Active Dataset:</span>
          <select
            value={activeDataset || ''}
            onChange={(e) => setActiveDataset(e.target.value)}
            className="bg-transparent text-xs font-medium text-white border-none focus:outline-none cursor-pointer pr-4"
          >
            {datasets.map(d => (
              <option key={d.id} value={d.id} className="bg-slate-900 text-slate-100">
                {d.name} ({d.row_count?.toLocaleString()} rows)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status & Quick Actions */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-medium">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>R Engine: Online</span>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors"
          title="Refresh dataset analysis"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>

        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-sky-400 text-xs font-medium border border-blue-500/30 transition-colors"
        >
          <span>FastAPI Docs</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </header>
  );
};
