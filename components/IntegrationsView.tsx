import React, { useState } from 'react';
import { useIntegration } from '../contexts/IntegrationContext';
import { ApiKey, Webhook, WebhookEvent } from '../types';
import { 
  Webhook as WebhookIcon, Key, BookOpen, Plus, Trash2, Copy, 
  Check, RefreshCw, AlertCircle, CheckCircle2, XCircle, Zap, Shield, Play
} from 'lucide-react';

export const IntegrationsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'keys' | 'webhooks' | 'docs'>('keys');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">API & Integrations</h2>
           <p className="text-slate-500 text-sm mt-1">Manage API keys, webhooks, and view developer documentation.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
         <div className="flex space-x-8">
            {[
                { id: 'keys', label: 'API Keys', icon: <Key className="w-4 h-4"/> },
                { id: 'webhooks', label: 'Webhooks', icon: <WebhookIcon className="w-4 h-4"/> },
                { id: 'docs', label: 'Documentation', icon: <BookOpen className="w-4 h-4"/> },
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
      </div>

      <div className="min-h-[400px]">
          {activeTab === 'keys' && <ApiKeysPanel />}
          {activeTab === 'webhooks' && <WebhooksPanel />}
          {activeTab === 'docs' && <DocsPanel />}
      </div>
    </div>
  );
};

// --- Sub-Components ---

const ApiKeysPanel: React.FC = () => {
    const { apiKeys, createApiKey, revokeApiKey } = useIntegration();
    const [isCreating, setIsCreating] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [createdKey, setCreatedKey] = useState<string | null>(null);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        const key = createApiKey(newKeyName, ['read', 'write']);
        setCreatedKey(key);
        setNewKeyName('');
        setIsCreating(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Created Key Modal/Banner */}
            {createdKey && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                        <div className="flex-1">
                            <h3 className="font-bold text-green-800">API Key Created Successfully</h3>
                            <p className="text-sm text-green-700 mt-1">This is the only time the full key will be displayed. Please copy it now.</p>
                            <div className="mt-4 flex items-center gap-2">
                                <code className="bg-white px-3 py-2 rounded border border-green-200 font-mono text-sm flex-1 break-all">
                                    {createdKey}
                                
                                </code>
                                <button 
                                    onClick={() => {navigator.clipboard.writeText(createdKey); alert('Copied!')}}
                                    className="p-2 bg-white border border-green-200 rounded hover:bg-green-100 text-green-700"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                            <button onClick={() => setCreatedKey(null)} className="mt-4 text-sm font-bold text-green-800 underline">I have saved this key</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                 <h3 className="font-bold text-slate-800">Active API Keys</h3>
                 <button 
                    onClick={() => setIsCreating(true)}
                    disabled={isCreating}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition"
                 >
                     <Plus className="w-4 h-4" /> Create New Key
                 </button>
            </div>

            {isCreating && (
                <form onSubmit={handleCreate} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Key Name</label>
                        <input 
                            type="text" 
                            value={newKeyName} 
                            onChange={e => setNewKeyName(e.target.value)}
                            placeholder="e.g. Production Backend"
                            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">Generate</button>
                    <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-500 hover:text-slate-800">Cancel</button>
                </form>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Key Prefix</th>
                            <th className="px-6 py-3">Created</th>
                            <th className="px-6 py-3">Last Used</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {apiKeys.map(key => (
                            <tr key={key.id} className={key.status === 'revoked' ? 'opacity-50 bg-slate-50' : ''}>
                                <td className="px-6 py-4 font-medium text-slate-800">{key.name}</td>
                                <td className="px-6 py-4 font-mono text-xs text-slate-600 bg-slate-50 rounded w-max my-2 mx-6 px-2 py-1 border border-slate-200">
                                    {key.prefix}
                                </td>
                                <td className="px-6 py-4 text-slate-500">{new Date(key.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-slate-500">
                                    {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                                </td>
                                <td className="px-6 py-4">
                                    {key.status === 'active' 
                                        ? <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold"><CheckCircle2 className="w-3 h-3"/> Active</span>
                                        : <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-bold"><XCircle className="w-3 h-3"/> Revoked</span>
                                    }
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {key.status === 'active' && (
                                        <button 
                                            onClick={() => {if(window.confirm('Revoke this key? Apps using it will stop working.')) revokeApiKey(key.id)}}
                                            className="text-red-600 hover:bg-red-50 p-1.5 rounded transition" title="Revoke Key"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const WebhooksPanel: React.FC = () => {
    const { webhooks, createWebhook, deleteWebhook, triggerTestEvent, webhookLogs } = useIntegration();
    const [isCreating, setIsCreating] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([]);

    const availableEvents: WebhookEvent[] = ['bill.ocr.completed', 'bill.needs_review', 'bill.approved', 'export.completed', 'fraud.flagged'];

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedEvents.length === 0) {
            alert("Select at least one event");
            return;
        }
        createWebhook(newUrl, selectedEvents);
        setNewUrl('');
        setSelectedEvents([]);
        setIsCreating(false);
    };

    const toggleEvent = (ev: WebhookEvent) => {
        if (selectedEvents.includes(ev)) setSelectedEvents(prev => prev.filter(e => e !== ev));
        else setSelectedEvents(prev => [...prev, ev]);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2">
            
            {/* Left: Webhook List */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Webhook Endpoints</h3>
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition"
                    >
                        <Plus className="w-4 h-4" /> Add Endpoint
                    </button>
                </div>

                {isCreating && (
                    <form onSubmit={handleCreate} className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target URL</label>
                            <input 
                                type="url" 
                                value={newUrl} 
                                onChange={e => setNewUrl(e.target.value)}
                                placeholder="https://api.yourdomain.com/webhooks/medibill"
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subscribe to Events</label>
                            <div className="flex flex-wrap gap-2">
                                {availableEvents.map(ev => (
                                    <button
                                        type="button"
                                        key={ev}
                                        onClick={() => toggleEvent(ev)}
                                        className={`px-3 py-1.5 rounded text-xs font-medium border transition
                                            ${selectedEvents.includes(ev) 
                                                ? 'bg-blue-600 text-white border-blue-600' 
                                                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                                            }
                                        `}
                                    >
                                        {ev}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">Add Webhook</button>
                            <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-500 hover:text-slate-800">Cancel</button>
                        </div>
                    </form>
                )}

                <div className="space-y-4">
                    {webhooks.length === 0 && !isCreating && (
                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                            <WebhookIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-slate-500">No webhooks configured.</p>
                        </div>
                    )}
                    {webhooks.map(hook => (
                        <div key={hook.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative group">
                             <div className="flex justify-between items-start mb-4">
                                 <div className="flex items-center gap-3">
                                     <div className={`p-2 rounded-lg ${hook.status === 'failing' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                         <WebhookIcon className="w-5 h-5" />
                                     </div>
                                     <div>
                                         <p className="font-mono text-sm font-medium text-slate-800 break-all">{hook.url}</p>
                                         <p className="text-xs text-slate-500 mt-1">Secret: <code className="bg-slate-100 px-1 py-0.5 rounded">{hook.secret.substr(0, 10)}...</code></p>
                                     </div>
                                 </div>
                                 <button onClick={() => deleteWebhook(hook.id)} className="text-slate-300 hover:text-red-500 transition">
                                     <Trash2 className="w-4 h-4" />
                                 </button>
                             </div>
                             
                             <div className="flex flex-wrap gap-2 mb-4">
                                 {hook.events.map(ev => (
                                     <span key={ev} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wide border border-slate-200">
                                         {ev}
                                     </span>
                                 ))}
                             </div>

                             <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                 <div className="flex items-center gap-4 text-xs">
                                     <span className={`font-bold ${hook.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                                         ● {hook.status.toUpperCase()}
                                     </span>
                                     <span className="text-slate-400">Failures: {hook.failure_count}</span>
                                 </div>
                                 <button 
                                    onClick={() => triggerTestEvent(hook.id)}
                                    className="flex items-center gap-1 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded font-medium text-slate-700 transition"
                                 >
                                     <Play className="w-3 h-3" /> Test Ping
                                 </button>
                             </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Logs Panel */}
            <div className="bg-slate-900 text-slate-300 rounded-xl overflow-hidden flex flex-col h-[600px] border border-slate-800">
                <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500">Live Delivery Logs</span>
                    <ActivityIndicator />
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
                    {webhookLogs.length === 0 ? (
                        <div className="text-center text-slate-600 py-10 italic">Waiting for events...</div>
                    ) : (
                        webhookLogs.map(log => (
                            <div key={log.id} className="border-l-2 border-slate-700 pl-3 py-1">
                                <div className="flex justify-between mb-1">
                                    <span className={log.status_code >= 200 && log.status_code < 300 ? 'text-green-400' : 'text-red-400'}>
                                        {log.status_code} {log.status_code === 200 ? 'OK' : 'ERR'}
                                    </span>
                                    <span className="text-slate-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <div className="text-blue-400 font-bold mb-1">{log.event_type}</div>
                                <div className="text-slate-500 truncate" title={JSON.stringify(log.payload)}>{JSON.stringify(log.payload)}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

const DocsPanel: React.FC = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="lg:col-span-1 space-y-1">
                <h4 className="font-bold text-slate-800 mb-4 px-2">Reference</h4>
                {['Authentication', 'Batches', 'Bills', 'Webhooks'].map(item => (
                    <button key={item} className="block w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded transition">{item}</button>
                ))}
            </div>
            
            <div className="lg:col-span-3 space-y-8">
                <section>
                    <h3 className="text-xl font-bold text-slate-800 mb-4">Authentication</h3>
                    <p className="text-slate-600 mb-4">Authenticate your requests by including your secret API key in the <code className="bg-slate-100 px-1 rounded text-pink-600">Authorization</code> header.</p>
                    <div className="bg-slate-900 rounded-lg p-4 text-slate-300 font-mono text-sm overflow-x-auto">
                        <span className="text-purple-400">curl</span> https://api.medibill.ai/v1/batches \<br/>
                        &nbsp;&nbsp;<span className="text-blue-400">-H</span> <span className="text-green-400">"Authorization: Bearer pk_live_..."</span>
                    </div>
                </section>

                <div className="h-px bg-slate-200"></div>

                <section>
                    <h3 className="text-xl font-bold text-slate-800 mb-4">Batches</h3>
                    <div className="space-y-6">
                        <div>
                             <div className="flex items-center gap-3 mb-2">
                                 <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">POST</span>
                                 <code className="text-slate-700 font-mono">/v1/batches</code>
                             </div>
                             <p className="text-slate-600 text-sm mb-3">Upload a new batch of documents for processing.</p>
                             <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs font-mono text-slate-600">
                                 {`{ "files": ["base64_string..."], "settings": { "priority": "high" } }`}
                             </div>
                        </div>

                        <div>
                             <div className="flex items-center gap-3 mb-2">
                                 <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">GET</span>
                                 <code className="text-slate-700 font-mono">/v1/batches/{'{id}'}</code>
                             </div>
                             <p className="text-slate-600 text-sm">Retrieve status and results of a batch.</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

const ActivityIndicator = () => (
    <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse delay-75"></div>
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse delay-150"></div>
    </div>
);
