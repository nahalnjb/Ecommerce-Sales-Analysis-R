import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import {
  PieChart,
  BarChart,
  LineChart,
  ScatterChart,
  Sliders,
  Download,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';
import { LoadingState } from '../components/LoadingState';

export const DataVisualization = ({ activeDataset }) => {
  const [chartType, setChartType] = useState('bar');
  const [xVar, setXVar] = useState('Country');
  const [yVar, setYVar] = useState('Revenue');
  const [loading, setLoading] = useState(false);
  const [plotData, setPlotData] = useState(null);
  const { addToast } = useToast();

  const handleGenerateChart = async () => {
    if (!activeDataset) return;
    setLoading(true);
    try {
      // Execute visualization R script
      const rCode = `
suppressPackageStartupMessages({ library(readr); library(dplyr); library(ggplot2); library(jsonlite) })
args <- c("${xVar}", "${yVar}", "${chartType}")
# Load dataset
df <- read_csv(Sys.getenv("DATA_PATH"), show_col_types = FALSE)
if (!"Revenue" %in% colnames(df)) { df$Revenue <- as.numeric(df$Quantity) * as.numeric(df$UnitPrice) }

p <- NULL
dark_theme <- theme_minimal(base_size = 12) + theme(
  plot.background = element_rect(fill = "#0B1120", color = NA),
  panel.background = element_rect(fill = "#0B1120", color = NA),
  panel.grid.major = element_line(color = "#1E293B"),
  panel.grid.minor = element_blank(),
  text = element_text(color = "#E2E8F0"),
  axis.text = element_text(color = "#94A3B8"),
  plot.title = element_text(color = "#F8FAFC", face = "bold", size = 14)
)

if ("${chartType}" == "bar") {
  s <- df %>% group_by(.data[["${xVar}"]]) %>% summarise(Val = sum(.data[["${yVar}"]], na.rm=TRUE), .groups="drop") %>% arrange(desc(Val)) %>% head(10)
  p <- ggplot(s, aes(x = reorder(.data[["${xVar}"]], Val), y = Val)) + geom_col(fill = "#38bdf8", width=0.6) + coord_flip() + labs(title="Bar Chart: ${yVar} by ${xVar}", x="${xVar}", y="${yVar}") + dark_theme
  out_data <- list(x = s[[1]], y = s[[2]])
} else if ("${chartType}" == "line") {
  df$Period <- format(as.POSIXct(df$InvoiceDate), "%Y-%m")
  s <- df %>% group_by(Period) %>% summarise(Val = sum(.data[["${yVar}"]], na.rm=TRUE), .groups="drop") %>% arrange(Period)
  p <- ggplot(s, aes(x = Period, y = Val, group=1)) + geom_line(color="#3b82f6", linewidth=1.2) + geom_point(color="#60a5fa") + labs(title="Trend Line: ${yVar}", x="Period", y="${yVar}") + dark_theme + theme(axis.text.x = element_text(angle=45, hjust=1))
  out_data <- list(x = s$Period, y = s$Val)
} else {
  sub_df <- df %>% filter(!is.na(.data[["${xVar}"]]), !is.na(.data[["${yVar}"]])) %>% head(500)
  p <- ggplot(sub_df, aes(x = .data[["${xVar}"]], y = .data[["${yVar}"]])) + geom_point(color="#38bdf8", alpha=0.6) + labs(title="Scatter: ${yVar} vs ${xVar}", x="${xVar}", y="${yVar}") + dark_theme
  out_data <- list(x = sub_df[["${xVar}"]], y = sub_df[["${yVar}"]])
}

ggsave("custom_chart.png", plot = p, width = 8, height = 4.8, dpi = 150)
write_json(out_data, "output.json", auto_unbox = TRUE)
cat("Custom ggplot2 visualization generated.\\n")
`;
      const res = await api.executeRCode({
        code: rCode,
        dataset_id: activeDataset,
        analysis_type: `Visualization: ${chartType}`
      });

      setPlotData({
        job_id: res.data.job_id,
        files: res.data.output_files,
        chart_url: `/outputs/jobs/${res.data.job_id}/custom_chart.png`,
        data: res.data.data
      });
      addToast("Visualization rendered via R ggplot2 & Plotly!", "success");
    } catch (err) {
      addToast("Failed to render visualization: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerateChart();
  }, [activeDataset]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] p-5 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <PieChart className="w-5 h-5 text-sky-400" />
            <span>Interactive Data Visualization Studio</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Build custom analytical charts powered simultaneously by ggplot2 in R and interactive Plotly.js in React.
          </p>
        </div>
      </div>

      {/* Chart Builder Config Bar */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          <span>Chart Builder Configuration</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1.5 font-medium">Visualization Type</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
            >
              <option value="bar">Bar Chart (Categorical)</option>
              <option value="line">Line Trend (Time-Series)</option>
              <option value="scatter">Scatter Plot (Bivariate)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1.5 font-medium">X-Axis Variable</label>
            <select
              value={xVar}
              onChange={(e) => setXVar(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
            >
              <option value="Country">Country</option>
              <option value="Description">Product Description</option>
              <option value="StockCode">Stock Code</option>
              <option value="Quantity">Quantity (Numeric)</option>
              <option value="UnitPrice">Unit Price (Numeric)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1.5 font-medium">Y-Axis Metric</label>
            <select
              value={yVar}
              onChange={(e) => setYVar(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
            >
              <option value="Revenue">Total Revenue (£)</option>
              <option value="Quantity">Total Quantity</option>
              <option value="UnitPrice">Unit Price (£)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerateChart}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? "Rendering in R..." : "Generate Chart"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Side-by-Side: Interactive Plotly vs R ggplot2 Image */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive Plotly */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Interactive Plotly Canvas</h3>
              <p className="text-xs text-slate-400">Zoom, hover, and inspect data points</p>
            </div>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 border border-sky-800/40 px-2.5 py-1 rounded">
              Plotly.js
            </span>
          </div>

          <div className="h-80 w-full">
            {plotData?.data ? (
              <Plot
                data={[
                  {
                    x: plotData.data.x,
                    y: plotData.data.y,
                    type: chartType === 'bar' ? 'bar' : 'scatter',
                    mode: chartType === 'scatter' ? 'markers' : 'lines+markers',
                    marker: { color: '#38BDF8', size: 6 }
                  }
                ]}
                layout={{
                  autosize: true,
                  margin: { l: 50, r: 20, t: 10, b: 35 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  xaxis: { color: '#94A3B8', gridcolor: '#1E293B', tickangle: -25 },
                  yaxis: { color: '#94A3B8', gridcolor: '#1E293B' }
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: true, responsive: true }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Click Generate Chart to view interactive canvas
              </div>
            )}
          </div>
        </div>

        {/* Real R ggplot2 Output */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white">R ggplot2 Engine Render</h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                Direct R Graphics Output
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">Actual plot image rendered by R ggplot2</p>
          </div>

          {plotData?.chart_url ? (
            <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex flex-col items-center justify-center p-2">
              <img
                src={plotData.chart_url}
                alt="R ggplot2 Custom Render"
                className="max-h-72 object-contain rounded"
              />
              <div className="mt-3 w-full flex justify-end">
                <a
                  href={plotData.chart_url}
                  download="ggplot2_export.png"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Plot Image</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-xs text-slate-500">
              No ggplot2 graphic rendered yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
