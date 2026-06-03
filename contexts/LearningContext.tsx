import React, { createContext, useContext, useState, useEffect } from 'react';
import { Bill, Correction, Vendor, VendorStats } from '../types';
import { api } from '../services/api';

interface LearningContextType {
  vendors: Vendor[];
  learnFromBill: (bill: Bill, corrections: Correction[]) => void;
  getVendorStats: (vendorName: string) => VendorStats | undefined;
  identifyVendor: (billData: any) => string | undefined;
  refreshVendors: () => void;
}

const LearningContext = createContext<LearningContextType | undefined>(undefined);

export const LearningProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Fetch vendors from backend
  const refreshVendors = () => {
    api.get('/vendors/')
      .then(res => {
        const mapped: Vendor[] = (res.data || []).map((v: any) => ({
          id: v.id,
          org_id: v.org_id,
          name: v.name,
          gstin: v.gstin,
          address: v.address,
          trust_score: v.trust_score ?? 50,
          total_bills: v.total_bills ?? 0,
          auto_approved_bills: v.auto_approved_bills ?? 0,
          status: v.status || 'active',
          created_at: v.created_at || new Date().toISOString(),
          last_active: v.last_active || new Date().toISOString(),
        }));
        setVendors(mapped);
      })
      .catch(err => {
        // Silently fail — vendors load on best-effort basis
        if (err.response?.status !== 401) {
          console.error("Failed to load vendors", err);
        }
      });
  };

  // Load vendors on mount & periodically
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      refreshVendors();
    }
  }, []);

  const getVendorStats = (vendorName: string): VendorStats | undefined => {
    const v = vendors.find(ven => ven.name.toLowerCase() === vendorName.toLowerCase());
    if (!v) return undefined;
    return {
      vendor_name: v.name,
      total_bills: v.total_bills,
      corrected_bills: v.total_bills - v.auto_approved_bills,
      trust_score: v.trust_score,
      field_accuracies: {},
      top_errors: []
    };
  };

  const identifyVendor = (billData: any): string | undefined => {
    const name = billData?.seller_info?.supplier_name;
    if (!name) return undefined;
    const v = vendors.find(ven => ven.name.toLowerCase().includes(name.toLowerCase()));
    return v?.id;
  };

  const learnFromBill = (_bill: Bill, _corrections: Correction[]) => {
    // Vendor creation/update now happens on the backend during bill upload.
    // After processing, refresh the vendors list.
    refreshVendors();
  };

  return (
    <LearningContext.Provider value={{ vendors, learnFromBill, getVendorStats, identifyVendor, refreshVendors }}>
      {children}
    </LearningContext.Provider>
  );
};

export const useLearning = () => {
  const context = useContext(LearningContext);
  if (context === undefined) {
    throw new Error('useLearning must be used within a LearningProvider');
  }
  return context;
};
