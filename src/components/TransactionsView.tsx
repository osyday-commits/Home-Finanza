import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Edit3, 
  FileText, 
  Image as ImageIcon, 
  Check, 
  ArrowUpDown,
  X
} from 'lucide-react';
import { Transaction, Account, TransactionType } from '../types';

interface TransactionsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  onAddTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onImportCSV: (file: File) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  accounts,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onImportCSV
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | TransactionType>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [accountFilter, setAccountFilter] = useState<string>('All');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  // Filter transactions
  const filtered = transactions.filter((t) => {
    const matchesSearch =
      t.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'All' || t.type === typeFilter;
    const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
    const matchesAccount = accountFilter === 'All' || t.accountId === accountFilter;

    return matchesSearch && matchesType && matchesCategory && matchesAccount;
  });

  // Export CSV matching user's exact schema
  const handleExportCSV = () => {
    const headers = [
      'Transaction ID',
      'Date',
      'Type',
      'Category',
      'Subcategory',
      'Description',
      'Amount',
      'Provider',
      'Frequency',
      'Receipt',
      'Month',
      'Year',
      'Notes'
    ];

    const rows = transactions.map((t) => [
      t.id,
      t.date,
      t.type,
      t.category,
      t.subcategory,
      `"${t.description.replace(/"/g, '""')}"`,
      `$${t.amount.toFixed(2)}`,
      `"${t.provider.replace(/"/g, '""')}"`,
      t.frequency,
      t.receiptUrl || '',
      t.month,
      t.year,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Home_Finance_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportCSV(file);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Bar Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#14161c] p-5 rounded-2xl border border-white/5 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Transactions & Financial Statements Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track expenses, incomes, and statements with manual adjustment capabilities
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* CSV Import */}
          <label className="px-3.5 py-2 rounded-xl bg-[#090a0c] hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors border border-white/10">
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Import CSV</span>
            <input type="file" accept=".csv" onChange={handleCSVFileChange} className="hidden" />
          </label>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-[#090a0c] hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-colors border border-white/10"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Export CSV</span>
          </button>

          {/* Record Transaction Button */}
          <button
            onClick={onAddTransaction}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-950/50 border border-indigo-400/30"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Income / Expense</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search provider, notes, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#14161c] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="bg-[#14161c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="All">All Types (Expenses & Incomes)</option>
          <option value="Expense">Expenses Only (-)</option>
          <option value="Income">Incomes Only (+)</option>
          <option value="Transfer">Transfers (⇄)</option>
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-[#14161c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="All">All Categories</option>
          <option value="Everyday">Everyday</option>
          <option value="Housing">Housing</option>
          <option value="Tech & Media">Tech & Media</option>
          <option value="Transportation">Transportation</option>
          <option value="Healthcare">Healthcare</option>
          <option value="Income">Income</option>
        </select>

        {/* Account Filter */}
        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className="bg-[#14161c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
        >
          <option value="All">All Accounts</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Transactions Table */}
      <div className="bg-[#14161c] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#090a0c] border-b border-white/5 text-slate-500 uppercase font-medium text-[10px] tracking-wider">
                <th className="py-3.5 px-4">TRX ID</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Provider / Merchant</th>
                <th className="py-3.5 px-4">Category / Subcategory</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4">Frequency</th>
                <th className="py-3.5 px-4 text-center">Receipt</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-500">
                    No matching transactions found. Try adjusting filters or click '+ Add Income / Expense'.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const account = accounts.find((a) => a.id === t.accountId);
                  return (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                        {t.id}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-300">
                        {t.date}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-medium text-[10px] ${
                          t.type === 'Income'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white">
                        {t.provider}
                        {account && (
                          <span className="block text-[10px] font-normal text-slate-500">
                            {account.name}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-300">{t.category}</div>
                        <div className="text-[10px] text-slate-500">{t.subcategory}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 max-w-[180px] truncate" title={t.description}>
                        {t.description}
                      </td>
                      <td className={`py-3.5 px-4 text-right font-serif text-base font-medium ${
                        t.type === 'Income' ? 'text-emerald-400' : 'text-white'
                      }`}>
                        {t.type === 'Income' ? '+' : '-'}${t.amount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {t.frequency}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {t.receiptUrl ? (
                          <button
                            onClick={() => setSelectedReceipt(t.receiptUrl!)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            title="View Receipt Photo"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditTransaction(t)}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                            title="Edit Record"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteTransaction(t.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal Preview */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 relative">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" /> Attached Receipt Proof
              </h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-800">
              <img src={selectedReceipt} alt="Receipt Proof" className="w-full object-contain" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
