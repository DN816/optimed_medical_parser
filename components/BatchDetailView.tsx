import React, { useState, useMemo } from 'react';
import { useBatch } from '../contexts/BatchContext';
import { useExport } from '../contexts/ExportContext';
import { formatIST } from '../services/dateUtils';
import { Batch, Bill, SortConfig } from '../types';
import {
  ArrowLeft, FileText, CheckCircle2, AlertTriangle, Loader2, XCircle,
  RefreshCw, Eye, Search, Filter, Download, Trash2, CheckSquare, Square,
  MoreHorizontal, Flag, ChevronDown, ChevronUp, FileJson, FileSpreadsheet
} from 'lucide-react';

interface BatchDetailViewProps {
  batchId: string;
  onBack: () => void;
  onViewBill: (bill: Bill) => void;
}

export const BatchDetailView: React.FC<BatchDetailViewProps> = ({ batchId, onBack, onViewBill }) => {
  const { getBatch, getBillsByBatch, reprocessBills, deleteBills } = useBatch();
  const { createExportJob } = useExport();

  // State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const batch = getBatch(batchId);
  const bills = getBillsByBatch(batchId);

  // --- Filtering & Sorting Logic ---
  const filteredBills = useMemo(() => {
    let result = [...bills];

    // Filter by Status
    if (statusFilter !== 'all') {
      result = result.filter(b => b.status === statusFilter);
    }

    // Filter by Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(b =>
        b.file_name.toLowerCase().includes(lower) ||
        b.extracted_data?.seller_info?.supplier_name?.toLowerCase().includes(lower) ||
        b.extracted_data?.invoice_details?.invoice_number?.toLowerCase().includes(lower)
      );
    }

    // Sorting
    result.sort((a, b) => {
      let valA: any = a[sortConfig.key as keyof Bill];
      let valB: any = b[sortConfig.key as keyof Bill];

      // Computed fields
      if (sortConfig.key === 'vendor') {
        valA = a.extracted_data?.seller_info?.supplier_name || '';
        valB = b.extracted_data?.seller_info?.supplier_name || '';
      }
      if (sortConfig.key === 'amount') {
        valA = a.extracted_data?.totals?.grand_total || 0;
        valB = b.extracted_data?.totals?.grand_total || 0;
      }
      if (sortConfig.key === 'date') {
        valA = a.extracted_data?.invoice_details?.invoice_datetime || '';
        valB = b.extracted_data?.invoice_details?.invoice_datetime || '';
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [bills, statusFilter, searchTerm, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);
  const paginatedBills = filteredBills.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // --- Handlers ---
  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredBills.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBills.map(b => b.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkReprocess = () => {
    reprocessBills(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} bills?`)) {
      deleteBills(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleBulkExport = (format: 'json' | 'csv' | 'excel') => {
    const selectedBills = bills.filter(b => selectedIds.has(b.id));
    if (selectedBills.length === 0) return;

    createExportJob(selectedBills, format, 'selected');
    setShowExportMenu(false);
    alert(`Exporting ${selectedBills.length} bills. Check the Exports tab.`);
  };

  if (!batch) return <div>Batch not found</div>;

  // --- Render Helpers ---
  const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
      completed: 'bg-green-100 text-green-700 border-green-200',
      processing: 'bg-blue-100 text-blue-700 border-blue-200',
      needs_review: 'bg-amber-100 text-amber-700 border-amber-200',
      failed: 'bg-red-100 text-red-700 border-red-200',
      queued: 'bg-slate-100 text-slate-600 border-slate-200'
    }[status] || 'bg-gray-100 text-gray-700';

    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${styles}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const FlagIcon = ({ flags }: { flags?: Bill['flags'] }) => {
    if (!flags || flags.length === 0) return null;
    return (
      <div className="flex gap-1">
        {flags.includes('low_confidence') && (
          <div title="Low Confidence">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
        )}
        {flags.includes('fraud_risk') && (
          <div title="Fraud Risk Detected">
            <Flag className="w-4 h-4 text-red-500" />
          </div>
        )}
        {flags.includes('missing_fields') && (
          <div title="Missing Fields">
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] relative">

      {/* --- Sticky Batch Header --- */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-800">Batch Details</h2>
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono">{batch.id}</span>
            </div>
            <div className="flex gap-4 text-xs text-slate-500 mt-1">
              <span>Uploaded by: <span className="font-medium text-slate-700">CurrentUser</span></span>
              <span>•</span>
              <span>{formatIST(batch.created_at)}</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Status</p>
              <StatusBadge status={batch.status} />
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Completion</p>
              <p className="text-lg font-bold text-slate-800">{batch.processed_bills} <span className="text-slate-400 text-sm">/ {batch.total_bills}</span></p>
            </div>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by filename, invoice #, or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="h-8 w-px bg-slate-200 mx-2"></div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="needs_review">Needs Review</option>
              <option value="failed">Failed</option>
              <option value="processing">Processing</option>
            </select>
          </div>
        </div>
      </div>

      {/* --- Bills Table --- */}
      <div className="flex-1 overflow-auto bg-white rounded-lg border border-slate-200 shadow-sm mt-4">
        <table className="w-full text-left text-sm relative">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 w-10">
                <button onClick={toggleSelectAll} className="flex items-center">
                  {selectedIds.size > 0 && selectedIds.size === filteredBills.length
                    ? <CheckSquare className="w-4 h-4 text-blue-600" />
                    : <Square className="w-4 h-4 text-slate-300" />}
                </button>
              </th>
              <th className="px-4 py-3 w-16">Preview</th>
              <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('file_name')}>
                <div className="flex items-center gap-1">File Name {sortConfig.key === 'file_name' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('vendor')}>
                <div className="flex items-center gap-1">Vendor {sortConfig.key === 'vendor' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-1">Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
              </th>
              <th className="px-4 py-3 text-right cursor-pointer hover:text-slate-700" onClick={() => handleSort('amount')}>
                <div className="flex items-center justify-end gap-1">Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort('confidence_score')}>
                <div className="flex items-center gap-1">Confidence {sortConfig.key === 'confidence_score' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
              </th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedBills.map(bill => (
              <tr key={bill.id} className={`hover:bg-slate-50 transition ${selectedIds.has(bill.id) ? 'bg-blue-50/50' : ''}`}>
                <td className="px-4 py-3">
                  <button onClick={() => toggleSelectRow(bill.id)}>
                    {selectedIds.has(bill.id)
                      ? <CheckSquare className="w-4 h-4 text-blue-600" />
                      : <Square className="w-4 h-4 text-slate-300" />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="group relative">
                    <img src={bill.file_url} alt="" className="w-10 h-10 object-cover rounded border border-slate-200" />
                    {/* Hover Zoom Preview */}
                    <div className="absolute left-full top-0 ml-2 w-48 p-1 bg-white rounded shadow-xl border border-slate-200 hidden group-hover:block z-50">
                      <img src={bill.file_url} alt="" className="w-full h-auto rounded" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-slate-700 truncate max-w-[150px]" title={bill.file_name}>
                  {bill.file_name}
                  <div className="text-[10px] text-slate-400 font-mono">{bill.id}</div>
                </td>
                <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]">
                  {bill.extracted_data?.seller_info?.supplier_name || <span className="text-slate-300 italic">Unknown</span>}
                </td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  {bill.extracted_data?.invoice_details?.invoice_datetime || <span className="text-slate-300">-</span>}
                </td>
                <td className="px-4 py-3 text-slate-800 font-mono text-right">
                  {bill.extracted_data?.totals?.grand_total
                    ? `$${(typeof bill.extracted_data.totals.grand_total === 'number' ? bill.extracted_data.totals.grand_total : parseFloat(bill.extracted_data.totals.grand_total as any) || 0).toFixed(2)}`
                    : <span className="text-slate-300">-</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {bill.confidence_score > 0 && (
                      <div className={`w-12 h-1.5 rounded-full overflow-hidden bg-slate-100`}>
                        <div
                          className={`h-full ${bill.confidence_score > 0.8 ? 'bg-green-500' : 'bg-amber-500'}`}
                          style={{ width: `${bill.confidence_score * 100}%` }}
                        ></div>
                      </div>
                    )}
                    <span className="text-xs font-medium text-slate-500">{Math.round(bill.confidence_score * 100)}%</span>
                  </div>
                  <div className="mt-1">
                    <FlagIcon flags={bill.flags} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={bill.status} />
                  {bill.error_reason && <div className="text-[10px] text-red-500 truncate w-24" title={bill.error_reason}>{bill.error_reason}</div>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {bill.status === 'failed' && (
                      <button
                        onClick={() => reprocessBills([bill.id])}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="Retry"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onViewBill(bill)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { if (window.confirm('Delete this bill?')) deleteBills([bill.id]) }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {paginatedBills.length === 0 && (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  No bills found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Stats */}
      <div className="py-4 flex items-center justify-between text-sm text-slate-500">
        <div>Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredBills.length)} of {filteredBills.length} bills</div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* --- Bulk Actions Bar --- */}
      {selectedIds.size > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4 z-50">
          <span className="font-semibold">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-slate-700"></div>
          <div className="flex items-center gap-2">
            <button onClick={handleBulkReprocess} className="flex items-center gap-2 hover:text-blue-300 transition text-sm font-medium">
              <RefreshCw className="w-4 h-4" /> Reprocess
            </button>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 hover:text-blue-300 transition text-sm font-medium ml-4"
              >
                <Download className="w-4 h-4" /> Export
              </button>
              {showExportMenu && (
                <div className="absolute bottom-full mb-2 left-0 w-32 bg-white rounded-lg shadow-xl py-1 text-slate-800 animate-in zoom-in-95">
                  <button onClick={() => handleBulkExport('json')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex gap-2">
                    <FileJson className="w-3 h-3" /> JSON
                  </button>
                  <button onClick={() => handleBulkExport('csv')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex gap-2">
                    <FileText className="w-3 h-3" /> CSV
                  </button>
                  <button onClick={() => handleBulkExport('excel')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex gap-2">
                    <FileSpreadsheet className="w-3 h-3" /> Excel
                  </button>
                </div>
              )}
            </div>
            <button onClick={handleBulkDelete} className="flex items-center gap-2 hover:text-red-400 transition text-sm font-medium ml-4">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="ml-4 text-slate-400 hover:text-white">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

    </div>
  );
};
