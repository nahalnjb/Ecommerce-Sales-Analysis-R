import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import {
  Users,
  Award,
  AlertTriangle,
  Download,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Clock,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';
import { LoadingState, EmptyState } from '../components/LoadingState';

export const RFMSegmentation = ({ activeDataset }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('All');
  const [refDate, setRefDate] = useState('');
  const { addToast } = useToast();

  const runRFMAnalysis = async () => {
    if (!activeDataset) return;
    setLoading(true);
    try {
      const res = await api.runRFM({
        dataset_id: activeDataset,
        reference_date: refDate || undefined,
        r_bins: 5,
        f_bins: 5,
        m_bins: 5
      });
      setData(res.data.data);
      addToast(`RFM Analysis executed in R (${res.data.duration}s)!`, "success");
    } catch (err) {
      addToast("RFM calculation failed: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runRFMAnalysis();
  }, [activeDataset]);

  const summary = data?.segment_summary || [];
  const customers = data?.customer_samples || [];

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = search === '' ||
      String(c.CustomerID).toLowerCase().includes(search.toLowerCase()) ||
      String(c.Customer_Segment).toLowerCase().includes(search.toLowerCase());
    const matchesSegment = selectedSegment === 'All' || c.Customer_Segment === selectedSegment;
    return matchesSearch && matchesSegment;
  });

  const handleExportCSV = () => {
    if (!customers.length) return;
    const headers = ["CustomerID", "Country", "Recency_Days", "Frequency_Orders", "Monetary_Spend", "R_Score", "F_Score", "M_Score", "RFM_Score", "Customer_Segment"];
    const rows = customers.map(c => [
      c.CustomerID,
      c.Country || "",
      c.Recency,
      c.Frequency,
      c.Monetary,
      c.R_Score,
      c.F_Score,
      c.M_Score,
      c.RFM_Score,
      `"${c.Customer_Segment}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rfm_customer_segments_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Exported customer segmentation to CSV", "success");
  };

  if (loading && !data) {
    return <LoadingState message="Executing RFM segmentation model in R..." subMessage="Calculating Recency, Frequency, and Monetary quintile scores" />;
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] p-5 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            <span>RFM Customer Segmentation</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Segment customers using actual R dplyr scoring across Recency, Frequency, and Monetary dimensions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Ref Date:</span>
            <input
              type="text"
              placeholder="auto (latest date + 1)"
              value={refDate}
              onChange={(e) => setRefDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none w-36 font-mono text-[11px]"
            />
          </div>

          <button
            onClick={runRFMAnalysis}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? "Calculating..." : "Recalculate RFM in R"}</span>
          </button>
        </div>
      </div>

      {/* Segment Summary Cards Grid (4 Core Academic Segments) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((seg, idx) => {
          let badgeColor = "border-slate-800 text-slate-300";
          let borderAccent = "border-slate-800";
          if (seg.Customer_Segment === "Champions") {
            badgeColor = "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
            borderAccent = "border-emerald-500/30";
          } else if (seg.Customer_Segment === "Loyal Customers") {
            badgeColor = "border-sky-500/40 bg-sky-500/10 text-sky-300";
            borderAccent = "border-sky-500/30";
          } else if (seg.Customer_Segment === "At Risk") {
            badgeColor = "border-amber-500/40 bg-amber-500/10 text-amber-300";
            borderAccent = "border-amber-500/30";
          } else {
            badgeColor = "border-rose-500/40 bg-rose-500/10 text-rose-300";
            borderAccent = "border-rose-500/30";
          }

          return (
            <div
              key={idx}
              onClick={() => setSelectedSegment(selectedSegment === seg.Customer_Segment ? 'All' : seg.Customer_Segment)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedSegment === seg.Customer_Segment
                  ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/50 shadow-lg'
                  : `bg-[#0F172A] ${borderAccent} hover:border-slate-600`
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white truncate">
                  {seg.Customer_Segment}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badgeColor}`}>
                  {seg.Customer_Percentage}%
                </span>
              </div>
              <div className="text-xl font-bold text-white mb-1.5">
                {seg.Customer_Count?.toLocaleString()}
                <span className="text-xs font-normal text-slate-400 ml-1.5">customers</span>
              </div>
              <div className="text-xs text-slate-400 flex justify-between pt-1 border-t border-slate-800/60">
                <span>Total Spend:</span>
                <span className="text-slate-200 font-semibold">£{Number(seg.Total_Revenue || 0).toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Segment Revenue Distribution (Plotly) */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Segment Revenue Contribution (£)</h2>
              <p className="text-xs text-slate-400">Total spend aggregated per RFM tier</p>
            </div>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 border border-sky-800/40 px-2 py-0.5 rounded">
              Interactive Plotly
            </span>
          </div>
          <div className="h-72 w-full">
            <Plot
              data={[
                {
                  x: summary.map(s => s.Total_Revenue),
                  y: summary.map(s => s.Customer_Segment),
                  type: 'bar',
                  orientation: 'h',
                  marker: {
                    color: summary.map(s => {
                      if (s.Customer_Segment === "Champions") return '#10B981';
                      if (s.Customer_Segment === "Loyal Customers") return '#0284C7';
                      if (s.Customer_Segment === "At Risk") return '#F59E0B';
                      return '#EF4444';
                    })
                  }
                }
              ]}
              layout={{
                autosize: true,
                margin: { l: 150, r: 20, t: 10, b: 35 },
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

        {/* Customer Volume vs Recency Scatter / Direct ggplot2 Output */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white">R ggplot2 Segment Distribution</h2>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                Direct R Render
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">Actual plot image output from Rscript engine</p>
          </div>
          {data?.chart_file ? (
            <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center p-2">
              <img
                src={`/outputs/jobs/${data.chart_file}`}
                onError={(e) => {
                  // Fallback to static job url if relative
                  e.target.src = `/outputs/jobs/rfm_segments.png`;
                }}
                alt="RFM segments"
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

      {/* Customer-Level Inspection Table */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">Customer-Level RFM Score Breakdown</h3>
            <p className="text-xs text-slate-400">
              Showing top customer profiles with actual Recency (days), Frequency (orders), Monetary (£), and 1-5 quintile scores.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Customer ID or Segment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="All">All Segments</option>
              {summary.map((s, i) => (
                <option key={i} value={s.Customer_Segment}>{s.Customer_Segment}</option>
              ))}
            </select>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0">
              <tr>
                <th className="py-2.5 px-3">Customer ID</th>
                <th className="py-2.5 px-3">Country</th>
                <th className="py-2.5 px-3">Recency (Days)</th>
                <th className="py-2.5 px-3">Frequency</th>
                <th className="py-2.5 px-3">Monetary Spend</th>
                <th className="py-2.5 px-3">RFM Score</th>
                <th className="py-2.5 px-3">Segment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200 font-mono text-[11px]">
              {filteredCustomers.map((c, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-semibold text-sky-400">{c.CustomerID}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-300">{c.Country || "N/A"}</td>
                  <td className="py-2.5 px-3">{c.Recency}d</td>
                  <td className="py-2.5 px-3">{c.Frequency} orders</td>
                  <td className="py-2.5 px-3 font-sans font-semibold text-white">£{Number(c.Monetary || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="py-2.5 px-3">
                    <span className="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-sky-300">
                      {c.RFM_Score}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-950/60 border border-blue-800 text-blue-300">
                      {c.Customer_Segment}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
