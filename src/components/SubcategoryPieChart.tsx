import React, { useState } from 'react';
import { PieChart as PieIcon, Calendar, Filter, Layers, DollarSign } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Transaction, AppSettings } from '../types';

interface SubcategoryPieChartProps {
  transactions: Transaction[];
  settings: AppSettings;
}

const PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', 
  '#8b5cf6', '#06b6d4', '#14b8a6', '#f43f5e', '#a855f7',
  '#84cc16', '#eab308', '#0284c7', '#d946ef', '#64748b'
];

export const SubcategoryPieChart: React.FC<SubcategoryPieChartProps> = ({
  transactions,
  settings
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('August');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [timeFilterMode, setTimeFilterMode] = useState<'month' | 'year' | 'all'>('month');

  // Filter transactions
  const filteredTx = transactions.filter((t) => {
    if (t.type !== 'Expense') return false;

    if (timeFilterMode === 'month') {
      if (selectedMonth !== 'All' && t.month !== selectedMonth) return false;
      if (selectedYear !== 'All' && String(t.year) !== selectedYear) return false;
    } else if (timeFilterMode === 'year') {
      if (selectedYear !== 'All' && String(t.year) !== selectedYear) return false;
    }

    if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;

    return true;
  });

  // Aggregate by subcategory
  const subcategorySpendMap: Record<string, { amount: number; count: number; category: string }> = {};
  let totalExpenseAmount = 0;

  filteredTx.forEach((t) => {
    const sub = t.subcategory || 'General';
    if (!subcategorySpendMap[sub]) {
      subcategorySpendMap[sub] = { amount: 0, count: 0, category: t.category };
    }
    subcategorySpendMap[sub].amount += t.amount;
    subcategorySpendMap[sub].count += 1;
    totalExpenseAmount += t.amount;
  });

  const chartData = Object.entries(subcategorySpendMap)
    .map(([name, data]) => ({
      name,
      category: data.category,
      count: data.count,
      value: parseFloat(data.amount.toFixed(2)),
      percentage: totalExpenseAmount > 0 ? ((data.amount / totalExpenseAmount) * 100).toFixed(1) : '0.0'
    }))
    .sort((a, b) => b.value - a.value);

  const monthsList = ['All', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const yearsList = ['All', '2026', '2025', '2024'];
  const categoryOptions = ['All', ...(settings.categories || [])];

  return (
    <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-6 shadow-xl">
      
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-indigo-400" />
            Subcategory Spending Breakdown
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Graphic pie distribution displaying expenses grouped by subcategory
          </p>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          
          {/* Time Mode Toggle */}
          <div className="flex items-center bg-[#090a0c] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setTimeFilterMode('month')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                timeFilterMode === 'month' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              By Month
            </button>
            <button
              onClick={() => setTimeFilterMode('year')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                timeFilterMode === 'year' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              By Year
            </button>
            <button
              onClick={() => setTimeFilterMode('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                timeFilterMode === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Month Selector */}
          {timeFilterMode === 'month' && (
            <div className="flex items-center gap-1.5 bg-[#090a0c] px-3 py-1.5 rounded-xl border border-white/10">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              >
                {monthsList.map((m) => (
                  <option key={m} value={m} className="bg-[#14161c] text-white">
                    {m === 'All' ? 'All Months' : m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Year Selector */}
          {timeFilterMode !== 'all' && (
            <div className="flex items-center gap-1.5 bg-[#090a0c] px-3 py-1.5 rounded-xl border border-white/10">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              >
                {yearsList.map((y) => (
                  <option key={y} value={y} className="bg-[#14161c] text-white">
                    {y === 'All' ? 'All Years' : y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category Selector */}
          <div className="flex items-center gap-1.5 bg-[#090a0c] px-3 py-1.5 rounded-xl border border-white/10">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat} className="bg-[#14161c] text-white">
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Total Subcategory Expense Summary Badge */}
      <div className="flex items-center justify-between bg-[#090a0c] p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="text-xs text-slate-300">
            Total Expense in Selected View:
          </span>
        </div>
        <div className="text-lg font-serif font-bold text-white">
          ${totalExpenseAmount.toFixed(2)}
        </div>
      </div>

      {/* Pie Chart Visualizer */}
      {chartData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          <div className="lg:col-span-7 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={105}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  labelLine={false}
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PALETTE[index % PALETTE.length]}
                      stroke="#090a0c"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Spent']}
                  contentStyle={{
                    backgroundColor: '#090a0c',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Subcategory Legend & List */}
          <div className="lg:col-span-5 space-y-2 max-h-72 overflow-y-auto pr-1">
            {chartData.map((item, idx) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#090a0c] border border-white/5 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                  />
                  <div>
                    <div className="font-semibold text-white">{item.name}</div>
                    <div className="text-[10px] text-slate-500">{item.category} • {item.count} items</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-serif font-bold text-white">${item.value.toFixed(2)}</div>
                  <div className="text-[10px] text-indigo-400 font-medium">{item.percentage}%</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      ) : (
        <div className="p-8 text-center bg-[#090a0c] rounded-xl border border-white/5 text-slate-400 text-xs">
          No subcategory expenses recorded for the selected time period or filters.
        </div>
      )}

    </div>
  );
};
