import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Download,
  TableProperties
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/ToastContext';
import { LoadingState } from '../components/LoadingState';

export const DataExplorer = ({ activeDataset }) => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [sortBy, setSortBy] = useState('InvoiceDate');
  const [sortDir, setSortDir] = useState('desc');
  const [loading, setLoading] = useState(false);
  const [metaInfo, setMetaInfo] = useState([]);
  const [showMeta, setShowMeta] = useState(false);
  const { addToast } = useToast();

  const fetchData = async () => {
    if (!activeDataset) return;
    setLoading(true);
    try {
      const res = await api.previewDataset(activeDataset, {
        page,
        page_size: pageSize,
        search: search || undefined,
        country: countryFilter || undefined,
        sort_by: sortBy,
        sort_dir: sortDir
      });
      setData(res.data.data);
      setColumns(res.data.columns);
      setTotalRecords(res.data.total_records);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      addToast("Failed to load records: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    if (!activeDataset) return;
    try {
      const res = await api.getDataset(activeDataset);
      setMetaInfo(res.data.columns_meta || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, countryFilter, pageSize, activeDataset]);

  useEffect(() => {
    fetchData();
  }, [activeDataset, page, pageSize, countryFilter, sortBy, sortDir]);

  useEffect(() => {
    fetchMeta();
  }, [activeDataset]);

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] p-5 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Interactive Data Explorer</h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse, sort, filter, and inspect transactional data records ({totalRecords.toLocaleString()} rows).
          </p>
        </div>
        <button
          onClick={() => setShowMeta(!showMeta)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
        >
          <Info className="w-4 h-4 text-sky-400" />
          <span>{showMeta ? "Hide Schema Meta" : "Inspect Column Types"}</span>
        </button>
      </div>

      {/* Column Schema Drawer */}
      {showMeta && (
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <TableProperties className="w-4 h-4 text-sky-400" />
            <span>Dataset Schema & Type Inspection</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Column</th>
                  <th className="py-2 px-3">Data Type</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Non-Null</th>
                  <th className="py-2 px-3">Missing %</th>
                  <th className="py-2 px-3">Unique Values</th>
                  <th className="py-2 px-3">Sample Values</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {metaInfo.map((col, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-semibold text-white">{col.name}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-sky-400">{col.data_type}</td>
                    <td className="py-2 px-3 capitalize">{col.detected_type}</td>
                    <td className="py-2 px-3">{col.non_null_count?.toLocaleString()}</td>
                    <td className="py-2 px-3">{col.null_percentage}%</td>
                    <td className="py-2 px-3">{col.unique_count?.toLocaleString()}</td>
                    <td className="py-2 px-3 text-slate-400 font-mono text-[11px] truncate max-w-xs">
                      {col.sample_values?.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-96">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by invoice, product, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    onClick={() => handleSort(col)}
                    className="py-3 px-3 cursor-pointer hover:text-white transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={columns.length || 8} className="py-12 text-center text-slate-400">
                    Loading records...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length || 8} className="py-12 text-center text-slate-400">
                    No transactions match the search filters.
                  </td>
                </tr>
              ) : (
                data.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-800/40 transition-colors">
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className="py-2.5 px-3 whitespace-nowrap">
                        {col === 'UnitPrice' || col === 'Revenue' ? (
                          `£${Number(row[col] || 0).toFixed(2)}`
                        ) : col === 'CustomerID' ? (
                          <span className="font-mono text-sky-400">{row[col] || "Unregistered"}</span>
                        ) : (
                          String(row[col] ?? "")
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalRecords)} of {totalRecords.toLocaleString()} transactions
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-slate-200 font-medium">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
