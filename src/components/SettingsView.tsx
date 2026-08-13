import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Sparkles, 
  Building2, 
  Landmark, 
  Tag, 
  Layers, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Search, 
  CreditCard, 
  PieChart as PieIcon,
  Save,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Package,
  Boxes
} from 'lucide-react';
import { AppSettings, Account, Transaction, BudgetCategory } from '../types';
import { SubcategoryPieChart } from './SubcategoryPieChart';
import { BrandLogo, LOGO_PRESETS } from './BrandLogo';

interface SettingsViewProps {
  settings: AppSettings;
  accounts: Account[];
  transactions: Transaction[];
  budgets: BudgetCategory[];
  onUpdateSettings: (newSettings: AppSettings) => void;
  onUpdateAccounts: (accounts: Account[]) => void;
  onUpdateTransactions?: (transactions: Transaction[]) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  accounts,
  transactions,
  budgets,
  onUpdateSettings,
  onUpdateAccounts,
  onUpdateTransactions
}) => {
  const [activeSection, setActiveSection] = useState<'app' | 'merchants' | 'accounts' | 'categories' | 'subcategories' | 'invCategories' | 'invSubcategories' | 'analytics'>('app');

  // App Name & Logo State
  const [appNameInput, setAppNameInput] = useState<string>(settings.appName || 'Aura Finance');
  const [appLogoInput, setAppLogoInput] = useState<string>(settings.appLogo || 'Sparkles');
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('');
  const [appNameSavedMsg, setAppNameSavedMsg] = useState<boolean>(false);

  // Merchants State
  const [merchantSearch, setMerchantSearch] = useState<string>('');
  const [newMerchantInput, setNewMerchantInput] = useState<string>('');
  const [editingMerchant, setEditingMerchant] = useState<{ oldName: string; newName: string } | null>(null);

  // Accounts State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accName, setAccName] = useState<string>('');
  const [accBank, setAccBank] = useState<string>('');
  const [accType, setAccType] = useState<'Checking' | 'Savings' | 'Credit Card' | 'Investment'>('Checking');
  const [accBalance, setAccBalance] = useState<string>('');
  const [accColor, setAccColor] = useState<string>('#6366f1');

  // Category State
  const [newCategoryInput, setNewCategoryInput] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<{ oldCat: string; newCat: string } | null>(null);

  // Subcategory State
  const [selectedCatForSub, setSelectedCatForSub] = useState<string>(settings.categories[0] || 'Everyday');
  const [newSubcategoryInput, setNewSubcategoryInput] = useState<string>('');
  const [editingSubcategory, setEditingSubcategory] = useState<{ oldSub: string; newSub: string } | null>(null);

  // Inventory Categories & Subcategories State
  const invCategories = settings.inventoryCategories || [
    'Food & Pantry',
    'Beverages',
    'Household & Cleaning',
    'Personal Care & Health',
    'Office & Supplies',
    'Tools & Hardware',
    'Electronics & Appliances',
    'Other Inventory'
  ];

  const invSubcategories = settings.inventorySubcategories || {
    'Food & Pantry': ['Dry Goods', 'Canned Goods', 'Spices & Oils', 'Snacks', 'Baking', 'Fresh Produce', 'Dairy & Refrigerated', 'Frozen Foods'],
    'Beverages': ['Coffee & Tea', 'Water & Juice', 'Soda & Soft Drinks', 'Wine & Spirits'],
    'Household & Cleaning': ['Paper Products', 'Detergents & Cleaners', 'Trash Bags', 'Kitchenware'],
    'Personal Care & Health': ['Toiletries', 'Vitamins & Supplements', 'First Aid', 'Skincare'],
    'Office & Supplies': ['Stationery & Paper', 'Printer Supplies', 'Shipping & Boxes', 'Desk Accessories'],
    'Tools & Hardware': ['Hand Tools', 'Fasteners & Hardware', 'Electrical', 'Safety Equipment'],
    'Electronics & Appliances': ['Cables & Adapters', 'Batteries', 'Gadgets', 'Small Appliances'],
    'Other Inventory': ['General Item', 'Miscellaneous']
  };

  const [newInvCategoryInput, setNewInvCategoryInput] = useState<string>('');
  const [editingInvCategory, setEditingInvCategory] = useState<{ oldCat: string; newCat: string } | null>(null);

  const [selectedInvCatForSub, setSelectedInvCatForSub] = useState<string>(invCategories[0] || 'Food & Pantry');
  const [newInvSubcategoryInput, setNewInvSubcategoryInput] = useState<string>('');
  const [editingInvSubcategory, setEditingInvSubcategory] = useState<{ oldSub: string; newSub: string } | null>(null);

  // Handlers for App Identity
  const handleSaveAppIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appNameInput.trim()) return;
    onUpdateSettings({
      ...settings,
      appName: appNameInput.trim(),
      appLogo: appLogoInput
    });
    setAppNameSavedMsg(true);
    setTimeout(() => setAppNameSavedMsg(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image file size should be less than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const resultStr = event.target.result as string;
          setAppLogoInput(resultStr);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handlers for Merchants
  const handleAddMerchant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMerchantInput.trim()) return;
    const trimmed = newMerchantInput.trim();
    if (settings.merchants.includes(trimmed)) return;

    onUpdateSettings({
      ...settings,
      merchants: [trimmed, ...settings.merchants]
    });
    setNewMerchantInput('');
  };

  const handleSaveEditMerchant = () => {
    if (!editingMerchant || !editingMerchant.newName.trim()) return;
    const { oldName, newName } = editingMerchant;
    const updatedMerchants = settings.merchants.map((m) => (m === oldName ? newName.trim() : m));

    onUpdateSettings({
      ...settings,
      merchants: updatedMerchants
    });

    // Update existing transactions provider if requested
    if (onUpdateTransactions) {
      const updatedTx = transactions.map((t) => (t.provider === oldName ? { ...t, provider: newName.trim() } : t));
      onUpdateTransactions(updatedTx);
    }

    setEditingMerchant(null);
  };

  const handleDeleteMerchant = (merchantName: string) => {
    if (window.confirm(`Are you sure you want to remove "${merchantName}" from merchant list?`)) {
      onUpdateSettings({
        ...settings,
        merchants: settings.merchants.filter((m) => m !== merchantName)
      });
    }
  };

  // Handlers for Accounts
  const handleOpenAccountModal = (acc?: Account) => {
    if (acc) {
      setEditingAccount(acc);
      setAccName(acc.name);
      setAccBank(acc.bankName);
      setAccType(acc.type);
      setAccBalance(String(acc.balance));
      setAccColor(acc.color);
    } else {
      setEditingAccount(null);
      setAccName('');
      setAccBank('');
      setAccType('Checking');
      setAccBalance('0');
      setAccColor('#6366f1');
    }
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim() || !accBank.trim()) return;

    if (editingAccount) {
      const updated = accounts.map((a) =>
        a.id === editingAccount.id
          ? {
              ...a,
              name: accName.trim(),
              bankName: accBank.trim(),
              type: accType,
              balance: parseFloat(accBalance) || 0,
              color: accColor
            }
          : a
      );
      onUpdateAccounts(updated);
    } else {
      const newAcc: Account = {
        id: `acc-${Date.now()}`,
        name: accName.trim(),
        bankName: accBank.trim(),
        type: accType,
        balance: parseFloat(accBalance) || 0,
        accountNumber: `•••• ${Math.floor(1000 + Math.random() * 9000)}`,
        color: accColor,
        isLinked: true,
        lastSynced: new Date().toISOString()
      };
      onUpdateAccounts([...accounts, newAcc]);
    }

    setIsAccountModalOpen(false);
  };

  const handleDeleteAccount = (accId: string, accName: string) => {
    if (accounts.length <= 1) {
      alert('You must have at least one active Target Account.');
      return;
    }
    if (window.confirm(`Are you sure you want to remove account "${accName}"?`)) {
      onUpdateAccounts(accounts.filter((a) => a.id !== accId));
    }
  };

  // Handlers for Categories
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryInput.trim()) return;
    const cat = newCategoryInput.trim();
    if (settings.categories.includes(cat)) return;

    const updatedCategories = [...settings.categories, cat];
    const updatedSubcategories = {
      ...settings.subcategories,
      [cat]: settings.subcategories[cat] || ['General']
    };

    onUpdateSettings({
      ...settings,
      categories: updatedCategories,
      subcategories: updatedSubcategories
    });
    setNewCategoryInput('');
  };

  const handleSaveEditCategory = () => {
    if (!editingCategory || !editingCategory.newCat.trim()) return;
    const { oldCat, newCat } = editingCategory;
    const trimmed = newCat.trim();

    const updatedCategories = settings.categories.map((c) => (c === oldCat ? trimmed : c));
    const updatedSubcategories = { ...settings.subcategories };
    if (updatedSubcategories[oldCat]) {
      updatedSubcategories[trimmed] = updatedSubcategories[oldCat];
      delete updatedSubcategories[oldCat];
    }

    onUpdateSettings({
      ...settings,
      categories: updatedCategories,
      subcategories: updatedSubcategories
    });

    if (onUpdateTransactions) {
      const updatedTx = transactions.map((t) => (t.category === oldCat ? { ...t, category: trimmed } : t));
      onUpdateTransactions(updatedTx);
    }

    setEditingCategory(null);
  };

  const handleDeleteCategory = (catName: string) => {
    if (settings.categories.length <= 1) {
      alert('You must keep at least one Category.');
      return;
    }
    if (window.confirm(`Are you sure you want to remove category "${catName}" and its subcategories?`)) {
      const updatedCategories = settings.categories.filter((c) => c !== catName);
      const updatedSubcategories = { ...settings.subcategories };
      delete updatedSubcategories[catName];

      onUpdateSettings({
        ...settings,
        categories: updatedCategories,
        subcategories: updatedSubcategories
      });
    }
  };

  // Handlers for Subcategories
  const handleAddSubcategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubcategoryInput.trim() || !selectedCatForSub) return;
    const sub = newSubcategoryInput.trim();
    const currentSubs = settings.subcategories[selectedCatForSub] || [];

    if (currentSubs.includes(sub)) return;

    onUpdateSettings({
      ...settings,
      subcategories: {
        ...settings.subcategories,
        [selectedCatForSub]: [...currentSubs, sub]
      }
    });
    setNewSubcategoryInput('');
  };

  const handleSaveEditSubcategory = () => {
    if (!editingSubcategory || !editingSubcategory.newSub.trim() || !selectedCatForSub) return;
    const { oldSub, newSub } = editingSubcategory;
    const trimmed = newSub.trim();

    const currentSubs = settings.subcategories[selectedCatForSub] || [];
    const updatedSubs = currentSubs.map((s) => (s === oldSub ? trimmed : s));

    onUpdateSettings({
      ...settings,
      subcategories: {
        ...settings.subcategories,
        [selectedCatForSub]: updatedSubs
      }
    });

    if (onUpdateTransactions) {
      const updatedTx = transactions.map((t) =>
        t.category === selectedCatForSub && t.subcategory === oldSub ? { ...t, subcategory: trimmed } : t
      );
      onUpdateTransactions(updatedTx);
    }

    setEditingSubcategory(null);
  };

  const handleDeleteSubcategory = (subName: string) => {
    if (!selectedCatForSub) return;
    const currentSubs = settings.subcategories[selectedCatForSub] || [];
    if (currentSubs.length <= 1) {
      alert('Every Category should have at least one subcategory.');
      return;
    }

    if (window.confirm(`Are you sure you want to remove subcategory "${subName}" from "${selectedCatForSub}"?`)) {
      onUpdateSettings({
        ...settings,
        subcategories: {
          ...settings.subcategories,
          [selectedCatForSub]: currentSubs.filter((s) => s !== subName)
        }
      });
    }
  };

  // Handlers for Inventory Categories
  const handleAddInvCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvCategoryInput.trim()) return;
    const cat = newInvCategoryInput.trim();
    if (invCategories.includes(cat)) return;

    const updatedCategories = [...invCategories, cat];
    const updatedSubcategories = {
      ...invSubcategories,
      [cat]: invSubcategories[cat] || ['General Item']
    };

    onUpdateSettings({
      ...settings,
      inventoryCategories: updatedCategories,
      inventorySubcategories: updatedSubcategories
    });
    setNewInvCategoryInput('');
  };

  const handleSaveEditInvCategory = () => {
    if (!editingInvCategory || !editingInvCategory.newCat.trim()) return;
    const { oldCat, newCat } = editingInvCategory;
    const trimmed = newCat.trim();

    const updatedCategories = invCategories.map((c) => (c === oldCat ? trimmed : c));
    const updatedSubcategories = { ...invSubcategories };
    if (updatedSubcategories[oldCat]) {
      updatedSubcategories[trimmed] = updatedSubcategories[oldCat];
      delete updatedSubcategories[oldCat];
    }

    onUpdateSettings({
      ...settings,
      inventoryCategories: updatedCategories,
      inventorySubcategories: updatedSubcategories
    });

    if (selectedInvCatForSub === oldCat) {
      setSelectedInvCatForSub(trimmed);
    }

    setEditingInvCategory(null);
  };

  const handleDeleteInvCategory = (catName: string) => {
    if (invCategories.length <= 1) {
      alert('You must keep at least one Inventory Category.');
      return;
    }
    if (window.confirm(`Are you sure you want to remove inventory category "${catName}" and its subcategories?`)) {
      const updatedCategories = invCategories.filter((c) => c !== catName);
      const updatedSubcategories = { ...invSubcategories };
      delete updatedSubcategories[catName];

      onUpdateSettings({
        ...settings,
        inventoryCategories: updatedCategories,
        inventorySubcategories: updatedSubcategories
      });

      if (selectedInvCatForSub === catName) {
        setSelectedInvCatForSub(updatedCategories[0] || '');
      }
    }
  };

  // Handlers for Inventory Subcategories
  const handleAddInvSubcategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvSubcategoryInput.trim() || !selectedInvCatForSub) return;
    const sub = newInvSubcategoryInput.trim();
    const currentSubs = invSubcategories[selectedInvCatForSub] || [];

    if (currentSubs.includes(sub)) return;

    onUpdateSettings({
      ...settings,
      inventorySubcategories: {
        ...invSubcategories,
        [selectedInvCatForSub]: [...currentSubs, sub]
      }
    });
    setNewInvSubcategoryInput('');
  };

  const handleSaveEditInvSubcategory = () => {
    if (!editingInvSubcategory || !editingInvSubcategory.newSub.trim() || !selectedInvCatForSub) return;
    const { oldSub, newSub } = editingInvSubcategory;
    const trimmed = newSub.trim();

    const currentSubs = invSubcategories[selectedInvCatForSub] || [];
    const updatedSubs = currentSubs.map((s) => (s === oldSub ? trimmed : s));

    onUpdateSettings({
      ...settings,
      inventorySubcategories: {
        ...invSubcategories,
        [selectedInvCatForSub]: updatedSubs
      }
    });

    setEditingInvSubcategory(null);
  };

  const handleDeleteInvSubcategory = (subName: string) => {
    if (!selectedInvCatForSub) return;
    const currentSubs = invSubcategories[selectedInvCatForSub] || [];
    if (currentSubs.length <= 1) {
      alert('Every Inventory Category should have at least one subcategory.');
      return;
    }

    if (window.confirm(`Are you sure you want to remove subcategory "${subName}" from "${selectedInvCatForSub}"?`)) {
      onUpdateSettings({
        ...settings,
        inventorySubcategories: {
          ...invSubcategories,
          [selectedInvCatForSub]: currentSubs.filter((s) => s !== subName)
        }
      });
    }
  };

  const filteredMerchants = (settings.merchants || []).filter((m) =>
    m.toLowerCase().includes(merchantSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-indigo-400" />
            App Control Center & Data Customization Settings
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Personalize app branding, merchants, accounts, categories, subcategories, and subcategory analytics
          </p>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/5 scrollbar-none">
        {[
          { id: 'app', label: '1. App Identity', icon: Sparkles },
          { id: 'merchants', label: '2. Merchants/Providers', icon: Building2 },
          { id: 'accounts', label: '3. Target Accounts', icon: Landmark },
          { id: 'categories', label: '4. Tx Categories', icon: Tag },
          { id: 'subcategories', label: '5. Tx Subcategories', icon: Layers },
          { id: 'invCategories', label: '6. Inventory Categories', icon: Package },
          { id: 'invSubcategories', label: '7. Inventory Subcategories', icon: Boxes },
          { id: 'analytics', label: '8. Subcategory Graphic Pie', icon: PieIcon }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50 border border-indigo-400/30'
                  : 'bg-[#14161c] text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Section 1: App Identity */}
      {activeSection === 'app' && (
        <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-6 shadow-xl max-w-2xl">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              App Name & Brand Logo Customization
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Personalize your application name and icon logo displayed across the navigation header, security screens, and system reports.
            </p>
          </div>

          <form onSubmit={handleSaveAppIdentity} className="space-y-6">
            {/* App Name Field */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Application Title / Branding Name
              </label>
              <input
                type="text"
                value={appNameInput}
                onChange={(e) => setAppNameInput(e.target.value)}
                placeholder="e.g. Aura Finance, My Family Vault, Wealth Navigator"
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-4 py-3 text-white font-medium text-sm focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>

            {/* Brand Logo Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-400">
                Brand Logo Icon
              </label>
              
              {/* Preset Icons Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {LOGO_PRESETS.map((p) => {
                  const Icon = p.icon;
                  const isSelected = appLogoInput === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setAppLogoInput(p.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold shadow-md'
                          : 'bg-[#090a0c] border-white/5 text-slate-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-white/5 text-indigo-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="truncate text-[11px]">{p.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Upload or Custom Image URL */}
              <div className="pt-2 space-y-2">
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-400" /> Or Upload Custom Logo Image
                </span>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <label className="cursor-pointer px-4 py-2 bg-[#090a0c] hover:bg-white/5 border border-white/10 text-xs font-medium text-slate-300 rounded-xl flex items-center gap-2 transition-colors">
                    <Upload className="w-4 h-4 text-indigo-400" />
                    <span>Browse Image File...</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-500 text-center sm:text-left">or paste image URL:</span>
                  <input
                    type="url"
                    value={appLogoInput.startsWith('http') ? appLogoInput : customLogoUrl}
                    onChange={(e) => {
                      setCustomLogoUrl(e.target.value);
                      if (e.target.value.trim()) {
                        setAppLogoInput(e.target.value.trim());
                      }
                    }}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-indigo-950/50 border border-indigo-400/30 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Save App Name & Logo</span>
              </button>

              {appNameSavedMsg && (
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in">
                  <Check className="w-4 h-4" /> App identity updated successfully!
                </span>
              )}
            </div>
          </form>

          {/* Live Preview Box */}
          <div className="bg-[#090a0c] p-4.5 rounded-xl border border-white/5 space-y-2.5">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Header Identity Preview
            </span>
            <div className="flex items-center gap-3 bg-[#14161c] p-3 rounded-xl border border-white/5">
              <BrandLogo logo={appLogoInput} size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-serif italic text-xl text-indigo-400 tracking-tight font-medium">
                    {appNameInput || 'Aura Finance'}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                    Bank-Grade
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">AI Wealth Intelligence & Drive Cloud Sync</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Merchants / Providers */}
      {activeSection === 'merchants' && (
        <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                Merchant & Provider Name Registry
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Control and add any merchant or provider names used when recording transactions and subscriptions.
              </p>
            </div>

            {/* Add Merchant Form */}
            <form onSubmit={handleAddMerchant} className="flex items-center gap-2">
              <input
                type="text"
                value={newMerchantInput}
                onChange={(e) => setNewMerchantInput(e.target.value)}
                placeholder="New merchant name..."
                className="bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none w-48 sm:w-64"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </form>
          </div>

          {/* Search Filter */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={merchantSearch}
              onChange={(e) => setMerchantSearch(e.target.value)}
              placeholder="Search merchants..."
              className="w-full bg-[#090a0c] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Merchants List Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredMerchants.map((merchant) => {
              const isEditing = editingMerchant?.oldName === merchant;
              const count = transactions.filter((t) => t.provider === merchant).length;

              return (
                <div
                  key={merchant}
                  className="bg-[#090a0c] p-3.5 rounded-xl border border-white/5 flex items-center justify-between gap-2 hover:border-white/10 transition-colors"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={editingMerchant.newName}
                        onChange={(e) =>
                          setEditingMerchant({ ...editingMerchant, newName: e.target.value })
                        }
                        className="bg-[#14161c] border border-indigo-500 rounded px-2 py-1 text-white text-xs w-full focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEditMerchant}
                        className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingMerchant(null)}
                        className="p-1 text-slate-400 hover:bg-white/5 rounded"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="font-semibold text-white text-xs">{merchant}</div>
                        <div className="text-[10px] text-slate-500">{count} transactions linked</div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingMerchant({ oldName: merchant, newName: merchant })}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-colors"
                          title="Modify Name"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMerchant(merchant)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Remove Merchant"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 3: Accounts */}
      {activeSection === 'accounts' && (
        <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-400" />
                Target Accounts Control
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Add, modify, or remove any target financial accounts available across the application.
              </p>
            </div>

            <button
              onClick={() => handleOpenAccountModal()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-950/50 border border-indigo-400/30"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Target Account</span>
            </button>
          </div>

          {/* Accounts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-[#090a0c] p-5 rounded-2xl border border-white/5 space-y-3 relative hover:border-white/10 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow border border-white/10"
                      style={{ backgroundColor: acc.color }}
                    >
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                        {acc.type} • {acc.bankName}
                      </span>
                      <h4 className="font-semibold text-white text-sm">{acc.name}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenAccountModal(acc)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-colors"
                      title="Modify Account"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(acc.id, acc.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Remove Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">Current Balance</span>
                  <span className={`text-xl font-serif font-bold ${acc.balance < 0 ? 'text-rose-400' : 'text-white'}`}>
                    ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Categories */}
      {activeSection === 'categories' && (
        <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-400" />
                Category Groups Management
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Add, modify, or remove the primary groups of budget categories.
              </p>
            </div>

            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="flex items-center gap-2">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                placeholder="New Category Name..."
                className="bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none w-48 sm:w-64"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </form>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {settings.categories.map((cat) => {
              const isEditing = editingCategory?.oldCat === cat;
              const subCount = (settings.subcategories[cat] || []).length;

              return (
                <div
                  key={cat}
                  className="bg-[#090a0c] p-4 rounded-xl border border-white/5 flex items-center justify-between gap-2 hover:border-white/10 transition-colors"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={editingCategory.newCat}
                        onChange={(e) =>
                          setEditingCategory({ ...editingCategory, newCat: e.target.value })
                        }
                        className="bg-[#14161c] border border-indigo-500 rounded px-2 py-1 text-white text-xs w-full focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEditCategory}
                        className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingCategory(null)}
                        className="p-1 text-slate-400 hover:bg-white/5 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="font-semibold text-white text-sm">{cat}</div>
                        <div className="text-[10px] text-slate-500">{subCount} subcategories inside</div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingCategory({ oldCat: cat, newCat: cat })}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 5: Subcategories */}
      {activeSection === 'subcategories' && (
        <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                Subcategory Groups Management
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Add, modify, or remove subcategories grouped under each category.
              </p>
            </div>

            {/* Select Parent Category */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Parent Category:</span>
              <select
                value={selectedCatForSub}
                onChange={(e) => setSelectedCatForSub(e.target.value)}
                className="bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
              >
                {settings.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Add Subcategory Form */}
          <form onSubmit={handleAddSubcategory} className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              value={newSubcategoryInput}
              onChange={(e) => setNewSubcategoryInput(e.target.value)}
              placeholder={`Add new subcategory under "${selectedCatForSub}"...`}
              className="bg-[#090a0c] border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-indigo-500 focus:outline-none flex-1"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subcategory</span>
            </button>
          </form>

          {/* Subcategories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {(settings.subcategories[selectedCatForSub] || []).map((sub) => {
              const isEditing = editingSubcategory?.oldSub === sub;

              return (
                <div
                  key={sub}
                  className="bg-[#090a0c] p-3.5 rounded-xl border border-white/5 flex items-center justify-between gap-2 hover:border-white/10 transition-colors"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={editingSubcategory.newSub}
                        onChange={(e) =>
                          setEditingSubcategory({ ...editingSubcategory, newSub: e.target.value })
                        }
                        className="bg-[#14161c] border border-indigo-500 rounded px-2 py-1 text-white text-xs w-full focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEditSubcategory}
                        className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingSubcategory(null)}
                        className="p-1 text-slate-400 hover:bg-white/5 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="font-semibold text-white text-xs">{sub}</div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingSubcategory({ oldSub: sub, newSub: sub })}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubcategory(sub)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 6: Inventory Categories */}
      {activeSection === 'invCategories' && (
        <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-400" />
                Inventory Categories Management
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage category groups strictly reserved for inventory items (pantry, assets, supplies). These are isolated from transaction expense categories.
              </p>
            </div>

            {/* Add Inventory Category Form */}
            <form onSubmit={handleAddInvCategory} className="flex items-center gap-2">
              <input
                type="text"
                value={newInvCategoryInput}
                onChange={(e) => setNewInvCategoryInput(e.target.value)}
                placeholder="New Inventory Category..."
                className="bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none w-48 sm:w-64"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </form>
          </div>

          {/* Inventory Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {invCategories.map((cat) => {
              const isEditing = editingInvCategory?.oldCat === cat;
              const subCount = (invSubcategories[cat] || []).length;

              return (
                <div
                  key={cat}
                  className="bg-[#090a0c] p-4 rounded-xl border border-white/5 flex items-center justify-between gap-2 hover:border-white/10 transition-colors"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={editingInvCategory.newCat}
                        onChange={(e) =>
                          setEditingInvCategory({ ...editingInvCategory, newCat: e.target.value })
                        }
                        className="bg-[#14161c] border border-indigo-500 rounded px-2 py-1 text-white text-xs w-full focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEditInvCategory}
                        className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingInvCategory(null)}
                        className="p-1 text-slate-400 hover:bg-white/5 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="font-semibold text-white text-sm">{cat}</div>
                        <div className="text-[10px] text-slate-500">{subCount} inventory subcategories</div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingInvCategory({ oldCat: cat, newCat: cat })}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteInvCategory(cat)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 7: Inventory Subcategories */}
      {activeSection === 'invSubcategories' && (
        <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-400" />
                Inventory Subcategories Management
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Add, modify, or remove subcategories strictly assigned to inventory categories.
              </p>
            </div>

            {/* Select Parent Inventory Category */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Inventory Category:</span>
              <select
                value={selectedInvCatForSub}
                onChange={(e) => setSelectedInvCatForSub(e.target.value)}
                className="bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
              >
                {invCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Add Subcategory Form */}
          <form onSubmit={handleAddInvSubcategory} className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              value={newInvSubcategoryInput}
              onChange={(e) => setNewInvSubcategoryInput(e.target.value)}
              placeholder={`New subcategory for "${selectedInvCatForSub}"...`}
              className="bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none w-full"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subcategory</span>
            </button>
          </form>

          {/* Subcategories List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {(invSubcategories[selectedInvCatForSub] || []).map((sub) => {
              const isEditing = editingInvSubcategory?.oldSub === sub;

              return (
                <div
                  key={sub}
                  className="bg-[#090a0c] p-3.5 rounded-xl border border-white/5 flex items-center justify-between gap-2 hover:border-white/10 transition-colors"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={editingInvSubcategory.newSub}
                        onChange={(e) =>
                          setEditingInvSubcategory({ ...editingInvSubcategory, newSub: e.target.value })
                        }
                        className="bg-[#14161c] border border-indigo-500 rounded px-2 py-1 text-white text-xs w-full focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEditInvSubcategory}
                        className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingInvSubcategory(null)}
                        className="p-1 text-slate-400 hover:bg-white/5 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="font-semibold text-white text-xs">{sub}</div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingInvSubcategory({ oldSub: sub, newSub: sub })}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteInvSubcategory(sub)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 8: Graphic Pie Chart for Subcategories */}
      {activeSection === 'analytics' && (
        <SubcategoryPieChart transactions={transactions} settings={settings} />
      )}

      {/* Modal for Add / Edit Target Account */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#14161c] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-400" />
                {editingAccount ? 'Modify Target Account' : 'Add Target Account'}
              </h3>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Account Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Primary Checking"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3.5 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Bank / Financial Institution
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chase, Bank of America, Fidelity"
                  value={accBank}
                  onChange={(e) => setAccBank(e.target.value)}
                  className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3.5 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Account Type
                  </label>
                  <select
                    value={accType}
                    onChange={(e) => setAccType(e.target.value as any)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3.5 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Checking">Checking</option>
                    <option value="Savings">Savings</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Investment">Investment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Initial Balance ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={accBalance}
                    onChange={(e) => setAccBalance(e.target.value)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3.5 py-2 text-white text-sm font-serif focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Badge Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accColor}
                    onChange={(e) => setAccColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border-none cursor-pointer bg-transparent"
                  />
                  <span className="text-xs font-serif text-slate-300">{accColor}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-950/50 border border-indigo-400/30"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
