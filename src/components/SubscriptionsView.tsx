import React, { useState } from 'react';
import { 
  RefreshCw, 
  Bell, 
  AlertTriangle, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  X, 
  Trash2, 
  Edit3,
  DollarSign,
  CreditCard,
  Sparkles,
  CalendarCheck
} from 'lucide-react';
import { Subscription, Account, Transaction, GoogleWorkspaceState } from '../types';
import { SmartRemindersView } from './SmartRemindersView';

interface SubscriptionsViewProps {
  subscriptions: Subscription[];
  accounts: Account[];
  transactions?: Transaction[];
  workspaceState?: GoogleWorkspaceState;
  onAddSubscription: (sub: Partial<Subscription>) => void;
  onUpdateSubscription?: (sub: Subscription) => void;
  onDeleteSubscription: (id: string) => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  subscriptions,
  accounts,
  transactions = [],
  workspaceState,
  onAddSubscription,
  onUpdateSubscription,
  onDeleteSubscription
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'smart-reminders'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);

  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState<'Monthly' | 'Yearly'>('Monthly');
  const [nextBillingDate, setNextBillingDate] = useState('2026-08-15');
  const [category, setCategory] = useState('Tech & Media');
  const [accountId, setAccountId] = useState(accounts[0]?.id || 'acc-3');
  const [status, setStatus] = useState<'Active' | 'Paused' | 'Cancelled'>('Active');

  const totalMonthlyCost = subscriptions
    .filter((s) => s.status === 'Active')
    .reduce((sum, s) => sum + (s.billingCycle === 'Monthly' ? s.amount : s.amount / 12), 0);

  const totalYearlyCost = totalMonthlyCost * 12;

  const handleOpenAdd = () => {
    setEditingSub(null);
    setName('');
    setProvider('');
    setAmount('');
    setBillingCycle('Monthly');
    setNextBillingDate('2026-08-15');
    setCategory('Tech & Media');
    setAccountId(accounts[0]?.id || '');
    setStatus('Active');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sub: Subscription) => {
    setEditingSub(sub);
    setName(sub.name);
    setProvider(sub.provider || sub.name);
    setAmount(String(sub.amount));
    setBillingCycle(sub.billingCycle || 'Monthly');
    setNextBillingDate(sub.nextBillingDate || '2026-08-15');
    setCategory(sub.category || 'Tech & Media');
    setAccountId(sub.accountId || accounts[0]?.id || '');
    setStatus(sub.status || 'Active');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || isNaN(Number(amount))) return;

    const numericAmount = parseFloat(amount);

    if (editingSub) {
      const updated: Subscription = {
        ...editingSub,
        name: name.trim(),
        provider: provider.trim() || name.trim(),
        amount: numericAmount,
        billingCycle,
        nextBillingDate,
        category,
        accountId: accountId || accounts[0]?.id || '',
        status
      };

      if (onUpdateSubscription) {
        onUpdateSubscription(updated);
      } else {
        onAddSubscription(updated);
      }
    } else {
      onAddSubscription({
        id: `sub-${Math.floor(100 + Math.random() * 900)}`,
        name: name.trim(),
        provider: provider.trim() || name.trim(),
        amount: numericAmount,
        billingCycle,
        nextBillingDate,
        category,
        accountId: accountId || accounts[0]?.id || '',
        autoAlert: true,
        status
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-400" />
            Recurring Subscription & Payment Alerts
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Automated tracking of recurring memberships, monthly software, and gym fees
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab(activeTab === 'all' ? 'smart-reminders' : 'all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border ${
              activeTab === 'smart-reminders'
                ? 'bg-indigo-600 text-white border-indigo-400/40 shadow-lg shadow-indigo-950/60'
                : 'bg-[#1e2230] text-indigo-300 border-indigo-500/30 hover:bg-[#282d40]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>{activeTab === 'smart-reminders' ? 'View Subscriptions List' : 'Gemini Smart Reminders'}</span>
          </button>

          {activeTab === 'all' && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-950/50 border border-indigo-400/30 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subscription</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode Subtabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'all'
              ? 'bg-white/10 text-white border border-white/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4 text-indigo-400" />
          <span>Active Subscriptions ({subscriptions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('smart-reminders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'smart-reminders'
              ? 'bg-indigo-600 text-white shadow-md border border-indigo-400/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-300" />
          <span>Gemini Smart Calendar Reminders</span>
        </button>
      </div>

      {/* Render Smart Reminders View if active */}
      {activeTab === 'smart-reminders' ? (
        <SmartRemindersView
          subscriptions={subscriptions}
          transactions={transactions}
          workspaceState={workspaceState}
        />
      ) : (
        <>
          {/* Subscription Alerts Banner */}
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse shrink-0" />
              <div>
                <strong className="text-white font-semibold">Gemini AI Cadence Analysis Available:</strong>
                <span className="ml-1 text-slate-300">
                  Analyze subscription frequencies and schedule automated Google Calendar notifications.
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('smart-reminders')}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Launch Smart Reminders</span>
            </button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 space-y-1 shadow-lg">
              <span className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-medium">Monthly Recurring Total</span>
              <div className="text-3xl font-serif text-indigo-400 tracking-tight">
                ${totalMonthlyCost.toFixed(2)}<span className="text-xs font-sans text-slate-400">/mo</span>
              </div>
            </div>

            <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 space-y-1 shadow-lg">
              <span className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-medium">Annual Subscription Total</span>
              <div className="text-3xl font-serif text-white tracking-tight">
                ${totalYearlyCost.toFixed(2)}<span className="text-xs font-sans text-slate-400">/yr</span>
              </div>
            </div>

            <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 space-y-1 shadow-lg">
              <span className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-medium">Active Subscriptions</span>
              <div className="text-3xl font-serif text-emerald-400 tracking-tight">
                {subscriptions.filter((s) => s.status === 'Active').length} Active
              </div>
            </div>
          </div>

      {/* Subscription Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subscriptions.map((sub) => {
          const acc = accounts.find((a) => a.id === sub.accountId);
          return (
            <div
              key={sub.id}
              className="bg-[#14161c] p-5 rounded-2xl border border-white/5 space-y-3 relative group hover:border-white/10 transition-colors shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-serif text-sm">
                    {sub.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{sub.name}</h3>
                    <p className="text-xs text-slate-400">{sub.provider}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(sub)}
                    className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-colors"
                    title="Edit Subscription Price & Account"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteSubscription(sub.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors"
                    title="Remove Subscription"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-baseline justify-between border-t border-white/5 pt-3">
                <span className="text-xs text-slate-400">Recurring Price</span>
                <span className="text-lg font-serif font-semibold text-white">
                  ${sub.amount.toFixed(2)}
                  <span className="text-xs text-slate-400 font-sans">/{sub.billingCycle === 'Monthly' ? 'mo' : 'yr'}</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 bg-[#090a0c] p-2.5 rounded-xl border border-white/5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Next Bill:
                </span>
                <span className="font-serif text-slate-200">{sub.nextBillingDate}</span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 bg-[#090a0c]/60 px-2.5 py-1.5 rounded-lg border border-white/5">
                <span className="flex items-center gap-1 truncate max-w-[170px]">
                  <CreditCard className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span className="truncate">{acc?.name || 'Primary Account'}</span>
                </span>
                <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  sub.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' :
                  sub.status === 'Paused' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  <CheckCircle2 className="w-2.5 h-2.5" /> {sub.status || 'Active'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      </>
      )}

      {/* Modal Add / Edit Subscription */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#14161c] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-400" />
                {editingSub ? 'Edit Subscription' : 'Add New Recurring Subscription'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Service / Subscription Name</label>
                <input
                  type="text"
                  placeholder="e.g. Disney+, Gym Membership, Netflix"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Provider / Merchant Name</label>
                <input
                  type="text"
                  placeholder="e.g. Walt Disney Inc."
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Price / Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="14.99"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Billing Cycle</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as any)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div>

              {/* Linked Payment Account Dropdown */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Payment Account</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.bankName || acc.type}) - ${acc.balance.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Tech & Media">Tech & Media</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Fitness & Health">Fitness & Health</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Shopping & Services">Shopping & Services</option>
                    <option value="Software & SaaS">Software & SaaS</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Subscription Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Next Billing Date</label>
                <input
                  type="date"
                  value={nextBillingDate}
                  onChange={(e) => setNextBillingDate(e.target.value)}
                  className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-950/50"
                >
                  {editingSub ? 'Update Subscription' : 'Save Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

