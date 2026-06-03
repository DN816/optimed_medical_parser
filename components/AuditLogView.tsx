import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { formatIST } from '../services/dateUtils';
import { Search, Download, Filter, Shield, Calendar, User, Activity } from 'lucide-react';
// @ts-ignore
import * as XLSX from 'xlsx';

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // '24h', '7d', '30d'

  // Extract unique actions and users for filters
  const uniqueActions = Array.from(new Set(auditLogs.map(l => l.action)));
  const uniqueUsers = Array.from(new Set(auditLogs.map(l => l.user_email)));

  const filteredLogs = useMemo(() => {
    let logs = auditLogs;

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      logs = logs.filter(l => 
        l.action.toLowerCase().includes(lower) || 
        l.entity_type.toLowerCase().includes(lower) ||
        l.user_email.toLowerCase().includes(lower) ||
        JSON.stringify(l.metadata).toLowerCase().includes(lower)
      );
    }

    if (actionFilter !== 'all') {
      logs = logs.filter(l => l.action === actionFilter);
    }

    if (userFilter !== 'all') {
      logs = logs.filter(l => l.user_email === userFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      if (dateFilter === '24h') cutoff.setHours(now.getHours() - 24);
      if (dateFilter === '7d') cutoff.setDate(now.getDate() - 7);
      if (dateFilter === '30d') cutoff.setDate(now.getDate() - 30);
      logs = logs.filter(l => new Date(l.timestamp) >= cutoff);
    }

    return logs;
  }, [auditLogs, searchTerm, actionFilter, userFilter, dateFilter]);

  const handleExport = () => {
    const data = filteredLogs.map(l => ({
      "Timestamp": formatIST(l.timestamp),
      "User": l.user_email,
      "Action": l.action,
      "Entity Type": l.entity_type,
      "Entity ID": l.entity_id,
      "Metadata": JSON.stringify(l.metadata)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Logs");
    XLSX.writeFile(workbook, `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <Shield className="w-6 h-6 text-blue-600" /> Audit Trails
           </h2>
           <p className="text-slate-500 text-sm mt-1">Immutable record of all system activities for compliance and security.</p>
        </div>
        
        <button 
           onClick={handleExport}
           className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition shadow-sm"
        >
            <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search logs..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
          </div>
          
          <div className="relative">
             <Activity className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <select 
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
             >
                <option value="all">All Actions</option>
                {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
             </select>
          </div>

          <div className="relative">
             <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <select 
                value={userFilter}
                onChange={e => setUserFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
             >
                <option value="all">All Users</option>
                {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
             </select>
          </div>

          <div className="relative">
             <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <select 
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
             >
                <option value="all">All Time</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
             </select>
          </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                 <tr>
                     <th className="px-6 py-3">Timestamp</th>
                     <th className="px-6 py-3">User</th>
                     <th className="px-6 py-3">Action</th>
                     <th className="px-6 py-3">Entity</th>
                     <th className="px-6 py-3">Details</th>
                 </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 font-mono text-xs">
                 {filteredLogs.length === 0 ? (
                     <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-sans">No matching audit logs found</td></tr>
                 ) : (
                     filteredLogs.map(log => (
                         <tr key={log.id} className="hover:bg-slate-50">
                             <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                                 {formatIST(log.timestamp)}
                             </td>
                             <td className="px-6 py-3 font-medium text-slate-700">
                                 {log.user_email}
                             </td>
                             <td className="px-6 py-3">
                                 <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 font-bold text-slate-700">
                                     {log.action}
                                 </span>
                             </td>
                             <td className="px-6 py-3 text-slate-600">
                                 <span className="opacity-70">{log.entity_type}:</span> {log.entity_id}
                             </td>
                             <td className="px-6 py-3 text-slate-500 truncate max-w-xs" title={JSON.stringify(log.metadata, null, 2)}>
                                 {JSON.stringify(log.metadata)}
                             </td>
                         </tr>
                     ))
                 )}
             </tbody>
         </table>
      </div>
    </div>
  );
};
