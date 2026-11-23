import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Play,
  RotateCcw,
  Search,
  Filter,
  DollarSign,
  Calendar,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';
import { LoadingState } from '../components/LoadingState';

export const ManualAnalysis = ({ activeDataset }) => {
  const [params, setParams] = useState({
    country: '',
    customer_id: '',
    product_code: '',
    date_from: '',
    date_to: '',
    min_revenue: '',
    max_revenue: '',
    analysis_type: 'comprehensive'
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { addToast } = useToast();

  const handleRun = async (e) => {
    e.preventDefault();
    if (!activeDataset) {
      addToast("Please select an active dataset first.", "info");
      return;
    }

    setLoading(true);
    try {
      const res = await api.runManualAnalysis({
        dataset_id: activeDataset,
        country: params.country || undefined,
        customer_id: params.customer_id || undefined,
        product_code: params.product_code || undefined,
        date_from: params.date_from || undefined,
        date_to: params.date_to || undefined,
        min_revenue: params.min_revenue ? Number(params.min_revenue) : undefined,
        max_revenue: params.max_revenue ? Number(params.max_revenue) : undefined,
        analysis_type: params.analysis_type
      });
      setResult(res.data);
      addToast(`Filtered analysis executed in R (${res.data.duration}s)!`, "success");
    } catch (err) {
      addToast("Execution failed: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setParams({
      country: '',
      customer_id: '',
      product_code: '',
      date_from: '',
      date_to: '',
      min_revenue: '',
      max_revenue: '',
      analysis_type: 'comprehensive'
    });
    setResult(null);
  };

  const resData = result?.data || {};
  const topItems = resData.top_items || [];
  const samples = resData.sample_records || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] p-5 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-sky-400" />
            <span>Interactive Parameterized Analysis</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Build tailored parametric queries sent directly to FastAPI backend and executed via an isolated R script.
          </p>
        </div>
      </div>

      {/* Filter Form Card */}
      <form onSubmit={handleRun} className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Filter className="w-4 h-4 text-sky-400" />
          <span>Query Parameters</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1 font-medium">Country Filter</label>
            <input
              type="text"
              placeholder="e.g. United Kingdom, Germany"
              value={params.country}
              onChange={(e) => setParams(p => ({ ...p, country: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Customer ID</label>
            <input
              type="text"
              placeholder="e.g. 17850"
              value={params.customer_id}
              onChange={(e) => setParams(p => ({ ...p, customer_id: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Product StockCode</label>
            <input
              type="text"
              placeholder="e.g. 85123A"
              value={params.product_code}
              onChange={(e) => setParams(p => ({ ...p, product_code: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Min Revenue (£)</label>
            <input
              type="number"
              placeholder="e.g. 50"
              value={params.min_revenue}
              onChange={(e) => setParams(p => ({ ...p, min_revenue: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Date Range From</label>
            <input
              type="date"
              value={params.date_from}
              onChange={(e) => setParams(p => ({ ...p, date_from: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Date Range To</label>
            <input
              type="date"
              value={params.date_to}
              onChange={(e) => setParams(p => ({ ...p, date_to: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Max Revenue (£)</label>
            <input
              type="number"
              placeholder="e.g. 5000"
              value={params.max_revenue}
              onChange={(e) => setParams(p => ({ ...p, max_revenue: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{loading ? "Running in R..." : "Run Analysis"}</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>

      {/* Results Display */}
      {result && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-[#0F172A]">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Filtered Revenue</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">£{Number(resData.total_revenue || 0).toLocaleString()}</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-[#0F172A]">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Transactions</span>
              <div className="text-xl font-bold text-white mt-1">{resData.total_transactions?.toLocaleString()}</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-[#0F172A]">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Orders</span>
              <div className="text-xl font-bold text-sky-400 mt-1">{resData.total_orders?.toLocaleString()}</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-[#0F172A]">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Execution Time</span>
              <div className="text-xl font-bold text-purple-400 mt-1">{result.duration}s</div>
            </div>
          </div>

          {/* Top Filtered SKUs */}
          {topItems.length > 0 && (
            <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-white">Top Contributing Items in Filtered Scope</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3">Revenue (£)</th>
                      <th className="py-2 px-3">Quantity</th>
                      <th className="py-2 px-3">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200 font-mono text-[11px]">
                    {topItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-sky-400 font-semibold">{item.StockCode}</td>
                        <td className="py-2 px-3 font-sans truncate max-w-xs">{item.Description}</td>
                        <td className="py-2 px-3 font-sans font-semibold text-emerald-400">£{Number(item.Revenue || 0).toLocaleString()}</td>
                        <td className="py-2 px-3">{item.Quantity?.toLocaleString()}</td>
                        <td className="py-2 px-3">{item.Orders?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Raw R Standard Output */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">R Execution Console Output</h3>
            <pre className="p-3 bg-slate-950 rounded-lg text-xs font-mono text-slate-300 whitespace-pre-wrap border border-slate-800">
              {result.stdout || "[No stdout produced]"}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
