import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BillingSettingsView } from './BillingSettingsView';
import { Shield, Users, UserPlus, UserX, UserCheck, Lock, Globe, AlertTriangle, Smartphone, Clock, Trash2, CheckCircle2, AlertOctagon, CreditCard } from 'lucide-react';
import { UserRole } from '../types';

export const SettingsScreen: React.FC = () => {
  const { 
      user, organization, usersInOrg, inviteUser, updateUserRole, deactivateUser,
      activeSessions, revokeSession, securityAlerts, resolveAlert, updateSecuritySettings
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'org' | 'users' | 'security' | 'billing'>('billing');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('viewer');
  const [newIp, setNewIp] = useState('');

  if (user?.role !== 'admin') {
      return (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-slate-200">
              <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
              <p className="text-slate-500">You do not have permission to view organization settings.</p>
          </div>
      );
  }

  const handleInvite = (e: React.FormEvent) => {
      e.preventDefault();
      if(inviteEmail) {
          inviteUser(inviteEmail, inviteRole);
          setInviteEmail('');
      }
  }

  const handleAddIp = (e: React.FormEvent) => {
      e.preventDefault();
      if (newIp && organization?.security_settings) {
          updateSecuritySettings({ 
              ip_allowlist: [...organization.security_settings.ip_allowlist, newIp] 
          });
          setNewIp('');
      }
  };

  const handleRemoveIp = (ip: string) => {
      if (organization?.security_settings) {
          updateSecuritySettings({ 
              ip_allowlist: organization.security_settings.ip_allowlist.filter(item => item !== ip) 
          });
      }
  };

  return (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
            {[
                { id: 'billing', label: 'Billing (Mock)', icon: <CreditCard className="w-4 h-4"/> },
                { id: 'security', label: 'Security & Access', icon: <Lock className="w-4 h-4"/> },
                { id: 'users', label: 'Users & Roles', icon: <Users className="w-4 h-4"/> },
                { id: 'org', label: 'Organization', icon: <Shield className="w-4 h-4"/> },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap
                        ${activeTab === tab.id 
                            ? 'border-blue-600 text-blue-600' 
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                >
                    {tab.icon} {tab.label}
                </button>
            ))}
        </div>

        {/* --- BILLING TAB --- */}
        {activeTab === 'billing' && <BillingSettingsView />}

        {/* --- SECURITY TAB --- */}
        {activeTab === 'security' && organization?.security_settings && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2">
                
                {/* 1. Alerts Section */}
                <div className="lg:col-span-3">
                    {securityAlerts.filter(a => !a.resolved).length > 0 && (
                        <div className="mb-6 space-y-3">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-500" /> Security Alerts
                            </h3>
                            {securityAlerts.filter(a => !a.resolved).map(alert => (
                                <div key={alert.id} className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <AlertOctagon className="w-5 h-5 text-red-600" />
                                        <div>
                                            <p className="font-bold text-red-900 text-sm">{alert.message}</p>
                                            <p className="text-xs text-red-700">{new Date(alert.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => resolveAlert(alert.id)}
                                        className="text-xs font-bold bg-white text-red-600 border border-red-200 px-3 py-1.5 rounded hover:bg-red-100"
                                    >
                                        Mark Resolved
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 2. Access Control */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Smartphone className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">Authentication Policy</h3>
                                <p className="text-sm text-slate-500">Manage how users sign in to your organization.</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-4 border-b border-slate-100">
                            <div>
                                <p className="font-medium text-slate-700">Two-Factor Authentication (2FA)</p>
                                <p className="text-sm text-slate-500">Enforce 2FA for all users in this organization.</p>
                            </div>
                            <button 
                                onClick={() => updateSecuritySettings({ two_factor_enabled: !organization.security_settings!.two_factor_enabled })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${organization.security_settings.two_factor_enabled ? 'bg-blue-600' : 'bg-slate-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${organization.security_settings.two_factor_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between py-4 border-b border-slate-100">
                            <div>
                                <p className="font-medium text-slate-700">Password Expiry</p>
                                <p className="text-sm text-slate-500">Force password rotation every 90 days.</p>
                            </div>
                            <div className="text-sm font-bold text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Active
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-4">
                            <div>
                                <p className="font-medium text-slate-700">Session Timeout</p>
                                <p className="text-sm text-slate-500">Automatically log out inactive users.</p>
                            </div>
                            <select 
                                value={organization.security_settings.session_timeout_minutes}
                                onChange={(e) => updateSecuritySettings({ session_timeout_minutes: parseInt(e.target.value) })}
                                className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={15}>15 Minutes</option>
                                <option value={30}>30 Minutes</option>
                                <option value={60}>1 Hour</option>
                                <option value={120}>2 Hours</option>
                            </select>
                        </div>
                    </section>

                    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                             <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                <Globe className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">Network Security</h3>
                                <p className="text-sm text-slate-500">Restrict access to specific IP addresses.</p>
                            </div>
                        </div>
                        
                        <form onSubmit={handleAddIp} className="flex gap-2 mb-4">
                            <input 
                                type="text" 
                                placeholder="e.g. 192.168.1.5" 
                                value={newIp}
                                onChange={e => setNewIp(e.target.value)}
                                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">Add IP</button>
                        </form>

                        <div className="space-y-2">
                            {organization.security_settings.ip_allowlist.length === 0 && (
                                <p className="text-sm text-slate-400 italic">No IP restrictions active. Access allowed from anywhere.</p>
                            )}
                            {organization.security_settings.ip_allowlist.map(ip => (
                                <div key={ip} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded border border-slate-200">
                                    <span className="font-mono text-sm text-slate-700">{ip}</span>
                                    <button onClick={() => handleRemoveIp(ip)} className="text-slate-400 hover:text-red-500">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* 3. Session Management & Retention */}
                <div className="space-y-6">
                    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                             <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">Active Sessions</h3>
                                <p className="text-sm text-slate-500">Monitor and revoke access.</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {activeSessions.map(session => (
                                <div key={session.id} className="border border-slate-100 rounded-lg p-3 hover:bg-slate-50 transition">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${session.is_current ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {session.is_current ? 'Current' : 'Active'}
                                        </span>
                                        {!session.is_current && (
                                            <button onClick={() => revokeSession(session.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Revoke</button>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-slate-800">{session.device}</p>
                                    <div className="flex justify-between mt-1 text-xs text-slate-500">
                                        <span>{session.ip_address}</span>
                                        <span>{new Date(session.last_active).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                         <div className="mb-4">
                            <h3 className="font-bold text-slate-800">Data Governance</h3>
                         </div>
                         <div className="space-y-4">
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Retention Period</label>
                                <select 
                                    value={organization.security_settings.data_retention_days}
                                    onChange={(e) => updateSecuritySettings({ data_retention_days: parseInt(e.target.value) })}
                                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value={30}>30 Days</option>
                                    <option value={90}>90 Days</option>
                                    <option value={365}>1 Year</option>
                                    <option value={2555}>7 Years (Legal Hold)</option>
                                </select>
                             </div>
                         </div>
                    </section>
                </div>
            </div>
        )}

        {/* Organization Tab */}
        {activeTab === 'org' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-2xl animate-in fade-in slide-in-from-bottom-2">
                 <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Organization ID</label>
                    <code className="bg-slate-100 px-2 py-1 rounded text-slate-700 font-mono text-sm">{organization?.id}</code>
                 </div>
                 <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Company Name</label>
                    <p className="text-lg font-semibold text-slate-900">{organization?.name}</p>
                 </div>
                 <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Subscription Status</label>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-sm font-bold capitalize">
                            {organization?.status}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-sm font-bold capitalize">
                            {organization?.subscription_plan} Plan
                        </span>
                    </div>
                 </div>
            </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                {/* Invite Box */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-blue-600" /> Invite New User
                    </h3>
                    <form onSubmit={handleInvite} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Email Address</label>
                            <input 
                                type="email" 
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="colleague@company.com"
                                required
                            />
                        </div>
                        <div className="w-48">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
                            <select 
                                value={inviteRole}
                                onChange={e => setInviteRole(e.target.value as UserRole)}
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            >
                                <option value="viewer">Viewer</option>
                                <option value="reviewer">Reviewer</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition">
                            Send Invite
                        </button>
                    </form>
                </div>

                {/* User List */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">User</th>
                                <th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {usersInOrg.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {u.avatar_url ? (
                                                <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-200" />
                                            )}
                                            <div>
                                                <p className="font-medium text-slate-900">{u.name}</p>
                                                <p className="text-xs text-slate-500">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select 
                                            value={u.role}
                                            onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                                            disabled={u.id === user.id || u.status === 'inactive'} // Cannot change own role
                                            className="bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="viewer">Viewer</option>
                                            <option value="reviewer">Reviewer</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {u.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {u.id !== user.id && (
                                            u.status === 'active' ? (
                                                <button 
                                                    onClick={() => deactivateUser(u.id)}
                                                    className="text-red-500 hover:bg-red-50 p-1 rounded" title="Deactivate"
                                                >
                                                    <UserX className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button className="text-green-600 hover:bg-green-50 p-1 rounded" title="Activate (Mock)">
                                                    <UserCheck className="w-4 h-4" />
                                                </button>
                                            )
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
  );
};
