import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { BiometricLockModal } from './components/BiometricLockModal';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { AIScannerView } from './components/AIScannerView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { AccountsView } from './components/AccountsView';
import { BudgetsGoalsView } from './components/BudgetsGoalsView';
import { SecurityDriveView } from './components/SecurityDriveView';
import { SettingsView } from './components/SettingsView';
import { InventoryView } from './components/InventoryView';
import { TransactionModal } from './components/TransactionModal';

import { 
  FinancialDataStore, 
  Transaction, 
  Account, 
  Subscription, 
  BudgetCategory, 
  SavingsGoal, 
  BiometricSettings, 
  DriveSyncState,
  AppSettings
} from './types';

import { DEFAULT_SETTINGS } from './data/initialData';

import { 
  loadFinancialStore, 
  saveFinancialStore, 
  loadBiometricSettings, 
  saveBiometricSettings,
  importStoreFromJSON
} from './services/storageService';

import { 
  getDriveSyncState, 
  syncToGoogleDrive, 
  restoreFromGoogleDrive 
} from './services/driveService';

export default function App() {
  const [store, setStore] = useState<FinancialDataStore>(() => loadFinancialStore());
  const [biometricSettings, setBiometricSettings] = useState<BiometricSettings>(() => loadBiometricSettings());
  const [driveState, setDriveState] = useState<DriveSyncState>(() => getDriveSyncState());

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isLocked, setIsLocked] = useState<boolean>(biometricSettings.isEnabled);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Partial<Transaction> | undefined>(undefined);
  const [isSyncingBank, setIsSyncingBank] = useState<boolean>(false);

  // Auto save to localStorage when store changes
  useEffect(() => {
    saveFinancialStore(store);
  }, [store]);

  // Lock / Unlock handlers
  const handleUnlock = () => {
    setIsLocked(false);
  };

  const handleLockApp = () => {
    setIsLocked(true);
  };

  const handleUpdateBiometrics = (newSettings: BiometricSettings) => {
    setBiometricSettings(newSettings);
    saveBiometricSettings(newSettings);
  };

  // Transaction Actions (Expenses & Incomes)
  const handleSaveTransaction = (txData: Partial<Transaction>) => {
    setStore((prev) => {
      const existingIdx = prev.transactions.findIndex((t) => t.id === txData.id);
      let updatedTxList = [...prev.transactions];

      const fullTx: Transaction = {
        id: txData.id || `TRX-${Math.floor(100 + Math.random() * 900)}`,
        date: txData.date || new Date().toISOString().split('T')[0],
        type: txData.type || 'Expense',
        category: txData.category || 'Everyday',
        subcategory: txData.subcategory || 'General',
        description: txData.description || txData.provider || 'Transaction',
        amount: txData.amount || 0,
        provider: txData.provider || 'Unknown Provider',
        frequency: txData.frequency || 'One Time',
        receiptUrl: txData.receiptUrl || '',
        month: txData.month || 'August',
        year: txData.year || 2026,
        accountId: txData.accountId || prev.accounts[0]?.id || 'acc-1',
        notes: txData.notes || '',
        isSubscription: txData.isSubscription || false,
        status: 'Cleared'
      };

      if (existingIdx >= 0) {
        updatedTxList[existingIdx] = fullTx;
      } else {
        updatedTxList = [fullTx, ...updatedTxList];
      }

      // Update balance of the account
      const updatedAccounts = prev.accounts.map((acc) => {
        if (acc.id === fullTx.accountId) {
          const delta = fullTx.type === 'Income' ? fullTx.amount : -fullTx.amount;
          return { ...acc, balance: acc.balance + delta };
        }
        return acc;
      });

      return {
        ...prev,
        transactions: updatedTxList,
        accounts: updatedAccounts
      };
    });

    setEditingTransaction(undefined);
  };

  const handleDeleteTransaction = (id: string) => {
    setStore((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id)
    }));
  };

  const handleImportCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length <= 1) return;

      const newTransactions: Transaction[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
        if (cols.length >= 7) {
          const rawAmount = cols[6].replace('$', '').replace(/,/g, '');
          const amountNum = parseFloat(rawAmount) || 0;
          newTransactions.push({
            id: cols[0] || `TRX-${Math.floor(100 + Math.random() * 900)}`,
            date: cols[1] || '2026-08-01',
            type: (cols[2] as any) || 'Expense',
            category: cols[3] || 'Everyday',
            subcategory: cols[4] || '',
            description: cols[5] || cols[7] || 'CSV Import',
            amount: Math.abs(amountNum),
            provider: cols[7] || 'Merchant',
            frequency: (cols[8] as any) || 'One Time',
            receiptUrl: cols[9] || '',
            month: cols[10] || 'August',
            year: parseInt(cols[11]) || 2026,
            notes: cols[12] || '',
            accountId: store.accounts[0]?.id || 'acc-1',
            status: 'Cleared'
          });
        }
      }

      if (newTransactions.length > 0) {
        setStore((prev) => ({
          ...prev,
          transactions: [...newTransactions, ...prev.transactions]
        }));
      }
    };
    reader.readAsText(file);
  };

  // Live Bank Feed Sync Simulation
  const handleBankSync = async () => {
    setIsSyncingBank(true);
    try {
      const res = await fetch('/api/bank/sync-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: store.accounts[0]?.id })
      });
      const json = await res.json();
      if (json.success && json.newTransaction) {
        handleSaveTransaction(json.newTransaction);
      }
    } catch (err) {
      console.error('Bank sync failed', err);
    } finally {
      setIsSyncingBank(false);
    }
  };

  // Subscription Actions
  const handleAddSubscription = (sub: Partial<Subscription>) => {
    setStore((prev) => ({
      ...prev,
      subscriptions: [sub as Subscription, ...prev.subscriptions]
    }));
  };

  const handleUpdateSubscription = (updatedSub: Subscription) => {
    setStore((prev) => ({
      ...prev,
      subscriptions: prev.subscriptions.map((s) => (s.id === updatedSub.id ? updatedSub : s))
    }));
  };

  const handleDeleteSubscription = (id: string) => {
    setStore((prev) => ({
      ...prev,
      subscriptions: prev.subscriptions.filter((s) => s.id !== id)
    }));
  };

  // Account Actions
  const handleAddAccount = (acc: Account) => {
    setStore((prev) => ({
      ...prev,
      accounts: [...prev.accounts, acc]
    }));
  };

  // Budget & Goal Actions
  const handleAddBudget = (b: BudgetCategory) => {
    setStore((prev) => {
      const idx = prev.budgets.findIndex((item) => item.category.toLowerCase() === b.category.toLowerCase());
      if (idx >= 0) {
        const updated = [...prev.budgets];
        updated[idx] = b;
        return { ...prev, budgets: updated };
      }
      return { ...prev, budgets: [...prev.budgets, b] };
    });
  };

  const handleUpdateBudget = (b: BudgetCategory) => {
    setStore((prev) => {
      const idx = prev.budgets.findIndex((item) => item.category === b.category);
      if (idx >= 0) {
        const updated = [...prev.budgets];
        updated[idx] = b;
        return { ...prev, budgets: updated };
      }
      return { ...prev, budgets: [...prev.budgets, b] };
    });
  };

  const handleDeleteBudget = (categoryName: string) => {
    setStore((prev) => ({
      ...prev,
      budgets: prev.budgets.filter((item) => item.category !== categoryName)
    }));
  };

  const handleAddGoal = (g: SavingsGoal) => {
    setStore((prev) => ({
      ...prev,
      savingsGoals: [...prev.savingsGoals, g]
    }));
  };

  // Drive Backup & Restore Actions
  const handleSyncDriveNow = async () => {
    const res = await syncToGoogleDrive(store);
    setDriveState(getDriveSyncState());
  };

  const handleRestoreDriveNow = async () => {
    const restored = await restoreFromGoogleDrive();
    if (restored) {
      setStore(restored);
      setDriveState(getDriveSyncState());
    }
  };

  const handleImportStore = (jsonStr: string) => {
    const imported = importStoreFromJSON(jsonStr);
    setStore(imported);
  };

  const handleUpdateInventory = (newInventory: any[]) => {
    setStore((prev) => ({
      ...prev,
      inventory: newInventory
    }));
  };

  return (
    <div className="min-h-screen bg-[#090a0c] text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* Biometric Security Lock Overlay */}
      {isLocked && (
        <BiometricLockModal
          settings={biometricSettings}
          onUnlock={handleUnlock}
        />
      )}

      {/* Main Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => {
          setEditingTransaction(undefined);
          setIsAddModalOpen(true);
        }}
        onLockApp={handleLockApp}
        driveState={driveState}
        onBankSync={handleBankSync}
        isSyncingBank={isSyncingBank}
        appName={store.settings?.appName || DEFAULT_SETTINGS.appName}
        appLogo={store.settings?.appLogo || DEFAULT_SETTINGS.appLogo}
      />

      {/* Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            transactions={store.transactions}
            accounts={store.accounts}
            budgets={store.budgets}
            subscriptions={store.subscriptions}
            savingsGoals={store.savingsGoals}
            onOpenAddModal={() => {
              setEditingTransaction(undefined);
              setIsAddModalOpen(true);
            }}
            onNavigateToScanner={() => setActiveTab('scanner')}
            settings={store.settings || DEFAULT_SETTINGS}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            transactions={store.transactions}
            accounts={store.accounts}
            onAddTransaction={() => {
              setEditingTransaction(undefined);
              setIsAddModalOpen(true);
            }}
            onEditTransaction={(tx) => {
              setEditingTransaction(tx);
              setIsAddModalOpen(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
            onImportCSV={handleImportCSV}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            inventory={store.inventory || []}
            onUpdateInventory={handleUpdateInventory}
            settings={store.settings || DEFAULT_SETTINGS}
            onAddTransaction={handleSaveTransaction}
          />
        )}

        {activeTab === 'scanner' && (
          <AIScannerView
            onSaveExtracted={(tx) => {
              handleSaveTransaction(tx);
              setActiveTab('transactions');
            }}
            accounts={store.accounts}
          />
        )}

        {activeTab === 'subscriptions' && (
          <SubscriptionsView
            subscriptions={store.subscriptions}
            accounts={store.accounts}
            onAddSubscription={handleAddSubscription}
            onUpdateSubscription={handleUpdateSubscription}
            onDeleteSubscription={handleDeleteSubscription}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsView
            accounts={store.accounts}
            transactions={store.transactions}
            onAddAccount={handleAddAccount}
            onBankSync={handleBankSync}
            isSyncingBank={isSyncingBank}
          />
        )}

        {activeTab === 'budgets' && (
          <BudgetsGoalsView
            budgets={store.budgets}
            savingsGoals={store.savingsGoals}
            transactions={store.transactions}
            onAddBudget={handleAddBudget}
            onUpdateBudget={handleUpdateBudget}
            onDeleteBudget={handleDeleteBudget}
            onAddGoal={handleAddGoal}
          />
        )}

        {activeTab === 'security' && (
          <SecurityDriveView
            biometricSettings={biometricSettings}
            onUpdateBiometrics={handleUpdateBiometrics}
            driveState={driveState}
            onSyncDriveNow={handleSyncDriveNow}
            onRestoreDriveNow={handleRestoreDriveNow}
            store={store}
            onImportStore={handleImportStore}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={store.settings || DEFAULT_SETTINGS}
            accounts={store.accounts}
            transactions={store.transactions}
            budgets={store.budgets}
            onUpdateSettings={(newSettings) =>
              setStore((prev) => ({ ...prev, settings: newSettings }))
            }
            onUpdateAccounts={(newAccounts) =>
              setStore((prev) => ({ ...prev, accounts: newAccounts }))
            }
            onUpdateTransactions={(newTx) =>
              setStore((prev) => ({ ...prev, transactions: newTx }))
            }
          />
        )}
      </main>

      {/* Manual Expense & Income Record Modal */}
      <TransactionModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTransaction(undefined);
        }}
        onSave={handleSaveTransaction}
        accounts={store.accounts}
        initialData={editingTransaction}
        settings={store.settings || DEFAULT_SETTINGS}
      />

    </div>
  );
}
