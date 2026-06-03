import React, { useState, useEffect, useMemo } from 'react';
import { BillData, Bill } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useBatch } from '../contexts/BatchContext';
import { useExport } from '../contexts/ExportContext';

import { ImageViewer } from './ImageViewer';
import { DataForm } from './DataForm';
import { JsonView } from './JsonView';
import { RiskPanel } from './RiskPanel'; // Import RiskPanel
import { ArrowLeft, Download, FileJson, Layout, FileSpreadsheet, FileText, Check, Save, AlertTriangle, XCircle, RotateCcw, ShieldAlert } from 'lucide-react';

interface WorkspaceProps {
  imageSrc: string;
  data: BillData;
  originalData?: BillData;
  billId?: string; // Optional for new edits
  onReset: () => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({ imageSrc, data: initialData, originalData, billId, onReset }) => {
  const [data, setData] = useState<BillData>(initialData);
  const [viewMode, setViewMode] = useState<'form' | 'json' | 'risk'>('form');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  const { user, logAction } = useAuth();
  const { saveBillWithCorrections, updateBill, bills, resolveFraudFlag } = useBatch();
  const { createExportJob } = useExport();

  // Retrieve full bill object for export context
  const currentBill = bills.find(b => b.id === billId);
  const activeRiskCount = currentBill?.fraud_signals?.filter(f => f.status === 'active').length || 0;

  // Update dirty state on change
  const handleDataChange = (newData: BillData) => {
      setData(newData);
      setIsDirty(true);
  };

  // --- Backend Validation ---
  // We trust the backend's validation results instead of duplicating logic in the frontend
  const validationResult = useMemo(() => {
      return currentBill?.validation_results || { isValid: true, errors: {}, warnings: {} };
  }, [currentBill?.validation_results]);

  const formErrors: Record<string, string> = {};
  if (validationResult.errors) {
      Object.entries(validationResult.errors).forEach(([key, msgs]) => {
          const messages = Array.isArray(msgs) ? msgs : [msgs];
          formErrors[key] = messages[0] as string;
      });
  }

  const isValid = validationResult.isValid !== false && !isDirty; // Require saving before approval if dirty

  // --- Actions ---
  const handleSave = () => {
      if (billId) {
          saveBillWithCorrections(billId, data);
          setIsDirty(false);
      }
  };

  const handleApprove = () => {
      if (billId) {
          if (activeRiskCount > 0 && !window.confirm(`There are ${activeRiskCount} unresolved risk signals. Approve anyway?`)) {
              return;
          }
          saveBillWithCorrections(billId, data, 'completed');
          onReset();
      }
  };

  const handleReject = () => {
       if (billId) {
          updateBill(billId, { status: 'failed', error_reason: 'Rejected by reviewer' });
          onReset();
      }
  };

  const handleMarkReview = () => {
      if (billId) {
          updateBill(billId, { status: 'needs_review' });
          onReset();
      }
  };

  // --- New Export Handler ---
  const handleExport = (format: 'json' | 'csv' | 'excel') => {
      if (!currentBill) return;
      
      const exportVersionBill: Bill = {
          ...currentBill,
          extracted_data: data
      };

      createExportJob([exportVersionBill], format, 'bill');
      setShowExportMenu(false);
      
      alert(`Export to ${format.toUpperCase()} started. Check the Exports tab.`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]" onClick={() => setShowExportMenu(false)}>
      
      {/* --- Workspace Toolbar --- */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
         <div className="flex items-center gap-4">
            <button onClick={onReset} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500 hover:text-slate-800">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <h2 className="font-bold text-slate-800 text-sm">Reviewing Bill</h2>
                <p className="text-xs text-slate-500 font-mono">{data.invoice_details?.invoice_number || 'Unidentified'}</p>
            </div>
         </div>

         {/* Center: View Toggles */}
         <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('form')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition ${viewMode === 'form' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Layout className="w-3.5 h-3.5" /> Form
            </button>
            <button 
              onClick={() => setViewMode('risk')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition ${viewMode === 'risk' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ShieldAlert className={`w-3.5 h-3.5 ${activeRiskCount > 0 ? 'text-red-500' : ''}`} /> 
              Risk
              {activeRiskCount > 0 && <span className="bg-red-500 text-white text-[9px] px-1 rounded-full">{activeRiskCount}</span>}
            </button>
            <button 
              onClick={() => setViewMode('json')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition ${viewMode === 'json' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FileJson className="w-3.5 h-3.5" /> JSON
            </button>
         </div>

         {/* Right: Export */}
         <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); }}
              className="flex items-center gap-2 text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-sm font-medium transition"
            >
              <Download className="w-4 h-4" /> Export
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button 
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <FileJson className="w-4 h-4 text-orange-500" /> Export as JSON
                </button>
                <button 
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-blue-500" /> Export as CSV
                </button>
                <button 
                  onClick={() => handleExport('excel')}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-600" /> Export as Excel
                </button>
              </div>
            )}
         </div>
      </div>

      {/* --- Main Content Split View --- */}
      <div className="flex-1 overflow-hidden flex relative">
        {/* Left Panel - Image Viewer */}
        <div className="w-[50%] h-full border-r border-slate-200 bg-slate-900">
          <ImageViewer imageSrc={imageSrc} />
        </div>

        {/* Right Panel - Data/Risk Form */}
        <div className="w-[50%] h-full bg-white flex flex-col">
            <div className="flex-1 overflow-y-auto">
                {viewMode === 'form' && (
                  <DataForm 
                      data={data} 
                      originalData={originalData}
                      onChange={handleDataChange} 
                      validationErrors={formErrors} 
                  />
                )}
                
                {viewMode === 'risk' && currentBill && (
                   <RiskPanel 
                      flags={currentBill.fraud_signals || []} 
                      onResolve={(flagId, resolution) => billId && resolveFraudFlag(billId, flagId, resolution)}
                   />
                )}
                
                {viewMode === 'json' && (
                  <JsonView data={data} />
                )}
            </div>
            
            {/* --- Sticky Action Bar --- */}
            <div className="border-t border-slate-200 p-4 bg-white shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                {/* Validation Banner */}
                {!isValid && (
                    <div className="mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded text-xs text-red-600 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">Cannot Approve:</span> {isDirty ? 'Please save your changes first to validate them.' : 'Data validation failed. Please correct the highlighted fields and save.'}
                        </div>
                    </div>
                )}
                
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleSave}
                            disabled={!isDirty}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
                                ${isDirty ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                            `}
                        >
                            <Save className="w-4 h-4" /> Save
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                             onClick={handleReject}
                             className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition flex items-center gap-2"
                        >
                            <XCircle className="w-4 h-4" /> Reject
                        </button>
                         <button 
                             onClick={handleMarkReview}
                             className="px-4 py-2 border border-amber-200 text-amber-600 hover:bg-amber-50 rounded-lg text-sm font-medium transition flex items-center gap-2"
                        >
                            <RotateCcw className="w-4 h-4" /> Re-Review
                        </button>
                        <button 
                             onClick={handleApprove}
                             disabled={!isValid}
                             className={`px-6 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 shadow-sm
                                ${isValid 
                                    ? 'bg-green-600 text-white hover:bg-green-700 hover:shadow' 
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                             `}
                        >
                            <Check className="w-4 h-4" /> Approve
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>

    </div>
  );
};
