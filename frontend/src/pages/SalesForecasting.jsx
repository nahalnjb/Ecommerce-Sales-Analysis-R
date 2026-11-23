import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import {
  TrendingUp,
  Calendar,
  Layers,
  RefreshCw,
  Activity,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';
import { LoadingState } from '../components/LoadingState';

export const SalesForecasting = ({ activeDataset }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState('ARIMA');
  const [horizon, setHorizon] = useState(6);
  const { addToast } = useToast();

  const runForecast = async () => {
    if (!activeDataset) return;
    setLoading(true);
    try {
      const res = await api.runForecast({
        dataset_id: activeDataset,
        method,
        horizon_months: Number(horizon)
      });
      setData(res.data.data);
      addToast(`Sales Forecast (${method}) generated in R (${res.data.duration}s)!`, "success");
    } catch (err) {
      addToast("Forecasting failed: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runForecast();
  }, [activeDataset]);

  const historical = data?.historical || [];
  const forecast = data?.forecast || [];
  const metrics = data?.metrics || {};

  if (loading && !data) {
    return <LoadingState message="Fitting time-series model in R..." subMessage="Executing forecast::auto.arima() and computing prediction intervals" />;
  }

  return (
    <div className="space-y-6">
      {/* Header & Model Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] p-5 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-sky-400" />
            <span>Sales Revenue Forecasting</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Empirical time-series forecasting powered by R's forecast package (ARIMA, ETS, Moving Average).
          </p>
        </div>

        {/* Model Form */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400 font-semibold">Method:</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="ARIMA" className="bg-slate-900">Auto-ARIMA</option>
              <option value="ETS" className="bg-slate-900">Exponential Smoothing (ETS)</option>
              <option value="MA" className="bg-slate-900">Moving Average (MA)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400 font-semibold">Horizon:</span>
            <select
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value={3} className="bg-slate-900">3 Months</option>
              <option value={6} className="bg-slate-900">6 Months</option>
              <option value={12} className="bg-slate-900">12 Months</option>
            </select>
          </div>

          <button
            onClick={runForecast}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? "Forecasting..." : "Run Forecast"}</span>
          </button>
        </div>
      </div>

      {/* Model Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0F172A]">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Fitted Model</span>
          <div className="text-sm font-bold text-sky-400 mt-1 truncate">{data?.model_name || method}</div>
          <span className="text-[11px] text-slate-500">R Package forecast</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0F172A]">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">RMSE</span>
          <div className="text-lg font-bold text-emerald-400 mt-1">{metrics.RMSE !== undefined ? `£${metrics.RMSE}` : 'N/A'}</div>
          <span className="text-[11px] text-slate-500">Root Mean Sq Error</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0F172A]">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">MAE</span>
          <div className="text-lg font-bold text-blue-400 mt-1">{metrics.MAE !== undefined ? `£${metrics.MAE}` : 'N/A'}</div>
          <span className="text-[11px] text-slate-500">Mean Absolute Error</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0F172A]">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">MAPE</span>
          <div className="text-lg font-bold text-purple-400 mt-1">{metrics.MAPE !== undefined ? `${metrics.MAPE}%` : 'N/A'}</div>
          <span className="text-[11px] text-slate-500">Mean Abs % Error</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0F172A]">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">AIC / BIC</span>
          <div className="text-sm font-bold text-amber-400 mt-1">{metrics.AIC ? `${metrics.AIC} / ${metrics.BIC}` : 'N/A'}</div>
          <span className="text-[11px] text-slate-500">Information Criteria</span>
        </div>
      </div>

      {/* Main Interactive Forecast Chart */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white">Historical Revenue & Forecast Projections with Confidence Intervals</h2>
            <p className="text-xs text-slate-400">Blue: Actual Historical Sales | Orange: Forecast | Shaded: 80% & 95% Confidence Intervals</p>
          </div>
          <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 border border-sky-800/40 px-2.5 py-1 rounded">
            R Time-Series Model
          </span>
        </div>

        <div className="h-80 w-full">
          <Plot
            data={[
              // Historical
              {
                x: historical.map(h => h.Period),
                y: historical.map(h => h.Revenue),
                type: 'scatter',
                mode: 'lines+markers',
                name: 'Historical Revenue',
                marker: { color: '#38BDF8', size: 6 },
                line: { color: '#38BDF8', width: 2.5 }
              },
              // 95% Confidence Interval Upper
              {
                x: forecast.map(f => f.Period),
                y: forecast.map(f => f.Upper_95),
                type: 'scatter',
                mode: 'lines',
                line: { width: 0 },
                showlegend: false,
                hoverinfo: 'none'
              },
              // 95% Confidence Interval Lower
              {
                x: forecast.map(f => f.Period),
                y: forecast.map(f => f.Lower_95),
                type: 'scatter',
                mode: 'lines',
                fill: 'tonexty',
                fillcolor: 'rgba(245, 158, 11, 0.12)',
                line: { width: 0 },
                name: '95% Confidence Interval'
              },
              // Point Forecast
              {
                x: forecast.map(f => f.Period),
                y: forecast.map(f => f.Forecast_Revenue),
                type: 'scatter',
                mode: 'lines+markers',
                name: 'Point Forecast',
                marker: { color: '#F59E0B', size: 7 },
                line: { color: '#F59E0B', width: 3, dash: 'dot' }
              }
            ]}
            layout={{
              autosize: true,
              margin: { l: 55, r: 20, t: 10, b: 35 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              xaxis: { color: '#94A3B8', gridcolor: '#1E293B' },
              yaxis: { color: '#94A3B8', gridcolor: '#1E293B', title: 'Revenue (£)' },
              legend: { font: { color: '#CBD5E1', size: 10 }, orientation: 'h', y: -0.2 }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ displayModeBar: false, responsive: true }}
          />
        </div>
      </div>

      {/* Projections Table & R ggplot2 Graphic Render */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table of Forecast Bounds */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-white">Monthly Forecast Projections Table</h3>
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3">Forecast (£)</th>
                  <th className="py-2.5 px-3">Lower 80%</th>
                  <th className="py-2.5 px-3">Upper 80%</th>
                  <th className="py-2.5 px-3">Lower 95%</th>
                  <th className="py-2.5 px-3">Upper 95%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200 font-mono text-[11px]">
                {forecast.map((fc, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-sky-400">{fc.Period}</td>
                    <td className="py-2.5 px-3 font-sans font-bold text-amber-400">£{Number(fc.Forecast_Revenue || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-slate-400">£{Number(fc.Lower_80 || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-slate-400">£{Number(fc.Upper_80 || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-slate-500">£{Number(fc.Lower_95 || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-slate-500">£{Number(fc.Upper_95 || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real R ggplot2 Output */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white">R ggplot2 Forecast Graphic</h2>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                Direct R Graphics Output
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">Actual plot image rendered by R</p>
          </div>
          {data?.chart_file ? (
            <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center p-2">
              <img
                src={`/outputs/jobs/${data.chart_file}`}
                onError={(e) => {
                  e.target.src = `/outputs/jobs/forecast_chart.png`;
                }}
                alt="Forecast chart"
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
