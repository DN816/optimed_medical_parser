import React from 'react';
import { useBatch } from '../contexts/BatchContext';
import { Layers, ChevronRight, Clock, CheckCircle2, AlertTriangle, XCircle, Plus } from 'lucide-react';

interface BatchListViewProps {
  onCreateBatch: () => void;
  onSelectBatch: (id: string) => void;
}

export const BatchListView: React.FC<BatchListViewProps> = ({ onCreateBatch, onSelectBatch }) => {
  const { batches } = useBatch();

  const getStatusColor = (status: string) => {
    switch(status) {
        case 'completed': return 'bg-green-100 text-green-700 border-green-200';
        case 'processing': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'failed': return 'bg-red-100 text-red-700 border-red-200';
        case 'partial': return 'bg-amber-100 text-amber-700 border-amber-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Batches</h2>
        <button 
          onClick={onCreateBatch}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Batch Upload
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {batches.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
             <div className="bg-slate-50 p-4 rounded-full mb-4">
               <Layers className="w-8 h-8 text-slate-400" />
             </div>
             <h3 className="text-lg font-medium text-slate-900">No batches yet</h3>
             <p className="text-slate-500 max-w-sm mt-2">Upload your first batch of medical bills to start processing.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3">Batch ID</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Progress</th>
                <th className="px-6 py-3">Avg Confidence</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.map(batch => (
                <tr key={batch.id} className="hover:bg-slate-50 group cursor-pointer" onClick={() => onSelectBatch(batch.id)}>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">
                    {batch.id}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(batch.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${getStatusColor(batch.status)}`}>
                      {batch.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 w-48">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <span>{batch.processed_bills} / {batch.total_bills}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${batch.status === 'failed' ? 'bg-red-500' : 'bg-blue-600'}`}
                        style={{ width: `${(batch.processed_bills / batch.total_bills) * 100}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {batch.avg_confidence > 0 ? (
                        <span className={`font-bold ${batch.avg_confidence > 0.8 ? 'text-green-600' : 'text-amber-600'}`}>
                            {Math.round(batch.avg_confidence * 100)}%
                        </span>
                    ) : (
                        <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 inline-block" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
