import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  FileSpreadsheet,
  Package, 
  ScanLine, 
  RefreshCw, 
  Landmark, 
  Target, 
  ShieldCheck, 
  Lock, 
  Plus, 
  Cloud, 
  Sparkles, 
  Zap,
  Edit2,
  LayoutGrid,
  Menu,
  Settings as SettingsIcon
} from 'lucide-react';
import { DriveSyncState } from '../types';
import { BrandLogo } from './BrandLogo';
import { QuickMenu } from './QuickMenu';

export type ActiveTab = 'dashboard' | 'transactions' | 'statements' | 'inventory' | 'scanner' | 'subscriptions' | 'accounts' | 'budgets' | 'workspace' | 'security' | 'settings';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAddModal: () => void;
  onLockApp: () => void;
  driveState: DriveSyncState;
  onBankSync: () => void;
  isSyncingBank: boolean;
  appName?: string;
  appLogo?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  onLockApp,
  driveState,
  onBankSync,
  isSyncingBank,
  appName = 'Aura Finance',
  appLogo = 'Sparkles'
}) => {
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState<boolean>(false);

  // Global keyboard shortcut: Cmd+K / Ctrl+K to toggle quick menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickMenuOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard & Intelligence', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'statements', label: 'Statements', icon: FileSpreadsheet },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'scanner', label: 'AI Receipt Scanner', icon: ScanLine },
    { id: 'subscriptions', label: 'Subscriptions', icon: RefreshCw },
    { id: 'accounts', label: 'Linked Accounts', icon: Landmark },
    { id: 'budgets', label: 'Budgets & Goals', icon: Target },
    { id: 'workspace', label: 'Google Workspace', icon: Sparkles },
    { id: 'security', label: 'Security & Backup', icon: ShieldCheck },
    { id: 'settings', label: 'Control & Settings', icon: SettingsIcon }
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#090a0c]/90 backdrop-blur-xl border-b border-white/5">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Top Left: Quick Menu Trigger + Brand Identity */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Menu Button on Top Left */}
            <button
              type="button"
              onClick={() => setIsQuickMenuOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#14161f] hover:bg-indigo-600/20 text-slate-300 hover:text-white border border-white/10 hover:border-indigo-500/40 transition-all font-semibold text-xs shadow-md shadow-black/20 group active:scale-95"
              title="Quick Menu (⌘K) — Open full navigation & features"
            >
              <LayoutGrid className="w-4 h-4 text-indigo-400 group-hover:scale-110 group-hover:text-indigo-300 transition-all" />
              <span className="font-semibold text-xs text-white">Quick Menu</span>
              <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/10 text-slate-400 group-hover:text-indigo-300 group-hover:border-indigo-500/30 transition-colors">
                ⌘K
              </kbd>
            </button>

            {/* Vertical Divider */}
            <div className="h-6 w-px bg-white/10 hidden sm:block" />

            {/* Logo & Identity */}
            <div
              className="group flex items-center gap-3 cursor-pointer select-none p-1.5 rounded-2xl hover:bg-white/5 transition-all"
              onClick={() => setActiveTab('dashboard')}
              title="Click to view Dashboard or edit App Name & Logo in Settings"
            >
              <div className="relative">
                <BrandLogo logo={appLogo} size="md" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('settings');
                  }}
                  className="absolute -top-1 -right-1 p-1 bg-indigo-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-indigo-500"
                  title="Change Logo & App Name"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </button>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-serif italic text-2xl text-indigo-400 tracking-tight font-medium group-hover:text-indigo-300 transition-colors">
                    {appName}
                  </h1>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('settings');
                    }}
                    className="p-1 text-slate-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-white/5"
                    title="Modify App Name & Logo"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                    Bank-Grade
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  AI Wealth Intelligence & Drive Cloud Sync
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Badges & Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Live Bank Sync Trigger */}
            <button
              onClick={onBankSync}
              disabled={isSyncingBank}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14161c] hover:bg-slate-800 text-xs text-slate-300 transition-colors border border-white/5"
              title="Sync Live Bank Feed"
            >
              <Zap className={`w-3.5 h-3.5 text-amber-400 ${isSyncingBank ? 'animate-spin' : ''}`} />
              <span>{isSyncingBank ? 'Syncing...' : 'Live Bank Sync'}</span>
            </button>

            {/* Google Drive Status Badge */}
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-colors ${
                driveState.isConnected
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20'
              }`}
              title={driveState.isConnected ? `Synced with Google Drive folder: ${driveState.folderName || 'Home Finance Data'}` : 'Connect to Google Drive'}
            >
              <Cloud className={`w-3.5 h-3.5 ${driveState.isSyncing ? 'animate-pulse' : ''}`} />
              <span className="hidden md:inline font-semibold text-[11px] uppercase tracking-wider">
                {driveState.isConnected ? 'Drive Synced' : 'Connect Drive'}
              </span>
            </button>

            {/* Lock App Trigger */}
            <button
              onClick={onLockApp}
              className="p-2 rounded-xl bg-[#14161c] hover:bg-slate-800 text-slate-300 transition-colors border border-white/5"
              title="Lock with Biometric PIN"
            >
              <Lock className="w-4 h-4 text-indigo-400" />
            </button>

            {/* + Add Record Button */}
            <button
              onClick={onOpenAddModal}
              className="px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm shadow-md shadow-indigo-950/50 flex items-center gap-1.5 border border-indigo-400/30 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Record Transaction</span>
              <span className="sm:hidden">Add</span>
            </button>

          </div>

        </div>
      </div>

      {/* Navigation Tabs Scroll Bar */}
      <div className="bg-[#090a0c]/80 border-t border-white/5 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-4 flex space-x-1 sm:space-x-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#14161c]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Menu Flyout Modal */}
      {isQuickMenuOpen && (
        <QuickMenu
          isOpen={isQuickMenuOpen}
          onClose={() => setIsQuickMenuOpen(false)}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenAddModal={onOpenAddModal}
          onLockApp={onLockApp}
          onBankSync={onBankSync}
          isSyncingBank={isSyncingBank}
        />
      )}
    </header>
  );
};
