import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Organization, UserRole, AuditLog, SecuritySettings, Session, SecurityAlert } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isInitializing: boolean;
  usersInOrg: User[];
  auditLogs: AuditLog[];
  activeSessions: Session[];
  securityAlerts: SecurityAlert[];
  logAction: (action: string, entityType: string, entityId: string, metadata?: any) => void;
  updateUserRole: (userId: string, newRole: UserRole) => void;
  inviteUser: (email: string, role: UserRole) => void;
  deactivateUser: (userId: string) => void;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => void;
  revokeSession: (sessionId: string) => void;
  resolveAlert: (alertId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [sessions] = useState<Session[]>([]);
  const [alerts] = useState<SecurityAlert[]>([]);

  const usersInOrg = user ? allUsers.filter(u => u.org_id === user.org_id) : [];
  const orgLogs = user ? auditLogs.filter(l => l.org_id === user.org_id) : [];

  // Send audit log to backend
  const logAction = (action: string, entityType: string, entityId: string, metadata: any = {}) => {
    if (!user) return;
    api.post('/audit-logs/', {
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    }).catch(err => {
      // Non-critical — log locally if backend fails
      console.warn("Audit log failed:", err.message);
    });
  };

  // Fetch audit logs from backend
  const loadAuditLogs = () => {
    api.get('/audit-logs/')
      .then(res => setAuditLogs(res.data || []))
      .catch(err => {
        if (err.response?.status !== 401) {
          console.error("Failed to load audit logs", err);
        }
      });
  };

  // Fetch users in org
  const loadUsers = () => {
    api.get('/users/')
      .then(res => setAllUsers(res.data || []))
      .catch(err => console.error("Failed to load users", err));
  };

  const _setUserAndOrg = (userData: any) => {
    const feUser: User = {
      id: userData.id,
      org_id: userData.org_id,
      email: userData.email,
      name: userData.full_name || userData.email,
      role: userData.role || 'viewer',
      status: userData.is_active ? 'active' : 'inactive',
      created_at: userData.created_at || new Date().toISOString()
    };

    const matchedOrg: Organization = userData.organization ? {
      id: userData.organization.id,
      name: userData.organization.name,
      subscription_plan: userData.organization.subscription_plan,
      status: userData.organization.status,
      created_at: userData.organization.created_at || new Date().toISOString()
    } : {
      id: userData.org_id,
      name: "Your Organization",
      subscription_plan: "enterprise",
      status: "active",
      created_at: new Date().toISOString()
    };

    setUser(feUser);
    setOrganization(matchedOrg);
    loadUsers();
  };

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      if (!password) {
        throw new Error("Password is required");
      }

      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);

      const res = await api.post('/login/access-token', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const { access_token } = res.data;
      localStorage.setItem('access_token', access_token);

      const userRes = await api.post('/login/test-token');
      _setUserAndOrg(userRes.data);

      // Load audit logs after login
      loadAuditLogs();

      return true;
    } catch (e) {
      console.error("Login failed:", e);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
    setOrganization(null);
    setAuditLogs([]);
  };

  // Check token on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      api.post('/login/test-token')
        .then(res => {
          _setUserAndOrg(res.data);
          loadAuditLogs();
        })
        .catch(err => {
          console.error("Failed to restore session:", err);
          logout();
        })
        .finally(() => {
          setIsInitializing(false);
        });
    } else {
      setIsInitializing(false);
    }
  }, []);

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      loadUsers();
    } catch (e) {
      console.error(e);
      alert('Failed to update user role');
    }
  };

  const inviteUser = async (email: string, role: UserRole) => {
    try {
      await api.post('/users/invite', { email, role });
      loadUsers();
      alert('User invited successfully!');
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.detail || 'Failed to invite user');
    }
  };

  const deactivateUser = async (userId: string) => {
    try {
      await api.put(`/users/${userId}/deactivate`);
      loadUsers();
    } catch (e) {
      console.error(e);
      alert('Failed to deactivate user');
    }
  };

  const updateSecuritySettings = (_settings: Partial<SecuritySettings>) => { alert('Not Implemented: updateSecuritySettings'); };
  const revokeSession = (_sessionId: string) => { alert('Not Implemented: revokeSession'); };
  const resolveAlert = (_alertId: string) => { alert('Not Implemented: resolveAlert'); };

  return (
    <AuthContext.Provider value={{
      user,
      organization,
      login,
      logout,
      isAuthenticated: !!user,
      isInitializing,
      usersInOrg,
      auditLogs: orgLogs,
      activeSessions: sessions,
      securityAlerts: alerts,
      logAction,
      updateUserRole,
      inviteUser,
      deactivateUser,
      updateSecuritySettings,
      revokeSession,
      resolveAlert
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
