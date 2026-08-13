import React, { useState } from 'react';
import { 
  Target, 
  PiggyBank, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  X,
  Sparkles,
  Edit3,
  Trash2,
  Sliders,
  Check
} from 'lucide-react';
import { BudgetCategory, SavingsGoal, Transaction } from '../types';

interface BudgetsGoalsViewProps {
  budgets: BudgetCategory[];
  savingsGoals: SavingsGoal[];
  transactions: Transaction[];
  onAddBudget: (b: BudgetCategory) => void;
  onUpdateBudget?: (b: BudgetCategory) => void;
  onDeleteBudget?: (category: string) => void;
  onAddGoal: (g: SavingsGoal) => void;
}

const COLOR_OPTIONS = [
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Teal', value: '#14b8a6' }
];

const CATEGORY_SUGGESTIONS = [
  'Everyday',
  'Housing',
  'Tech & Media',
  'Transportation',
  'Healthcare',
  'Entertainment',
  'Utilities',
  'Dining & Restaurants',
  'Shopping',
  'Travel & Vacation',
  'Education',
  'Children & Family',
  'Other'
];

export const BudgetsGoalsView: React.FC<BudgetsGoalsViewProps> = ({
  budgets,
  savingsGoals,
  transactions,
  onAddBudget,
  onUpdateBudget,
  onDeleteBudget,
  onAddGoal
}) => {
  // Goal Modal State
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');
  const [goalDate, setGoalDate] = useState('2027-06-01');
  const [goalMonthly, setGoalMonthly] = useState('');

  // Budget Category Allocation Modal State
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [budCategory, setBudCategory] = useState('Everyday');
  const [customCategory, setCustomCategory] = useState('');
  const [budLimit, setBudLimit] = useState('');
  const [budColor, setBudColor] = useState('#6366f1');

  // Inline Quick Limit Edit State
  const [inlineEditingCat, setInlineEditingCat] = useState<string | null>(null);
  const [inlineLimitVal, setInlineLimitVal] = useState('');

  // Calculate actual spending per category for current month
  const categorySpendMap: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'Expense')
    .forEach((t) => {
      categorySpendMap[t.category] = (categorySpendMap[t.category] || 0) + t.amount;
    });

  // Calculate total allocated vs total spent
  const totalAllocatedBudget = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
  const totalSpentInBudgets = budgets.reduce((sum, b) => sum + (categorySpendMap[b.category] || 0), 0);

  const handleOpenAddBudget = () => {
    setEditingCategory(null);
    setBudCategory('Utilities');
    setCustomCategory('');
    setBudLimit('500');
    setBudColor('#6366f1');
    setIsBudgetModalOpen(true);
  };

  const handleOpenEditBudget = (b: BudgetCategory) => {
    setEditingCategory(b.category);
    setBudCategory(b.category);
    setCustomCategory('');
    setBudLimit(String(b.monthlyLimit));
    setBudColor(b.color || '#6366f1');
    setIsBudgetModalOpen(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategoryName = (budCategory === 'Custom' ? customCategory : budCategory).trim();
    if (!finalCategoryName || !budLimit || isNaN(Number(budLimit))) return;

    const numericLimit = parseFloat(budLimit);

    const budgetPayload: BudgetCategory = {
      category: finalCategoryName,
      monthlyLimit: numericLimit,
      color: budColor
    };

    if (editingCategory && onUpdateBudget) {
      onUpdateBudget(budgetPayload);
    } else {
      onAddBudget(budgetPayload);
    }

    setIsBudgetModalOpen(false);
  };

  const handleStartInlineEdit = (b: BudgetCategory) => {
    setInlineEditingCat(b.category);
    setInlineLimitVal(String(b.monthlyLimit));
  };

  const handleSaveInlineEdit = (category: string, color: string) => {
    if (!inlineLimitVal || isNaN(Number(inlineLimitVal))) {
      setInlineEditingCat(null);
      return;
    }
    const numeric = parseFloat(inlineLimitVal);
    const payload: BudgetCategory = {
      category,
      monthlyLimit: numeric,
      color
    };

    if (onUpdateBudget) {
      onUpdateBudget(payload);
    } else {
      onAddBudget(payload);
    }
    setInlineEditingCat(null);
  };

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle || !goalTarget) return;

    onAddGoal({
      id: `goal-${Math.floor(100 + Math.random() * 900)}`,
      title: goalTitle,
      targetAmount: parseFloat(goalTarget),
      currentSaved: parseFloat(goalCurrent || '0'),
      targetDate: goalDate,
      category: 'General',
      monthlyContribution: parseFloat(goalMonthly || '200'),
      color: '#10b981'
    });

    setGoalTitle('');
    setGoalTarget('');
    setIsGoalModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            Visual Budgeting & Savings Goal Tracker
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Automated monthly expense limits and progress tracking toward your financial targets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddBudget}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950/50 border border-indigo-400/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Set Budget Limit</span>
          </button>

          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/50 border border-emerald-400/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Goal</span>
          </button>
        </div>
      </div>

      {/* Category Budget Progress Bars */}
      <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-6 shadow-xl">
        
        {/* Header & Stats summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Monthly Category Budget Allocations
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Click any category limit or edit button to update monthly budget targets</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
            <div className="bg-[#090a0c] px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
              <span className="text-slate-400">Total Allocated:</span>
              <span className="font-serif text-indigo-400 font-bold">${totalAllocatedBudget.toFixed(2)}</span>
            </div>
            <div className="bg-[#090a0c] px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
              <span className="text-slate-400">Spent:</span>
              <span className="font-serif text-amber-400 font-bold">${totalSpentInBudgets.toFixed(2)}</span>
            </div>
            <div className="bg-[#090a0c] px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
              <span className="text-slate-400">Remaining:</span>
              <span className={`font-serif font-bold ${
                totalAllocatedBudget - totalSpentInBudgets >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                ${(totalAllocatedBudget - totalSpentInBudgets).toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleOpenAddBudget}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 flex items-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Allocation</span>
            </button>
          </div>
        </div>

        {/* Budget Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {budgets.map((b) => {
            const spent = categorySpendMap[b.category] || 0;
            const pct = b.monthlyLimit > 0 ? Math.min(Math.round((spent / b.monthlyLimit) * 100), 100) : 100;
            const isOver = spent > b.monthlyLimit;
            const isWarning = pct >= 80 && !isOver;
            const isEditingThis = inlineEditingCat === b.category;

            return (
              <div key={b.category} className="bg-[#090a0c] p-4 rounded-xl border border-white/5 space-y-3 relative group">
                
                {/* Card Header: Title + Controls */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color || '#6366f1' }} />
                    <span className="text-sm font-bold text-white">{b.category}</span>
                  </span>

                  {/* Limit Display & Quick Actions */}
                  <div className="flex items-center gap-2">
                    {isEditingThis ? (
                      <div className="flex items-center gap-1 bg-[#14161c] p-1 rounded-lg border border-indigo-500">
                        <span className="text-slate-400 font-serif">$</span>
                        <input
                          type="number"
                          step="10"
                          value={inlineLimitVal}
                          onChange={(e) => setInlineLimitVal(e.target.value)}
                          className="w-20 bg-transparent text-white font-serif font-bold text-xs focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInlineEdit(b.category, b.color);
                            if (e.key === 'Escape') setInlineEditingCat(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveInlineEdit(b.category, b.color)}
                          className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-500"
                          title="Save Limit"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setInlineEditingCat(null)}
                          className="p-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                          title="Cancel"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStartInlineEdit(b)}
                          className="font-serif text-slate-200 font-bold text-sm hover:text-indigo-300 transition-colors bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-lg border border-white/5"
                          title="Click to quick-edit monthly budget limit"
                        >
                          ${spent.toFixed(2)} / <span className="text-indigo-400">${b.monthlyLimit.toFixed(2)}</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditBudget(b)}
                          className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-colors"
                          title="Modify Budget Settings"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {onDeleteBudget && (
                          <button
                            onClick={() => {
                              if (confirm(`Remove budget allocation limit for "${b.category}"?`)) {
                                onDeleteBudget(b.category);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors"
                            title="Delete Budget Allocation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#14161c] h-2.5 rounded-full overflow-hidden border border-white/5">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${pct}%`, backgroundColor: !isOver && !isWarning ? b.color : undefined }}
                  />
                </div>

                {/* Progress Status Footer */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                  <span className="font-medium">{pct}% utilized</span>
                  {isOver ? (
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Over limit by ${(spent - b.monthlyLimit).toFixed(2)}
                    </span>
                  ) : isWarning ? (
                    <span className="text-amber-400 font-semibold">Nearing 80% limit</span>
                  ) : (
                    <span className="text-emerald-400 font-semibold">${(b.monthlyLimit - spent).toFixed(2)} remaining</span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Savings Goals Tracker */}
      <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-6 shadow-xl">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-indigo-400" /> Savings Goals Progress
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Comparing actual saved contributions against target dates</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {savingsGoals.map((goal) => {
            const pct = Math.min(Math.round((goal.currentSaved / goal.targetAmount) * 100), 100);

            return (
              <div key={goal.id} className="bg-[#090a0c] p-5 rounded-2xl border border-white/5 space-y-4 relative">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-medium text-slate-500 tracking-[0.2em]">
                      {goal.category}
                    </span>
                    <h4 className="font-semibold text-white text-sm mt-0.5">{goal.title}</h4>
                  </div>
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <PiggyBank className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400">Saved so far</div>
                  <div className="text-2xl font-serif text-emerald-400 tracking-tight">
                    ${goal.currentSaved.toLocaleString()}
                    <span className="text-xs text-slate-400 font-sans ml-1">
                      / ${goal.targetAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full bg-[#14161c] h-2 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{pct}% completed</span>
                    <span>Target: {goal.targetDate}</span>
                  </div>
                </div>

                <div className="bg-[#14161c] p-2.5 rounded-xl border border-white/5 text-[11px] text-slate-300 flex justify-between">
                  <span>Monthly Contribution:</span>
                  <span className="font-serif text-emerald-400 font-medium">${goal.monthlyContribution}/mo</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Add or Edit Category Budget */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#14161c] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                {editingCategory ? `Modify "${editingCategory}" Budget` : 'Set Monthly Category Budget'}
              </h3>
              <button onClick={() => setIsBudgetModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Expense Category</label>
                <select
                  value={budCategory}
                  onChange={(e) => setBudCategory(e.target.value)}
                  disabled={Boolean(editingCategory)}
                  className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none disabled:opacity-60"
                >
                  {CATEGORY_SUGGESTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="Custom">+ Custom Category...</option>
                </select>
              </div>

              {budCategory === 'Custom' && !editingCategory && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Custom Category Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Subscriptions, Pet Care"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Monthly Budget Limit ($)</label>
                <input
                  type="number"
                  step="25"
                  placeholder="e.g. 800"
                  value={budLimit}
                  onChange={(e) => setBudLimit(e.target.value)}
                  className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Badge / Color Theme</label>
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setBudColor(c.value)}
                      className={`w-7 h-7 rounded-lg border-2 transition-all flex items-center justify-center ${
                        budColor === c.value ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    >
                      {budColor === c.value && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-950/50"
                >
                  {editingCategory ? 'Update Budget' : 'Save Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Create Goal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#14161c] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white">Create New Savings Goal</h3>
              <button onClick={() => setIsGoalModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGoalSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Goal Title</label>
                <input
                  type="text"
                  placeholder="e.g. House Down Payment"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Amount ($)</label>
                  <input
                    type="number"
                    placeholder="10000"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Already Saved ($)</label>
                  <input
                    type="number"
                    placeholder="2000"
                    value={goalCurrent}
                    onChange={(e) => setGoalCurrent(e.target.value)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Date</label>
                  <input
                    type="date"
                    value={goalDate}
                    onChange={(e) => setGoalDate(e.target.value)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Monthly Deposit ($)</label>
                  <input
                    type="number"
                    placeholder="500"
                    value={goalMonthly}
                    onChange={(e) => setGoalMonthly(e.target.value)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-950/50"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

