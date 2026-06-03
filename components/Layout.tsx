import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBatch } from '../contexts/BatchContext'; // Import BatchContext
import { useNotification } from '../contexts/NotificationContext';
import { NotificationPanel } from './NotificationPanel';
import { NavSection } from '../types';
import {
  LogOut, Settings, User as UserIcon, Building2,
  LayoutDashboard, Layers, FileText, CheckSquare,
  BarChart3, Store, Download, Webhook, ShieldAlert,
  ChevronLeft, ChevronRight, Bell, Search, Activity
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeNav: NavSection;
  onNavChange: (nav: NavSection) => void;
  onGlobalBillSelect?: (bill: any) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeNav, onNavChange, onGlobalBillSelect }) => {
  const { user, organization, logout } = useAuth();
  // Safe destructuring in case BatchProvider is not yet wrapping (though it should be)
  const batchContext = useBatch();
  const reviewCount = batchContext ? batchContext.reviewQueueCount : 0;

  const { unreadCount } = useNotification();

  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Close dropdown when clicking outside (simple approximation for now)
  useEffect(() => {
    const handleClick = () => setShowSearchDropdown(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Compute search results
  const searchResults = React.useMemo(() => {
    if (!globalSearch.trim() || !batchContext) return [];
    const q = globalSearch.toLowerCase();
    return batchContext.bills.filter(b => 
      b.file_name.toLowerCase().includes(q) ||
      (b.extracted_data?.seller_info?.supplier_name || '').toLowerCase().includes(q) ||
      (b.extracted_data?.invoice_details?.invoice_number || '').toLowerCase().includes(q)
    ).slice(0, 5); // Limit to top 5 results
  }, [globalSearch, batchContext?.bills]);

  if (!user || !organization) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-8 h-8 text-blue-600 animate-pulse" />
          <p className="text-slate-500 text-sm font-medium">Loading workspace...</p>
        </div>
      </div>
    );
  }

  const NAV_ITEMS: { id: NavSection; label: string; icon: React.ReactNode; roles?: string[] }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'batches', label: 'Batches', icon: <Layers className="w-5 h-5" /> },
    { id: 'bills', label: 'All Bills', icon: <FileText className="w-5 h-5" /> },
    { id: 'review_queue', label: 'Review Queue', icon: <CheckSquare className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" />, roles: ['admin', 'reviewer'] },
    { id: 'vendors', label: 'Vendors', icon: <Store className="w-5 h-5" />, roles: ['admin', 'reviewer'] },
    { id: 'exports', label: 'Exports', icon: <Download className="w-5 h-5" />, roles: ['admin', 'reviewer'] },
    { id: 'api', label: 'Integrations (Mock)', icon: <Webhook className="w-5 h-5" />, roles: ['admin'] },
    { id: 'audit_logs', label: 'Audit Logs', icon: <ShieldAlert className="w-5 h-5" />, roles: ['admin'] },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, roles: ['admin'] },
  ];

  const filteredNavItems = NAV_ITEMS.filter(item =>
    !item.roles || item.roles.includes(user.role)
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">

      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-64'
          }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
          <div className={`flex items-center gap-2 overflow-hidden ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'} transition-all`}>
            <div className="bg-blue-600 p-1.5 rounded-lg text-white shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="whitespace-nowrap">
              <h1 className="text-sm font-bold text-slate-800 leading-none truncate">{organization.name}</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">
                {organization.subscription_plan}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-1">
          {filteredNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavChange(item.id)}
              title={isSidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors relative
                ${activeNav === item.id
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
              `}
            >
              <div className={`shrink-0 ${activeNav === item.id ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                {item.icon}
              </div>
              <span className={`text-sm font-medium whitespace-nowrap transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'
                }`}>
                {item.label}
              </span>
              {item.id === 'review_queue' && !isSidebarCollapsed && reviewCount > 0 && (
                <span className="ml-auto bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{reviewCount}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer (User Profile) */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-50 transition ${isSidebarCollapsed ? 'justify-center' : ''}`}
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                {user.name.charAt(0)}
              </div>
            )}
            {!isSidebarCollapsed && (
              <div className="text-left overflow-hidden">
                <p className="text-sm font-medium text-slate-700 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate capitalize">{user.role}</p>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">

          {/* Left: Search / Breadcrumbs */}
          <div 
            className="flex items-center gap-4 w-96 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search bills, batches, or vendors..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
              />
            </div>
            
            {/* Search Dropdown */}
            {showSearchDropdown && globalSearch.trim().length > 0 && (
              <div 
                className="absolute top-12 left-0 w-full bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2"
              >
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No results found for "{globalSearch}"
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-400 bg-slate-50 uppercase tracking-wider">
                      Bills
                    </div>
                    {searchResults.map(bill => (
                      <button
                        key={bill.id}
                        onClick={() => {
                          setShowSearchDropdown(false);
                          setGlobalSearch('');
                          if (onGlobalBillSelect) onGlobalBillSelect(bill);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center justify-between transition group"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-blue-500 transition" />
                          <div className="truncate">
                            <p className="text-sm font-medium text-slate-700 truncate">{bill.file_name}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {bill.extracted_data?.seller_info?.supplier_name || 'Unknown Vendor'}
                            </p>
                          </div>
                        </div>
                        {bill.extracted_data?.totals?.grand_total && (
                          <span className="text-xs font-semibold text-slate-600 shrink-0 pl-2">
                            ₹{Number(bill.extracted_data.totals.grand_total).toLocaleString('en-IN')}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Environment, Alerts, Actions */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 text-xs font-bold tracking-wide">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              PROD
            </div>

            <div className="h-6 w-px bg-slate-200"></div>

            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <NotificationPanel
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
              />
            </div>

            {showProfileMenu && (
              <div className="absolute right-4 top-16 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-100 py-1 animate-in fade-in zoom-in-95 duration-100 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-50">
                  <p className="text-sm font-medium text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <button
                  onClick={() => { onNavChange('settings'); setShowProfileMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" /> Account Settings
                </button>
                <div className="h-px bg-slate-100 my-1"></div>
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}

          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto bg-slate-50 relative">
          <div className="max-w-[1440px] mx-auto p-6 min-h-full pb-12">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 h-8 flex items-center justify-between px-6 text-[10px] text-slate-400 shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-green-500" />
              System Status: <span className="text-green-600 font-medium">Operational</span>
            </span>
            <span>•</span>
            <span>Enterprise SLA: 99.9%</span>
          </div>
          <div>
            MediBill AI v2.4.0
          </div>
        </footer>

      </div>
    </div>
  );
};
