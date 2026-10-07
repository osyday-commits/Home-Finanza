import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Upload, 
  Download, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  ArrowUpDown, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Filter, 
  Check, 
  X, 
  RefreshCw, 
  CreditCard, 
  Landmark, 
  ChevronRight, 
  ChevronLeft, 
  ExternalLink, 
  Eye, 
  Layers, 
  Sparkles,
  Calendar,
  DollarSign,
  Receipt,
  User
} from 'lucide-react';
import { BankStatement, StatementItem, Transaction, Account, TransactionType } from '../types';

interface StatementsViewProps {
  statements: BankStatement[];
  accounts: Account[];
  transactions: Transaction[];
  onAddStatement: (statement: BankStatement) => void;
  onDeleteStatement: (id: string) => void;
  onUpdateStatement: (statement: BankStatement) => void;
  onAddTransactionFromStatement: (tx: Partial<Transaction>, statementId: string, statementItemId: string) => void;
  onNavigateToTransactions: () => void;
}

export const StatementsView: React.FC<StatementsViewProps> = ({
  statements,
  accounts,
  transactions,
  onAddStatement,
  onDeleteStatement,
  onUpdateStatement,
  onAddTransactionFromStatement,
  onNavigateToTransactions
}) => {
  // Navigation & selection
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  
  // Filtering & Search
  const [accountFilter, setAccountFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Cross-reference view filter
  const [itemStatusFilter, setItemStatusFilter] = useState<'All' | 'Matched' | 'Unmatched' | 'Inflow' | 'Outflow'>('All');
  const [itemSearchTerm, setItemSearchTerm] = useState<string>('');

  // Selected statement object
  const activeStatement = useMemo(() => {
    return statements.find((s) => s.id === selectedStatementId) || null;
  }, [statements, selectedStatementId]);

  // Overall Money In & Money Out across all statements
  const aggregatedStats = useMemo(() => {
    const totalInflow = statements.reduce((sum, s) => sum + s.totalInflow, 0);
    const totalOutflow = statements.reduce((sum, s) => sum + s.totalOutflow, 0);
    const net = totalInflow - totalOutflow;

    let totalItems = 0;
    let matchedItems = 0;
    statements.forEach((s) => {
      s.items.forEach((item) => {
        totalItems++;
        if (item.reconciledStatus === 'Matched') {
          matchedItems++;
        }
      });
    });

    const matchRate = totalItems > 0 ? Math.round((matchedItems / totalItems) * 100) : 100;

    return { totalInflow, totalOutflow, net, totalStatements: statements.length, totalItems, matchedItems, matchRate };
  }, [statements]);

  // Filtered statements list
  const filteredStatements = useMemo(() => {
    return statements.filter((s) => {
      const matchesAccount = accountFilter === 'All' || s.accountId === accountFilter;
      const matchesType = typeFilter === 'All' || s.accountType === typeFilter;
      const matchesSearch =
        s.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.institutionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.accountHolderName && s.accountHolderName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.notes && s.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesAccount && matchesType && matchesSearch;
    });
  }, [statements, accountFilter, typeFilter, searchTerm]);

  // Cross reference analysis for the active statement
  const activeStatementAnalysis = useMemo(() => {
    if (!activeStatement) return null;

    // Filter transactions for this account in this statement date range
    const periodStart = activeStatement.statementPeriodStart;
    const periodEnd = activeStatement.statementPeriodEnd;

    const ledgerTxs = transactions.filter((t) => {
      const matchAccount = t.accountId === activeStatement.accountId;
      const matchDate = t.date >= periodStart && t.date <= periodEnd;
      return matchAccount && matchDate;
    });

    const ledgerIncome = ledgerTxs
      .filter((t) => t.type === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);

    const ledgerExpense = ledgerTxs
      .filter((t) => t.type === 'Expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const ledgerNet = ledgerIncome - ledgerExpense;

    // Discrepancies
    const inflowVariance = activeStatement.totalInflow - ledgerIncome;
    const outflowVariance = activeStatement.totalOutflow - ledgerExpense;
    const netVariance = activeStatement.netChange - ledgerNet;

    // Ledger transactions that are not matched to any statement item
    const matchedTxIds = new Set(
      activeStatement.items
        .map((i) => i.matchedTransactionId)
        .filter(Boolean)
    );

    const unmatchedLedgerTxs = ledgerTxs.filter((t) => !matchedTxIds.has(t.id));

    // Statement items filtering
    const filteredItems = activeStatement.items.filter((item) => {
      const matchesStatus =
        itemStatusFilter === 'All' ||
        (itemStatusFilter === 'Matched' && item.reconciledStatus === 'Matched') ||
        (itemStatusFilter === 'Unmatched' && item.reconciledStatus !== 'Matched') ||
        (itemStatusFilter === 'Inflow' && item.type === 'Inflow') ||
        (itemStatusFilter === 'Outflow' && item.type === 'Outflow');

      const matchesSearch =
        item.description.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
        (item.referenceNo && item.referenceNo.toLowerCase().includes(itemSearchTerm.toLowerCase())) ||
        (item.categoryHint && item.categoryHint.toLowerCase().includes(itemSearchTerm.toLowerCase())) ||
        item.amount.toString().includes(itemSearchTerm);

      return matchesStatus && matchesSearch;
    });

    const matchedCount = activeStatement.items.filter((i) => i.reconciledStatus === 'Matched').length;
    const itemsCount = activeStatement.items.length;
    const matchPct = itemsCount > 0 ? Math.round((matchedCount / itemsCount) * 100) : 100;

    return {
      ledgerTxs,
      ledgerIncome,
      ledgerExpense,
      ledgerNet,
      inflowVariance,
      outflowVariance,
      netVariance,
      unmatchedLedgerTxs,
      filteredItems,
      matchedCount,
      itemsCount,
      matchPct
    };
  }, [activeStatement, transactions, itemStatusFilter, itemSearchTerm]);

  // Export Statement CSV
  const handleExportStatement = (stmt: BankStatement) => {
    const headers = ['Item ID', 'Date', 'Description', 'Type', 'Amount', 'Reference', 'Category Hint', 'Reconciled Status', 'Matched TRX ID'];
    const rows = stmt.items.map((i) => [
      i.id,
      i.date,
      `"${i.description.replace(/"/g, '""')}"`,
      i.type,
      i.amount.toFixed(2),
      i.referenceNo || '',
      i.categoryHint || '',
      i.reconciledStatus || 'Unmatched',
      i.matchedTransactionId || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${stmt.filename.replace(/\.csv$/i, '')}_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Full Reconciliation Audit
  const handleExportFullAudit = () => {
    if (!activeStatement || !activeStatementAnalysis) return;

    const summaryRows = [
      `STATEMENT RECONCILIATION AUDIT REPORT`,
      `Account: ${activeStatement.institutionName} - Account ID: ${activeStatement.accountId}`,
      `Period: ${activeStatement.statementPeriodStart} to ${activeStatement.statementPeriodEnd}`,
      `Report Generated: ${new Date().toISOString()}`,
      ``,
      `METRIC,BANK STATEMENT,TRANSACTIONS LEDGER,VARIANCE / DISCREPANCY`,
      `Total Money In (Inflow),$${activeStatement.totalInflow.toFixed(2)},$${activeStatementAnalysis.ledgerIncome.toFixed(2)},$${activeStatementAnalysis.inflowVariance.toFixed(2)}`,
      `Total Money Out (Outflow),$${activeStatement.totalOutflow.toFixed(2)},$${activeStatementAnalysis.ledgerExpense.toFixed(2)},$${activeStatementAnalysis.outflowVariance.toFixed(2)}`,
      `Net Change,$${activeStatement.netChange.toFixed(2)},$${activeStatementAnalysis.ledgerNet.toFixed(2)},$${activeStatementAnalysis.netVariance.toFixed(2)}`,
      `Match Rate,${activeStatementAnalysis.matchPct}%,${activeStatementAnalysis.matchedCount} of ${activeStatementAnalysis.itemsCount} matched,`,
      ``,
      `STATEMENT LINE ITEMS AUDIT`,
      `Date,Description,Type,Amount,Reference,Status,Matched Transaction`
    ];

    const itemRows = activeStatement.items.map((i) =>
      `"${i.date}","${i.description.replace(/"/g, '""')}","${i.type}","$${i.amount.toFixed(2)}","${i.referenceNo || ''}","${i.reconciledStatus || 'Unmatched'}","${i.matchedTransactionId || 'None'}"`
    );

    const csvContent = [...summaryRows, ...itemRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reconciliation_Audit_${activeStatement.institutionName.replace(/\s+/g, '_')}_${activeStatement.statementPeriodStart}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick 1-click test statement load
  const handleLoadSampleChaseCard = () => {
    const cardAcc = accounts.find((a) => a.type === 'Credit Card') || accounts[0];
    const newStmt: BankStatement = {
      id: `stmt-${Date.now()}`,
      filename: `Chase_Credit_Card_Export_${new Date().getFullYear()}_Sep.csv`,
      accountId: cardAcc ? cardAcc.id : 'acc-3',
      accountType: 'Credit Card',
      institutionName: cardAcc ? cardAcc.bankName : 'Chase Card Services',
      accountHolderName: 'Alex Miller',
      statementPeriodStart: '2026-09-01',
      statementPeriodEnd: '2026-09-27',
      statementDate: '2026-09-27',
      startingBalance: -642.50,
      endingBalance: -1125.75,
      totalInflow: 642.50,
      totalOutflow: 1125.75,
      netChange: -483.25,
      importedAt: new Date().toISOString(),
      status: 'Needs Review',
      notes: 'Imported Credit Card Statement with automated transaction cross-reference monitoring.',
      items: [
        {
          id: `item-${Date.now()}-1`,
          date: '2026-09-02',
          description: 'TARGET SUPERSTORE GROCERIES',
          amount: 88.40,
          type: 'Outflow',
          referenceNo: 'AUTH-99120',
          categoryHint: 'Everyday / Groceries',
          reconciledStatus: 'Unmatched'
        },
        {
          id: `item-${Date.now()}-2`,
          date: '2026-09-05',
          description: 'AUTOMATIC PAYMENT THANK YOU',
          amount: 642.50,
          type: 'Inflow',
          referenceNo: 'ACH-44102',
          categoryHint: 'Credit Card Payment',
          reconciledStatus: 'Matched'
        },
        {
          id: `item-${Date.now()}-3`,
          date: '2026-09-12',
          description: 'UBER RIDES TRIP SEATTLE',
          amount: 32.15,
          type: 'Outflow',
          referenceNo: 'AUTH-11093',
          categoryHint: 'Transportation / Rideshare',
          reconciledStatus: 'Unmatched'
        },
        {
          id: `item-${Date.now()}-4`,
          date: '2026-09-18',
          description: 'STARBUCKS COFFEE ROASTERY',
          amount: 14.20,
          type: 'Outflow',
          referenceNo: 'AUTH-88219',
          categoryHint: 'Everyday / Coffee',
          reconciledStatus: 'Unmatched'
        },
        {
          id: `item-${Date.now()}-5`,
          date: '2026-09-24',
          description: 'APPLE STORE DIGITAL SUBSCRIPTION',
          amount: 19.99,
          type: 'Outflow',
          referenceNo: 'AUTH-55291',
          categoryHint: 'Tech & Media',
          reconciledStatus: 'Unmatched'
        }
      ]
    };
    onAddStatement(newStmt);
    setSelectedStatementId(newStmt.id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#14161c] p-5 rounded-2xl border border-white/5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Bank & Credit Card Statements
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Import exported bank statements to monitor total Money In and Money Out, reconcile balances, and cross-reference with your transaction ledger
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Load Sample Statement Button */}
          <button
            onClick={handleLoadSampleChaseCard}
            className="px-3 py-2 rounded-xl bg-[#090a0c] hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/10"
            title="Import a sample credit card statement for demonstration"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Sample Card Statement</span>
          </button>

          {/* Manual Entry Button */}
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#090a0c] hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/10"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400" />
            <span>Manual Statement</span>
          </button>

          {/* Import CSV Statement Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-950/50 border border-indigo-400/30"
          >
            <Upload className="w-4 h-4" />
            <span>Import Bank Statement (CSV)</span>
          </button>
        </div>
      </div>

      {/* Aggregate Money In & Out Monitoring Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* Total Money In */}
        <div className="bg-[#14161c] border border-white/5 p-4 rounded-2xl relative overflow-hidden group hover:border-emerald-500/20 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Total Statement Money In
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-serif mt-2">
            +${aggregatedStats.totalInflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Deposits, payroll, refunds across {aggregatedStats.totalStatements} statements</span>
          </div>
        </div>

        {/* Total Money Out */}
        <div className="bg-[#14161c] border border-white/5 p-4 rounded-2xl relative overflow-hidden group hover:border-rose-500/20 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Total Statement Money Out
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400 font-serif mt-2">
            -${aggregatedStats.totalOutflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Card debits, bills, purchases, fees</span>
          </div>
        </div>

        {/* Net Movement */}
        <div className="bg-[#14161c] border border-white/5 p-4 rounded-2xl relative overflow-hidden group hover:border-indigo-500/20 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Net Statement Cash Movement
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <ArrowUpDown className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold font-serif mt-2 ${aggregatedStats.net >= 0 ? 'text-indigo-400' : 'text-amber-400'}`}>
            {aggregatedStats.net >= 0 ? '+' : '-'}${Math.abs(aggregatedStats.net).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Net flow (Inflow minus Outflow)
          </div>
        </div>

        {/* Reconciliation Rate */}
        <div className="bg-[#14161c] border border-white/5 p-4 rounded-2xl relative overflow-hidden group hover:border-indigo-500/20 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Cross-Reference Rate
              </span>
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white font-serif mt-2">
              {aggregatedStats.matchRate}%
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{aggregatedStats.matchedItems} of {aggregatedStats.totalItems} line items matched</span>
            <button
              onClick={onNavigateToTransactions}
              className="text-indigo-400 hover:text-indigo-300 font-medium underline"
            >
              View Ledger
            </button>
          </div>
        </div>

      </div>

      {/* Main View: Either Statement List OR Active Cross-Reference Workspace */}
      {selectedStatementId && activeStatement ? (
        /* DETAIL & CROSS-REFERENCE WORKSPACE */
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Active Statement Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#14161c] p-4 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedStatementId(null)}
                className="p-2 rounded-xl bg-[#090a0c] hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5 flex items-center gap-1.5 text-xs font-semibold"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>All Statements</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    {activeStatement.institutionName}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                    activeStatement.accountType === 'Credit Card'
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                    {activeStatement.accountType}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                    activeStatement.status === 'Reconciled'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {activeStatement.status}
                  </span>
                  {activeStatement.accountHolderName && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      <User className="w-3 h-3 text-indigo-400" />
                      <span>Owner: <strong className="text-white font-medium">{activeStatement.accountHolderName}</strong></span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-500">{activeStatement.filename}</span>
                  <span>•</span>
                  <span>Period: {activeStatement.statementPeriodStart} to {activeStatement.statementPeriodEnd}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportFullAudit}
                className="px-3 py-1.5 rounded-xl bg-[#090a0c] hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 border border-white/10 transition-colors"
                title="Download complete cross-reference audit report"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Export Audit CSV</span>
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete statement "${activeStatement.filename}"?`)) {
                    onDeleteStatement(activeStatement.id);
                    setSelectedStatementId(null);
                  }
                }}
                className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors border border-rose-500/20"
                title="Delete this statement"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cross-Reference Comparison Grid */}
          {activeStatementAnalysis && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Bank Statement Column */}
              <div className="bg-[#14161c] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Official Statement Record
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400">Imported Source</span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Opening Balance:</span>
                    <span className="font-mono text-slate-200">
                      ${activeStatement.startingBalance.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Statement Money In:</span>
                    <span className="font-serif font-bold text-emerald-400">
                      +${activeStatement.totalInflow.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Statement Money Out:</span>
                    <span className="font-serif font-bold text-rose-400">
                      -${activeStatement.totalOutflow.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-white/5">
                    <span className="font-medium text-slate-300">Closing Balance:</span>
                    <span className="font-mono font-bold text-white">
                      ${activeStatement.endingBalance.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#090a0c] border border-white/5 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">Line Items: </span>
                  {activeStatement.items.length} records parsed from bank export
                </div>
              </div>

              {/* Transactions Ledger Column */}
              <div className="bg-[#14161c] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Transactions Ledger
                    </h4>
                  </div>
                  <button
                    onClick={onNavigateToTransactions}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-medium"
                  >
                    Open Ledger
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Account Filter:</span>
                    <span className="font-medium text-slate-300 truncate max-w-[140px]">
                      {accounts.find((a) => a.id === activeStatement.accountId)?.name || 'Linked Account'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Ledger Money In:</span>
                    <span className="font-serif font-bold text-emerald-400">
                      +${activeStatementAnalysis.ledgerIncome.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Ledger Money Out:</span>
                    <span className="font-serif font-bold text-rose-400">
                      -${activeStatementAnalysis.ledgerExpense.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-white/5">
                    <span className="font-medium text-slate-300">Net Ledger Flow:</span>
                    <span className="font-serif font-bold text-white">
                      {activeStatementAnalysis.ledgerNet >= 0 ? '+' : '-'}${Math.abs(activeStatementAnalysis.ledgerNet).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#090a0c] border border-white/5 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">Transactions: </span>
                  {activeStatementAnalysis.ledgerTxs.length} entries recorded in this timeframe
                </div>
              </div>

              {/* Cross-Reference & Reconciliation Variance Column */}
              <div className="bg-[#14161c] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Cross-Reference Variance
                    </h4>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    Math.abs(activeStatementAnalysis.outflowVariance) < 0.01 && Math.abs(activeStatementAnalysis.inflowVariance) < 0.01
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {Math.abs(activeStatementAnalysis.outflowVariance) < 0.01 && Math.abs(activeStatementAnalysis.inflowVariance) < 0.01
                      ? 'Balanced'
                      : 'Variance Found'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Inflow Discrepancy:</span>
                    <span className={`font-mono font-semibold ${
                      Math.abs(activeStatementAnalysis.inflowVariance) < 0.01 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {Math.abs(activeStatementAnalysis.inflowVariance) < 0.01 ? '$0.00' : `${activeStatementAnalysis.inflowVariance >= 0 ? '+' : '-'}$${Math.abs(activeStatementAnalysis.inflowVariance).toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Outflow Discrepancy:</span>
                    <span className={`font-mono font-semibold ${
                      Math.abs(activeStatementAnalysis.outflowVariance) < 0.01 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {Math.abs(activeStatementAnalysis.outflowVariance) < 0.01 ? '$0.00' : `${activeStatementAnalysis.outflowVariance >= 0 ? '+' : '-'}$${Math.abs(activeStatementAnalysis.outflowVariance).toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Item Match Ratio:</span>
                    <span className="font-bold text-white">
                      {activeStatementAnalysis.matchPct}% ({activeStatementAnalysis.matchedCount}/{activeStatementAnalysis.itemsCount})
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-white/5">
                    <span className="font-medium text-slate-300">Reconciliation:</span>
                    <span className="text-[11px] font-semibold text-slate-200">
                      {activeStatementAnalysis.itemsCount - activeStatementAnalysis.matchedCount} unrecorded items
                    </span>
                  </div>
                </div>

                {activeStatementAnalysis.itemsCount - activeStatementAnalysis.matchedCount > 0 ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <span>
                      Use the table below to cross-reference and click <strong>'+ Add to Transactions'</strong> to bring missing bank items into your transactions ledger!
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>All statement items have been verified and reconciled with the transactions ledger.</span>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Statement Items Table & Cross-Reference Explorer */}
          <div className="bg-[#14161c] rounded-2xl border border-white/5 overflow-hidden shadow-xl space-y-4 p-5">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Statement Items Cross-Reference List</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verify individual bank statement records against your transactions ledger
                </p>
              </div>

              {/* Status & Search Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search payee, memo, amount..."
                    value={itemSearchTerm}
                    onChange={(e) => setItemSearchTerm(e.target.value)}
                    className="bg-[#090a0c] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44"
                  />
                </div>

                <div className="flex items-center gap-1 bg-[#090a0c] p-1 rounded-xl border border-white/10 text-xs">
                  <button
                    onClick={() => setItemStatusFilter('All')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      itemStatusFilter === 'All' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({activeStatement.items.length})
                  </button>
                  <button
                    onClick={() => setItemStatusFilter('Matched')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      itemStatusFilter === 'Matched' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Matched ({activeStatement.items.filter((i) => i.reconciledStatus === 'Matched').length})
                  </button>
                  <button
                    onClick={() => setItemStatusFilter('Unmatched')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      itemStatusFilter === 'Unmatched' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Missing in Ledger ({activeStatement.items.filter((i) => i.reconciledStatus !== 'Matched').length})
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-white/5 rounded-xl">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-[#090a0c] border-b border-white/5 text-slate-500 uppercase font-medium text-[10px] tracking-wider">
                    <th className="py-3 px-3.5">Date</th>
                    <th className="py-3 px-3.5">Payee / Bank Description</th>
                    <th className="py-3 px-3.5">Flow Type</th>
                    <th className="py-3 px-3.5 text-right">Amount</th>
                    <th className="py-3 px-3.5">Category Hint</th>
                    <th className="py-3 px-3.5">Reference #</th>
                    <th className="py-3 px-3.5 text-center">Cross-Reference Status</th>
                    <th className="py-3 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {activeStatementAnalysis && activeStatementAnalysis.filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-500">
                        No statement items found matching this filter.
                      </td>
                    </tr>
                  ) : (
                    activeStatementAnalysis?.filteredItems.map((item) => {
                      const isMatched = item.reconciledStatus === 'Matched';
                      const matchedTx = item.matchedTransactionId
                        ? transactions.find((t) => t.id === item.matchedTransactionId)
                        : null;

                      return (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-3.5 font-medium text-slate-300 whitespace-nowrap">
                            {item.date}
                          </td>
                          <td className="py-3 px-3.5 font-medium text-white max-w-[240px] truncate" title={item.description}>
                            {item.description}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${
                              item.type === 'Inflow'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {item.type === 'Inflow' ? 'Money In (+)' : 'Money Out (-)'}
                            </span>
                          </td>
                          <td className={`py-3 px-3.5 text-right font-serif text-sm font-semibold ${
                            item.type === 'Inflow' ? 'text-emerald-400' : 'text-white'
                          }`}>
                            {item.type === 'Inflow' ? '+' : '-'}${item.amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-3.5 text-slate-400">
                            {item.categoryHint || 'General'}
                          </td>
                          <td className="py-3 px-3.5 font-mono text-[10px] text-slate-500">
                            {item.referenceNo || '—'}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            {isMatched ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <Check className="w-3 h-3" /> Matched
                                </span>
                                {matchedTx && (
                                  <span className="text-[9px] font-mono text-slate-500 mt-0.5" title={`Linked to ${matchedTx.provider}`}>
                                    {matchedTx.id}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <AlertTriangle className="w-3 h-3" /> Missing in Ledger
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-right">
                            {isMatched ? (
                              <button
                                onClick={() => {
                                  // Toggle back to unmatched
                                  const updatedItems = activeStatement.items.map((i) =>
                                    i.id === item.id ? { ...i, reconciledStatus: 'Unmatched' as const, matchedTransactionId: undefined } : i
                                  );
                                  onUpdateStatement({ ...activeStatement, items: updatedItems });
                                }}
                                className="text-[10px] text-slate-500 hover:text-slate-300 underline"
                              >
                                Unmatch
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  // Convert to Transaction and add to app ledger
                                  const newTxData: Partial<Transaction> = {
                                    date: item.date,
                                    type: item.type === 'Inflow' ? 'Income' : 'Expense',
                                    amount: item.amount,
                                    provider: item.description,
                                    description: `Imported from bank statement: ${item.description}`,
                                    category: item.type === 'Inflow' ? 'Income' : (item.categoryHint ? item.categoryHint.split('/')[0].trim() : 'Everyday'),
                                    subcategory: item.categoryHint && item.categoryHint.includes('/') ? item.categoryHint.split('/')[1].trim() : 'General',
                                    accountId: activeStatement.accountId,
                                    frequency: 'One Time',
                                    status: 'Cleared',
                                    notes: `Reconciled with statement ${activeStatement.filename}`
                                  };
                                  onAddTransactionFromStatement(newTxData, activeStatement.id, item.id);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] inline-flex items-center gap-1 shadow-sm transition-all"
                                title="Add this bank item as a transaction in your ledger and mark as matched"
                              >
                                <Plus className="w-3 h-3" />
                                <span>+ Add to Ledger</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* Unmatched Transactions in Ledger Section */}
          {activeStatementAnalysis && activeStatementAnalysis.unmatchedLedgerTxs.length > 0 && (
            <div className="bg-[#14161c] rounded-2xl border border-white/5 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>Transactions in Ledger Not Found on this Bank Statement ({activeStatementAnalysis.unmatchedLedgerTxs.length})</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    These transactions are logged in your ledger for this account during this period, but are absent from the bank statement (e.g. pending checks, manual cash items)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {activeStatementAnalysis.unmatchedLedgerTxs.map((t) => (
                  <div key={t.id} className="p-3 rounded-xl bg-[#090a0c] border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white">{t.provider}</div>
                      <div className="text-[10px] text-slate-500">{t.date} • {t.category} ({t.id})</div>
                    </div>
                    <div className="text-right">
                      <span className={`font-serif font-semibold ${t.type === 'Income' ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {t.type === 'Income' ? '+' : '-'}${t.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      ) : (
        /* STATEMENTS LIST & BROWSER VIEW */
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search statements by name or bank..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#14161c] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="bg-[#14161c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="All">All Linked Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.bankName})
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#14161c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="All">All Account Types (Credit Cards & Banks)</option>
              <option value="Credit Card">Credit Cards</option>
              <option value="Checking">Checking Accounts</option>
              <option value="Savings">Savings Accounts</option>
            </select>
          </div>

          {/* Statements Table */}
          <div className="bg-[#14161c] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-[#090a0c] border-b border-white/5 text-slate-500 uppercase font-medium text-[10px] tracking-wider">
                    <th className="py-3.5 px-4">Statement / File</th>
                    <th className="py-3.5 px-4">Statement Owner</th>
                    <th className="py-3.5 px-4">Account & Institution</th>
                    <th className="py-3.5 px-4">Period</th>
                    <th className="py-3.5 px-4 text-right">Money In</th>
                    <th className="py-3.5 px-4 text-right">Money Out</th>
                    <th className="py-3.5 px-4 text-right">Net Movement</th>
                    <th className="py-3.5 px-4 text-center">Balances</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStatements.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-slate-500">
                        <div className="max-w-sm mx-auto space-y-3">
                          <FileSpreadsheet className="w-8 h-8 text-slate-600 mx-auto" />
                          <p>No statements found matching your filter criteria.</p>
                          <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                          >
                            Import Statement Now
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStatements.map((stmt) => {
                      const acc = accounts.find((a) => a.id === stmt.accountId);
                      const matchedCount = stmt.items.filter((i) => i.reconciledStatus === 'Matched').length;
                      const matchPct = stmt.items.length > 0 ? Math.round((matchedCount / stmt.items.length) * 100) : 100;

                      return (
                        <tr
                          key={stmt.id}
                          className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                          onClick={() => setSelectedStatementId(stmt.id)}
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                              <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                              <span className="truncate max-w-[200px]" title={stmt.filename}>
                                {stmt.filename}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {stmt.items.length} line items • Imported {stmt.importedAt ? stmt.importedAt.split('T')[0] : 'Recently'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-300 shrink-0 shadow-sm">
                                {stmt.accountHolderName
                                  ? stmt.accountHolderName
                                      .split(' ')
                                      .map((n) => n[0])
                                      .join('')
                                      .slice(0, 2)
                                      .toUpperCase()
                                  : 'AM'}
                              </div>
                              <div>
                                <span className="font-semibold text-white block text-xs">
                                  {stmt.accountHolderName || 'Alex Miller'}
                                </span>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <User className="w-2.5 h-2.5 text-slate-500" /> Account Holder
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-200">
                              {acc ? acc.name : stmt.institutionName}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                stmt.accountType === 'Credit Card'
                                  ? 'bg-purple-500/10 text-purple-400'
                                  : 'bg-blue-500/10 text-blue-400'
                              }`}>
                                {stmt.accountType}
                              </span>
                              <span className="text-[10px] text-slate-500">{stmt.institutionName}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-300 text-[11px]">
                            {stmt.statementPeriodStart} <br />
                            <span className="text-slate-500 text-[10px]">to {stmt.statementPeriodEnd}</span>
                          </td>

                          <td className="py-3.5 px-4 text-right font-serif text-sm font-semibold text-emerald-400">
                            +${stmt.totalInflow.toFixed(2)}
                          </td>

                          <td className="py-3.5 px-4 text-right font-serif text-sm font-semibold text-rose-400">
                            -${stmt.totalOutflow.toFixed(2)}
                          </td>

                          <td className={`py-3.5 px-4 text-right font-serif text-sm font-semibold ${
                            stmt.netChange >= 0 ? 'text-indigo-400' : 'text-amber-400'
                          }`}>
                            {stmt.netChange >= 0 ? '+' : '-'}${Math.abs(stmt.netChange).toFixed(2)}
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-400">
                            <span>${stmt.startingBalance.toFixed(2)}</span>
                            <span className="mx-1 text-slate-600">&rarr;</span>
                            <span className="text-slate-200 font-semibold">${stmt.endingBalance.toFixed(2)}</span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              stmt.status === 'Reconciled'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {stmt.status} ({matchPct}%)
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedStatementId(stmt.id)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-semibold transition-all flex items-center gap-1"
                                title="Open cross-reference and monitoring audit"
                              >
                                <span>Audit</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleExportStatement(stmt)}
                                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                                title="Export statement CSV"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete statement "${stmt.filename}"?`)) {
                                    onDeleteStatement(stmt.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                                title="Delete statement"
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

        </div>
      )}

      {/* MODAL: Import Bank Statement CSV */}
      {isImportModalOpen && (
        <StatementImportModal
          accounts={accounts}
          transactions={transactions}
          onClose={() => setIsImportModalOpen(false)}
          onImport={(statement) => {
            onAddStatement(statement);
            setIsImportModalOpen(false);
            setSelectedStatementId(statement.id);
          }}
        />
      )}

      {/* MODAL: Manual Statement Record Entry */}
      {isManualModalOpen && (
        <ManualStatementModal
          accounts={accounts}
          onClose={() => setIsManualModalOpen(false)}
          onCreate={(statement) => {
            onAddStatement(statement);
            setIsManualModalOpen(false);
            setSelectedStatementId(statement.id);
          }}
        />
      )}

    </div>
  );
};

/* =========================================================================
   STATEMENT IMPORT MODAL COMPONENT (WITH PARSER & PREVIEW)
   ========================================================================= */

interface StatementImportModalProps {
  accounts: Account[];
  transactions: Transaction[];
  onClose: () => void;
  onImport: (statement: BankStatement) => void;
}

const StatementImportModal: React.FC<StatementImportModalProps> = ({
  accounts,
  transactions,
  onClose,
  onImport
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || 'acc-1');
  const [bankFormat, setBankFormat] = useState<string>('auto');
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<StatementItem[]>([]);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string>('');

  // Editable header fields
  const [statementStart, setStatementStart] = useState<string>('2026-08-01');
  const [statementEnd, setStatementEnd] = useState<string>('2026-08-31');
  const [startBalance, setStartBalance] = useState<number>(0);
  const [endBalance, setEndBalance] = useState<number>(0);
  const [recognizedHolderName, setRecognizedHolderName] = useState<string>('Alex Miller');
  const [holderRecognitionSource, setHolderRecognitionSource] = useState<string>('');

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  // Parse CSV file content
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsParsing(true);
    setParseError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          throw new Error('File is empty.');
        }

        // --- Recognize Statement Owner / Person Name from CSV Text or Filename ---
        let detectedName = '';
        let detectionSource = '';

        // 1. Check raw file text for name labels (common in bank exports: Name:, Cardholder:, Account Holder:)
        const nameRegex = /(?:account\s*holder|cardholder(?:\s*name)?|customer(?:\s*name)?|statement\s*for|prepared\s*for|member(?:\s*name)?|client|primary\s*owner)\s*[:=,]\s*["']?([A-Za-z\s\.\,\&'-]+?)["']?(?:\r|\n|,|$)/i;
        const nameMatch = text.match(nameRegex);
        if (nameMatch && nameMatch[1] && nameMatch[1].trim().length > 2 && !nameMatch[1].toLowerCase().includes('date') && !nameMatch[1].toLowerCase().includes('bank')) {
          detectedName = nameMatch[1].trim().replace(/^["']|["']$/g, '');
          detectionSource = 'Recognized from statement header';
        }

        // 2. Check filename for person's name (e.g. Chase_Sapphire_Alex_Miller.csv or Alex_Miller_Aug2026.csv)
        if (!detectedName && uploadedFile.name) {
          const cleanName = uploadedFile.name
            .replace(/\.[^/.]+$/, '')
            .replace(/statement|export|chase|checking|credit|card|monthly|aug|august|sep|september|oct|october|nov|dec|jan|feb|mar|apr|may|jun|jul|2026|2025|2024/gi, ' ')
            .trim();
          const words = cleanName.split(/[_\-\s]+/).filter((w) => w.length > 1 && /^[A-Za-z]+$/.test(w));
          if (words.length >= 2) {
            detectedName = words.slice(0, 2).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            detectionSource = 'Recognized from file name';
          }
        }

        if (detectedName) {
          setRecognizedHolderName(detectedName);
          setHolderRecognitionSource(detectionSource);
        } else {
          setRecognizedHolderName('Alex Miller');
          setHolderRecognitionSource('Default account holder');
        }

        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          throw new Error('CSV must contain a header row and at least one data row.');
        }

        // Header detection
        const header = lines[0].toLowerCase();
        const hasDebitCredit = header.includes('debit') && header.includes('credit');

        const items: StatementItem[] = [];
        let earliestDate = '9999-99-99';
        let latestDate = '0000-00-00';

        // Parse line items
        for (let i = 1; i < lines.length; i++) {
          const rawLine = lines[i];
          // Handle quoted commas properly
          const cols = rawLine
            .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map((c) => c.replace(/^"|"$/g, '').trim());

          if (cols.length < 2) continue;

          let date = cols[0];
          let desc = cols[1] || 'Bank Charge';
          let amount = 0;
          let flowType: 'Inflow' | 'Outflow' = 'Outflow';
          let refNo = '';
          let catHint = '';

          // Format date if MM/DD/YYYY
          if (date && date.includes('/')) {
            const parts = date.split('/');
            if (parts.length === 3) {
              const mm = parts[0].padStart(2, '0');
              const dd = parts[1].padStart(2, '0');
              const yy = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
              date = `${yy}-${mm}-${dd}`;
            }
          }

          if (date && date < earliestDate) earliestDate = date;
          if (date && date > latestDate) latestDate = date;

          if (hasDebitCredit) {
            // e.g. Date, Description, Debit, Credit
            const debitIdx = lines[0].toLowerCase().split(',').findIndex((c) => c.includes('debit'));
            const creditIdx = lines[0].toLowerCase().split(',').findIndex((c) => c.includes('credit'));
            const debitVal = parseFloat((cols[debitIdx] || '0').replace(/[^0-9.-]+/g, '')) || 0;
            const creditVal = parseFloat((cols[creditIdx] || '0').replace(/[^0-9.-]+/g, '')) || 0;

            if (debitVal > 0) {
              amount = debitVal;
              flowType = 'Outflow';
            } else if (creditVal > 0) {
              amount = creditVal;
              flowType = 'Inflow';
            }
          } else {
            // Normal amount column (look for amount in cols 2, 3, 4, etc.)
            let rawAmt = '0';
            for (let c = 2; c < cols.length; c++) {
              if (/[0-9]/.test(cols[c]) && (cols[c].includes('.') || cols[c].startsWith('$') || cols[c].startsWith('-'))) {
                rawAmt = cols[c];
                break;
              }
            }
            if (rawAmt === '0' && cols[2]) rawAmt = cols[2];

            const parsedVal = parseFloat(rawAmt.replace(/[^0-9.-]+/g, '')) || 0;
            amount = Math.abs(parsedVal);

            // In bank accounts: negative = debit/outflow, positive = deposit/inflow
            // In credit cards: positive = purchase/outflow, negative = payment/inflow
            const isCreditCard = selectedAccount?.type === 'Credit Card';
            if (isCreditCard) {
              flowType = parsedVal < 0 || desc.toLowerCase().includes('payment') || desc.toLowerCase().includes('credit') ? 'Inflow' : 'Outflow';
            } else {
              flowType = parsedVal >= 0 || desc.toLowerCase().includes('deposit') || desc.toLowerCase().includes('payroll') ? 'Inflow' : 'Outflow';
            }
          }

          if (cols[3] && isNaN(Number(cols[3]))) {
            catHint = cols[3];
          }

          // Check if matches an existing transaction
          const matchedTx = transactions.find((t) => {
            const matchesAcc = t.accountId === selectedAccountId;
            const matchesAmt = Math.abs(t.amount - amount) < 0.01;
            const matchesType = (flowType === 'Inflow' && t.type === 'Income') || (flowType === 'Outflow' && t.type === 'Expense');
            return matchesAcc && matchesAmt && matchesType;
          });

          items.push({
            id: `st-item-${Date.now()}-${i}`,
            date: date || new Date().toISOString().split('T')[0],
            description: desc,
            amount: amount,
            type: flowType,
            referenceNo: refNo || `TX-${i + 100}`,
            categoryHint: catHint || (flowType === 'Inflow' ? 'Income' : 'Everyday'),
            matchedTransactionId: matchedTx ? matchedTx.id : undefined,
            reconciledStatus: matchedTx ? 'Matched' : 'Unmatched'
          });
        }

        setParsedRows(items);
        if (earliestDate !== '9999-99-99') setStatementStart(earliestDate);
        if (latestDate !== '0000-00-00') setStatementEnd(latestDate);

        // Compute preliminary balances
        const totalIn = items.filter((i) => i.type === 'Inflow').reduce((sum, i) => sum + i.amount, 0);
        const totalOut = items.filter((i) => i.type === 'Outflow').reduce((sum, i) => sum + i.amount, 0);
        const currentAccBal = selectedAccount?.balance || 0;
        setEndBalance(currentAccBal);
        setStartBalance(currentAccBal - (totalIn - totalOut));
      } catch (err: any) {
        setParseError(err.message || 'Error parsing CSV file.');
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsText(uploadedFile);
  };

  const handleSave = () => {
    if (parsedRows.length === 0) {
      alert('Please select and parse a valid CSV bank statement.');
      return;
    }

    const totalInflow = parsedRows
      .filter((i) => i.type === 'Inflow')
      .reduce((sum, i) => sum + i.amount, 0);

    const totalOutflow = parsedRows
      .filter((i) => i.type === 'Outflow')
      .reduce((sum, i) => sum + i.amount, 0);

    const netChange = totalInflow - totalOutflow;

    const matchedCount = parsedRows.filter((i) => i.reconciledStatus === 'Matched').length;
    const status: 'Reconciled' | 'Needs Review' = matchedCount === parsedRows.length ? 'Reconciled' : 'Needs Review';

    const newStatement: BankStatement = {
      id: `stmt-${Date.now()}`,
      filename: file?.name || `Statement_${statementStart}_${statementEnd}.csv`,
      accountId: selectedAccountId,
      accountType: selectedAccount?.type || 'Checking',
      institutionName: selectedAccount?.bankName || selectedAccount?.name || 'Bank',
      accountHolderName: recognizedHolderName.trim() || 'Alex Miller',
      statementPeriodStart: statementStart,
      statementPeriodEnd: statementEnd,
      statementDate: statementEnd,
      startingBalance: startBalance,
      endingBalance: endBalance,
      totalInflow,
      totalOutflow,
      netChange,
      importedAt: new Date().toISOString(),
      items: parsedRows,
      status,
      notes: `Imported statement with ${parsedRows.length} transactions (${matchedCount} auto-matched with ledger)`
    };

    onImport(newStatement);
  };

  const totalIn = parsedRows.filter((i) => i.type === 'Inflow').reduce((sum, i) => sum + i.amount, 0);
  const totalOut = parsedRows.filter((i) => i.type === 'Outflow').reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#14161c] border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-5 my-8 shadow-2xl animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Import Bank or Credit Card Statement
              </h3>
              <p className="text-xs text-slate-400">
                Upload CSV exported from Chase, BofA, Wells Fargo, Amex, Capital One, or custom bank
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Target Account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type} • {acc.bankName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Bank Export Format
            </label>
            <select
              value={bankFormat}
              onChange={(e) => setBankFormat(e.target.value)}
              className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="auto">Auto-Detect CSV Format</option>
              <option value="chase">Chase (Checking & Credit Card)</option>
              <option value="bofa">Bank of America</option>
              <option value="wells">Wells Fargo</option>
              <option value="amex">American Express</option>
              <option value="capitalone">Capital One</option>
              <option value="generic">Standard Bank CSV (Date, Payee, Amount)</option>
            </select>
          </div>
        </div>

        {/* Statement Owner / Person (Recognized from statement) */}
        <div className="bg-[#090a0c] p-3.5 rounded-xl border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Statement Owner / Account Holder</span>
            </label>
            {holderRecognitionSource && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/20 font-medium">
                <Sparkles className="w-2.5 h-2.5" /> {holderRecognitionSource}
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. Alex Miller, John Doe"
              value={recognizedHolderName}
              onChange={(e) => setRecognizedHolderName(e.target.value)}
              className="w-full bg-[#14161c] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
            />
            <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          </div>
          <p className="text-[10px] text-slate-500">
            Identifies the person or cardholder this statement belongs to. Auto-extracted from file headers or customizable.
          </p>
        </div>

        {/* File Dropzone */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Select Statement File (.CSV)
          </label>
          <label className="border-2 border-dashed border-white/10 hover:border-indigo-500/50 bg-[#090a0c] rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors group">
            <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 transition-colors mb-2" />
            <span className="text-xs font-semibold text-slate-200">
              {file ? file.name : 'Click to browse or drop bank statement CSV here'}
            </span>
            <span className="text-[10px] text-slate-500 mt-1">
              Supports CSV files exported directly from your bank or card portal
            </span>
            <input type="file" accept=".csv,.txt" onChange={handleFileChange} className="hidden" />
          </label>
        </div>

        {parseError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Parsed Summary & Preview */}
        {parsedRows.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-white/5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2.5 rounded-xl bg-[#090a0c] border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-medium">Parsed Records</span>
                <div className="text-sm font-bold text-white mt-0.5">{parsedRows.length} items</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#090a0c] border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-medium">Statement Money In</span>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">+${totalIn.toFixed(2)}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#090a0c] border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-medium">Statement Money Out</span>
                <div className="text-sm font-bold text-rose-400 mt-0.5">-${totalOut.toFixed(2)}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#090a0c] border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-medium">Auto-Matched</span>
                <div className="text-sm font-bold text-indigo-400 mt-0.5">
                  {parsedRows.filter((i) => i.reconciledStatus === 'Matched').length} of {parsedRows.length}
                </div>
              </div>
            </div>

            {/* Date range adjustments */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Period Start</label>
                <input
                  type="date"
                  value={statementStart}
                  onChange={(e) => setStatementStart(e.target.value)}
                  className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Period End</label>
                <input
                  type="date"
                  value={statementEnd}
                  onChange={(e) => setStatementEnd(e.target.value)}
                  className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Preview sample 5 items */}
            <div className="max-h-40 overflow-y-auto rounded-xl border border-white/5 text-[11px]">
              <table className="w-full text-left">
                <thead className="bg-[#090a0c] text-slate-500 sticky top-0">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Description</th>
                    <th className="p-2">Type</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {parsedRows.slice(0, 6).map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="p-2 font-mono text-slate-400">{item.date}</td>
                      <td className="p-2 text-white truncate max-w-[180px]">{item.description}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] ${item.type === 'Inflow' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="p-2 text-right font-serif font-medium text-white">${item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={parsedRows.length === 0}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-950/50"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & Import Statement</span>
          </button>
        </div>

      </div>
    </div>
  );
};

/* =========================================================================
   MANUAL STATEMENT ENTRY MODAL
   ========================================================================= */

interface ManualStatementModalProps {
  accounts: Account[];
  onClose: () => void;
  onCreate: (statement: BankStatement) => void;
}

const ManualStatementModal: React.FC<ManualStatementModalProps> = ({
  accounts,
  onClose,
  onCreate
}) => {
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || 'acc-1');
  const [holderName, setHolderName] = useState<string>('Alex Miller');
  const [statementStart, setStatementStart] = useState<string>('2026-08-01');
  const [statementEnd, setStatementEnd] = useState<string>('2026-08-31');
  const [totalInflow, setTotalInflow] = useState<string>('0');
  const [totalOutflow, setTotalOutflow] = useState<string>('0');
  const [startBalance, setStartBalance] = useState<string>('0');
  const [endBalance, setEndBalance] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');

  const account = accounts.find((a) => a.id === accountId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inVal = parseFloat(totalInflow) || 0;
    const outVal = parseFloat(totalOutflow) || 0;
    const net = inVal - outVal;

    const newStmt: BankStatement = {
      id: `stmt-${Date.now()}`,
      filename: `Manual_${account?.bankName || 'Statement'}_${statementStart}.csv`,
      accountId,
      accountType: account?.type || 'Checking',
      institutionName: account?.bankName || 'Bank',
      accountHolderName: holderName.trim() || 'Alex Miller',
      statementPeriodStart: statementStart,
      statementPeriodEnd: statementEnd,
      statementDate: statementEnd,
      startingBalance: parseFloat(startBalance) || 0,
      endingBalance: parseFloat(endBalance) || 0,
      totalInflow: inVal,
      totalOutflow: outVal,
      netChange: net,
      importedAt: new Date().toISOString(),
      items: [
        {
          id: `item-m-${Date.now()}-1`,
          date: statementEnd,
          description: `Total Monthly Deposits & Inflows (${statementStart} to ${statementEnd})`,
          amount: inVal,
          type: 'Inflow',
          categoryHint: 'Income',
          reconciledStatus: 'Unmatched'
        },
        {
          id: `item-m-${Date.now()}-2`,
          date: statementEnd,
          description: `Total Monthly Outflows & Purchases (${statementStart} to ${statementEnd})`,
          amount: outVal,
          type: 'Outflow',
          categoryHint: 'Everyday',
          reconciledStatus: 'Unmatched'
        }
      ],
      status: 'Needs Review',
      notes: notes || 'Manually entered statement cycle.'
    };

    onCreate(newStmt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-[#14161c] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
        
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Add Statement Period Manually</span>
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Target Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.bankName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Statement Owner / Person</label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Alex Miller"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-white font-medium"
                required
              />
              <User className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Period Start</label>
              <input
                type="date"
                value={statementStart}
                onChange={(e) => setStatementStart(e.target.value)}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Period End</label>
              <input
                type="date"
                value={statementEnd}
                onChange={(e) => setStatementEnd(e.target.value)}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Statement Money In ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={totalInflow}
                onChange={(e) => setTotalInflow(e.target.value)}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Statement Money Out ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={totalOutflow}
                onChange={(e) => setTotalOutflow(e.target.value)}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Opening Balance ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={startBalance}
                onChange={(e) => setStartBalance(e.target.value)}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Ending Balance ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={endBalance}
                onChange={(e) => setEndBalance(e.target.value)}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Notes / Description</label>
            <input
              type="text"
              placeholder="e.g. August 2026 Credit Card cycle"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
            >
              Save Statement
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
