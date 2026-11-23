import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  Clock,
  Eye,
  CheckCircle2,
  AlertCircle,
  Play
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';

export const AnalysisHistory = () => {
  const [history, setHistory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterType, setFilterType] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.getHistory({
        analysis_type: filterType === 'All' ? undefined : filterType,
        search: search || undefined
      });
      setHistory(res.data);
    } catch (err) {
      addToast("Failed to fetch history: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [filterType]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this analysis record?")) return;
    try {
      await api.deleteHistory(id);
      addToast("Record deleted from history", "info");
      if (selectedItem?.id === id) setSelectedItem(null);
      await fetchHistory();
    } catch (err) {
      addToast("Failed to delete: " + err.message, "error");
    }
  };

  const handleViewDetail = async (id) => {
    try {
      const res = await api.getHistoryDetail(id);
      setSelectedItem(res.data);
    } catch (err) {
      addToast("Failed to load details: " + err.message, "error");
    }
  };

  const types = ['All', 'RFM', 'KMeans', 'Forecast', 'Sales', 'Statistics', 'Manual'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] p-5 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-sky-400" />
            <span>Analysis History & Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Persisted execution records in SQLite with full parameter history and empirical results.
          </p>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filterType === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); fetchHistory(); }} className="flex items-center gap-2 w-full md:w-80">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search analysis name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
          <button type="submit" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg">
            Filter
          </button>
        </form>
      </div>

      {/* History Grid: Table & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Table */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden shadow-sm lg:col-span-2">
          <div className="overflow-x-auto max-h-[580px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Analysis Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Dataset</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No analyses recorded yet. Run RFM, K-Means, or Forecasting to generate records.
                    </td>
                  </tr>
                ) : (
                  history.map(item => (
                    <tr
                      key={item.id}
                      onClick={() => handleViewDetail(item.id)}
                      className={`cursor-pointer hover:bg-slate-800/40 transition-colors ${
                        selectedItem?.id === item.id ? 'bg-blue-600/15 border-l-2 border-blue-500' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-white truncate max-w-xs">{item.analysis_name}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-sky-300">
                          {item.analysis_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 truncate max-w-[120px]">{item.dataset_name}</td>
                      <td className="py-2.5 px-3 font-mono text-emerald-400">{item.execution_duration}s</td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Record Inspector */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm lg:col-span-1 flex flex-col h-[580px]">
          {selectedItem ? (
            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 block mb-1">
                  {selectedItem.analysis_type} Record
                </span>
                <h3 className="text-sm font-bold text-white">{selectedItem.analysis_name}</h3>
                <span className="text-[11px] text-slate-400">ID: {selectedItem.id}</span>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-1">Execution Parameters:</span>
                <pre className="p-2.5 bg-slate-950 rounded-lg text-[11px] font-mono text-sky-300 overflow-x-auto border border-slate-800">
                  {JSON.stringify(selectedItem.parameters, null, 2)}
                </pre>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-1">Empirical Result Payload:</span>
                <pre className="p-2.5 bg-slate-950 rounded-lg text-[11px] font-mono text-emerald-300 overflow-x-auto border border-slate-800 max-h-56">
                  {JSON.stringify(selectedItem.result_data, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center">
              <Eye className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs">Select an analysis record from the left to inspect parameters and results.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
