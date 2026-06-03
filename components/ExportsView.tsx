import React from 'react';
import { useExport } from '../contexts/ExportContext';
import { Download, FileText, FileSpreadsheet, FileJson, Clock, CheckCircle2, XCircle, Trash2, Loader2 } from 'lucide-react';

export const ExportsView: React.FC = () => {
  const { jobs, deleteJob } = useExport();

  const getFormatIcon = (format: string) => {
      switch(format) {
          case 'excel': return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
          case 'csv': return <FileText className="w-5 h-5 text-blue-600" />;
          case 'json': return <FileJson className="w-5 h-5 text-orange-600" />;
          default: return <FileText className="w-5 h-5 text-slate-400" />;
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Export History</h2>
        <div className="text-sm text-slate-500">
            Files are available for the duration of the session.
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {jobs.length === 0 ? (
           <div className="p-12 text-center flex flex-col items-center">
                <div className="bg-slate-50 p-4 rounded-full mb-4">
                    <Download className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">No exports yet</h3>
                <p className="text-slate-500 max-w-sm mt-2">Export bills from the Batch or Workspace view to see them here.</p>
           </div>
        ) : (
           <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
               <tr>
                 <th className="px-6 py-3">File Name</th>
                 <th className="px-6 py-3">Format</th>
                 <th className="px-6 py-3">Scope</th>
                 <th className="px-6 py-3">Requested By</th>
                 <th className="px-6 py-3">Status</th>
                 <th className="px-6 py-3">Created At</th>
                 <th className="px-6 py-3 text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {jobs.map(job => (
                 <tr key={job.id} className="hover:bg-slate-50">
                   <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-3">
                     {getFormatIcon(job.format)}
                     {job.file_name}
                   </td>
                   <td className="px-6 py-4 uppercase text-xs font-bold text-slate-500">
                     {job.format}
                   </td>
                   <td className="px-6 py-4 capitalize text-slate-600">
                     {job.scope} <span className="text-slate-400">({job.item_count})</span>
                   </td>
                   <td className="px-6 py-4 text-slate-600">
                     {job.requested_by}
                   </td>
                   <td className="px-6 py-4">
                     {job.status === 'completed' && <span className="flex items-center gap-1 text-green-600 text-xs font-bold"><CheckCircle2 className="w-4 h-4"/> Ready</span>}
                     {job.status === 'processing' && <span className="flex items-center gap-1 text-blue-600 text-xs font-bold"><Loader2 className="w-4 h-4 animate-spin"/> Processing</span>}
                     {job.status === 'failed' && <span className="flex items-center gap-1 text-red-600 text-xs font-bold"><XCircle className="w-4 h-4"/> Failed</span>}
                     {job.status === 'queued' && <span className="flex items-center gap-1 text-slate-400 text-xs font-bold"><Clock className="w-4 h-4"/> Queued</span>}
                   </td>
                   <td className="px-6 py-4 text-slate-500">
                     {new Date(job.created_at).toLocaleString()}
                   </td>
                   <td className="px-6 py-4 text-right">
                     <div className="flex items-center justify-end gap-2">
                         {job.status === 'completed' && job.file_url && (
                             <a 
                                href={job.file_url} 
                                download={job.file_name}
                                className="flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded transition font-medium text-xs"
                             >
                                 <Download className="w-3.5 h-3.5" /> Download
                             </a>
                         )}
                         <button 
                            onClick={() => deleteJob(job.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition"
                         >
                             <Trash2 className="w-4 h-4" />
                         </button>
                     </div>
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
