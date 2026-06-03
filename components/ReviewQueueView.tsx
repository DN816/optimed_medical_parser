import React, { useMemo, useState } from 'react';
import { useBatch } from '../contexts/BatchContext';
import { Bill } from '../types';
import { 
  AlertTriangle, CheckSquare, Clock, ArrowRight, Filter, 
  Flag, Zap, Play, CheckCircle2, Search
} from 'lucide-react';

interface ReviewQueueViewProps {
  onStartSession: (filteredBills: Bill[]) => void;
}

export const ReviewQueueView: React.FC<ReviewQueueViewProps> = ({ onStartSession }) => {
  const { bills } = useBatch();
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Derived Review Queue
  const queue = useMemo(() => {
    let q = bills.filter(b => b.status === 'needs_review');

    // Filter Search
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        q = q.filter(b => 
            b.file_name.toLowerCase().includes(lower) || 
            b.extracted_data?.seller_info?.supplier_name?.toLowerCase().includes(lower)
        );
    }

    // Filter Severity
    if (severityFilter !== 'all') {
        q = q.filter(b => {
            const hasFraud = b.flags?.includes('fraud_risk');
            const hasMismatch = b.flags?.includes('data_mismatch') || b.flags?.includes('missing_fields');
            
            if (severityFilter === 'high') return hasFraud;
            if (severityFilter === 'medium') return !hasFraud && hasMismatch;
            if (severityFilter === 'low') return !hasFraud && !hasMismatch;
            return true;
        });
    }

    // Sort by SLA Deadline (Ascending - Urgent First)
    return q.sort((a, b) => {
        const tA = new Date(a.sla_deadline || '9999-12-31').getTime();
        const tB = new Date(b.sla_deadline || '9999-12-31').getTime();
        return tA - tB;
    });

  }, [bills, severityFilter, searchTerm]);

  // Helpers
  const getSeverity = (bill: Bill) => {
      if (bill.flags?.includes('fraud_risk')) return { label: 'High', color: 'bg-red-100 text-red-700', icon: <Flag className="w-3 h-3"/> };
      if (bill.flags?.includes('data_mismatch') || bill.flags?.includes('missing_fields')) return { label: 'Medium', color: 'bg-orange-100 text-orange-700', icon: <AlertTriangle className="w-3 h-3"/> };
      return { label: 'Low', color: 'bg-blue-100 text-blue-700', icon: <CheckSquare className="w-3 h-3"/> };
  };

  const getSLAStatus = (deadlineStr?: string) => {
      if (!deadlineStr) return { text: '-', color: 'text-slate-400' };
      const now = new Date().getTime();
      const due = new Date(deadlineStr).getTime();
      const diffHrs = (due - now) / (1000 * 60 * 60);

      if (diffHrs < 0) return { text: 'BREACHED', color: 'text-red-600 font-bold' };
      if (diffHrs < 4) return { text: `< ${Math.ceil(diffHrs)}h left`, color: 'text-red-500 font-bold' };
      if (diffHrs < 24) return { text: `${Math.ceil(diffHrs)}h left`, color: 'text-amber-600' };
      return { text: `${Math.ceil(diffHrs / 24)}d left`, color: 'text-green-600' };
  };

  return (
    <div className="space-y-6">
      
      {/* Header Stats */}
      <div className="flex items-center justify-between">
          <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <CheckSquare className="w-6 h-6 text-blue-600" /> Review Queue
                  <span className="bg-blue-100 text-blue-700 text-sm px-2.5 py-0.5 rounded-full">{queue.length}</span>
              </h2>
              <p className="text-slate-500 text-sm mt-1">Prioritized worklist based on risk and SLA deadlines.</p>
          </div>
          
          <button 
             onClick={() => onStartSession(queue)}
             disabled={queue.length === 0}
             className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg shadow-blue-200 transition-all
                ${queue.length > 0 ? 'bg-blue-600 hover:bg-blue-700 hover:scale-105' : 'bg-slate-300 cursor-not-allowed'}
             `}
          >
              <Zap className="w-5 h-5 fill-current" /> Start Fast Review
          </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search vendor or invoice number..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <div className="flex bg-slate-100 p-1 rounded-lg">
                  {['all', 'high', 'medium', 'low'].map(s => (
                      <button 
                        key={s}
                        onClick={() => setSeverityFilter(s as any)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition ${severityFilter === s ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                          {s}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                 <tr>
                     <th className="px-6 py-3">Priority</th>
                     <th className="px-6 py-3">Bill ID</th>
                     <th className="px-6 py-3">Vendor</th>
                     <th className="px-6 py-3">Amount</th>
                     <th className="px-6 py-3">Issue Type</th>
                     <th className="px-6 py-3">SLA Status</th>
                     <th className="px-6 py-3 text-right">Action</th>
                 </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                 {queue.length === 0 ? (
                     <tr>
                         <td colSpan={7} className="py-12 text-center">
                             <div className="inline-flex p-4 bg-green-50 rounded-full mb-4">
                                 <CheckCircle2 className="w-8 h-8 text-green-500" />
                             </div>
                             <h3 className="text-lg font-medium text-slate-900">All caught up!</h3>
                             <p className="text-slate-400">No bills currently require manual review.</p>
                         </td>
                     </tr>
                 ) : (
                     queue.map(bill => {
                         const severity = getSeverity(bill);
                         const sla = getSLAStatus(bill.sla_deadline);
                         return (
                             <tr key={bill.id} className="hover:bg-slate-50 group">
                                 <td className="px-6 py-4">
                                     <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-transparent ${severity.color}`}>
                                         {severity.icon} {severity.label}
                                     </span>
                                 </td>
                                 <td className="px-6 py-4 font-mono text-xs text-slate-600">{bill.id}</td>
                                 <td className="px-6 py-4 font-medium text-slate-800">{bill.extracted_data?.seller_info?.supplier_name || 'Unknown'}</td>
                                 <td className="px-6 py-4 text-slate-600">₹{bill.extracted_data?.totals?.grand_total?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                 <td className="px-6 py-4">
                                     <div className="flex flex-wrap gap-1">
                                         {bill.flags?.map(f => (
                                             <span key={f} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                                                 {f.replace('_', ' ')}
                                             </span>
                                         ))}
                                     </div>
                                 </td>
                                 <td className="px-6 py-4">
                                     <div className="flex items-center gap-1.5">
                                         <Clock className={`w-4 h-4 ${sla.color}`} />
                                         <span className={`font-mono font-medium ${sla.color}`}>{sla.text}</span>
                                     </div>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                     <button 
                                        onClick={() => onStartSession([bill])}
                                        className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-bold transition opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-auto"
                                     >
                                         Review <ArrowRight className="w-3 h-3" />
                                     </button>
                                 </td>
                             </tr>
                         );
                     })
                 )}
             </tbody>
         </table>
      </div>

    </div>
  );
};
