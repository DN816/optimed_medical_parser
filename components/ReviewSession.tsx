import React, { useState, useEffect, useCallback } from 'react';
import { Bill, BillData } from '../types';
import { Workspace } from './Workspace';
import { useBatch } from '../contexts/BatchContext';
import { X, ChevronLeft, ChevronRight, Keyboard, Zap, CheckCircle2 } from 'lucide-react';

interface ReviewSessionProps {
  queue: Bill[];
  onClose: () => void;
}

export const ReviewSession: React.FC<ReviewSessionProps> = ({ queue, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const currentBill = queue[currentIndex];

  const { saveBillWithCorrections } = useBatch();

  // Handle Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Alt + N -> Next
        if (e.altKey && e.key === 'n') {
            e.preventDefault();
            handleNext();
        }
        // Alt + P -> Prev
        if (e.altKey && e.key === 'p') {
            e.preventDefault();
            handlePrev();
        }
        // Ctrl + Enter -> Approve (Simulated via ref would be better, but this works for global)
        // We actually can't trigger the internal Workspace approve easily without ref.
        // For this demo, we'll just handle navigation or rely on the user clicking approve.
        // Implementing 'Fast Approve' bypassing validation check would be risky without ref validation logic.
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, queue]);

  const handleNext = () => {
      if (currentIndex < queue.length - 1) {
          setCurrentIndex(prev => prev + 1);
      } else {
          setSessionCompleted(true);
      }
  };

  const handlePrev = () => {
      if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
      }
  };

  // When a bill is approved/resolved in Workspace, we want to auto-advance
  // Since Workspace manages its own state, we need to wrap the onReset logic.
  // We treat "onReset" from Workspace as "Done with this bill" in this context.
  const handleBillDone = () => {
      handleNext();
  };

  if (sessionCompleted || !currentBill) {
      return (
          <div className="fixed inset-0 z-50 bg-slate-50 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-slate-200">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">Session Complete!</h2>
                  <p className="text-slate-500 mt-2 mb-8">You have reviewed all selected bills in this queue.</p>
                  <button 
                    onClick={onClose}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition"
                  >
                      Return to Dashboard
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
       {/* Session Header */}
       <div className="h-14 bg-slate-900 text-white flex items-center justify-between px-4 shrink-0 shadow-md">
           <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 text-amber-400 font-bold px-3 py-1 bg-white/10 rounded-lg">
                   <Zap className="w-4 h-4 fill-current" /> Fast Mode
               </div>
               <span className="text-slate-400 text-sm">
                   Reviewing {currentIndex + 1} of {queue.length}
               </span>
           </div>

           <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                    <Keyboard className="w-3 h-3" />
                    <span><strong className="text-white">Alt + N</strong> Next</span>
                    <span className="w-px h-3 bg-slate-600"></span>
                    <span><strong className="text-white">Alt + P</strong> Prev</span>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition"
                >
                    <X className="w-5 h-5" />
                </button>
           </div>
       </div>

       {/* Workspace Content */}
       <div className="flex-1 overflow-hidden relative">
           {/* Navigation Overlays */}
           {currentIndex > 0 && (
               <button 
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 bg-white/90 shadow-xl border border-slate-200 rounded-full text-slate-600 hover:text-blue-600 hover:scale-110 transition hidden md:block"
               >
                   <ChevronLeft className="w-6 h-6" />
               </button>
           )}
           
           <button 
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 bg-white/90 shadow-xl border border-slate-200 rounded-full text-slate-600 hover:text-blue-600 hover:scale-110 transition hidden md:block"
           >
               <ChevronRight className="w-6 h-6" />
           </button>

           {/* The Workspace */}
           <Workspace 
               key={currentBill.id} // Forces remount on change
               billId={currentBill.id}
               imageSrc={currentBill.file_url}
               data={currentBill.extracted_data || {} as BillData}
               originalData={currentBill.original_data}
               onReset={handleBillDone} // Hijack reset to move next
           />
       </div>
    </div>
  );
};
