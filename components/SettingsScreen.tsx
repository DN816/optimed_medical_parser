import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BillingSettingsView } from './BillingSettingsView';
import { Shield, Users, UserPlus, UserX, UserCheck, CreditCard } from 'lucide-react';
import { UserRole } from '../types';

export const SettingsScreen: React.FC = () => {
  const { 
      user, organization, usersInOrg, inviteUser, updateUserRole, deactivateUser,
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'org' | 'users' | 'billing'>('billing');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('viewer');

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

  return (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
            {[
                { id: 'billing', label: 'Billing (Mock)', icon: <CreditCard className="w-4 h-4"/> },
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
