import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';

export const ReportsDownloads = ({ activeDataset }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportTitle, setReportTitle] = useState('Academic E-Commerce & RFM Analysis Report');
  const [reportType, setReportType] = useState('pdf');
  const { addToast } = useToast();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.getReports();
      setReports(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    if (!activeDataset) {
      addToast("Please select an active dataset first.", "info");
      return;
    }

    setGenerating(true);
    try {
      const res = await api.generateReport({
        dataset_id: activeDataset,
        report_title: reportTitle,
        report_type: reportType
      });
      addToast(`Generated ${reportType.toUpperCase()} Report (${(res.data.file_size / 1024).toFixed(1)} KB)!`, "success");
      await fetchReports();
    } catch (err) {
      addToast("Report generation failed: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] p-5 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-sky-400" />
            <span>Reports & Downloads Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate printable academic PDF reports (with embedded ggplot2 graphics), Excel workbooks, and CSV summaries.
          </p>
        </div>
      </div>

      {/* Report Generator Form */}
      <form onSubmit={handleGenerateReport} className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span>Generate New Intelligence Report</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="md:col-span-1">
            <label className="text-slate-400 block mb-1 font-medium">Document Title</label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Report Format</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none cursor-pointer"
            >
              <option value="pdf">Academic PDF Document (with Charts & Tables)</option>
              <option value="excel">Excel Workbook (.xlsx - Multi-Tab)</option>
              <option value="csv">Summary CSV Export (.csv)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={generating}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{generating ? "Compiling Document..." : "Generate Report Now"}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Generated Reports Table */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Generated Reports Archive</h3>
          <button
            onClick={fetchReports}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Title</th>
                <th className="py-2.5 px-4">Format</th>
                <th className="py-2.5 px-4">Dataset Scope</th>
                <th className="py-2.5 px-4">File Size</th>
                <th className="py-2.5 px-4">Created Date</th>
                <th className="py-2.5 px-4 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No reports generated yet. Use the form above to compile a PDF or Excel document.
                  </td>
                </tr>
              ) : (
                reports.map(r => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-sky-400 flex-shrink-0" />
                      <span>{r.report_title}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-emerald-300">
                        {r.report_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{r.dataset_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {(r.file_size_bytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={api.getReportDownloadUrl(r.id)}
                        download
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-sky-400 border border-blue-500/30 text-xs font-medium transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
