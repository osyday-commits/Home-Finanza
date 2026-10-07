import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  ArrowUpRight, 
  ArrowDownRight, 
  User, 
  Landmark, 
  Sparkles, 
  ChevronRight, 
  PieChart as PieIcon, 
  BarChart3, 
  Filter, 
  Layers, 
  DollarSign, 
  Search, 
  X,
  CreditCard,
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
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { BankStatement, Account, StatementItem } from '../types';

interface DashboardStatementsAnalysisProps {
  statements: BankStatement[];
  accounts: Account[];
  onNavigateToStatements?: () => void;
}

// Harmonious palette: greens/teals for IN, warm rose/orange/purple for OUT
const SLICE_COLORS: Record<string, string> = {
  // Common holders
  'Alex Miller (IN)': '#10b981',
  'Alex Miller (OUT)': '#f43f5e',
  'Sarah Miller (IN)': '#06b6d4',
  'Sarah Miller (OUT)': '#f97316',
  'Alex & Sarah Miller (IN)': '#3b82f6',
  'Alex & Sarah Miller (OUT)': '#ec4899',
  'Primary (IN)': '#14b8a6',
  'Primary (OUT)': '#e11d48'
};

const FALLBACK_IN_COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#14b8a6', '#84cc16'];
const FALLBACK_OUT_COLORS = ['#f43f5e', '#f97316', '#ec4899', '#e11d48', '#a855f7'];

export const DashboardStatementsAnalysis: React.FC<DashboardStatementsAnalysisProps> = ({
  statements,
  accounts,
  onNavigateToStatements
}) => {
  const [pieFilter, setPieFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [drilledSlice, setDrilledSlice] = useState<{
    holder: string;
    flowType: 'Inflow' | 'Outflow' | 'All';
    color: string;
  } | null>(null);
  const [drillSearch, setDrillSearch] = useState<string>('');
  const [selectedStatementFilter, setSelectedStatementFilter] = useState<string>('all');

  // Filter statements if dropdown is used
  const activeStatements = useMemo(() => {
    if (selectedStatementFilter === 'all') return statements;
    return statements.filter((s) => s.id === selectedStatementFilter);
  }, [statements, selectedStatementFilter]);

  // CARD 1: Total of Transactions IN vs Total of Transactions OUT
  const { totalInflow, totalOutflow, totalInCount, totalOutCount, netFlow } = useMemo(() => {
    let inflowSum = 0;
    let outflowSum = 0;
    let inCount = 0;
    let outCount = 0;

    activeStatements.forEach((stmt) => {
      // Use statement items if available, or statement totals
      if (stmt.items && stmt.items.length > 0) {
        stmt.items.forEach((item) => {
          if (item.type === 'Inflow') {
            inflowSum += item.amount;
            inCount++;
          } else {
            outflowSum += item.amount;
            outCount++;
          }
        });
      } else {
        inflowSum += stmt.totalInflow || 0;
        outflowSum += stmt.totalOutflow || 0;
      }
    });

    return {
      totalInflow: inflowSum,
      totalOutflow: outflowSum,
      totalInCount: inCount,
      totalOutCount: outCount,
      netFlow: inflowSum - outflowSum
    };
  }, [activeStatements]);

  const totalVolume = totalInflow + totalOutflow;
  const inflowPercent = totalVolume > 0 ? ((totalInflow / totalVolume) * 100).toFixed(1) : '50.0';
  const outflowPercent = totalVolume > 0 ? ((totalOutflow / totalVolume) * 100).toFixed(1) : '50.0';

  // CARD 2 & CHART 2: Account Holder (Transactions IN and OUT) VS Account Holder (Transactions IN and OUT)
  const accountHolderStats = useMemo(() => {
    const holderMap: Record<
      string,
      {
        holder: string;
        inflow: number;
        outflow: number;
        inCount: number;
        outCount: number;
        statementsCount: number;
        statementIds: string[];
      }
    > = {};

    activeStatements.forEach((stmt) => {
      const holder = (stmt.accountHolderName && stmt.accountHolderName.trim()) || 'Alex Miller';
      if (!holderMap[holder]) {
        holderMap[holder] = {
          holder,
          inflow: 0,
          outflow: 0,
          inCount: 0,
          outCount: 0,
          statementsCount: 0,
          statementIds: []
        };
      }

      holderMap[holder].statementsCount += 1;
      holderMap[holder].statementIds.push(stmt.id);

      if (stmt.items && stmt.items.length > 0) {
        stmt.items.forEach((item) => {
          if (item.type === 'Inflow') {
            holderMap[holder].inflow += item.amount;
            holderMap[holder].inCount += 1;
          } else {
            holderMap[holder].outflow += item.amount;
            holderMap[holder].outCount += 1;
          }
        });
      } else {
        holderMap[holder].inflow += stmt.totalInflow || 0;
        holderMap[holder].outflow += stmt.totalOutflow || 0;
      }
    });

    return Object.values(holderMap).map((h) => ({
      ...h,
      net: h.inflow - h.outflow,
      totalFlow: h.inflow + h.outflow,
      inflowShare: h.inflow + h.outflow > 0 ? ((h.inflow / (h.inflow + h.outflow)) * 100).toFixed(1) : '0'
    }));
  }, [activeStatements]);

  // CARD 3: Compare Transactions In and Out grouped by Bank
  const bankStats = useMemo(() => {
    const bankMap: Record<
      string,
      {
        bankName: string;
        accountType: string;
        inflow: number;
        outflow: number;
        inCount: number;
        outCount: number;
        statementsCount: number;
      }
    > = {};

    activeStatements.forEach((stmt) => {
      const bank = stmt.institutionName || 'Unknown Bank';
      if (!bankMap[bank]) {
        bankMap[bank] = {
          bankName: bank,
          accountType: stmt.accountType,
          inflow: 0,
          outflow: 0,
          inCount: 0,
          outCount: 0,
          statementsCount: 0
        };
      }

      bankMap[bank].statementsCount += 1;

      if (stmt.items && stmt.items.length > 0) {
        stmt.items.forEach((item) => {
          if (item.type === 'Inflow') {
            bankMap[bank].inflow += item.amount;
            bankMap[bank].inCount += 1;
          } else {
            bankMap[bank].outflow += item.amount;
            bankMap[bank].outCount += 1;
          }
        });
      } else {
        bankMap[bank].inflow += stmt.totalInflow || 0;
        bankMap[bank].outflow += stmt.totalOutflow || 0;
      }
    });

    return Object.values(bankMap).map((b) => ({
      ...b,
      net: b.inflow - b.outflow,
      totalVolume: b.inflow + b.outflow
    }));
  }, [activeStatements]);

  // PIE CHART DATA: Group Transactions In and Out by Account Holder
  const pieData = useMemo(() => {
    const slices: {
      name: string;
      holder: string;
      flowType: 'Inflow' | 'Outflow';
      value: number;
      color: string;
      itemCount: number;
      percentage: string;
    }[] = [];

    let overallPieTotal = 0;

    accountHolderStats.forEach((h, idx) => {
      if (pieFilter === 'all' || pieFilter === 'inflow') {
        if (h.inflow > 0) {
          const name = `${h.holder} (IN)`;
          const color = SLICE_COLORS[name] || FALLBACK_IN_COLORS[idx % FALLBACK_IN_COLORS.length];
          slices.push({
            name,
            holder: h.holder,
            flowType: 'Inflow',
            value: parseFloat(h.inflow.toFixed(2)),
            color,
            itemCount: h.inCount,
            percentage: '0'
          });
          overallPieTotal += h.inflow;
        }
      }

      if (pieFilter === 'all' || pieFilter === 'outflow') {
        if (h.outflow > 0) {
          const name = `${h.holder} (OUT)`;
          const color = SLICE_COLORS[name] || FALLBACK_OUT_COLORS[idx % FALLBACK_OUT_COLORS.length];
          slices.push({
            name,
            holder: h.holder,
            flowType: 'Outflow',
            value: parseFloat(h.outflow.toFixed(2)),
            color,
            itemCount: h.outCount,
            percentage: '0'
          });
          overallPieTotal += h.outflow;
        }
      }
    });

    // Compute percentages
    return slices.map((s) => ({
      ...s,
      percentage: overallPieTotal > 0 ? ((s.value / overallPieTotal) * 100).toFixed(1) : '0.0'
    })).sort((a, b) => b.value - a.value);
  }, [accountHolderStats, pieFilter]);

  // Active insight for hovered slice (or first slice fallback)
  const currentHoveredInsight = useMemo(() => {
    if (!pieData || pieData.length === 0) return null;
    if (hoveredSlice) {
      return pieData.find((p) => p.name === hoveredSlice) || pieData[0];
    }
    return pieData[0];
  }, [pieData, hoveredSlice]);

  // Drilled transactions when slice is clicked
  const drilledTransactions = useMemo(() => {
    if (!drilledSlice) return [];

    const items: (StatementItem & { statementName: string; bankName: string; holder: string })[] = [];

    activeStatements.forEach((stmt) => {
      const holder = (stmt.accountHolderName && stmt.accountHolderName.trim()) || 'Alex Miller';
      if (holder === drilledSlice.holder) {
        (stmt.items || []).forEach((item) => {
          if (drilledSlice.flowType === 'All' || item.type === drilledSlice.flowType) {
            items.push({
              ...item,
              statementName: stmt.filename,
              bankName: stmt.institutionName,
              holder
            });
          }
        });
      }
    });

    if (!drillSearch.trim()) return items;

    const q = drillSearch.toLowerCase();
    return items.filter(
      (it) =>
        it.description.toLowerCase().includes(q) ||
        (it.categoryHint && it.categoryHint.toLowerCase().includes(q)) ||
        (it.referenceNo && it.referenceNo.toLowerCase().includes(q)) ||
        it.bankName.toLowerCase().includes(q) ||
        String(it.amount).includes(q)
    );
  }, [drilledSlice, activeStatements, drillSearch]);

  if (statements.length === 0) {
    return (
      <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Statements Intelligence & Flow Analysis</h3>
              <p className="text-xs text-slate-400">Import bank & card statements to unlock cross-account Money IN vs OUT comparisons</p>
            </div>
          </div>
          {onNavigateToStatements && (
            <button
              onClick={onNavigateToStatements}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              <span>Import Statements</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="bg-[#14161c] p-5 sm:p-7 rounded-2xl border border-white/5 space-y-7 shadow-2xl">
      
      {/* SECTION HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shrink-0 shadow-md shadow-indigo-950/40">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Statements Intelligence & Flow Analysis
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {statements.length} {statements.length === 1 ? 'Statement' : 'Statements'} Loaded
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive statement reconciliation • Transactions IN (Credits/Deposits) vs OUT (Debits/Charges)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Statement selector filter */}
          <select
            value={selectedStatementFilter}
            onChange={(e) => setSelectedStatementFilter(e.target.value)}
            className="bg-[#090a0c] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="all">All Statements Consolidated</option>
            {statements.map((s) => (
              <option key={s.id} value={s.id}>
                {s.institutionName} ({s.accountHolderName || 'Alex Miller'})
              </option>
            ))}
          </select>

          {onNavigateToStatements && (
            <button
              onClick={onNavigateToStatements}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-indigo-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>Manage Statements</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          1. THREE ANALYSIS CARDS
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* CARD 1: Total of Transactions IN vs Total of Transactions OUT */}
        <div className="bg-[#090a0c] p-5 rounded-2xl border border-white/5 space-y-4 hover:border-indigo-500/20 transition-all flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                <span>Total Transactions IN vs OUT</span>
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                netFlow >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {netFlow >= 0 ? '+ Surplus' : '- Deficit'}
              </span>
            </div>

            {/* Inflow vs Outflow Amounts */}
            <div className="grid grid-cols-2 gap-3 mt-3.5">
              
              {/* Money IN */}
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    <ArrowDownRight className="w-3.5 h-3.5" /> Money IN
                  </span>
                  <span className="text-[10px] text-emerald-500/80 font-mono">{inflowPercent}%</span>
                </div>
                <div className="text-lg sm:text-xl font-serif font-bold text-emerald-400">
                  ${totalInflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-slate-400">{totalInCount} credits / deposits</p>
              </div>

              {/* Money OUT */}
              <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Money OUT
                  </span>
                  <span className="text-[10px] text-rose-500/80 font-mono">{outflowPercent}%</span>
                </div>
                <div className="text-lg sm:text-xl font-serif font-bold text-rose-400">
                  ${totalOutflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-slate-400">{totalOutCount} debits / charges</p>
              </div>

            </div>
          </div>

          {/* Visual Ratio Progress Bar */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">
                Net Statement Flow: <strong className={netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {netFlow >= 0 ? '+' : '-'}${Math.abs(netFlow).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </strong>
              </span>
              <span className="text-slate-500 text-[10px]">
                {totalInCount + totalOutCount} Total Items
              </span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${inflowPercent}%` }}
                className="bg-emerald-500 transition-all duration-500"
                title={`Money IN: ${inflowPercent}%`}
              />
              <div
                style={{ width: `${outflowPercent}%` }}
                className="bg-rose-500 transition-all duration-500"
                title={`Money OUT: ${outflowPercent}%`}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
              <span className="text-emerald-400">● Inflow {inflowPercent}%</span>
              <span className="text-rose-400">● Outflow {outflowPercent}%</span>
            </div>
          </div>
        </div>

        {/* CARD 2: Account Holder (Transactions IN and OUT) VS Account Holder (Transactions IN and OUT) */}
        <div className="bg-[#090a0c] p-5 rounded-2xl border border-white/5 space-y-3.5 hover:border-indigo-500/20 transition-all flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>Account Holder Comparison</span>
              </span>
              <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 font-medium">
                {accountHolderStats.length} {accountHolderStats.length === 1 ? 'Owner' : 'Owners'}
              </span>
            </div>

            {/* List of Account Holders Side by Side / Stacked */}
            <div className="space-y-2.5 mt-3 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
              {accountHolderStats.map((holder) => (
                <div
                  key={holder.holder}
                  onClick={() => setDrilledSlice({ holder: holder.holder, flowType: 'All', color: '#6366f1' })}
                  className="p-2.5 rounded-xl bg-[#14161c] hover:bg-white/[0.05] border border-white/5 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-[10px] text-white">
                        {holder.holder.charAt(0)}
                      </div>
                      <span className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {holder.holder}
                      </span>
                    </div>
                    <span className={`font-mono text-[11px] font-semibold ${
                      holder.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {holder.net >= 0 ? '+' : '-'}${Math.abs(holder.net).toFixed(2)}
                    </span>
                  </div>

                  {/* Flow comparison row */}
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="flex items-center justify-between bg-emerald-500/5 px-2 py-1 rounded-lg border border-emerald-500/10">
                      <span className="text-emerald-400 font-medium">IN</span>
                      <span className="font-mono text-white font-medium">${holder.inflow.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between bg-rose-500/5 px-2 py-1 rounded-lg border border-rose-500/10">
                      <span className="text-rose-400 font-medium">OUT</span>
                      <span className="font-mono text-white font-medium">${holder.outflow.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Click any owner to drill down into items</span>
            <Sparkles className="w-3 h-3 text-indigo-400" />
          </div>
        </div>

        {/* CARD 3: Compare Transactions In and Out grouped by Bank */}
        <div className="bg-[#090a0c] p-5 rounded-2xl border border-white/5 space-y-3.5 hover:border-indigo-500/20 transition-all flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-indigo-400" />
                <span>Transactions IN & OUT by Bank</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                {bankStats.length} Institutions
              </span>
            </div>

            {/* List of Banks */}
            <div className="space-y-2 mt-3 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
              {bankStats.map((bank) => (
                <div key={bank.bankName} className="p-2.5 rounded-xl bg-[#14161c] border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-semibold text-white truncate max-w-[130px]">{bank.bankName}</span>
                      <span className="text-[9px] text-slate-500 px-1 py-0.2 rounded bg-white/5">
                        {bank.accountType}
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono font-semibold ${
                      bank.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {bank.net >= 0 ? '+' : '-'}${Math.abs(bank.net).toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>IN: <strong className="text-emerald-400">${bank.inflow.toFixed(0)}</strong></span>
                      <span className="text-slate-600">({bank.inCount})</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>OUT: <strong className="text-rose-400">${bank.outflow.toFixed(0)}</strong></span>
                      <span className="text-slate-600">({bank.outCount})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Reconciled banking institutions</span>
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          </div>
        </div>

      </div>

      {/* =========================================================================
          2. CHART: TRANSACTIONS IN VS OUT BY ACCOUNT HOLDER
          ========================================================================= */}
      <div className="bg-[#090a0c] p-5 sm:p-6 rounded-2xl border border-white/5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white uppercase flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span>Comparative Chart: Transactions IN vs OUT by Account Holder</span>
            </h3>
            <p className="text-xs text-slate-400">
              Direct volumetric comparison of inflows and outflows generated across each statement owner
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
              <span>Transactions IN</span>
            </span>
            <span className="flex items-center gap-1.5 text-rose-400 font-medium">
              <span className="w-3 h-3 rounded bg-rose-500 inline-block" />
              <span>Transactions OUT</span>
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={accountHolderStats} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <XAxis 
                dataKey="holder" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#14161c',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '0.75rem',
                  color: '#fff',
                  fontSize: '0.75rem',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                }}
                formatter={(value: any, name: any) => [
                  `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  name === 'inflow' ? 'Transactions IN' : 'Transactions OUT'
                ]}
                labelFormatter={(label) => `Account Holder: ${label}`}
              />
              <Bar 
                dataKey="inflow" 
                name="Transactions IN" 
                fill="#10b981" 
                radius={[6, 6, 0, 0]} 
                maxBarSize={55}
              />
              <Bar 
                dataKey="outflow" 
                name="Transactions OUT" 
                fill="#f43f5e" 
                radius={[6, 6, 0, 0]} 
                maxBarSize={55}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* =========================================================================
          3. INTERACTIVE PIE CHART: GROUP TRANSACTIONS IN & OUT BY ACCOUNT HOLDER
             "Pase el cursor por las perspectivas en vivo • Haga clic para profundizar"
          ========================================================================= */}
      <div className="bg-[#090a0c] p-5 sm:p-6 rounded-2xl border border-white/5 space-y-5 shadow-xl">
        
        {/* Header with requested exact subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold tracking-wide text-white uppercase">
                Interactive Statements Flow Breakdown by Account Holder
              </h3>
            </div>
            {/* User's requested exact phrase */}
            <p className="text-xs text-indigo-300 font-medium flex items-center gap-1.5 mt-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Pase el cursor por las perspectivas en vivo • Haga clic para profundizar</span>
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-[#14161c] p-1 rounded-xl border border-white/5 text-xs">
            <button
              onClick={() => setPieFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                pieFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All (IN & OUT)
            </button>
            <button
              onClick={() => setPieFilter('inflow')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                pieFilter === 'inflow'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              IN Only
            </button>
            <button
              onClick={() => setPieFilter('outflow')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                pieFilter === 'outflow'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              OUT Only
            </button>
          </div>
        </div>

        {/* PIE CHART & LIVE INSIGHTS SPLIT VIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left: Recharts Interactive Pie */}
          <div className="lg:col-span-7 h-72 sm:h-80 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={105}
                  paddingAngle={3}
                  dataKey="value"
                  onMouseEnter={(_, index) => {
                    if (pieData[index]) {
                      setHoveredSlice(pieData[index].name);
                    }
                  }}
                  onMouseLeave={() => setHoveredSlice(null)}
                  onClick={(_, index) => {
                    if (pieData[index]) {
                      setDrilledSlice({
                        holder: pieData[index].holder,
                        flowType: pieData[index].flowType,
                        color: pieData[index].color
                      });
                    }
                  }}
                  cursor="pointer"
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                      stroke={hoveredSlice === entry.name ? '#ffffff' : 'rgba(0,0,0,0.4)'}
                      strokeWidth={hoveredSlice === entry.name ? 2 : 1}
                      className="transition-all duration-300 hover:opacity-90"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#14161c] border border-white/10 p-3 rounded-xl shadow-2xl text-xs space-y-1">
                          <p className="font-bold text-white flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                            <span>{data.name}</span>
                          </p>
                          <p className="font-mono text-indigo-300 text-sm font-semibold">
                            ${data.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {data.percentage}% of selected statement volume • {data.itemCount} items
                          </p>
                          <p className="text-[10px] text-indigo-400 font-medium pt-1 border-t border-white/5">
                            Haga clic para profundizar (Click to inspect)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Donut Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {pieFilter === 'all' ? 'Total Statements' : pieFilter === 'inflow' ? 'Total IN' : 'Total OUT'}
              </span>
              <span className="text-base sm:text-lg font-serif font-bold text-white">
                ${pieData.reduce((acc, p) => acc + p.value, 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[9px] text-indigo-400 font-mono">
                {pieData.length} Slices
              </span>
            </div>
          </div>

          {/* Right: Live Perspectives Panel & Slices Legend */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Live Hover Perspective Card */}
            {currentHoveredInsight && (
              <div className="p-4 rounded-xl bg-[#14161c] border border-white/10 space-y-2 shadow-lg animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    <span>Perspectiva en Vivo (Live Insight)</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {currentHoveredInsight.percentage}% of Volume
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {currentHoveredInsight.name}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Statement Owner: <strong className="text-slate-200">{currentHoveredInsight.holder}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-serif text-base font-bold text-white">
                      ${currentHoveredInsight.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                      currentHoveredInsight.flowType === 'Inflow'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {currentHoveredInsight.flowType === 'Inflow' ? 'Money IN (Credit)' : 'Money OUT (Debit)'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Contains {currentHoveredInsight.itemCount} statement transactions</span>
                  <button
                    onClick={() =>
                      setDrilledSlice({
                        holder: currentHoveredInsight.holder,
                        flowType: currentHoveredInsight.flowType,
                        color: currentHoveredInsight.color
                      })
                    }
                    className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 flex items-center gap-1"
                  >
                    <span>Profundizar (Drill Down)</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Slices Quick Selector List */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
              {pieData.map((slice) => (
                <div
                  key={slice.name}
                  onMouseEnter={() => setHoveredSlice(slice.name)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  onClick={() =>
                    setDrilledSlice({
                      holder: slice.holder,
                      flowType: slice.flowType,
                      color: slice.color
                    })
                  }
                  className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                    hoveredSlice === slice.name
                      ? 'bg-white/10 border-indigo-500/50'
                      : 'bg-[#14161c]/60 border-white/5 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                    <span className="text-slate-300 font-medium">{slice.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-white font-serif font-semibold">${slice.value.toFixed(2)}</span>
                    <span className="text-[10px] text-indigo-400 font-mono w-10 text-right">({slice.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

        {/* =========================================================================
            DRILL-DOWN TRANSACTION LIST (Haga clic para profundizar)
            ========================================================================= */}
        {drilledSlice && (
          <div className="mt-5 p-5 rounded-2xl bg-[#14161c] border border-indigo-500/30 space-y-4 animate-in slide-in-from-top-3 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: drilledSlice.color }} />
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Profundización de Transacciones: {drilledSlice.holder}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                      {drilledSlice.flowType === 'All' ? 'All Transactions' : `${drilledSlice.flowType} Only`}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Inspecting all recorded transactions extracted from {drilledSlice.holder}&apos;s statements
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Search within drilled */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={drillSearch}
                    onChange={(e) => setDrillSearch(e.target.value)}
                    className="bg-[#090a0c] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44"
                  />
                  {drillSearch && (
                    <button
                      onClick={() => setDrillSearch('')}
                      className="absolute right-2 top-2 text-slate-500 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setDrilledSlice(null)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  title="Close Drill-Down"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drilled Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#090a0c] border-b border-white/5 text-slate-500 uppercase font-medium text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Bank / Institution</th>
                    <th className="py-2.5 px-3">Category Hint</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Type</th>
                    <th className="py-2.5 px-3 text-center">Reconciled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {drilledTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500 text-xs">
                        No transactions found for this filter criteria.
                      </td>
                    </tr>
                  ) : (
                    drilledTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-white">{tx.description}</span>
                          {tx.referenceNo && (
                            <span className="block font-mono text-[9px] text-slate-500 mt-0.5">
                              Ref: {tx.referenceNo}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {tx.bankName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          {tx.categoryHint || 'General'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-serif font-bold text-sm">
                          <span className={tx.type === 'Inflow' ? 'text-emerald-400' : 'text-rose-400'}>
                            {tx.type === 'Inflow' ? '+' : '-'}${tx.amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                            tx.type === 'Inflow'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`text-[10px] font-medium ${
                            tx.reconciledStatus === 'Matched' ? 'text-emerald-400' : 'text-slate-500'
                          }`}>
                            {tx.reconciledStatus || 'Unmatched'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
              <span>Showing {drilledTransactions.length} transactions</span>
              <button
                onClick={() => setDrilledSlice(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Done Inspecting
              </button>
            </div>
          </div>
        )}

      </div>

    </section>
  );
};
