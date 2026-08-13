import React, { useState } from 'react';
import { 
  Landmark, 
  CreditCard, 
  Zap, 
  Plus, 
  ShieldCheck, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  X,
  FileSpreadsheet
} from 'lucide-react';
import { Account, Transaction } from '../types';

interface AccountsViewProps {
  accounts: Account[];
  transactions: Transaction[];
  onAddAccount: (acc: Account) => void;
  onBankSync: () => void;
  isSyncingBank: boolean;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  transactions,
  onAddAccount,
  onBankSync,
  isSyncingBank
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [type, setType] = useState<'Checking' | 'Savings' | 'Credit Card' | 'Investment'>('Checking');
  const [balance, setBalance] = useState('');
  const [accountNumber, setAccountNumber] = useState('•••• 1234');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !balance) return;

    onAddAccount({
      id: `acc-${Math.floor(100 + Math.random() * 900)}`,
      name,
      bankName: bankName || name,
      type,
      balance: parseFloat(balance),
      accountNumber,
      color: type === 'Savings' ? '#10b981' : type === 'Credit Card' ? '#8b5cf6' : '#3b82f6',
      lastSynced: new Date().toISOString(),
      isLinked: true
    });

    setName('');
    setBalance('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Landmark className="w-5 h-5 text-indigo-400" />
            Bank Accounts & Real-Time Live Feed Integration
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Bank-grade encrypted account aggregation with live transaction updates
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBankSync}
            disabled={isSyncingBank}
            className="px-4 py-2 rounded-xl bg-[#090a0c] hover:bg-slate-800 text-slate-300 border border-white/10 text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <Zap className={`w-4 h-4 text-amber-400 ${isSyncingBank ? 'animate-spin' : ''}`} />
            <span>{isSyncingBank ? 'Syncing Bank Feed...' : 'Sync Live Bank Feed'}</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-950/50 border border-indigo-400/30"
          >
            <Plus className="w-4 h-4" />
            <span>Link New Account</span>
          </button>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {accounts.map((acc) => {
          const accTx = transactions.filter((t) => t.accountId === acc.id);
          const accIncome = accTx.filter((t) => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
          const accExpense = accTx.filter((t) => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);

          return (
            <div
              key={acc.id}
              className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-4 relative overflow-hidden shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                    {acc.type} • {acc.bankName}
                  </span>
                  <h3 className="text-lg font-semibold text-white">{acc.name}</h3>
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md border border-white/10"
                  style={{ backgroundColor: acc.color }}
                >
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400">Current Balance</div>
                <div className={`text-3xl font-serif tracking-tight ${
                  acc.balance < 0 ? 'text-rose-400' : 'text-white'
                }`}>
                  ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-1">
                  Acc No: {acc.accountNumber}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                <div className="bg-[#090a0c] p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-500 text-[10px] block">Inflow</span>
                  <span className="text-emerald-400 font-serif font-medium text-sm">+${accIncome.toFixed(2)}</span>
                </div>
                <div className="bg-[#090a0c] p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-500 text-[10px] block">Outflow</span>
                  <span className="text-rose-400 font-serif font-medium text-sm">-${accExpense.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="w-3 h-3" /> Live Encrypted Feed
                </span>
                <span>Last Synced: Today</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Account Statements Summary Table */}
      <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-4 shadow-xl">
        <h3 className="text-sm font-semibold tracking-wide text-white flex items-center gap-2 uppercase">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Account Statements & Ledger Totals
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#090a0c] border-b border-white/5 text-slate-500 uppercase font-medium text-[10px]">
                <th className="py-3 px-4">Account Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Bank</th>
                <th className="py-3 px-4 text-right">Transactions Count</th>
                <th className="py-3 px-4 text-right">Current Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {accounts.map((acc) => {
                const count = transactions.filter((t) => t.accountId === acc.id).length;
                return (
                  <tr key={acc.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 font-semibold text-white">{acc.name}</td>
                    <td className="py-3.5 px-4 text-slate-300">{acc.type}</td>
                    <td className="py-3.5 px-4 text-slate-400">{acc.bankName}</td>
                    <td className="py-3.5 px-4 text-right text-slate-300">{count} items</td>
                    <td className="py-3.5 px-4 text-right font-serif text-base font-medium text-white">
                      ${acc.balance.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                        Active & Synced
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Link Account */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Link New Bank Account</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Account Name</label>
                <input
                  type="text"
                  placeholder="e.g. Travel Checking"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Bank Institution Name</label>
                <input
                  type="text"
                  placeholder="e.g. Bank of America"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Account Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Checking">Checking</option>
                    <option value="Savings">Savings</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Investment">Investment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Opening Balance ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="1000.00"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium"
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
