import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import {
  BarChart3,
  TrendingUp,
  Package,
  Globe,
  DollarSign,
  ShoppingCart,
  RefreshCw,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';
import { LoadingState } from '../components/LoadingState';

export const SalesAnalysis = ({ activeDataset }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [topN, setTopN] = useState(10);
  const { addToast } = useToast();

  const fetchSalesAnalysis = async () => {
    if (!activeDataset) return;
    setLoading(true);
    try {
      const res = await api.runSalesAnalysis({
        dataset_id: activeDataset,
        top_n: Number(topN)
      });
      setData(res.data.data);
      addToast(`Sales analysis computed in R (${res.data.duration}s)!`, "success");
    } catch (err) {
      addToast("Failed to compute sales analysis: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesAnalysis();
  }, [activeDataset, topN]);

  const kpi = data?.kpi || {};
  const monthly = data?.monthly_trend || [];
  const topProds = data?.top_products || [];
  const bottomProds = data?.bottom_products || [];
  const countrySales = data?.country_sales || [];

  if (loading && !data) {
    return <LoadingState message="Aggregating sales metrics in R..." subMessage="Computing monthly/daily trends, product velocity, and market distribution" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] p-5 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-400" />
            <span>Comprehensive Sales Analysis</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Empirical transactional breakdown computed via R dplyr: velocity, margins, and catalog performance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400">Top/Bottom N:</span>
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value={5} className="bg-slate-900">5 Products</option>
              <option value={10} className="bg-slate-900">10 Products</option>
              <option value={15} className="bg-slate-900">15 Products</option>
            </select>
          </div>

          <button
            onClick={fetchSalesAnalysis}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Recompute</span>
          </button>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0F172A]">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Net Total Revenue</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">£{Number(kpi.total_revenue || 0).toLocaleString()}</div>
          <span className="text-[11px] text-slate-500">Across {kpi.total_orders?.toLocaleString()} orders</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0F172A]">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Average Order Value</span>
          <div className="text-xl font-bold text-sky-400 mt-1">£{Number(kpi.average_order_value || 0).toFixed(2)}</div>
          <span className="text-[11px] text-slate-500">Per transaction</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0F172A]">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Quantity Sold</span>
          <div className="text-xl font-bold text-purple-400 mt-1">{Number(kpi.total_quantity || 0).toLocaleString()}</div>
          <span className="text-[11px] text-slate-500">Units delivered</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0F172A]">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Active Customers</span>
          <div className="text-xl font-bold text-amber-400 mt-1">{kpi.total_customers?.toLocaleString()}</div>
          <span className="text-[11px] text-slate-500">Identified buyers</span>
        </div>
      </div>

      {/* Monthly Sales Breakdown Table & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-white">Monthly Transactional Progression</h2>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3">Revenue (£)</th>
                  <th className="py-2.5 px-3">Invoices</th>
                  <th className="py-2.5 px-3">Units Sold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200 font-mono text-[11px]">
                {monthly.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-sky-400">{m.Month}</td>
                    <td className="py-2.5 px-3 font-sans font-semibold text-white">£{Number(m.Revenue || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3">{m.Orders?.toLocaleString()}</td>
                    <td className="py-2.5 px-3">{m.Quantity?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Revenue Bars (Plotly) */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-white mb-2">Monthly Revenue Volume</h2>
          <div className="h-72 w-full">
            <Plot
              data={[
                {
                  x: monthly.map(m => m.Month),
                  y: monthly.map(m => m.Revenue),
                  type: 'bar',
                  marker: {
                    color: '#3B82F6',
                    opacity: 0.85
                  }
                }
              ]}
              layout={{
                autosize: true,
                margin: { l: 50, r: 20, t: 10, b: 35 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                xaxis: { color: '#94A3B8', gridcolor: '#1E293B', tickangle: -30 },
                yaxis: { color: '#94A3B8', gridcolor: '#1E293B' }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        </div>
      </div>

      {/* Top vs Lowest Performing Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Best-Sellers */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
              <span>Best-Selling Products (Top {topN})</span>
            </h3>
          </div>
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">SKU</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3">Revenue (£)</th>
                  <th className="py-2 px-3">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {topProds.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-mono text-sky-400 text-[11px]">{p.StockCode}</td>
                    <td className="py-2 px-3 truncate max-w-xs">{p.Description}</td>
                    <td className="py-2 px-3 font-semibold text-emerald-400 font-mono">£{Number(p.Total_Revenue || 0).toLocaleString()}</td>
                    <td className="py-2 px-3 font-mono">{p.Total_Quantity?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lowest-Performing */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
              <span>Lowest-Performing Products (Bottom {topN})</span>
            </h3>
          </div>
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">SKU</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3">Revenue (£)</th>
                  <th className="py-2 px-3">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {bottomProds.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">{p.StockCode}</td>
                    <td className="py-2 px-3 truncate max-w-xs">{p.Description}</td>
                    <td className="py-2 px-3 font-semibold text-rose-400 font-mono">£{Number(p.Total_Revenue || 0).toLocaleString()}</td>
                    <td className="py-2 px-3 font-mono">{p.Total_Quantity?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
