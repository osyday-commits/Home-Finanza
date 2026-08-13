import React, { useState } from 'react';
import { X, Plus, DollarSign, Calendar, Tag, CreditCard, FileText, CheckCircle2, Upload, AlertCircle } from 'lucide-react';
import { Transaction, TransactionType, Frequency, Account, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../data/initialData';
import { CameraDocUploader } from './CameraDocUploader';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Partial<Transaction>) => void;
  accounts: Account[];
  initialData?: Partial<Transaction>;
  settings?: AppSettings;
}

export const CATEGORIES_WITH_SUBCATEGORIES: Record<string, string[]> = DEFAULT_SETTINGS.subcategories;

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  accounts,
  initialData,
  settings
}) => {
  if (!isOpen) return null;

  const activeCategories = settings?.categories || Object.keys(DEFAULT_SETTINGS.subcategories);
  const activeSubcategoriesMap = settings?.subcategories || DEFAULT_SETTINGS.subcategories;
  const activeMerchants = settings?.merchants || DEFAULT_SETTINGS.merchants;

  const [type, setType] = useState<TransactionType>(initialData?.type || 'Expense');
  const [amount, setAmount] = useState<string>(initialData?.amount ? String(initialData.amount) : '');
  const [provider, setProvider] = useState<string>(initialData?.provider || '');
  const [description, setDescription] = useState<string>(initialData?.description || '');
  const [category, setCategory] = useState<string>(
    initialData?.category || (initialData?.type === 'Income' ? 'Income' : activeCategories[0] || 'Everyday')
  );
  const [subcategory, setSubcategory] = useState<string>(
    initialData?.subcategory || (activeSubcategoriesMap[category]?.[0] || 'General')
  );
  const [date, setDate] = useState<string>(initialData?.date || new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState<string>(initialData?.accountId || accounts[0]?.id || 'acc-1');
  const [frequency, setFrequency] = useState<Frequency>(initialData?.frequency || 'One Time');
  const [notes, setNotes] = useState<string>(initialData?.notes || '');
  const [receiptUrl, setReceiptUrl] = useState<string>(initialData?.receiptUrl || '');
  const [error, setError] = useState<string>('');

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'Income') {
      setCategory('Income');
      setSubcategory('Salary');
    } else {
      setCategory('Everyday');
      setSubcategory('Groceries');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    if (!provider.trim()) {
      setError('Please specify a merchant, provider, or payer name.');
      return;
    }

    const d = new Date(date);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = months[d.getMonth()] || 'August';
    const yearNum = d.getFullYear() || 2026;

    onSave({
      id: initialData?.id || `TRX-${Math.floor(100 + Math.random() * 900)}`,
      type,
      amount: parseFloat(amount),
      provider,
      description: description || `${provider} (${type})`,
      category,
      subcategory: subcategory || CATEGORIES_WITH_SUBCATEGORIES[category]?.[0] || 'General',
      date,
      accountId,
      frequency,
      notes,
      receiptUrl,
      month: monthName,
      year: yearNum,
      isSubscription: frequency !== 'One Time',
      status: 'Cleared'
    });

    onClose();
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#14161c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#090a0c]">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${type === 'Income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {initialData?.id ? 'Edit Transaction' : 'Record Transaction / Income'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Type Selector Toggle */}
          <div className="grid grid-cols-3 gap-2 bg-[#090a0c] p-1.5 rounded-xl border border-white/5">
            {(['Expense', 'Income', 'Transfer'] as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  type === t
                    ? t === 'Income'
                      ? 'bg-emerald-600 text-white shadow'
                      : t === 'Expense'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'Income' ? '+ Income' : t === 'Expense' ? '- Expense' : '⇄ Transfer'}
              </button>
            ))}
          </div>

          {/* Amount & Provider */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Amount ($)
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#090a0c] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white font-serif text-base focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {type === 'Income' ? 'Payer / Source' : 'Merchant / Provider'}
              </label>
              <input
                type="text"
                list="merchants-list"
                placeholder={type === 'Income' ? 'e.g., Acme Corp' : "e.g., Texas's Route"}
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
                required
              />
              <datalist id="merchants-list">
                {activeMerchants.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Description & Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Description / Memo
              </label>
              <input
                type="text"
                placeholder="e.g., Dinner, bi-weekly salary"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Target Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.bankName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  const subs = activeSubcategoriesMap[e.target.value] || [];
                  setSubcategory(subs[0] || 'General');
                }}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
              >
                {activeCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Subcategory
              </label>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
              >
                {(activeSubcategoriesMap[category] || ['General']).map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Frequency / Recurrence
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="One Time">One Time</option>
                <option value="Weekly">Weekly</option>
                <option value="Bi-Weekly">Bi-Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
          </div>

          {/* Receipt Image / Proof Upload with Camera & Document support */}
          <CameraDocUploader
            label="Attach Receipt Photo / Proof or Upload Documents"
            value={receiptUrl}
            onChange={(base64) => setReceiptUrl(base64)}
            onClear={() => setReceiptUrl('')}
          />

          {/* Submit */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-950/50 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Record
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
