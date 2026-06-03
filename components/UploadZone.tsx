import React, { useCallback, useState } from 'react';
import { Upload, FileText, Image as ImageIcon, AlertCircle, X, Settings, ArrowRight, Lock } from 'lucide-react';
import { BatchSettings } from '../types';
import { useBilling } from '../contexts/BillingContext';

interface UploadZoneProps {
  onBatchUpload: (files: File[], settings: BatchSettings) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onBatchUpload }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<BatchSettings>({
    priority: 'normal',
    auto_review: true,
    auto_export: false
  });

  const { checkLimit, usage, currentPlan } = useBilling();

  const MAX_BATCH_SIZE_MB = 50;
  const totalSizeMB = files.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024);
  const remainingSizeMB = Math.max(0, MAX_BATCH_SIZE_MB - totalSizeMB);
  
  // Check limits relative to files selected
  const isOverQuota = !checkLimit('bills_processed', files.length);
  const isOverSize = totalSizeMB > MAX_BATCH_SIZE_MB;
  const isOverLimit = isOverQuota || isOverSize;
  const remainingQuota = currentPlan.limits.bills_per_month - usage.bills_processed;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFiles = (newFiles: File[]) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const validFiles = newFiles.filter(file => validTypes.includes(file.type));
    
    if (validFiles.length !== newFiles.length) {
      setError("Some files were skipped. Only JPG, PNG, and PDF are supported.");
    } else {
      setError(null);
    }
    
    setFiles(prev => [...prev, ...validFiles]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      validateFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
      if (files.length === 0) return;
      if (isOverLimit) {
          alert("You have exceeded your plan limits. Please upgrade to continue.");
          return;
      }
      onBatchUpload(files, settings);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left: Drop Zone */}
        <div className="md:col-span-2 space-y-4">
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ease-in-out cursor-pointer h-64 flex flex-col items-center justify-center
                ${isDragging 
                    ? 'border-blue-500 bg-blue-50 scale-[1.01]' 
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }
                ${isOverLimit ? 'opacity-50 cursor-not-allowed border-slate-200' : ''}
                `}
            >
                {!isOverLimit && (
                    <input
                        type="file"
                        multiple
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileInput}
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                    />
                )}
                
                <div className="p-3 rounded-full bg-slate-100 mb-4">
                    {isOverLimit ? <Lock className="w-8 h-8 text-slate-400" /> : <Upload className="w-8 h-8 text-slate-400" />}
                </div>
                {isOverLimit ? (
                    <div>
                        <h3 className="text-lg font-semibold text-slate-700">Upload Locked</h3>
                        {isOverQuota && <p className="text-red-500 text-sm mt-1 font-medium">Plan limit exceeded ({usage.bills_processed}/{currentPlan.limits.bills_per_month}).</p>}
                        {isOverSize && <p className="text-red-500 text-sm mt-1 font-medium">Maximum batch size ({MAX_BATCH_SIZE_MB} MB) exceeded.</p>}
                    </div>
                ) : (
                    <div>
                        <h3 className="text-lg font-semibold text-slate-700">Drag & Drop Files</h3>
                        <p className="text-slate-500 text-sm mt-1">or click to browse multiple documents</p>
                    </div>
                )}
                
                {!isOverLimit && (
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-4">
                        <span className="bg-slate-100 px-2 py-1 rounded">JPG</span>
                        <span className="bg-slate-100 px-2 py-1 rounded">PNG</span>
                        <span className="bg-slate-100 px-2 py-1 rounded">PDF</span>
                    </div>
                )}
            </div>

            {/* Quota Info */}
            <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>Remaining Quota: <strong className={remainingQuota <= 0 ? 'text-red-500' : ''}>{remainingQuota < 0 ? 0 : remainingQuota} bills</strong></span>
                    <span>Plan: <strong className="uppercase">{currentPlan.name}</strong></span>
                </div>
                
                <div className="h-px bg-slate-200 w-full"></div>
                
                <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>Maximum batch size: <strong>{MAX_BATCH_SIZE_MB.toFixed(2)} MB</strong></span>
                    <span className="flex gap-3">
                      <span>Used: <strong className={isOverSize ? 'text-red-500' : ''}>{totalSizeMB.toFixed(2)} MB</strong></span>
                      <span>Remaining: <strong>{remainingSizeMB.toFixed(2)} MB</strong></span>
                    </span>
                </div>
            </div>

            {/* File List Preview */}
            {files.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 flex justify-between items-center">
                        <span>SELECTED FILES ({files.length})</span>
                        <button onClick={() => setFiles([])} className="text-red-500 hover:text-red-700">Clear All</button>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                        {files.map((file, i) => (
                            <div key={i} className="px-4 py-2 flex items-center justify-between hover:bg-slate-50">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {file.type.includes('pdf') 
                                        ? <FileText className="w-4 h-4 text-red-500 shrink-0" /> 
                                        : <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
                                    }
                                    <span className="text-sm text-slate-700 truncate">{file.name}</span>
                                    <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(0)} KB)</span>
                                </div>
                                <button onClick={() => removeFile(i)} className="text-slate-300 hover:text-red-500 transition">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
             {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
                </div>
            )}
        </div>

        {/* Right: Settings & Actions */}
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold">
                    <Settings className="w-4 h-4 text-blue-600" />
                    <h3>Batch Settings</h3>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase">Processing Priority</label>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setSettings({...settings, priority: 'normal'})}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${settings.priority === 'normal' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                            >
                                Normal
                            </button>
                            <button 
                                onClick={() => setSettings({...settings, priority: 'high'})}
                                disabled={currentPlan.tier === 'free'} // Feature gate
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition 
                                    ${settings.priority === 'high' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}
                                    ${currentPlan.tier === 'free' ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                            >
                                {currentPlan.tier === 'free' ? <span className="flex items-center justify-center gap-1"><Lock className="w-3 h-3"/> High</span> : 'High'}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center justify-between cursor-pointer group">
                            <span className="text-sm text-slate-700">Auto-send to Review</span>
                            <input 
                                type="checkbox" 
                                checked={settings.auto_review}
                                onChange={e => setSettings({...settings, auto_review: e.target.checked})}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                        </label>
                        <p className="text-[10px] text-slate-400 mt-1">Automatically flag low confidence bills for manual review.</p>
                    </div>

                    <div>
                        <label className="flex items-center justify-between cursor-pointer group">
                            <span className="text-sm text-slate-700">Auto-Export JSON</span>
                            <input 
                                type="checkbox" 
                                checked={settings.auto_export}
                                onChange={e => setSettings({...settings, auto_export: e.target.checked})}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                        </label>
                        <p className="text-[10px] text-slate-400 mt-1">Download JSON immediately after batch completion.</p>
                    </div>
                </div>
            </div>

            <button
                onClick={handleUpload}
                disabled={files.length === 0 || isOverLimit}
                className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all
                    ${files.length > 0 && !isOverLimit
                        ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }
                `}
            >
                {isOverLimit ? 'Limit Exceeded' : (
                    <>Start Processing {files.length > 0 && `(${files.length})`} <ArrowRight className="w-4 h-4" /></>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};
