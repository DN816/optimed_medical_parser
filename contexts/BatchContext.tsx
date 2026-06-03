import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Batch, Bill, BatchSettings, BillData, Correction, FraudFlag } from '../types';
import { useAuth } from './AuthContext';
import { useLearning } from './LearningContext';
import { useExport } from './ExportContext';
import { useNotification } from './NotificationContext';
import { detectCorrections } from '../services/diffUtils';
import { runFraudChecks } from '../services/fraudDetectionService';
import { api } from '../services/api';

interface BatchContextType {
  batches: Batch[];
  bills: Bill[];
  createBatch: (files: File[], settings: BatchSettings) => Promise<string>;
  getBatch: (id: string) => Batch | undefined;
  getBillsByBatch: (batchId: string) => Bill[];
  reprocessBills: (billIds: string[]) => void;
  deleteBills: (billIds: string[]) => void;
  updateBill: (billId: string, updates: Partial<Bill>) => void;
  saveBillWithCorrections: (billId: string, newData: BillData, status?: Bill['status']) => void;
  resolveFraudFlag: (billId: string, flagId: string, resolution: 'resolved' | 'ignored', note?: string) => void;
  reviewQueueCount: number;
  refreshBills: () => void;
}

const BatchContext = createContext<BatchContextType | undefined>(undefined);

export const BatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logAction } = useAuth();
  const { identifyVendor, vendors, refreshVendors } = useLearning();
  const { createExportJob } = useExport();
  const { addNotification } = useNotification();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  // Ref to track processing status
  const processingRef = useRef<boolean>(false);

  // Load bills from backend on login
  const refreshBills = () => {
    if (!user) return;
    api.get('/bills/?limit=1000')
      .then(res => {
        const backendBills: Bill[] = (res.data || []).map((b: any) => ({
          id: b.id,
          org_id: b.org_id,
          batch_id: b.batch_id || 'imported',
          file_name: b.file_name,
          file_type: b.file_type,
          page_count: 1,
          status: b.status,
          confidence_score: b.confidence_score || 0,
          created_at: b.created_at,
          file_url: b.file_url,
          extracted_data: b.extracted_data,
          original_data: b.extracted_data ? structuredClone(b.extracted_data) : undefined,
          validation_results: b.validation_results,
          corrections: [],
          flags: _computeFlags(b),
          fraud_signals: [],
          vendor_id: b.vendor_id,
        }));
        setBills(backendBills);
      })
      .catch(err => {
        if (err.response?.status !== 401) {
          console.error("Failed to load bills", err);
        }
      });
  };

  useEffect(() => {
    if (user) {
      refreshBills();
    }
  }, [user]);

  // Helper to compute flags from backend bill data
  function _computeFlags(b: any): Bill['flags'] {
    const flags: Bill['flags'] = [];
    if (b.confidence_score && b.confidence_score <= 0.8) flags.push('low_confidence');
    if (b.validation_results?.errors && Object.keys(b.validation_results.errors).length > 0) flags.push('data_mismatch');
    if (!b.extracted_data?.totals?.grand_total) flags.push('missing_fields');
    return flags;
  }

  // Filter data by Org
  const orgBatches = batches.filter(b => b.org_id === user?.org_id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const orgBills = bills.filter(b => !user?.org_id || b.org_id === user?.org_id);
  const reviewQueueCount = orgBills.filter(b => b.status === 'needs_review').length;

  const createBatch = async (files: File[], settings: BatchSettings): Promise<string> => {
    if (!user) throw new Error("Not authenticated");

    const batchId = `batch_${Math.random().toString(36).substr(2, 9)}`;
    const newBatch: Batch = {
      id: batchId,
      org_id: user.org_id,
      created_by: user.id,
      created_at: new Date().toISOString(),
      status: 'queued',
      total_bills: files.length,
      processed_bills: 0,
      avg_confidence: 0,
      settings
    };

    const newBills: Bill[] = files.map(file => ({
      id: `bill_${Math.random().toString(36).substr(2, 9)}`,
      org_id: user.org_id,
      batch_id: batchId,
      file_name: file.name,
      file_type: file.type,
      page_count: 1,
      status: 'queued',
      confidence_score: 0,
      created_at: new Date().toISOString(),
      file_url: URL.createObjectURL(file),
      _file: file,  // Store raw file for upload
    } as Bill & { _file: File }));

    setBatches(prev => [newBatch, ...prev]);
    setBills(prev => [...prev, ...newBills]);

    logAction('CREATE_BATCH', 'BATCH', batchId, { count: files.length, settings });

    // Notification: Batch upload started (Suggestion 2 — contextual)
    addNotification(
      'Batch Upload Started',
      `${files.length} file${files.length > 1 ? 's' : ''} queued for processing.`,
      'info'
    );

    return batchId;
  };

  const reprocessBills = (billIds: string[]) => {
    setBills(prev => prev.map(bill => {
      if (billIds.includes(bill.id)) {
        return { ...bill, status: 'queued', extracted_data: undefined, original_data: undefined, confidence_score: 0, error_reason: undefined, flags: [], fraud_signals: [], sla_deadline: undefined };
      }
      return bill;
    }));
    logAction('REPROCESS_BILLS', 'BILL', 'bulk', { count: billIds.length });
  };

  const deleteBills = async (billIds: string[]) => {
    setBills(prev => prev.filter(bill => !billIds.includes(bill.id)));
    logAction('DELETE_BILLS', 'BILL', 'bulk', { count: billIds.length });

    // Notification: Bills deleted
    addNotification(
      'Bills Deleted',
      `${billIds.length} bill${billIds.length > 1 ? 's' : ''} removed.`,
      'info'
    );

    try {
      await Promise.all(billIds.map(id => api.delete(`/bills/${id}`)));
    } catch (err) {
      console.error("Failed to delete bills on backend", err);
    }
  };

  const updateBill = (billId: string, updates: Partial<Bill>) => {
    setBills(prev => prev.map(bill => {
      if (bill.id === billId) {
        return { ...bill, ...updates };
      }
      return bill;
    }));
    if (updates.status) {
      const bill = bills.find(b => b.id === billId);
      if (bill?.batch_id) recalculateBatchStats([bill.batch_id]);
    }
    logAction('UPDATE_BILL', 'BILL', billId, { updates: Object.keys(updates) });
  };

  const saveBillWithCorrections = async (billId: string, newData: BillData, status?: Bill['status']) => {
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;

    const newCorrections = bill.original_data
      ? detectCorrections(bill.original_data, newData, user?.id || 'unknown')
      : [];

    const updatedStatus = status || bill.status;

    setBills(prev => prev.map(b => {
      if (b.id === billId) {
        return {
          ...b,
          extracted_data: newData,
          status: updatedStatus,
          corrections: [...(b.corrections || []), ...newCorrections]
        };
      }
      return b;
    }));

    if (bill.batch_id) recalculateBatchStats([bill.batch_id]);
    logAction('SAVE_CORRECTIONS', 'BILL', billId, { correction_count: newCorrections.length });

    // Notification: Bill updated (Suggestion 2 — contextual with vendor name)
    const vendorName = newData?.seller_info?.supplier_name;
    addNotification(
      'Bill Updated',
      vendorName
        ? `Corrections saved for ${vendorName} invoice.`
        : `Corrections saved for bill ${billId.substring(0, 8)}...`,
      'success'
    );

    // Backend sync
    try {
      await api.put(`/bills/${billId}`, {
        extracted_data: newData,
        status: updatedStatus
      });
    } catch (err) {
      console.error("Failed to save corrections to backend", err);
    }
  };

  const resolveFraudFlag = (billId: string, flagId: string, resolution: 'resolved' | 'ignored', note?: string) => {
    setBills(prev => prev.map(bill => {
      if (bill.id === billId && bill.fraud_signals) {
        return {
          ...bill,
          fraud_signals: bill.fraud_signals.map(flag =>
            flag.id === flagId
              ? { ...flag, status: resolution, resolved_by: user?.email, resolution_note: note }
              : flag
          )
        };
      }
      return bill;
    }));
    logAction('RESOLVE_FRAUD_FLAG', 'BILL', billId, { flagId, resolution });
  };

  // Async Processor — uploads queued bills to backend
  const processQueue = async () => {
      if (processingRef.current) return;

      const queuedBillsAll = bills.filter(b => b.status === 'queued' && (b as any)._file);
      
      // Sort by batch priority (High > Normal > Low)
      const priorityWeight: Record<string, number> = { 'high': 3, 'normal': 2, 'low': 1 };
      queuedBillsAll.sort((a, b) => {
          const batchA = batches.find(bat => bat.id === a.batch_id);
          const batchB = batches.find(bat => bat.id === b.batch_id);
          const pA = priorityWeight[batchA?.settings?.priority || 'normal'] || 2;
          const pB = priorityWeight[batchB?.settings?.priority || 'normal'] || 2;
          return pB - pA;
      });

      // Process 1 at a time to prevent Gemini Vision rate limits
      const queuedBills = queuedBillsAll.slice(0, 1);
      
      if (queuedBills.length === 0) return;

      processingRef.current = true;

      // Mark as processing
      setBills(prev => prev.map(b => queuedBills.find(qb => qb.id === b.id) ? { ...b, status: 'processing' } : b));

      const affectedBatchIds = Array.from(new Set(queuedBills.map(b => b.batch_id).filter(Boolean))) as string[];
      setBatches(prev => prev.map(batch =>
        affectedBatchIds.includes(batch.id) && batch.status === 'queued'
          ? { ...batch, status: 'processing' }
          : batch
      ));

      // Process each bill
      await Promise.all(queuedBills.map(async (bill) => {
        try {
          const file = (bill as any)._file as File;
          if (!file) {
            throw new Error("No file attached to bill");
          }

          const formData = new FormData();
          formData.append("file", file, bill.file_name);
          if (bill.batch_id) {
            formData.append("batch_id", bill.batch_id);
          }

          const response = await api.post("/bills/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });

          const backendBill = response.data;
          const data: BillData = backendBill.extracted_data || {} as BillData;
          data.confidence_score = backendBill.confidence_score ?? data.confidence_score ?? 0;
          const originalData = structuredClone(data);

          // Fraud Detection (client-side enrichment)
          const vendorId = identifyVendor(data);
          const vendor = vendors.find(v => v.id === vendorId);
          const fraudSignals = runFraudChecks(bill, data, bills, vendor);

          let newStatus: Bill['status'] = backendBill.status || (data.confidence_score > 0.8 ? 'completed' : 'needs_review');

          const flags: Bill['flags'] = [];
          if (data.confidence_score <= 0.8) flags.push('low_confidence');
          if (data.validation_results?.errors && Object.keys(data.validation_results.errors).length > 0) flags.push('data_mismatch');
          if (!data.totals?.grand_total) flags.push('missing_fields');

          if (fraudSignals.length > 0) {
            flags.push('fraud_risk');
            newStatus = 'needs_review';
          }

          let slaHours = 48;
          if (flags.includes('fraud_risk')) slaHours = 4;
          else if (flags.includes('data_mismatch') || flags.includes('missing_fields')) slaHours = 24;
          const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();

          setBills(prev => prev.map(b => b.id === bill.id ? {
            ...b,
            id: backendBill.id,  // Use backend's real ID
            status: newStatus,
            extracted_data: data,
            original_data: originalData,
            confidence_score: data.confidence_score,
            flags,
            fraud_signals: fraudSignals,
            sla_deadline: newStatus === 'needs_review' ? slaDeadline : undefined,
            vendor_id: vendorId,
            file_url: backendBill.file_url,
            _file: undefined,  // Clear file reference
          } : b));

          // Notification: Bill extraction completed (Suggestion 2 — contextual)
          const vendorName = data?.seller_info?.supplier_name;
          addNotification(
            'Bill Extraction Completed',
            vendorName
              ? `${vendorName} invoice processed (${Math.round(data.confidence_score * 100)}% confidence).`
              : `${bill.file_name} processed (${Math.round(data.confidence_score * 100)}% confidence).`,
            data.confidence_score > 0.8 ? 'success' : 'warning'
          );

        } catch (error) {
          console.error(`Error processing bill ${bill.id}`, error);
          setBills(prev => prev.map(b => b.id === bill.id ? {
            ...b,
            status: 'failed',
            error_reason: error instanceof Error ? error.message : "Unknown error"
          } : b));

          // Notification: Bill extraction failed (Suggestion 2 — contextual with filename)
          addNotification(
            'Bill Extraction Failed',
            `${bill.file_name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'error'
          );
        }
      }));

      processingRef.current = false;
      recalculateBatchStats(affectedBatchIds);

      // Refresh vendors after processing (new vendors may have been created)
      refreshVendors();
  };

  const processQueueRef = useRef(processQueue);
  useEffect(() => {
    processQueueRef.current = processQueue;
  }); // Runs on every render to keep ref updated

  useEffect(() => {
    const interval = setInterval(() => {
      processQueueRef.current();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Auto-Export Trigger
  const exportRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    batches.forEach(batch => {
      if (batch.status === 'completed' && batch.settings?.auto_export && !(batch as any)._export_triggered && !exportRef.current.has(batch.id)) {
        exportRef.current.add(batch.id);
        const batchBills = bills.filter(b => b.batch_id === batch.id && b.extracted_data);
        if (batchBills.length > 0) {
          createExportJob(batchBills, 'json', 'batch');
        }
        setBatches(prev => prev.map(b => b.id === batch.id ? { ...b, _export_triggered: true } : b));
      }
    });
  }, [batches, bills, createExportJob]);

  const recalculateBatchStats = (batchIds: string[]) => {
    setBatches(prev => prev.map(batch => {
      if (!batchIds.includes(batch.id)) return batch;
      const batchBills = bills.filter(b => b.batch_id === batch.id);
      const processed = batchBills.filter(b => ['completed', 'failed', 'needs_review'].includes(b.status));
      const failed = batchBills.filter(b => b.status === 'failed');
      const validBills = batchBills.filter(b => b.extracted_data);
      const avgConf = validBills.length > 0 ? validBills.reduce((acc, b) => acc + b.confidence_score, 0) / validBills.length : 0;
      let newStatus: Batch['status'] = batch.status;
      if (processed.length === batch.total_bills) {
        newStatus = failed.length === batch.total_bills ? 'failed' : (failed.length > 0 ? 'partial' : 'completed');
      }
      return {
        ...batch,
        processed_bills: processed.length,
        avg_confidence: avgConf,
        status: newStatus
      };
    }));
  };

  const getBatch = (id: string) => orgBatches.find(b => b.id === id);
  const getBillsByBatch = (batchId: string) => orgBills.filter(b => b.batch_id === batchId);

  return (
    <BatchContext.Provider value={{
      batches: orgBatches,
      bills: orgBills,
      createBatch,
      getBatch,
      getBillsByBatch,
      reprocessBills,
      deleteBills,
      updateBill,
      saveBillWithCorrections,
      resolveFraudFlag,
      reviewQueueCount,
      refreshBills
    }}>
      {children}
    </BatchContext.Provider>
  );
};

export const useBatch = () => {
  const context = useContext(BatchContext);
  if (context === undefined) {
    throw new Error('useBatch must be used within a BatchProvider');
  }
  return context;
};
