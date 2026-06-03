import React, { createContext, useContext, useState, useEffect } from 'react';
import { Plan, UsageMetrics, Invoice, Organization } from '../types';
import { useAuth } from './AuthContext';

// --- Default Plans ---
export const PLANS: Plan[] = [
  {
    id: 'plan_free',
    tier: 'free',
    name: 'Starter',
    price: 0,
    limits: {
      bills_per_month: 20,
      pages_per_month: 50,
      api_calls_per_month: 0,
      users: 1,
      data_retention_days: 7
    },
    features: ['Standard OCR', 'Basic Validation', 'Export to CSV']
  },
  {
    id: 'plan_pro',
    tier: 'pro',
    name: 'Growth',
    price: 99,
    limits: {
      bills_per_month: 1000,
      pages_per_month: 5000,
      api_calls_per_month: 10000,
      users: 5,
      data_retention_days: 90
    },
    features: ['Advanced Fraud Detection', 'API Access', 'Webhooks', 'Priority Processing', 'Export to JSON/Excel']
  },
  {
    id: 'plan_ent',
    tier: 'enterprise',
    name: 'Enterprise',
    price: 499,
    limits: {
      bills_per_month: 10000,
      pages_per_month: 50000,
      api_calls_per_month: 100000,
      users: 50,
      data_retention_days: 365
    },
    features: ['Dedicated Support', 'SLA', 'Custom Models', 'Audit Logs', 'SSO']
  }
];

// Mock data removed to enforce real data usage

interface BillingContextType {
  currentPlan: Plan;
  usage: UsageMetrics;
  invoices: Invoice[];
  availablePlans: Plan[];
  incrementUsage: (metric: keyof UsageMetrics, amount: number) => void;
  checkLimit: (metric: keyof UsageMetrics, amountToAdd?: number) => boolean;
  upgradePlan: (planId: string) => Promise<void>;
  daysRemaining: number;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, organization } = useAuth();
  
  const [currentPlan, setCurrentPlan] = useState<Plan>(PLANS[0]);
  const [usage, setUsage] = useState<UsageMetrics>({
    period_start: new Date().toISOString(),
    period_end: new Date().toISOString(),
    bills_processed: 0,
    pages_processed: 0,
    api_calls: 0
  });
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Load Billing Data on Org Change
  useEffect(() => {
    if (organization) {
      // 1. Identify Plan
      const plan = PLANS.find(p => p.tier === organization.subscription_plan) || PLANS[0];
      setCurrentPlan(plan);

      // 2. Load Usage (Zeroed out until real backend connects)
      setUsage({
        period_start: new Date(new Date().setDate(1)).toISOString(),
        period_end: new Date(new Date().setMonth(new Date().getMonth() + 1, 0)).toISOString(),
        bills_processed: 0,
        pages_processed: 0,
        api_calls: 0
      });

      // 3. Load Invoices (Empty until real backend connects)
      setInvoices([]);
    }
  }, [organization]);

  const daysRemaining = Math.max(0, Math.ceil((new Date(usage.period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

  const checkLimit = (metric: keyof UsageMetrics, amountToAdd = 1): boolean => {
    if (organization?.subscription_plan === 'enterprise') return true; // Soft limits for Enterprise

    let limit = 0;
    let current = 0;

    if (metric === 'bills_processed') {
      limit = currentPlan.limits.bills_per_month;
      current = usage.bills_processed;
    } else if (metric === 'pages_processed') {
      limit = currentPlan.limits.pages_per_month;
      current = usage.pages_processed;
    } else if (metric === 'api_calls') {
      limit = currentPlan.limits.api_calls_per_month;
      current = usage.api_calls;
    }

    return (current + amountToAdd) <= limit;
  };

  const incrementUsage = (metric: keyof UsageMetrics, amount: number) => {
    if (!metric.toString().includes('period')) {
        setUsage(prev => ({
            ...prev,
            [metric]: (prev[metric] as number) + amount
        }));
    }
  };

  const upgradePlan = async (planId: string) => {
      // Simulate API Call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newPlan = PLANS.find(p => p.id === planId);
      if (newPlan) setCurrentPlan(newPlan);
      alert("Plan upgraded successfully! (Mock)");
  };

  return (
    <BillingContext.Provider value={{
      currentPlan,
      usage,
      invoices,
      availablePlans: PLANS,
      incrementUsage,
      checkLimit,
      upgradePlan,
      daysRemaining
    }}>
      {children}
    </BillingContext.Provider>
  );
};

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (context === undefined) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
};
