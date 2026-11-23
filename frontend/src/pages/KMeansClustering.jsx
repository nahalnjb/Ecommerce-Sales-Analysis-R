import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import {
  GitGraph,
  Sliders,
  RefreshCw,
  Layers,
  Sparkles,
  PieChart,
  TrendingUp,
  Award
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';
import { LoadingState } from '../components/LoadingState';

export const KMeansClustering = ({ activeDataset }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [k, setK] = useState(4);
  const [maxIter, setMaxIter] = useState(100);
  const [nStart, setNStart] = useState(25);
  const { addToast } = useToast();

  const runKMeans = async () => {
    if (!activeDataset) return;
    setLoading(true);
    try {
      const res = await api.runKMeans({
        dataset_id: activeDataset,
        k: Number(k),
        max_iter: Number(maxIter),
        n_start: Number(nStart)
      });
      setData(res.data.data);
      addToast(`K-Means (K=${k}) completed in R (${res.data.duration}s)!`, "success");
    } catch (err) {
      addToast("K-Means execution failed: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runKMeans();
  }, [activeDataset]);

  const profiles = data?.cluster_profiles || [];
  const elbow = data?.elbow_curve || [];
  const samples = data?.customer_samples || [];

  if (loading && !data) {
    return <LoadingState message="Running stats::kmeans() in R..." subMessage="Standardizing features, computing WSS elbow curve, and fitting clusters" />;
  }

  return (
    <div className="space-y-6">
      {/* Header & Parameter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] p-5 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <GitGraph className="w-5 h-5 text-sky-400" />
            <span>K-Means Customer Clustering</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Unsupervised machine learning executed in R using stats::kmeans() on log-scaled RFM behavior features.
          </p>
        </div>

        {/* Parameters Form */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400 font-semibold">K (Clusters):</span>
            <select
              value={k}
              onChange={(e) => setK(Number(e.target.value))}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              {[2, 3, 4, 5, 6, 7, 8].map(num => (
                <option key={num} value={num} className="bg-slate-900">{num} Clusters</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400">Max Iter:</span>
            <input
              type="number"
              value={maxIter}
              onChange={(e) => setMaxIter(e.target.value)}
              className="bg-transparent text-white w-14 font-mono focus:outline-none"
            />
          </div>

          <button
            onClick={runKMeans}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? "Clustering in R..." : "Fit K-Means"}</span>
          </button>
        </div>
      </div>

      {/* Variance & Stat Badges */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0F172A]">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Variance Explained</span>
            <div className="text-xl font-bold text-emerald-400 mt-1">{data.explained_variance_ratio}%</div>
            <span className="text-[11px] text-slate-500">BetweenSS / TotalSS</span>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0F172A]">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Total WithinSS</span>
            <div className="text-xl font-bold text-sky-400 mt-1">{Number(data.tot_withinss || 0).toLocaleString()}</div>
            <span className="text-[11px] text-slate-500">Cluster compactness</span>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0F172A]">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">BetweenSS</span>
            <div className="text-xl font-bold text-purple-400 mt-1">{Number(data.betweenss || 0).toLocaleString()}</div>
            <span className="text-[11px] text-slate-500">Inter-cluster separation</span>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0F172A]">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Customers</span>
            <div className="text-xl font-bold text-white mt-1">{data.total_customers?.toLocaleString()}</div>
            <span className="text-[11px] text-slate-500">Segmented records</span>
          </div>
        </div>
      )}

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Elbow Curve */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Elbow Method (Optimal K Analysis)</h2>
              <p className="text-xs text-slate-400">Within-Cluster Sum of Squares (WSS) vs Cluster Count K</p>
            </div>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 border border-sky-800/40 px-2 py-0.5 rounded">
              WSS & Silhouette
            </span>
          </div>
          <div className="h-72 w-full">
            <Plot
              data={[
                {
                  x: elbow.map(e => e.k),
                  y: elbow.map(e => e.wss),
                  type: 'scatter',
                  mode: 'lines+markers',
                  name: 'WSS (Elbow)',
                  marker: { color: '#38BDF8', size: 8 },
                  line: { color: '#38BDF8', width: 2.5 }
                }
              ]}
              layout={{
                autosize: true,
                margin: { l: 50, r: 20, t: 10, b: 35 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                xaxis: { title: 'Number of Clusters (K)', color: '#94A3B8', gridcolor: '#1E293B' },
                yaxis: { title: 'WithinSS', color: '#94A3B8', gridcolor: '#1E293B' }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        </div>

        {/* Cluster Scatter / R ggplot2 Graphic Render */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white">R ggplot2 Cluster Scatter</h2>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                Direct R Graphics Output
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">Bivariate Frequency vs Monetary cluster projection</p>
          </div>
          {data?.chart_file ? (
            <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center p-2">
              <img
                src={`/outputs/jobs/${data.chart_file}`}
                onError={(e) => {
                  e.target.src = `/outputs/jobs/kmeans_clusters.png`;
                }}
                alt="K-Means clusters"
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

      {/* Cluster Profiles Table */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white">Cluster Statistical Profiles & Interpretation</h3>
          <p className="text-xs text-slate-400">
            Cluster centers transformed back to original physical scales (days, order counts, £ spend) for business interpretability.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Cluster ID</th>
                <th className="py-2.5 px-3">Profile Name</th>
                <th className="py-2.5 px-3">Customer Count</th>
                <th className="py-2.5 px-3">% Base</th>
                <th className="py-2.5 px-3">Avg Recency</th>
                <th className="py-2.5 px-3">Avg Frequency</th>
                <th className="py-2.5 px-3">Avg Monetary (£)</th>
                <th className="py-2.5 px-3">Total Spend (£)</th>
                <th className="py-2.5 px-3">% Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200 font-mono text-[11px]">
              {profiles.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-semibold text-sky-400">Cluster {p.Cluster}</td>
                  <td className="py-2.5 px-3 font-sans font-medium text-white">{p.Cluster_Name}</td>
                  <td className="py-2.5 px-3">{p.Size?.toLocaleString()}</td>
                  <td className="py-2.5 px-3">{p.Size_Percentage}%</td>
                  <td className="py-2.5 px-3">{p.Avg_Recency} days</td>
                  <td className="py-2.5 px-3">{p.Avg_Frequency} orders</td>
                  <td className="py-2.5 px-3 font-sans font-semibold text-white">£{Number(p.Avg_Monetary || 0).toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-sans font-semibold text-emerald-400">£{Number(p.Total_Spend || 0).toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-semibold text-sky-300">{p.Spend_Percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
