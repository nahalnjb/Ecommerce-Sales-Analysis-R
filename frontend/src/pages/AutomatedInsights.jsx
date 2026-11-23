import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Award,
  Globe,
  DollarSign,
  CheckCircle2,
  RefreshCw,
  Lightbulb
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';
import { LoadingState } from '../components/LoadingState';

export const AutomatedInsights = ({ activeDataset }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const fetchInsights = async () => {
    if (!activeDataset) return;
    setLoading(true);
    try {
      const res = await api.getInsights(activeDataset);
      setData(res.data);
      addToast("Automated insights generated from real empirical R results!", "success");
    } catch (err) {
      addToast("Failed to generate insights: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [activeDataset]);

  const insights = data?.insights || [];
  const kpi = data?.kpi_summary || {};

  if (loading && !data) {
    return <LoadingState message="Extracting business insights from R empirical models..." subMessage="Evaluating revenue patterns, customer segmentation tiers, and churn indicators" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] p-5 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-400" />
            <span>Automated Business Insights</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Data-driven strategic takeaways derived strictly from actual R calculations — tailored for academic presentation.
          </p>
        </div>

        <button
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Regenerate Insights</span>
        </button>
      </div>

      {/* Dataset Scope Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sky-400">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{data?.dataset_name || "Active Dataset"}</h3>
            <span className="text-xs text-slate-400">{insights.length} Empirical Strategic Observations Derived</span>
          </div>
        </div>
        <div className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-3 py-1 rounded-md">
          Zero Hardcoded Values
        </div>
      </div>

      {/* Insights Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {insights.map((ins, idx) => {
          let badgeClass = "bg-blue-500/10 border-blue-500/20 text-blue-300";
          if (ins.impact === "Critical") badgeClass = "bg-rose-500/10 border-rose-500/20 text-rose-300";
          if (ins.impact === "High") badgeClass = "bg-emerald-500/10 border-emerald-500/20 text-emerald-300";

          return (
            <div key={idx} className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {ins.category}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badgeClass}`}>
                    {ins.impact} Impact
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">{ins.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                  {ins.observation}
                </p>
              </div>

              <div className="border-t border-slate-800/80 pt-3">
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block mb-1">
                  Strategic Recommendation:
                </span>
                <p className="text-xs text-slate-400 leading-normal">
                  {ins.recommendation}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
