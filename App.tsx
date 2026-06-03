import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BatchProvider, useBatch } from './contexts/BatchContext';
import { LearningProvider } from './contexts/LearningContext';
import { ExportProvider } from './contexts/ExportContext';
import { IntegrationProvider } from './contexts/IntegrationContext';
import { BillingProvider } from './contexts/BillingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { LoginScreen } from './components/LoginScreen';
import { Layout } from './components/Layout';
import { UploadZone } from './components/UploadZone';
import { BatchListView } from './components/BatchListView';
import { BatchDetailView } from './components/BatchDetailView';
import { Workspace } from './components/Workspace';
import { SettingsScreen } from './components/SettingsScreen';
import { AnalyticsView } from './components/AnalyticsView';
import { ExportsView } from './components/ExportsView';
import { ReviewQueueView } from './components/ReviewQueueView';
import { ReviewSession } from './components/ReviewSession';
import { VendorListView } from './components/VendorListView';
import { VendorDetailView } from './components/VendorDetailView';
import { IntegrationsView } from './components/IntegrationsView';
import { AuditLogView } from './components/AuditLogView';
import { AllBillsView } from './components/AllBillsView';
import { Bill, NavSection, BatchSettings } from './types';
import { api } from './services/api';
import { BrainCircuit, TrendingUp, FileText, CheckCircle, AlertTriangle, Clock, Store } from 'lucide-react';

// Dashboard Component — Real Data from Backend
const DashboardView: React.FC = () => {
  const [stats, setStats] = useState<{
    total_bills: number;
    completed: number;
    needs_review: number;
    failed: number;
    average_confidence: number;
  } | null>(null);
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [vendorCount, setVendorCount] = useState(0);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load dashboard stats from backend
    api.get('/bills/stats/summary').then(res => setStats(res.data)).catch(err => { console.error(err); setError('Failed to load stats'); });
    api.get('/analytics/recent-bills?limit=5').then(res => setRecentBills(res.data || [])).catch(err => { console.error(err); setError('Failed to load recent bills'); });
    api.get('/vendors/stats').then(res => setVendorCount(res.data?.total_vendors || 0)).catch(err => { console.error(err); setError('Failed to load vendors'); });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
        <p className="text-slate-500 text-sm mt-1">Real-time overview of your medical bill processing.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Processed', value: stats ? stats.total_bills.toString() : '...', icon: <FileText className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed', value: stats ? stats.completed.toString() : '...', icon: <CheckCircle className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Pending Review', value: stats ? stats.needs_review.toString() : '...', icon: <AlertTriangle className="w-5 h-5" />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Avg Confidence', value: stats ? `${stats.average_confidence}%` : '...', icon: <TrendingUp className="w-5 h-5" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <span className={stat.color}>{stat.icon}</span>
              </div>
            </div>
            <h3 className={`text-3xl font-bold ${stat.color}`}>{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bills */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Recent Bills</h3>
            <span className="text-xs text-slate-400">{recentBills.length} latest</span>
          </div>
          {recentBills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No bills processed yet.</p>
              <p className="text-xs text-slate-400 mt-1">Upload your first medical bill to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentBills.map((bill: any) => (
                <div key={bill.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{bill.file_name}</p>
                      <p className="text-xs text-slate-400">{bill.vendor_name || 'Unknown vendor'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {bill.grand_total && (
                      <span className="text-sm font-semibold text-slate-700">₹{Number(bill.grand_total).toLocaleString('en-IN')}</span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      bill.status === 'completed' ? 'bg-green-100 text-green-700' :
                      bill.status === 'needs_review' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {bill.status === 'completed' ? <CheckCircle className="w-3 h-3" /> :
                       bill.status === 'needs_review' ? <AlertTriangle className="w-3 h-3" /> :
                       <Clock className="w-3 h-3" />}
                      {bill.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Store className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800">Vendors</h3>
            </div>
            <p className="text-3xl font-bold text-blue-600">{vendorCount}</p>
            <p className="text-xs text-slate-400 mt-1">Auto-discovered from bills</p>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
            <BrainCircuit className="w-8 h-8 mb-3 opacity-80" />
            <h3 className="font-bold text-lg">AI-Powered OCR</h3>
            <p className="text-blue-100 text-sm mt-2">
              Gemini Vision AI pipeline extracts structured data from medical invoices automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Internal routing state for Batches flow
type BatchViewMode = 'list' | 'upload' | 'detail' | 'bill_workspace';

const AuthenticatedApp: React.FC = () => {
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');

  // Batch Navigation State
  const [batchViewMode, setBatchViewMode] = useState<BatchViewMode>('list');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  // Review Queue State
  const [reviewSessionQueue, setReviewSessionQueue] = useState<Bill[] | null>(null);

  // Vendor State
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  const { createBatch } = useBatch();

  const handleNavChange = (nav: NavSection) => {
    setActiveNav(nav);
    // Reset internal states
    if (nav !== 'batches') {
      setBatchViewMode('list');
      setSelectedBatchId(null);
      setSelectedBill(null);
    }
    if (nav !== 'vendors') {
      setSelectedVendorId(null);
    }
  };

  const handleCreateBatch = async (files: File[], settings: BatchSettings) => {
    try {
      await createBatch(files, settings);
      setBatchViewMode('list'); // Go back to list to see the new batch status
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to create batch");
    }
  };

  const handleViewBill = (bill: Bill) => {
    setSelectedBill(bill);
    setBatchViewMode('bill_workspace');
    setActiveNav('batches');
  };

  const renderBatchesContent = () => {
    switch (batchViewMode) {
      case 'list':
        return <BatchListView
          onCreateBatch={() => setBatchViewMode('upload')}
          onSelectBatch={(id) => { setSelectedBatchId(id); setBatchViewMode('detail'); }}
        />;
      case 'upload':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
              <button onClick={() => setBatchViewMode('list')} className="text-sm font-medium text-slate-500 hover:text-slate-800">
                &larr; Back to Batches
              </button>
              <h2 className="text-xl font-bold text-slate-800">Upload New Batch</h2>
            </div>
            <UploadZone onBatchUpload={handleCreateBatch} />
          </div>
        );
      case 'detail':
        if (!selectedBatchId) return <div>Error: No batch selected</div>;
        return <BatchDetailView
          batchId={selectedBatchId}
          onBack={() => setBatchViewMode('list')}
          onViewBill={handleViewBill}
        />;
      case 'bill_workspace':
        if (!selectedBill || !selectedBill.extracted_data) return <div>Error: Bill data not ready</div>;
        return <Workspace
          imageSrc={selectedBill.file_url}
          data={selectedBill.extracted_data}
          originalData={selectedBill.original_data}
          billId={selectedBill.id}
          onReset={() => setBatchViewMode('detail')}
        />;
      default:
        return <div>Unknown View</div>;
    }
  };

  const renderVendorsContent = () => {
    if (selectedVendorId) {
      return <VendorDetailView vendorId={selectedVendorId} onBack={() => setSelectedVendorId(null)} />;
    }
    return <VendorListView onSelectVendor={(v) => setSelectedVendorId(v.id)} />;
  };

  const renderContent = () => {
    // If a review session is active, it takes over the screen
    if (reviewSessionQueue) {
      return <ReviewSession queue={reviewSessionQueue} onClose={() => setReviewSessionQueue(null)} />;
    }

    switch (activeNav) {
      case 'dashboard':
        return <DashboardView />;
      case 'settings':
        return <SettingsScreen />;
      case 'audit_logs':
        return <AuditLogView />;
      case 'batches':
        return renderBatchesContent();
      case 'review_queue':
        return <ReviewQueueView onStartSession={(q) => setReviewSessionQueue(q)} />;
      case 'bills':
        return <AllBillsView onViewBill={handleViewBill} />;
      case 'analytics':
        return <AnalyticsView />;
      case 'exports':
        return <ExportsView />;
      case 'vendors':
        return renderVendorsContent();
      case 'api':
        return <IntegrationsView />;
      default:
        return <div>Select a menu item</div>;
    }
  };

  return (
    <Layout 
      activeNav={activeNav} 
      onNavChange={handleNavChange}
      onGlobalBillSelect={handleViewBill}
    >
      {renderContent()}
    </Layout>
  );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BillingProvider>
        <ExportProvider>
          <NotificationProvider>
            <LearningProvider>
              <IntegrationProvider>
                <BatchProvider>
                  <AppContent />
                </BatchProvider>
              </IntegrationProvider>
            </LearningProvider>
          </NotificationProvider>
        </ExportProvider>
      </BillingProvider>
    </AuthProvider>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isInitializing, user } = useAuth();

  if (isInitializing) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <BrainCircuit className="w-12 h-12 text-blue-600 animate-pulse" />
          <p className="text-slate-500 font-medium">Initializing Optimed AI...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <AuthenticatedApp /> : <LoginScreen />;
}

export default App;
