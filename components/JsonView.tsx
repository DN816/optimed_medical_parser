import React from 'react';
import { BillData } from '../types';
import { Copy, Check } from 'lucide-react';

interface JsonViewProps {
  data: BillData;
}

export const JsonView: React.FC<JsonViewProps> = ({ data }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-300 font-mono text-sm relative rounded-lg overflow-hidden border border-slate-700">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">JSON Output</span>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition text-white"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  );
};