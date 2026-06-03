import React from 'react';
import { useBilling } from '../contexts/BillingContext';
import { CreditCard, CheckCircle2, TrendingUp, AlertTriangle, Download, Zap, Shield } from 'lucide-react';

export const BillingSettingsView: React.FC = () => {
  const { currentPlan, usage, invoices, availablePlans, upgradePlan, daysRemaining } = useBilling();

  const getUsagePercent = (current: number, max: number) => {
      if (max === 0) return 100;
      return Math.min(100, Math.round((current / max) * 100));
  };

  const MetricCard = ({ label, current, max, unit }: { label: string, current: number, max: number, unit: string }) => {
      const pct = getUsagePercent(current, max);
      const isCritical = pct >= 90;
      const isWarning = pct >= 75 && pct < 90;

      return (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-medium text-slate-500">{label}</span>
                  <span className="text-xs font-bold text-slate-400">{pct}% Used</span>
              </div>
              <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-2xl font-bold text-slate-800">{current.toLocaleString()}</span>
                  <span className="text-sm text-slate-400">/ {max.toLocaleString()} {unit}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-600'}`} 
                    style={{ width: `${pct}%` }}
                  ></div>
              </div>
              {isCritical && (
                  <p className="text-xs text-red-600 mt-2 flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3 h-3" /> Limit reached. Upgrade to continue.
                  </p>
              )}
          </div>
      );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
        
        {/* Current Plan Summary */}
        <div className="bg-slate-900 text-white rounded-2xl p-8 flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full opacity-10 blur-3xl -mr-16 -mt-16"></div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Current Plan</span>
                    <h2 className="text-3xl font-bold">{currentPlan.name}</h2>
                </div>
                <p className="text-slate-400 mb-1">
                    Your plan renews in <span className="text-white font-bold">{daysRemaining} days</span> on {new Date(usage.period_end).toLocaleDateString()}.
                </p>
                <p className="text-slate-400 text-sm">
                    {currentPlan.tier === 'enterprise' 
                        ? 'Unlimited soft limits enabled. Overage charges apply.' 
                        : 'Hard limits active. Processing will pause if exceeded.'}
                </p>
            </div>

            <div className="relative z-10 flex flex-col items-end gap-4 mt-6 md:mt-0">
                <div className="text-right">
                    <span className="text-3xl font-bold">${currentPlan.price}</span>
                    <span className="text-slate-400">/mo</span>
                </div>
                {currentPlan.tier !== 'enterprise' && (
                    <button className="bg-white text-slate-900 hover:bg-slate-100 px-6 py-2.5 rounded-lg font-bold text-sm transition">
                        Manage Subscription
                    </button>
                )}
            </div>
        </div>

        {/* Usage Meters */}
        <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" /> Usage This Month
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard 
                    label="Bills Processed" 
                    current={usage.bills_processed} 
                    max={currentPlan.limits.bills_per_month} 
                    unit="bills" 
                />
                <MetricCard 
                    label="Pages Scanned" 
                    current={usage.pages_processed} 
                    max={currentPlan.limits.pages_per_month} 
                    unit="pages" 
                />
                <MetricCard 
                    label="API Calls" 
                    current={usage.api_calls} 
                    max={currentPlan.limits.api_calls_per_month} 
                    unit="calls" 
                />
            </div>
        </div>

        {/* Plan Comparison */}
        <div>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" /> Available Plans
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {availablePlans.map(plan => {
                    const isCurrent = plan.id === currentPlan.id;
                    return (
                        <div key={plan.id} className={`border rounded-xl p-6 relative flex flex-col ${isCurrent ? 'border-blue-600 ring-1 ring-blue-600 bg-blue-50/30' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                            {isCurrent && (
                                <span className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">CURRENT</span>
                            )}
                            <div className="mb-4">
                                <h4 className="text-lg font-bold text-slate-800">{plan.name}</h4>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-2xl font-bold">${plan.price}</span>
                                    <span className="text-slate-500 text-sm">/mo</span>
                                </div>
                            </div>
                            
                            <div className="flex-1 space-y-3 mb-6">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Limits</p>
                                <ul className="space-y-2 text-sm text-slate-600">
                                    <li className="flex justify-between"><span>Bills/mo</span> <strong>{plan.limits.bills_per_month.toLocaleString()}</strong></li>
                                    <li className="flex justify-between"><span>Pages/mo</span> <strong>{plan.limits.pages_per_month.toLocaleString()}</strong></li>
                                    <li className="flex justify-between"><span>Users</span> <strong>{plan.limits.users}</strong></li>
                                    <li className="flex justify-between"><span>API</span> <strong>{plan.limits.api_calls_per_month > 0 ? 'Yes' : 'No'}</strong></li>
                                </ul>
                                <div className="h-px bg-slate-200 my-2"></div>
                                <ul className="space-y-2">
                                    {plan.features.slice(0, 3).map((feat, i) => (
                                        <li key={i} className="text-xs text-slate-600 flex items-center gap-2">
                                            <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" /> {feat}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button 
                                onClick={() => upgradePlan(plan.id)}
                                disabled={isCurrent}
                                className={`w-full py-2 rounded-lg font-bold text-sm transition
                                    ${isCurrent 
                                        ? 'bg-slate-200 text-slate-500 cursor-default' 
                                        : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md'}
                                `}
                            >
                                {isCurrent ? 'Current Plan' : 'Upgrade'}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>

        {/* Invoice History */}
        <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-slate-600" /> Billing History
            </h3>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Invoice ID</th>
                            <th className="px-6 py-3">Amount</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Invoice</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {invoices.length === 0 ? (
                            <tr><td colSpan={5} className="p-6 text-center text-slate-400">No invoices found</td></tr>
                        ) : (
                            invoices.map(inv => (
                                <tr key={inv.id}>
                                    <td className="px-6 py-4 text-slate-600">{new Date(inv.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{inv.id}</td>
                                    <td className="px-6 py-4 font-medium text-slate-800">${inv.amount.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded capitalize">{inv.status}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-blue-600 hover:underline text-xs font-medium flex items-center justify-end gap-1">
                                            <Download className="w-3 h-3" /> PDF
                                        </button>
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
