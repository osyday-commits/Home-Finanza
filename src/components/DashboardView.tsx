import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Sparkles, 
  RefreshCw, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  PieChart as PieIcon, 
  BarChart3, 
  Zap,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { Transaction, Account, BudgetCategory, SavingsGoal, Subscription, AISpendingInsight, AppSettings, BankStatement } from '../types';
import { DEFAULT_SETTINGS } from '../data/initialData';
import { SubcategoryPieChart } from './SubcategoryPieChart';
import { MonthlySpendingD3Summary } from './MonthlySpendingD3Summary';
import { DashboardStatementsAnalysis } from './DashboardStatementsAnalysis';

interface DashboardViewProps {
  transactions: Transaction[];
  accounts: Account[];
  statements?: BankStatement[];
  budgets: BudgetCategory[];
  subscriptions: Subscription[];
  savingsGoals: SavingsGoal[];
  onOpenAddModal: () => void;
  onNavigateToScanner: () => void;
  onNavigateToStatements?: () => void;
  settings?: AppSettings;
}

const CATEGORY_COLORS: Record<string, string> = {
  Everyday: '#f59e0b',
  Housing: '#3b82f6',
  'Tech & Media': '#8b5cf6',
  Transportation: '#10b981',
  Healthcare: '#ec4899',
  Entertainment: '#06b6d4',
  Income: '#10b981',
  Other: '#64748b'
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  accounts,
  statements = [],
  budgets,
  subscriptions,
  savingsGoals,
  onOpenAddModal,
  onNavigateToScanner,
  onNavigateToStatements,
  settings
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('August');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [aiInsight, setAiInsight] = useState<AISpendingInsight | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>('');

  // Calculate Key Financial Metrics
  const filteredTx = transactions.filter((t) => t.month === selectedMonth && t.year === selectedYear);

  const totalIncome = filteredTx
    .filter((t) => t.type === 'Income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTx
    .filter((t) => t.type === 'Expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0.0';

  const totalAccountsBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const totalMonthlySubscriptions = subscriptions
    .filter((s) => s.status === 'Active')
    .reduce((sum, s) => sum + (s.billingCycle === 'Monthly' ? s.amount : s.amount / 12), 0);

  // Category Spending Filter States
  const [catTimeFilterMode, setCatTimeFilterMode] = useState<'month' | 'year' | 'all'>('month');
  const [catSelectedMonth, setCatSelectedMonth] = useState<string>('August');
  const [catSelectedYear, setCatSelectedYear] = useState<string>('2026');

  // Chart Data 1: Category Expenses Breakdown with independent time filters
  const catFilteredTx = transactions.filter((t) => {
    if (t.type !== 'Expense') return false;

    if (catTimeFilterMode === 'month') {
      if (catSelectedMonth !== 'All' && t.month !== catSelectedMonth) return false;
      if (catSelectedYear !== 'All' && String(t.year) !== catSelectedYear) return false;
    } else if (catTimeFilterMode === 'year') {
      if (catSelectedYear !== 'All' && String(t.year) !== catSelectedYear) return false;
    }

    return true;
  });

  const categoryExpenses: Record<string, number> = {};
  let totalCatExpenses = 0;
  catFilteredTx.forEach((t) => {
    categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
    totalCatExpenses += t.amount;
  });

  const pieChartData = Object.entries(categoryExpenses)
    .map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
      percentage: totalCatExpenses > 0 ? ((value / totalCatExpenses) * 100).toFixed(1) : '0.0'
    }))
    .sort((a, b) => b.value - a.value);

  // Chart Data 2: Compare Monthly Expenses to Projected Savings Goals over Time
  const monthlyComparisonData = [
    { month: 'May', Income: 6500, Expense: 3800, NetSavings: 2700, ProjectedTarget: 2500 },
    { month: 'Jun', Income: 6800, Expense: 4100, NetSavings: 2700, ProjectedTarget: 2500 },
    { month: 'Jul', Income: 6900, Expense: 3450, NetSavings: 3450, ProjectedTarget: 2500 },
    { month: 'Aug (Current)', Income: totalIncome || 6900, Expense: totalExpense || 1610, NetSavings: netSavings || 5290, ProjectedTarget: 2500 }
  ];

  // Chart Data 3: Daily Spending Trend for Current Month
  const dailySpendMap: Record<string, number> = {};
  filteredTx
    .filter((t) => t.type === 'Expense')
    .forEach((t) => {
      dailySpendMap[t.date] = (dailySpendMap[t.date] || 0) + t.amount;
    });

  const trendData = Object.entries(dailySpendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({
      date: date.substring(5),
      Spend: parseFloat(amount.toFixed(2))
    }));

  // AI Spending Insights Generator
  const generateAiReport = async () => {
    setIsGeneratingAi(true);
    setAiError('');
    try {
      const res = await fetch('/api/ai/spending-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: filteredTx,
          accounts,
          budgets,
          savingsGoals
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setAiInsight(json.data);
      } else {
        throw new Error(json.error || 'Failed to generate AI insights.');
      }
    } catch (err: any) {
      setAiError(err.message || 'Error generating insights.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#14161c] p-5 rounded-2xl border border-white/5 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Financial Health & Intelligence
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time balance tracking across all linked accounts with automated AI reports
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:border-indigo-500 focus:outline-none"
          >
            {['July', 'August', 'September', 'October', 'November', 'December'].map((m) => (
              <option key={m} value={m}>{m} 2026</option>
            ))}
          </select>

          <button
            onClick={generateAiReport}
            disabled={isGeneratingAi}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-indigo-950/50 border border-indigo-400/30 transition-all active:scale-95"
          >
            <Sparkles className={`w-4 h-4 ${isGeneratingAi ? 'animate-spin' : ''}`} />
            {isGeneratingAi ? 'Analyzing Data...' : 'Generate AI Report'}
          </button>
        </div>
      </div>

      {/* 4 Primary Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Net Worth / Balance */}
        <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors shadow-lg">
          <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase tracking-[0.2em] font-medium mb-1">
            <span>Total Net Worth</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-serif text-white tracking-tight">
            ${totalAccountsBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Across 3 linked bank accounts
          </div>
        </div>

        {/* Monthly Income */}
        <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors shadow-lg">
          <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase tracking-[0.2em] font-medium mb-1">
            <span>{selectedMonth} Total Income</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-serif text-emerald-400 tracking-tight">
            +${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Payroll & side income streams
          </div>
        </div>

        {/* Monthly Expenses */}
        <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors shadow-lg">
          <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase tracking-[0.2em] font-medium mb-1">
            <span>{selectedMonth} Spending</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-serif text-rose-400 tracking-tight">
            -${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Categorized automatically
          </div>
        </div>

        {/* Net Savings & Savings Rate */}
        <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors shadow-lg">
          <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase tracking-[0.2em] font-medium mb-1">
            <span>Projected Savings</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-serif text-white tracking-tight flex items-baseline gap-2">
            ${netSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-sans">
              {savingsRate}%
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Target savings goal: $2,500/mo
          </div>
        </div>

      </div>

      {/* AI Financial Intelligence Report Widget */}
      {(aiInsight || isGeneratingAi || aiError) && (
        <div className="bg-[#14161c] p-6 rounded-2xl border border-indigo-500/20 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <Sparkles className="w-5 h-5 animate-pulse text-indigo-400" />
              <span>Aura AI Financial Intelligence & Trend Report</span>
            </div>
            {aiInsight && (
              <span className="text-xs text-slate-500 font-mono">
                Updated just now
              </span>
            )}
          </div>

          {isGeneratingAi && (
            <div className="py-8 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">
                Gemini AI is analyzing transactions, category balances, and projected savings goals...
              </p>
            </div>
          )}

          {aiError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {aiError}
            </div>
          )}

          {aiInsight && !isGeneratingAi && (
            <div className="space-y-4 text-xs sm:text-sm">
              <p className="text-slate-300 leading-relaxed bg-[#090a0c] p-4 rounded-xl border border-white/5">
                {aiInsight.summary}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recommendations */}
                <div className="bg-[#090a0c] p-4 rounded-xl border border-white/5 space-y-2">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Actionable Recommendations
                  </h4>
                  <ul className="space-y-2 text-slate-300">
                    {aiInsight.recommendations?.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-indigo-400 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Savings & Anomalies */}
                <div className="bg-[#090a0c] p-4 rounded-xl border border-white/5 space-y-2">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-indigo-400" /> Savings Goals & Anomalies
                  </h4>
                  <p className="text-slate-300">
                    <strong className="text-white">Projected vs Goals:</strong> {aiInsight.projectedSavingsVsGoal}
                  </p>
                  {aiInsight.anomalies?.length > 0 && (
                    <div className="pt-2 text-amber-300/90 text-xs">
                      <strong>Noted Spike:</strong> {aiInsight.anomalies[0]}
                    </div>
                  )}
                  <div className="mt-2 pt-2 border-t border-white/5 text-emerald-400 font-semibold text-xs">
                    Potential Monthly Savings: +${aiInsight.potentialSavingsMonthly || 150}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Graphical Reports Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Report 1: Monthly Expenses vs Projected Savings Goals */}
        <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-white flex items-center gap-2 uppercase">
                <BarChart3 className="w-4 h-4 text-indigo-400" /> Expenses vs Savings Target
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparing monthly income, expenses, and net savings against targets
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090a0c', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="NetSavings" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Report 2: Category Expense Distribution */}
        <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-white flex items-center gap-2 uppercase">
                <PieIcon className="w-4 h-4 text-indigo-400" /> Spending By Category
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Expense distribution (${totalCatExpenses.toFixed(2)})
              </p>
            </div>

            {/* Time Filter Controls for Category Spending */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              
              {/* Time Mode Toggle */}
              <div className="flex items-center bg-[#090a0c] p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setCatTimeFilterMode('month')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    catTimeFilterMode === 'month' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  By Month
                </button>
                <button
                  onClick={() => setCatTimeFilterMode('year')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    catTimeFilterMode === 'year' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  By Year
                </button>
                <button
                  onClick={() => setCatTimeFilterMode('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    catTimeFilterMode === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Time
                </button>
              </div>

              {/* Month Selector */}
              {catTimeFilterMode === 'month' && (
                <div className="flex items-center gap-1 bg-[#090a0c] px-2.5 py-1 rounded-xl border border-white/10">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <select
                    value={catSelectedMonth}
                    onChange={(e) => setCatSelectedMonth(e.target.value)}
                    className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
                  >
                    {['All', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m) => (
                      <option key={m} value={m} className="bg-[#14161c] text-white">
                        {m === 'All' ? 'All Months' : m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Year Selector */}
              {catTimeFilterMode !== 'all' && (
                <div className="flex items-center gap-1 bg-[#090a0c] px-2.5 py-1 rounded-xl border border-white/10">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <select
                    value={catSelectedYear}
                    onChange={(e) => setCatSelectedYear(e.target.value)}
                    className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
                  >
                    {['All', '2026', '2025', '2024'].map((y) => (
                      <option key={y} value={y} className="bg-[#14161c] text-white">
                        {y === 'All' ? 'All Years' : y}
                      </option>
                    ))}
                  </select>
                </div>
              )}

            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 items-center h-64">
            <div className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData.length > 0 ? pieChartData : [{ name: 'No Data', value: 1 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Spent']}
                    contentStyle={{ backgroundColor: '#090a0c', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category Legend */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
              {pieChartData.length > 0 ? (
                pieChartData.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat.name] || '#64748b' }} />
                      <span className="text-slate-300 font-medium">{cat.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-serif font-semibold">${cat.value.toFixed(2)}</span>
                      <span className="text-[10px] text-indigo-400 font-medium ml-1.5">({cat.percentage}%)</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 py-4 text-center">No category spending for selected period.</div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* D3 Monthly Spending Summary & Category Visualization Section */}
      <MonthlySpendingD3Summary 
        transactions={transactions} 
        accounts={accounts}
        budgets={budgets} 
        settings={settings || DEFAULT_SETTINGS}
        defaultMonth={selectedMonth}
        defaultYear={selectedYear}
      />

      {/* Subcategory Graphic Pie Chart Section */}
      <SubcategoryPieChart transactions={transactions} settings={settings || DEFAULT_SETTINGS} />

      {/* Statements Intelligence Analysis: 3 Cards, Account Holder In vs Out Bar Chart, Interactive Pie with Drill-down */}
      <DashboardStatementsAnalysis 
        statements={statements} 
        accounts={accounts} 
        onNavigateToStatements={onNavigateToStatements} 
      />

      {/* Recent Transactions Table */}
      <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white uppercase">Recent Intelligence Feed</h3>
            <p className="text-xs text-slate-400">Latest expenses, incomes, and automated AI entries</p>
          </div>
          <button
            onClick={onOpenAddModal}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold uppercase tracking-wider"
          >
            + Add Transaction
          </button>
        </div>

        <div className="divide-y divide-white/5 overflow-x-auto">
          {filteredTx.slice(0, 6).map((tx) => (
            <div key={tx.id} className="py-3 flex items-center justify-between hover:bg-white/[0.02] px-2 rounded-xl transition-colors min-w-[500px]">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-serif text-sm ${
                  tx.type === 'Income'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-[#090a0c] text-slate-300 border border-white/10'
                }`}>
                  {tx.provider.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium text-white flex items-center gap-2">
                    {tx.provider}
                    {tx.isSubscription && (
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">
                        SUBSCRIPTION
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{tx.date}</span>
                    <span>•</span>
                    <span className="text-slate-400">{tx.category} / {tx.subcategory}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className={`font-serif text-base font-medium ${
                  tx.type === 'Income' ? 'text-emerald-400' : 'text-white'
                }`}>
                  {tx.type === 'Income' ? '+' : '-'}${tx.amount.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 capitalize">{tx.frequency}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
