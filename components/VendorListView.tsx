import React, { useState, useEffect } from 'react';
import { useLearning } from '../contexts/LearningContext';
import { Store, Search, Filter, ArrowUpRight, LayoutTemplate, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { Vendor } from '../types';

interface VendorListViewProps {
  onSelectVendor: (vendor: Vendor) => void;
}

export const VendorListView: React.FC<VendorListViewProps> = ({ onSelectVendor }) => {
  const { vendors, refreshVendors } = useLearning();
  const [searchTerm, setSearchTerm] = useState('');

  // Refresh vendors on mount
  useEffect(() => {
    refreshVendors();
  }, []);

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.gstin?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTrustBadge = (score: number) => {
    if (score >= 90) return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700"><ShieldCheck className="w-3 h-3"/> Trusted</span>;
    if (score >= 70) return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Stable</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700"><AlertCircle className="w-3 h-3"/> Learning</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Store className="w-6 h-6 text-blue-600" /> Vendor Intelligence
          </h2>
          <p className="text-slate-500 text-sm mt-1">Vendors are auto-discovered from uploaded bills.</p>
        </div>
        <button
          onClick={() => refreshVendors()}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search vendor by name or GSTIN..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredVendors.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
          <Store className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No vendors yet</h3>
          <p className="text-sm text-slate-500 max-w-md text-center">
            {vendors.length === 0
              ? 'Vendors will appear here automatically when you upload medical bills. The system extracts vendor information from each bill.'
              : 'No vendors match your search.'}
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendors.map(vendor => (
          <div 
            key={vendor.id} 
            onClick={() => onSelectVendor(vendor)}
            className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                  {vendor.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition">{vendor.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">{vendor.gstin || 'No GSTIN'}</p>
                </div>
              </div>
              <div className="p-2 bg-slate-50 rounded-full text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-center justify-between mb-6">
              {getTrustBadge(vendor.trust_score)}
              <span className="text-xs text-slate-400">Last active: {new Date(vendor.last_active).toLocaleDateString()}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-4 border-t border-slate-100">
              <div className="text-center">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Bills</p>
                <p className="text-lg font-bold text-slate-800">{vendor.total_bills}</p>
              </div>
              <div className="text-center border-l border-slate-100">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Trust</p>
                <p className="text-lg font-bold text-slate-800">{vendor.trust_score}%</p>
              </div>
              <div className="text-center border-l border-slate-100">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Auto-OK</p>
                <p className="text-lg font-bold text-slate-800">{vendor.auto_approved_bills}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
