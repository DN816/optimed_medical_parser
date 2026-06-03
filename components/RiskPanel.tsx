import React from 'react';
import { FraudFlag } from '../types';
import { AlertTriangle, ShieldAlert, CheckCircle2, XCircle, AlertOctagon, Copy } from 'lucide-react';

interface RiskPanelProps {
  flags: FraudFlag[];
  onResolve: (flagId: string, resolution: 'resolved' | 'ignored') => void;
}

export const RiskPanel: React.FC<RiskPanelProps> = ({ flags, onResolve }) => {
  const activeFlags = flags.filter(f => f.status === 'active');
  const resolvedFlags = flags.filter(f => f.status !== 'active');

  const getSeverityStyle = (s: FraudFlag['severity']) => {
    switch(s) {
      case 'high': return 'bg-red-50 text-red-700 border-red-200';
      case 'medium': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'low': return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 border-l border-slate-200 w-full overflow-hidden">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
           <ShieldAlert className="w-5 h-5 text-red-600" />
           Fraud & Risk Analysis
        </h3>
        <p className="text-xs text-slate-500 mt-1">
           {activeFlags.length} active risk signals detected.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
         {/* Active Flags */}
         {activeFlags.length > 0 ? (
             activeFlags.map(flag => (
                 <div key={flag.id} className={`p-4 rounded-xl border ${getSeverityStyle(flag.severity)} shadow-sm`}>
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-white/50 rounded border border-black/5">
                            {flag.signal_type.replace('_', ' ')}
                        </span>
                        {flag.severity === 'high' && <AlertOctagon className="w-4 h-4 text-red-600" />}
                    </div>
                    <p className="text-sm font-medium mb-4">{flag.description}</p>
                    
                    <div className="flex items-center gap-2">
                        <button 
                           onClick={() => onResolve(flag.id, 'resolved')}
                           className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-1.5 rounded text-xs font-bold transition flex items-center justify-center gap-1"
                        >
                            <CheckCircle2 className="w-3 h-3" /> Mark Valid
                        </button>
                        <button 
                           onClick={() => onResolve(flag.id, 'ignored')} // In real flow, this might confirm fraud
                           className="flex-1 bg-white border border-red-200 hover:bg-red-50 text-red-700 py-1.5 rounded text-xs font-bold transition flex items-center justify-center gap-1"
                        >
                            <XCircle className="w-3 h-3" /> Confirm Fraud
                        </button>
                    </div>
                 </div>
             ))
         ) : (
             <div className="text-center py-12 text-slate-400">
                 <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500 opacity-20" />
                 <p className="text-sm">No active risk signals.</p>
             </div>
         )}

         {/* Resolved History */}
         {resolvedFlags.length > 0 && (
             <div className="mt-8 pt-4 border-t border-slate-200">
                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Resolution History</h4>
                 <div className="space-y-3">
                     {resolvedFlags.map(flag => (
                         <div key={flag.id} className="p-3 bg-white rounded border border-slate-200 opacity-75">
                             <div className="flex justify-between text-xs mb-1">
                                 <span className="font-medium text-slate-700">{flag.signal_type}</span>
                                 <span className={`capitalize font-bold ${flag.status === 'resolved' ? 'text-green-600' : 'text-red-600'}`}>
                                     {flag.status === 'resolved' ? 'Valid' : 'Confirmed Fraud'}
                                 </span>
                             </div>
                             <p className="text-xs text-slate-500 line-clamp-1">{flag.description}</p>
                         </div>
                     ))}
                 </div>
             </div>
         )}
      </div>

    </div>
  );
};
