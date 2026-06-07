import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SimpleBarChart, KPICard } from './AnalyticsCharts';
import { DateRange, ChartDataPoint } from '../types';
import { 
  BarChart3, Users, Zap, ShieldAlert, Calendar, Download, 
  DollarSign, PieChart, Activity, AlertTriangle, CheckCircle, Flag, Loader2, Package
} from 'lucide-react';

interface SpendData {
  totalSpend: number;
  totalTax: number;
  avgBillValue: number;
  billCount: number;
  chartData: ChartDataPoint[];
}

interface OpsData {
  accuracy: number;
  autoApprovalRate: number;
  totalProcessed: number;
  chartData: ChartDataPoint[];
}

interface CategoryItem {
  category: string;
  amount: number;
  percentage: number;
}

interface VendorRow {
  vendor_name: string;
  total_bills: number;
  corrected_bills: number;
  trust_score: number;
  avg_confidence: number;
}

export const AnalyticsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'spend' | 'vendor' | 'ops' | 'risk'>('spend');
  const [dateRange, setDateRange] = useState<DateRange>('90d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Backend data
  const [spendData, setSpendData] = useState<SpendData | null>(null);
  const [opsData, setOpsData] = useState<OpsData | null>(null);
  const [vendorData, setVendorData] = useState<VendorRow[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<CategoryItem[]>([]);

  // Fetch summary (used for risk tab)
  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get(`/analytics/summary?range=${dateRange}`)
      .then(res => setSummaryData(res.data))
      .catch(err => {
        console.error('Failed to load analytics summary', err);
        setError('Failed to load analytics data.');
      })
      .finally(() => setLoading(false));
  }, [dateRange]);

  // Fetch spend data
  useEffect(() => {
    if (activeTab !== 'spend') return;
    api.get(`/analytics/spend?range=${dateRange}`)
      .then(res => {
        const chart = res.data?.chart_data || [];
        setSpendData({
          totalSpend: summaryData?.total_spend || 0,
          totalTax: summaryData?.total_tax || 0,
          avgBillValue: summaryData?.avg_bill_value || 0,
          billCount: summaryData?.total_bills || 0,
          chartData: chart,
        });
      })
      .catch(err => console.error('Failed to load spend analytics', err));
    // Also fetch category breakdown
    api.get(`/analytics/spend-by-category?range=${dateRange}`)
      .then(res => setCategoryData(res.data || []))
      .catch(err => console.error('Failed to load category analytics', err));
  }, [activeTab, dateRange, summaryData]);

  // Fetch ops data
  useEffect(() => {
    if (activeTab !== 'ops') return;
    api.get(`/analytics/ops?range=${dateRange}`)
      .then(res => {
        setOpsData({
          accuracy: res.data?.accuracy || 0,
          autoApprovalRate: res.data?.auto_approval_rate || 0,
          totalProcessed: res.data?.total_processed || 0,
          chartData: res.data?.chart_data || [],
        });
      })
      .catch(err => console.error('Failed to load ops analytics', err));
  }, [activeTab, dateRange]);

  // Fetch vendor data
  useEffect(() => {
    if (activeTab !== 'vendor') return;
    api.get('/analytics/vendors')
      .then(res => setVendorData(res.data || []))
      .catch(err => console.error('Failed to load vendor analytics', err));
  }, [activeTab]);

  // Formatters
  const currency = (val: number) => `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const pct = (val: number) => `${val}%`;

  // --- Tab Content Renderers ---

  const renderSpendTab = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KPICard 
                title="Total Medical Spend" 
                value={currency(spendData?.totalSpend || 0)} 
                subtext={`${dateRange} period`} 
                icon={<DollarSign className="w-5 h-5"/>} 
            />
            <KPICard 
                title="Total Tax Paid" 
                value={currency(spendData?.totalTax || 0)} 
                subtext="CGST + SGST" 
                icon={<PieChart className="w-5 h-5"/>} 
            />
            <KPICard 
                title="Avg Bill Value" 
                value={currency(spendData?.avgBillValue || 0)} 
                subtext={`Across ${spendData?.billCount || 0} bills`} 
                icon={<Activity className="w-5 h-5"/>} 
            />
            <KPICard 
                title="Processed Volume" 
                value={spendData?.billCount || 0} 
                subtext="Bills in selected period" 
                icon={<BarChart3 className="w-5 h-5"/>} 
            />
        </div>

        {/* Chart Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6">Monthly Spend Trend</h3>
                {(spendData?.chartData || []).length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <BarChart3 className="w-8 h-8 opacity-30" />
                    <p className="text-sm">No completed bills found for this period.</p>
                    <p className="text-xs text-slate-300">Process and complete some bills to see spend trends.</p>
                  </div>
                ) : (
                  <SimpleBarChart data={spendData?.chartData || []} formatValue={currency} color="bg-blue-600" />
                )}
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">Spend by Category</h3>
                {categoryData.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Package className="w-8 h-8 opacity-30" />
                    <p className="text-sm text-center">No categorised items yet.</p>
                    <p className="text-xs text-slate-300 text-center">Categories are derived from invoice line items.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categoryData.map((cat, i) => {
                      const colors = [
                        'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500',
                        'bg-pink-500', 'bg-rose-500', 'bg-orange-500', 'bg-amber-500'
                      ];
                      return (
                        <div key={i}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-slate-700 truncate max-w-[60%]">{cat.category}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800">{currency(cat.amount)}</span>
                              <span className="text-[10px] text-slate-400">({cat.percentage}%)</span>
                            </div>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${colors[i % colors.length]}`}
                              style={{ width: `${cat.percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
        </div>
    </div>
  );

  const renderVendorTab = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Vendor Performance Ranking</h3>
            </div>
            <table className="w-full text-left text-sm">
                <thead className="bg-white text-slate-500 border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-3 font-medium">Vendor Name</th>
                        <th className="px-6 py-3 font-medium">Total Bills</th>
                        <th className="px-6 py-3 font-medium">Corrections</th>
                        <th className="px-6 py-3 font-medium">Data Trust Score</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {vendorData.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-400">No vendor data available</td></tr>
                    ) : (
                        vendorData.map((v, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-800">{v.vendor_name}</td>
                                <td className="px-6 py-4 text-slate-500">{v.total_bills}</td>
                                <td className="px-6 py-4 text-slate-500">{v.corrected_bills}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${v.trust_score > 90 ? 'bg-green-500' : v.trust_score > 70 ? 'bg-blue-500' : 'bg-red-500'}`}
                                                style={{ width: `${v.trust_score}%` }}
                                            ></div>
                                        </div>
                                        <span className={`text-xs font-bold ${v.trust_score > 90 ? 'text-green-600' : 'text-slate-600'}`}>{v.trust_score}%</span>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );

  const renderOpsTab = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
         {/* KPI Grid */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard 
                title="Auto-Approval Rate" 
                value={pct(opsData?.autoApprovalRate || 0)} 
                subtext="High-confidence auto-approved" 
                icon={<Zap className="w-5 h-5 text-amber-500"/>} 
            />
            <KPICard 
                title="Global Accuracy" 
                value={pct(opsData?.accuracy || 0)} 
                subtext="Model Confidence" 
                icon={<CheckCircle className="w-5 h-5 text-green-500"/>} 
            />
            <KPICard 
                title="Total Processed" 
                value={opsData?.totalProcessed || 0} 
                subtext="Bills in selected period"
                icon={<BarChart3 className="w-5 h-5 text-indigo-500"/>} 
            />
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6">Processing Volume (Last 14 Days)</h3>
            {(opsData?.chartData || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 text-slate-400" style={{ height: '250px' }}>
                <Activity className="w-8 h-8 opacity-30" />
                <p className="text-sm">No processing data for this period.</p>
                <p className="text-xs text-slate-300">Upload and process bills to see volume trends.</p>
              </div>
            ) : (
              <SimpleBarChart data={opsData?.chartData || []} height={250} color="bg-indigo-500" />
            )}
        </div>
    </div>
  );

  const renderRiskTab = () => {
    const flaggedCount = summaryData?.needs_review || 0;
    const failedCount = summaryData?.failed || 0;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
        <div className="flex gap-4 p-4 bg-red-50 border border-red-100 rounded-xl items-start">
             <ShieldAlert className="w-6 h-6 text-red-600 mt-1" />
             <div>
                 <h3 className="text-lg font-bold text-red-800">Fraud Detection Active</h3>
                 <p className="text-sm text-red-600 mt-1">
                     The system is actively monitoring for duplicate invoices, amount anomalies, and shell vendor patterns.
                 </p>
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <KPICard 
                title="Bills Needing Review" 
                value={flaggedCount} 
                subtext="Requires manual audit"
                icon={<Flag className="w-5 h-5 text-amber-500"/>} 
            />
            <KPICard 
                title="Failed Bills" 
                value={failedCount} 
                trendColor="text-red-600"
                trend={failedCount > 0 ? 'Attention needed' : 'All clear'}
                icon={<AlertTriangle className="w-5 h-5 text-red-500"/>} 
            />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Analytics & Insights</h2>
           <p className="text-slate-500 text-sm">Real-time business intelligence from approved bills.</p>
        </div>
        
        <div className="flex items-center gap-2">
           {/* Date Filter */}
           <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              <span className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-500 border-r border-slate-100 mr-1">
                  <Calendar className="w-3.5 h-3.5" /> Period:
              </span>
              {(['30d', '90d', '1y', 'all'] as DateRange[]).map(r => (
                  <button 
                    key={r}
                    onClick={() => setDateRange(r)}
                    className={`px-3 py-1 text-xs font-medium rounded transition uppercase ${dateRange === r ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                      {r}
                  </button>
              ))}
           </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
         <div className="flex space-x-8">
            {[
                { id: 'spend', label: 'Spend Analytics', icon: <DollarSign className="w-4 h-4"/> },
                { id: 'vendor', label: 'Vendor Insights', icon: <Users className="w-4 h-4"/> },
                { id: 'ops', label: 'OCR & Ops Metrics', icon: <Activity className="w-4 h-4"/> },
                { id: 'risk', label: 'Fraud & Risk', icon: <ShieldAlert className="w-4 h-4"/> },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                        ${activeTab === tab.id 
                            ? 'border-blue-600 text-blue-600' 
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }
                    `}
                >
                    {tab.icon} {tab.label}
                </button>
            ))}
         </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
          {activeTab === 'spend' && renderSpendTab()}
          {activeTab === 'vendor' && renderVendorTab()}
          {activeTab === 'ops' && renderOpsTab()}
          {activeTab === 'risk' && renderRiskTab()}
      </div>

    </div>
  );
};