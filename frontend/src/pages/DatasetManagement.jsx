import React, { useState, useEffect } from 'react';
import {
  Upload,
  Database,
  CheckCircle,
  AlertTriangle,
  Download,
  Trash2,
  RefreshCw,
  FileText,
  Sliders,
  Check,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';
import { LoadingState } from '../components/LoadingState';

export const DatasetManagement = ({ activeDataset, setActiveDataset }) => {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null);
  const { addToast } = useToast();

  // Cleaning options
  const [cleanOptions, setCleanOptions] = useState({
    remove_cancelled: true,
    remove_missing_customer: false,
    remove_duplicates: true,
    min_unit_price: 0.0,
    handle_negative_quantities: 'filter'
  });

  const loadDatasets = async () => {
    setLoading(true);
    try {
      const res = await api.getDatasets();
      setDatasets(res.data);
      if (res.data.length > 0) {
        const current = res.data.find(d => d.id === activeDataset) || res.data[0];
        setSelectedDataset(current);
      }
    } catch (err) {
      addToast("Failed to fetch datasets: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, [activeDataset]);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!fileToUpload) return;

    const formData = new FormData();
    formData.append('file', fileToUpload);

    setLoading(true);
    try {
      const res = await api.uploadDataset(formData);
      addToast(`Dataset "${res.data.name}" uploaded and cleaned successfully!`, "success");
      setFileToUpload(null);
      await loadDatasets();
      setActiveDataset(res.data.id);
    } catch (err) {
      addToast("Upload failed: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = async () => {
    setLoading(true);
    try {
      const res = await api.loadSampleDataset();
      addToast("UCI Online Retail Academic Dataset loaded successfully!", "success");
      await loadDatasets();
      setActiveDataset(res.data.dataset_id);
    } catch (err) {
      addToast("Failed to load sample dataset: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCleanDataset = async () => {
    if (!selectedDataset) return;
    setCleaning(true);
    try {
      const res = await api.cleanDataset(selectedDataset.id, cleanOptions);
      addToast("Data cleaning pipeline completed!", "success");
      await loadDatasets();
    } catch (err) {
      addToast("Cleaning failed: " + err.message, "error");
    } finally {
      setCleaning(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this dataset?")) return;
    try {
      await api.deleteDataset(id);
      addToast("Dataset deleted", "info");
      await loadDatasets();
    } catch (err) {
      addToast("Delete failed: " + err.message, "error");
    }
  };

  const cleanSummary = selectedDataset?.cleaning_summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] p-5 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Dataset Management & Cleaning</h1>
          <p className="text-xs text-slate-400 mt-1">Upload CSV/Excel transactions, audit anomalies, and execute academic data cleaning rules.</p>
        </div>
        <button
          onClick={handleLoadSample}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span>Load UCI Online Retail Dataset</span>
        </button>
      </div>

      {/* Upload & Selector Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Card */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Upload className="w-4 h-4 text-sky-400" />
            <span>Upload New Dataset</span>
          </h2>
          <p className="text-xs text-slate-400 mb-4">Accepts CSV, XLS, and XLSX files up to 100MB.</p>

          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-900/40">
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={(e) => setFileToUpload(e.target.files[0])}
                className="hidden"
                id="file-upload-input"
              />
              <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center">
                <FileText className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-medium text-slate-200">
                  {fileToUpload ? fileToUpload.name : "Click or drag dataset file here"}
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  {fileToUpload ? `${(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB` : "CSV, Excel (.xlsx, .xls)"}
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={!fileToUpload || loading}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>{loading ? "Uploading & Auditing..." : "Upload & Inspect"}</span>
            </button>
          </form>
        </div>

        {/* Available Datasets Table */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-400" />
              <span>Available Datasets ({datasets.length})</span>
            </h2>
          </div>

          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Dataset Name</th>
                  <th className="py-2.5 px-3">Rows</th>
                  <th className="py-2.5 px-3">Cols</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {datasets.map(d => (
                  <tr
                    key={d.id}
                    onClick={() => { setSelectedDataset(d); setActiveDataset(d.id); }}
                    className={`cursor-pointer hover:bg-slate-800/40 transition-colors ${selectedDataset?.id === d.id ? 'bg-blue-600/10 border-l-2 border-blue-500' : ''}`}
                  >
                    <td className="py-2.5 px-3 font-medium flex items-center gap-2">
                      <span>{d.name}</span>
                      {d.is_default && (
                        <span className="text-[10px] bg-emerald-950/70 border border-emerald-800 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                          Primary
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">{d.row_count?.toLocaleString()}</td>
                    <td className="py-2.5 px-3">{d.col_count}</td>
                    <td className="py-2.5 px-3 uppercase text-[10px] text-slate-400">{d.file_type}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
                        className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Delete dataset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Selected Dataset Audit & Cleaning Controls */}
      {selectedDataset && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cleaning Summary Cards */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">{selectedDataset.name}</h3>
                <span className="text-[11px] text-slate-400">File: {selectedDataset.original_filename}</span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                Active Audit
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Original Row Count:</span>
                <span className="font-semibold text-white">{(cleanSummary.original_rows || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Retained Clean Rows:</span>
                <span className="font-semibold text-emerald-400">{(cleanSummary.retained_rows || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Retention Ratio:</span>
                <span className="font-semibold text-white">{cleanSummary.retention_rate || 100}%</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Cancelled Invoices Excluded:</span>
                <span className="font-semibold text-rose-400">{(cleanSummary.cancelled_invoices_excluded || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Negative Quantities Handled:</span>
                <span className="font-semibold text-amber-400">{(cleanSummary.negative_quantities_handled || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Zero / Invalid Prices Removed:</span>
                <span className="font-semibold text-amber-400">{(cleanSummary.zero_or_negative_price_removed || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Duplicates Removed:</span>
                <span className="font-semibold text-white">{(cleanSummary.duplicates_removed || 0).toLocaleString()}</span>
              </div>
              {(cleanSummary.missing_customer_ids_removed > 0) && (
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Missing Customer IDs Removed:</span>
                  <span className="font-semibold text-rose-400">{(cleanSummary.missing_customer_ids_removed || 0).toLocaleString()}</span>
                </div>
              )}
              {(cleanSummary.invalid_dates_removed > 0) && (
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Unparseable Dates Removed:</span>
                  <span className="font-semibold text-rose-400">{(cleanSummary.invalid_dates_removed || 0).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300 block">Exact Row Audit Balance:</span>
              <div className="font-mono text-[10px] text-sky-400 break-all">
                {(cleanSummary.original_rows || 0).toLocaleString()} (Orig) − {(
                  (cleanSummary.cancelled_invoices_excluded || 0) +
                  (cleanSummary.negative_quantities_handled || 0) +
                  (cleanSummary.zero_or_negative_price_removed || 0) +
                  (cleanSummary.duplicates_removed || 0) +
                  (cleanSummary.missing_customer_ids_removed || 0) +
                  (cleanSummary.invalid_dates_removed || 0)
                ).toLocaleString()} (Excluded) = {(cleanSummary.retained_rows || 0).toLocaleString()} (Retained)
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <a
                href={api.getDatasetDownloadUrl(selectedDataset.id, 'cleaned')}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center gap-2 transition-colors"
                download
              >
                <Download className="w-3.5 h-3.5" />
                <span>Cleaned CSV</span>
              </a>
              <a
                href={api.getDatasetDownloadUrl(selectedDataset.id, 'original')}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 flex items-center justify-center gap-2 transition-colors"
                download
              >
                <Download className="w-3.5 h-3.5" />
                <span>Original File</span>
              </a>
            </div>
          </div>

          {/* Interactive Cleaning Rules Form */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 lg:col-span-2">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>Academic Data Cleaning Rules</span>
            </h3>
            <p className="text-xs text-slate-400 mb-5">Configure filtering decisions according to academic standards. Records are never silently dropped.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/40 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={cleanOptions.remove_cancelled}
                  onChange={(e) => setCleanOptions(prev => ({ ...prev, remove_cancelled: e.target.checked }))}
                  className="mt-0.5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                />
                <div>
                  <span className="font-semibold text-white block">Exclude Cancelled Invoices</span>
                  <span className="text-slate-400 text-[11px]">Removes retail cancellation codes (e.g. 'C' + numbers). Preserves hex IDs/hashes.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/40 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={cleanOptions.remove_duplicates}
                  onChange={(e) => setCleanOptions(prev => ({ ...prev, remove_duplicates: e.target.checked }))}
                  className="mt-0.5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                />
                <div>
                  <span className="font-semibold text-white block">Deduplicate Transactions</span>
                  <span className="text-slate-400 text-[11px]">Eliminates exact duplicate line items.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/40 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={cleanOptions.remove_missing_customer}
                  onChange={(e) => setCleanOptions(prev => ({ ...prev, remove_missing_customer: e.target.checked }))}
                  className="mt-0.5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                />
                <div>
                  <span className="font-semibold text-white block">Drop Unregistered Customers</span>
                  <span className="text-slate-400 text-[11px]">Removes transactions without valid CustomerID.</span>
                </div>
              </label>

              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 flex flex-col justify-between">
                <span className="font-semibold text-white block mb-1">Handle Negative Quantities</span>
                <select
                  value={cleanOptions.handle_negative_quantities}
                  onChange={(e) => setCleanOptions(prev => ({ ...prev, handle_negative_quantities: e.target.value }))}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="filter">Filter Out (Returns/Damages)</option>
                  <option value="flag">Retain and Flag</option>
                </select>
              </div>

              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 flex flex-col justify-between md:col-span-2">
                <span className="font-semibold text-white block mb-1">Price Validation Threshold</span>
                <div className="flex items-center gap-3 mt-1">
                  <select
                    value={cleanOptions.min_unit_price === 0.0 ? "allow_zero" : "strict_positive"}
                    onChange={(e) => setCleanOptions(prev => ({ ...prev, min_unit_price: e.target.value === "allow_zero" ? 0.0 : 0.001 }))}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="allow_zero">Allow Zero Prices (UnitPrice &gt;= 0.0) — Recommended for Vouchers/Payments</option>
                    <option value="strict_positive">Filter Out Zero Prices (UnitPrice &gt;= 0.001) — Retail Products</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={handleCleanDataset}
                disabled={cleaning}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cleaning ? 'animate-spin' : ''}`} />
                <span>{cleaning ? "Executing Cleaning Pipeline..." : "Execute Cleaning Pipeline"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
