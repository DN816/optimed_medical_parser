import React, { useState } from 'react';
import { Vendor } from '../types';
import { useLearning } from '../contexts/LearningContext';
import { ArrowLeft, History } from 'lucide-react';
import { SimpleBarChart } from './AnalyticsCharts';

interface VendorDetailViewProps {
  vendorId: string;
  onBack: () => void;
}

export const VendorDetailView: React.FC<VendorDetailViewProps> = ({ vendorId, onBack }) => {
  const { vendors } = useLearning();
  const [activeTab, setActiveTab] = useState<'overview'>('overview');

  const vendor = vendors.find(v => v.id === vendorId);

  if (!vendor) return <div>Vendor not found</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">
            <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
            <h2 className="text-2xl font-bold text-slate-800">{vendor.name}</h2>
            <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="font-mono bg-slate-100 px-2 rounded text-xs">{vendor.id}</span>
                <span>•</span>
                <span>Joined {new Date(vendor.created_at).toLocaleDateString()}</span>
            </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${vendor.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                {vendor.status}
            </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-8 border-b border-slate-200">
        {[
            { id: 'overview', label: 'Overview', icon: <History className="w-4 h-4"/> },
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

      {/* Content */}
      <div className="min-h-[400px]">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
              <div className="grid grid-cols-3 gap-6">
                  {/* Stats Cards */}
                  <div className="col-span-3 grid grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Bills</p>
                          <p className="text-2xl font-bold text-slate-800 mt-1">{vendor.total_bills}</p>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Trust Score</p>
                          <p className={`text-2xl font-bold mt-1 ${vendor.trust_score > 90 ? 'text-green-600' : 'text-blue-600'}`}>{vendor.trust_score}%</p>
                      </div>
                  </div>

                  {/* Mock Accuracy Chart */}
                  <div className="col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-4">Extraction Accuracy Trend</h3>
                      {vendor.total_bills > 0 ? (
                        <SimpleBarChart 
                          data={[{label: 'Trust Score', value: vendor.trust_score}]} 
                          height={200} 
                          color="bg-blue-600"
                          formatValue={v => `${v}%`}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
                          Accuracy data will appear after bills are processed.
                        </div>
                      )}
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-4">Vendor Details</h3>
                      <div className="space-y-4 text-sm">
                          <div>
                              <span className="block text-slate-500 text-xs">GSTIN</span>
                              <span className="font-mono text-slate-800">{vendor.gstin || 'Not detected'}</span>
                          </div>
                          <div>
                              <span className="block text-slate-500 text-xs">Address</span>
                              <span className="text-slate-800">{vendor.address || 'Not detected'}</span>
                          </div>
                          <div>
                              <span className="block text-slate-500 text-xs">Org ID</span>
                              <span className="font-mono text-slate-800">{vendor.org_id}</span>
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};
