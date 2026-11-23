import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  Layers,
  ArrowUpRight,
  Filter,
  Download
} from 'lucide-react';
import { api } from '../services/api';
import { MetricCard } from '../components/MetricCard';
import { LoadingState, EmptyState } from '../components/LoadingState';
import { useToast } from '../components/ToastContext';

export const Dashboard = ({ activeDataset }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('All');
  const { addToast } = useToast();

  const fetchDashboard = async () => {
    if (!activeDataset) return;
    setLoading(true);
    try {
      const res = await api.getDashboard(activeDataset);
      setData(res.data);
    } catch (err) {
      console.error(err);
      addToast("Failed to load dashboard data: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [activeDataset]);

  if (loading && !data) {
    return <LoadingState message="Computing real-time analytics in R..." subMessage="Processing transactions and aggregating metrics" />;
  }

  if (!data || !data.kpi) {
    return (
      <EmptyState
        title="No Analytics Available"
        description="Please select or upload a dataset to generate real R dashboard analytics."
        icon={Layers}
        actionButton={
          <button
            onClick={() => api.loadSampleDataset().then(() => fetchDashboard())}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
          >
            Load Sample Dataset
          </button>
        }
      />
    );
  }

  const kpi = data.kpi || {};
  const monthly = data.monthly_trend || [];
  const topProducts = data.top_products || [];
  const countrySales = data.country_sales || [];

  // Filter country data if selected
  const countries = ['All', ...countrySales.map(c => c.Country)];

  return (
    <div className="space-y-6">
      {/* Top Banner / Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] p-5 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Executive E-Commerce Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time analytical processing powered by Rscript & dplyr engine.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <Filter className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400 font-medium">Country Filter:</span>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              {countries.slice(0, 15).map(c => (
                <option key={c} value={c} className="bg-slate-900">{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Total Revenue"
          value={`£${(kpi.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Net valid spending"
          icon={DollarSign}
          color="emerald"
        />
        <MetricCard
          title="Total Orders"
          value={(kpi.total_orders || 0).toLocaleString()}
          subtitle="Unique valid invoices"
          icon={ShoppingCart}
          color="blue"
        />
        <MetricCard
          title="Total Customers"
          value={(kpi.total_customers || 0).toLocaleString()}
          subtitle="Active buyer accounts"
          icon={Users}
          color="sky"
        />
        <MetricCard
          title="Total Products"
          value={(kpi.total_products || 0).toLocaleString()}
          subtitle="Catalog SKU count"
          icon={Package}
          color="purple"
        />
        <MetricCard
          title="Average Order Value"
          value={`£${(kpi.average_order_value || 0).toFixed(2)}`}
          subtitle="Revenue per invoice"
          icon={TrendingUp}
          color="amber"
        />
        <MetricCard
          title="Quantity Sold"
          value={(kpi.total_quantity || 0).toLocaleString()}
          subtitle="Total units shipped"
          icon={Layers}
          color="rose"
        />
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Monthly Revenue Velocity</h2>
              <p className="text-xs text-slate-400">Monthly revenue calculated via R aggregation</p>
            </div>
            <span className="text-[11px] font-semibold text-sky-400 bg-sky-950/60 border border-sky-800/50 px-2.5 py-1 rounded-md">
              R dplyr
            </span>
          </div>
          <div className="h-72 w-full">
            <Plot
              data={[
                {
                  x: monthly.map(m => m.Month),
                  y: monthly.map(m => m.Revenue),
                  type: 'scatter',
                  mode: 'lines+markers',
                  marker: { color: '#38BDF8', size: 6 },
                  line: { color: '#38BDF8', width: 3, shape: 'spline' },
                  fill: 'tozeroy',
                  fillcolor: 'rgba(56, 189, 248, 0.08)'
                }
              ]}
              layout={{
                autosize: true,
                margin: { l: 45, r: 20, t: 10, b: 35 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                xaxis: { color: '#94A3B8', gridcolor: '#1E293B', tickangle: -30 },
                yaxis: { color: '#94A3B8', gridcolor: '#1E293B' },
                hovermode: 'x unified'
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        </div>

        {/* Top 10 Best Selling Products */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Top 10 Best-Selling Products</h2>
              <p className="text-xs text-slate-400">Ranked by aggregate sales revenue (£)</p>
            </div>
            <span className="text-[11px] font-semibold text-blue-400 bg-blue-950/60 border border-blue-800/50 px-2.5 py-1 rounded-md">
              Top SKUs
            </span>
          </div>
          <div className="h-72 w-full">
            <Plot
              data={[
                {
                  y: topProducts.map(p => (p.Description || p.StockCode).substring(0, 22)).reverse(),
                  x: topProducts.map(p => p.Total_Revenue).reverse(),
                  type: 'bar',
                  orientation: 'h',
                  marker: {
                    color: '#3B82F6',
                    opacity: 0.85
                  }
                }
              ]}
              layout={{
                autosize: true,
                margin: { l: 140, r: 20, t: 10, b: 35 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                xaxis: { color: '#94A3B8', gridcolor: '#1E293B' },
                yaxis: { color: '#94A3B8', gridcolor: 'transparent' }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        </div>
      </div>

      {/* Row 2: Country Distribution & R-Generated Graphic */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Country Revenue Breakdown */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm lg:col-span-1">
          <h2 className="text-sm font-bold text-white mb-1">Geographic Revenue Distribution</h2>
          <p className="text-xs text-slate-400 mb-4">Country share percentage</p>
          <div className="h-64 w-full">
            <Plot
              data={[
                {
                  labels: countrySales.slice(0, 7).map(c => c.Country),
                  values: countrySales.slice(0, 7).map(c => c.Revenue),
                  type: 'pie',
                  hole: 0.55,
                  marker: {
                    colors: ['#3B82F6', '#38BDF8', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#64748B']
                  },
                  textinfo: 'percent',
                  hoverinfo: 'label+value+percent'
                }
              ]}
              layout={{
                autosize: true,
                margin: { l: 10, r: 10, t: 10, b: 10 },
                paper_bgcolor: 'transparent',
                showlegend: true,
                legend: { font: { color: '#CBD5E1', size: 10 }, orientation: 'h' }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        </div>

        {/* Real R ggplot2 Graphic Render */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white">R ggplot2 Engine Render</h2>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                Direct R Graphics Output
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">Actual plot image rendered by R ggplot2 subprocess on the backend.</p>
          </div>
          {data.chart_url ? (
            <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950/40 flex items-center justify-center p-2">
              <img
                src={data.chart_url}
                alt="R ggplot2 rendered sales overview"
                className="max-h-72 object-contain rounded-md"
              />
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">
              No R chart generated yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
