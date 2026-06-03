import React, { useState, useEffect, useMemo } from 'react';
import { Bill } from '../types';
import { api } from '../services/api';
import { useBatch } from '../contexts/BatchContext';
import { formatIST } from '../services/dateUtils';
import { Search, FileText, CheckCircle, AlertTriangle, XCircle, Clock, Filter, Eye } from 'lucide-react';

interface AllBillsViewProps {
  onViewBill?: (bill: Bill) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  needs_review: { label: 'Needs Review', color: 'bg-amber-100 text-amber-700', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: <Clock className="w-3.5 h-3.5" /> },
  queued: { label: 'Queued', color: 'bg-slate-100 text-slate-600', icon: <Clock className="w-3.5 h-3.5" /> },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" /> },
};

export const AllBillsView: React.FC<AllBillsViewProps> = ({ onViewBill }) => {
  const { bills } = useBatch();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredBills = useMemo(() => {
    let result = [...bills];

    if (statusFilter !== 'all') {
      result = result.filter(b => b.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(b =>
        b.file_name.toLowerCase().includes(q) ||
        (b.extracted_data?.seller_info?.supplier_name || '').toLowerCase().includes(q) ||
        (b.extracted_data?.invoice_details?.invoice_number || '').toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [bills, search, statusFilter]);

  const statuses = ['all', 'completed', 'needs_review', 'processing', 'failed'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">All Bills</h2>
        <span className="text-sm text-slate-500">{filteredBills.length} bill{filteredBills.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by file name, vendor, or invoice number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div className="flex bg-white border border-slate-200 rounded-lg p-1">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition capitalize ${
                statusFilter === s
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Bills Table */}
      {filteredBills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
          <FileText className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No bills found</h3>
          <p className="text-sm text-slate-500">
            {bills.length === 0
              ? 'Upload your first medical bill to get started.'
              : 'No bills match your current filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full min-w-[800px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">File</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Vendor</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Invoice #</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Confidence</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((bill) => {
                const vendor = bill.extracted_data?.seller_info?.supplier_name || '—';
                const invoiceNo = bill.extracted_data?.invoice_details?.invoice_number || '—';
                const amount = bill.extracted_data?.totals?.grand_total;
                const conf = Math.round(bill.confidence_score * 100);
                const statusCfg = STATUS_CONFIG[bill.status] || STATUS_CONFIG.queued;
                const date = bill.created_at ? formatIST(bill.created_at) : '—';

                return (
                  <tr key={bill.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm font-medium text-slate-700 truncate max-w-[160px]">{bill.file_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 truncate max-w-[140px]">{vendor}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">{invoiceNo}</td>
                    <td className="px-6 py-4 text-sm text-slate-800 font-semibold text-right">
                      {amount ? `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs font-bold ${
                        conf >= 80 ? 'text-green-600' : conf >= 60 ? 'text-amber-600' : 'text-red-500'
                      }`}>
                        {conf}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}>
                        {statusCfg.icon} {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{date}</td>
                    <td className="px-6 py-4 text-center">
                      {bill.extracted_data && onViewBill && (
                        <button
                          onClick={() => onViewBill(bill)}
                          className="p-1.5 hover:bg-slate-100 rounded-md transition text-slate-500 hover:text-slate-700"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
