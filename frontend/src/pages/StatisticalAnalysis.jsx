import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import {
  Calculator,
  RefreshCw,
  Sliders,
  Layers,
  Activity,
  TableProperties
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';
import { LoadingState } from '../components/LoadingState';

export const StatisticalAnalysis = ({ activeDataset }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCols, setSelectedCols] = useState(['Quantity', 'UnitPrice', 'Revenue']);
  const { addToast } = useToast();

  const runStats = async () => {
    if (!activeDataset) return;
    setLoading(true);
    try {
      const res = await api.runStatistics({
        dataset_id: activeDataset,
        columns: selectedCols
      });
      setData(res.data.data);
      addToast(`Statistical calculations completed in R (${res.data.duration}s)!`, "success");
    } catch (err) {
      addToast("Statistical analysis failed: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runStats();
  }, [activeDataset]);

  const stats = data?.statistics || {};
  const corMatrix = data?.correlation_matrix || {};
  const covMatrix = data?.covariance_matrix || {};

  if (loading && !data) {
    return <LoadingState message="Executing statistical functions in R..." subMessage="Computing moments, quantiles, variance, and correlation matrix" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] p-5 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Calculator className="w-5 h-5 text-sky-400" />
            <span>Statistical Analysis & Correlation</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Empirical parametric & non-parametric statistics computed via R stats: moments, quantiles, variance, IQR, covariance.
          </p>
        </div>

        <button
          onClick={runStats}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Recompute Statistics</span>
        </button>
      </div>

      {/* Summary Statistics Table */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-bold text-white">Descriptive Statistics & Measures of Dispersion</h2>
          <p className="text-xs text-slate-400">Computed across valid non-null numerical transactions in R.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Metric</th>
                {Object.keys(stats).map((col, idx) => (
                  <th key={idx} className="py-2.5 px-3 text-sky-400">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200 font-mono text-[11px]">
              <tr>
                <td className="py-2 px-3 font-sans font-semibold text-slate-400">Sample Count (N)</td>
                {Object.values(stats).map((s, i) => <td key={i} className="py-2 px-3">{s.count?.toLocaleString()}</td>)}
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-semibold text-slate-400">Arithmetic Mean</td>
                {Object.values(stats).map((s, i) => <td key={i} className="py-2 px-3 font-semibold text-white">{s.mean}</td>)}
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-semibold text-slate-400">Median (50th Percentile)</td>
                {Object.values(stats).map((s, i) => <td key={i} className="py-2 px-3 text-emerald-400">{s.median}</td>)}
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-semibold text-slate-400">Mode</td>
                {Object.values(stats).map((s, i) => <td key={i} className="py-2 px-3">{s.mode}</td>)}
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-semibold text-slate-400">Minimum</td>
                {Object.values(stats).map((s, i) => <td key={i} className="py-2 px-3">{s.min}</td>)}
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-semibold text-slate-400">Maximum</td>
                {Object.values(stats).map((s, i) => <td key={i} className="py-2 px-3">{s.max}</td>)}
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-semibold text-slate-400">Range (Max - Min)</td>
                {Object.values(stats).map((s, i) => <td key={i} className="py-2 px-3">{s.range}</td>)}
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-semibold text-slate-400">Variance (s²)</td>
                {Object.values(stats).map((s, i) => <td key={i} className="py-2 px-3">{s.variance}</td>)}
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-semibold text-slate-400">Standard Deviation (s)</td>
                {Object.values(stats).map((s, i) => <td key={i} className="py-2 px-3 font-semibold text-sky-300">{s.std_dev}</td>)}
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-semibold text-slate-400">Interquartile Range (IQR)</td>
                {Object.values(stats).map((s, i) => <td key={i} className="py-2 px-3">{s.iqr}</td>)}
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-semibold text-slate-400">Skewness Coefficient</td>
                {Object.values(stats).map((s, i) => <td key={i} className="py-2 px-3">{s.skewness}</td>)}
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-semibold text-slate-400">95th Percentile</td>
                {Object.values(stats).map((s, i) => <td key={i} className="py-2 px-3 text-amber-400">{s.quantiles?.q95}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Correlation Matrix & Distribution Render */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Correlation Matrix Heatmap Table */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-white">Pearson Correlation Matrix (cor())</h2>
          <p className="text-xs text-slate-400">Linear association between numeric transactional variables (-1 to +1).</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Variable</th>
                  {Object.keys(corMatrix).map((k, i) => <th key={i} className="py-2.5 px-3">{k}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {Object.entries(corMatrix).map(([rowKey, rowVals], idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-3 font-semibold text-sky-400 font-sans">{rowKey}</td>
                    {Object.values(rowVals).map((val, vIdx) => {
                      const num = Number(val);
                      const isHigh = Math.abs(num) > 0.5 && Math.abs(num) < 1;
                      return (
                        <td key={vIdx} className={`py-2.5 px-3 ${isHigh ? 'text-emerald-400 font-bold' : ''}`}>
                          {num.toFixed(3)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real R ggplot2 Histogram Output */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white">Distribution Analysis (ggplot2)</h2>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                Direct R Graphics Output
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">Revenue distribution histogram with mean and median overlay</p>
          </div>
          {data?.chart_file ? (
            <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center p-2">
              <img
                src={`/outputs/jobs/${data.chart_file}`}
                onError={(e) => {
                  e.target.src = `/outputs/jobs/stats_distribution.png`;
                }}
                alt="Distribution plot"
                className="max-h-64 object-contain rounded"
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">
              No ggplot2 graphic generated
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
