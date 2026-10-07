import React, { useState, useEffect, useRef } from 'react';
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
  Settings as SettingsIcon,
  Sparkles, 
  Search, 
  X, 
  ChevronRight, 
  Check, 
  Plus, 
  Lock, 
  Zap, 
  LayoutGrid,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ActiveTab } from './Navbar';

interface QuickMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenAddModal: () => void;
  onLockApp: () => void;
  onBankSync: () => void;
  isSyncingBank: boolean;
}

interface FeatureItem {
  id: ActiveTab;
  title: string;
  category: 'Core Finance' | 'Planning & Budgets' | 'Smart Tools' | 'Settings & Security';
  subtitle: string;
  icon: React.FC<{ className?: string }>;
  tag?: string;
}

export const QUICK_MENU_FEATURES: FeatureItem[] = [
  // Core Finance
  {
    id: 'dashboard',
    title: 'Dashboard & Intelligence',
    category: 'Core Finance',
    subtitle: 'Financial overview, D3 monthly spending charts, metrics & insights',
    icon: LayoutDashboard,
    tag: 'Overview'
  },
  {
    id: 'transactions',
    title: 'Transactions',
    category: 'Core Finance',
    subtitle: 'Daily expenses, income deposits, receipt photos & CSV export',
    icon: Receipt,
    tag: 'Ledger'
  },
  {
    id: 'statements',
    title: 'Statements',
    category: 'Core Finance',
    subtitle: 'Import bank & card statements, money in/out monitoring, cross-reference',
    icon: FileSpreadsheet,
    tag: 'Reconcile'
  },
  {
    id: 'accounts',
    title: 'Linked Accounts',
    category: 'Core Finance',
    subtitle: 'Checking, savings, credit card balances and institution feeds',
    icon: Landmark,
    tag: 'Balances'
  },

  // Planning & Budgets
  {
    id: 'budgets',
    title: 'Budgets & Goals',
    category: 'Planning & Budgets',
    subtitle: 'Monthly category limits, savings progress & budget utilization',
    icon: Target,
    tag: 'Targets'
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions',
    category: 'Planning & Budgets',
    subtitle: 'Recurring billing cycles, renewal alert calendar & active services',
    icon: RefreshCw,
    tag: 'Recurring'
  },
  {
    id: 'inventory',
    title: 'Inventory',
    category: 'Planning & Budgets',
    subtitle: 'Pantry goods, household assets, expiration dates & unit costs',
    icon: Package,
    tag: 'Assets'
  },

  // Smart Tools
  {
    id: 'scanner',
    title: 'AI Receipt Scanner',
    category: 'Smart Tools',
    subtitle: 'Live camera or receipt upload, OCR line-item extraction',
    icon: ScanLine,
    tag: 'Camera / OCR'
  },
  {
    id: 'workspace',
    title: 'Google Workspace',
    category: 'Smart Tools',
    subtitle: 'Google Drive backup, Sheets export, Gmail receipts & Calendar',
    icon: Sparkles,
    tag: '1P Cloud'
  },

  // Settings & Security
  {
    id: 'security',
    title: 'Security & Backup',
    category: 'Settings & Security',
    subtitle: 'PIN biometric lock, encrypted backup file & Google Drive sync',
    icon: ShieldCheck,
    tag: 'Security'
  },
  {
    id: 'settings',
    title: 'Control & Settings',
    category: 'Settings & Security',
    subtitle: 'App branding, custom categories, subcategories & merchant presets',
    icon: SettingsIcon,
    tag: 'System'
  }
];

export const QuickMenu: React.FC<QuickMenuProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  onOpenAddModal,
  onLockApp,
  onBankSync,
  isSyncingBank
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when menu opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Keyboard shortcut listener: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter features
  const filteredFeatures = QUICK_MENU_FEATURES.filter((feat) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      feat.title.toLowerCase().includes(query) ||
      feat.subtitle.toLowerCase().includes(query) ||
      feat.category.toLowerCase().includes(query) ||
      (feat.tag && feat.tag.toLowerCase().includes(query))
    );
  });

  // Group by category
  const categories: ('Core Finance' | 'Planning & Budgets' | 'Smart Tools' | 'Settings & Security')[] = [
    'Core Finance',
    'Planning & Budgets',
    'Smart Tools',
    'Settings & Security'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-start p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150">
      
      {/* Background click dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Flyout Panel anchored to top left */}
      <div 
        className="relative z-10 w-full max-w-xl max-h-[92vh] flex flex-col bg-[#111318] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header & Search Bar */}
        <div className="p-4 border-b border-white/5 bg-[#14161f] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Quick Features Menu</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-400">
                    ESC to close
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Jump directly to any section or feature across the application
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Close Quick Menu (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search or jump to feature (e.g. Statements, Budgets, Scanner)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredFeatures.length > 0) {
                  onSelectTab(filteredFeatures[0].id);
                  onClose();
                }
              }}
              className="w-full bg-[#090a0c] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Feature List (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-thumb-white/10">
          {filteredFeatures.length === 0 ? (
            <div className="text-center py-10 text-slate-500 space-y-2">
              <Layers className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs">No matching features found for &quot;{searchQuery}&quot;</p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-indigo-400 hover:underline"
              >
                Reset search
              </button>
            </div>
          ) : (
            categories.map((cat) => {
              const catFeatures = filteredFeatures.filter((f) => f.category === cat);
              if (catFeatures.length === 0) return null;

              return (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {cat}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {catFeatures.length} {catFeatures.length === 1 ? 'option' : 'options'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {catFeatures.map((feat) => {
                      const Icon = feat.icon;
                      const isActive = activeTab === feat.id;

                      return (
                        <button
                          key={feat.id}
                          onClick={() => {
                            onSelectTab(feat.id);
                            onClose();
                          }}
                          className={`text-left p-3 rounded-xl border transition-all flex items-start gap-3 group relative ${
                            isActive
                              ? 'bg-indigo-600/15 border-indigo-500/40 text-white shadow-md shadow-indigo-950/40'
                              : 'bg-[#14161f]/70 hover:bg-white/[0.05] border-white/5 text-slate-300 hover:border-white/10'
                          }`}
                        >
                          <div className={`p-2 rounded-lg shrink-0 transition-colors ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-[#090a0c] text-slate-400 group-hover:text-indigo-400 border border-white/5'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className={`text-xs font-semibold truncate ${
                                isActive ? 'text-indigo-300' : 'text-slate-200 group-hover:text-white'
                              }`}>
                                {feat.title}
                              </span>
                              {isActive && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                                  <Check className="w-2.5 h-2.5" /> Active
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 leading-relaxed">
                              {feat.subtitle}
                            </p>
                          </div>

                          <ChevronRight className={`w-3.5 h-3.5 shrink-0 self-center text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all ${
                            isActive ? 'text-indigo-400' : ''
                          }`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Quick Actions Bar */}
        <div className="p-3 bg-[#0c0e12] border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
          
          <div className="flex items-center gap-2">
            {/* Quick Add Transaction */}
            <button
              onClick={() => {
                onOpenAddModal();
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Record Transaction</span>
            </button>

            {/* Quick Bank Sync */}
            <button
              onClick={() => {
                onBankSync();
                onClose();
              }}
              disabled={isSyncingBank}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1.5 transition-colors border border-white/5"
            >
              <Zap className={`w-3 h-3 text-amber-400 ${isSyncingBank ? 'animate-spin' : ''}`} />
              <span>{isSyncingBank ? 'Syncing...' : 'Sync Bank'}</span>
            </button>
          </div>

          {/* Quick Lock */}
          <button
            onClick={() => {
              onLockApp();
              onClose();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs flex items-center gap-1.5 transition-colors border border-white/5"
            title="Lock application"
          >
            <Lock className="w-3 h-3 text-indigo-400" />
            <span>Lock App</span>
          </button>

        </div>

      </div>

    </div>
  );
};
