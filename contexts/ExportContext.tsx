import React, { createContext, useContext, useState, useEffect } from 'react';
import { ExportJob, Bill } from '../types';
import { useAuth } from './AuthContext';
import { generateExportFile } from '../services/exportService';

interface ExportContextType {
  jobs: ExportJob[];
  createExportJob: (bills: Bill[], format: 'json' | 'csv' | 'excel', scope: ExportJob['scope']) => void;
  deleteJob: (id: string) => void;
  processingCount: number;
}

const ExportContext = createContext<ExportContextType | undefined>(undefined);

export const ExportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logAction } = useAuth();
  const [jobs, setJobs] = useState<ExportJob[]>([]);

  // Filter jobs by current org
  const orgJobs = jobs.filter(j => j.org_id === user?.org_id).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const processingCount = orgJobs.filter(j => j.status === 'processing').length;

  const createExportJob = (bills: Bill[], format: 'json' | 'csv' | 'excel', scope: ExportJob['scope']) => {
    if (!user) return;

    const jobId = `export_${Math.random().toString(36).substr(2, 9)}`;
    const newJob: ExportJob = {
      id: jobId,
      org_id: user.org_id,
      requested_by: user.email,
      scope,
      format,
      status: 'queued',
      item_count: bills.length,
      file_name: `preparing...`,
      created_at: new Date().toISOString(),
    };

    setJobs(prev => [newJob, ...prev]);
    logAction('EXPORT_INITIATED', 'EXPORT', jobId, { count: bills.length, format });

    // Simulate Async Processing
    processExport(jobId, bills, format);
  };

  const processExport = async (jobId: string, bills: Bill[], format: 'json' | 'csv' | 'excel') => {
    // 1. Mark as processing
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'processing' } : j));

    try {
        // Simulate delay based on item count (min 1 sec)
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.min(bills.length * 100, 3000)));

        // 2. Generate File
        const { blob, filename } = await generateExportFile(bills, format);
        const fileUrl = URL.createObjectURL(blob);

        // 3. Mark Completed
        setJobs(prev => prev.map(j => j.id === jobId ? { 
            ...j, 
            status: 'completed',
            file_url: fileUrl,
            file_name: filename,
            completed_at: new Date().toISOString()
        } : j));

    } catch (error) {
        console.error("Export Failed", error);
        setJobs(prev => prev.map(j => j.id === jobId ? { 
            ...j, 
            status: 'failed', 
            error: error instanceof Error ? error.message : 'Unknown error' 
        } : j));
    }
  };

  const deleteJob = (id: string) => {
      setJobs(prev => prev.filter(j => j.id !== id));
      logAction('EXPORT_DELETED', 'EXPORT', id);
  };

  return (
    <ExportContext.Provider value={{ jobs: orgJobs, createExportJob, deleteJob, processingCount }}>
      {children}
    </ExportContext.Provider>
  );
};

export const useExport = () => {
  const context = useContext(ExportContext);
  if (context === undefined) {
    throw new Error('useExport must be used within an ExportProvider');
  }
  return context;
};
