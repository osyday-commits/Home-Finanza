import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Sliders,
  DollarSign,
  ShieldAlert,
  ArrowUpRight,
  Info,
  CalendarCheck,
  Zap,
  Check,
  X,
  Filter
} from 'lucide-react';
import {
  Subscription,
  Transaction,
  SmartReminderRecommendation,
  SmartReminderAnalysisResult,
  GoogleWorkspaceState
} from '../types';
import {
  createSmartCalendarReminder,
  batchSyncSmartRemindersToCalendar,
  listUpcomingEvents
} from '../services/calendarService';

interface SmartRemindersViewProps {
  subscriptions: Subscription[];
  transactions: Transaction[];
  workspaceState?: GoogleWorkspaceState;
  onRefreshWorkspace?: () => void;
}

export const SmartRemindersView: React.FC<SmartRemindersViewProps> = ({
  subscriptions,
  transactions,
  workspaceState,
  onRefreshWorkspace
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SmartReminderAnalysisResult | null>(null);
  const [recommendations, setRecommendations] = useState<SmartReminderRecommendation[]>([]);
  const [filterUrgency, setFilterUrgency] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Synced' | 'Pending' | 'Flagged'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);

  // Safe confirmation modal state for batch syncing
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [leadDaysOverride, setLeadDaysOverride] = useState<number | null>(null);

  // Run initial AI analysis on mount if subscriptions exist
  useEffect(() => {
    runAiAnalysis();
  }, [subscriptions.length]);

  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    setSyncSuccessMsg(null);
    setSyncErrorMsg(null);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/ai/smart-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptions,
          transactions: transactions.slice(0, 30),
          currentDate: todayStr,
          preferences: {
            preferredLeadDays: leadDaysOverride || 3
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to analyze subscriptions with Gemini AI.');
      }

      const responseData = await res.json();
      if (responseData.success && responseData.data) {
        setAnalysisResult(responseData.data);
        setRecommendations(responseData.data.recommendations || []);
      }
    } catch (err: any) {
      console.error('Smart Reminder Analysis error:', err);
      setSyncErrorMsg(err.message || 'Failed to analyze subscriptions.');
      // Fallback: generate local structured baseline recommendations if offline
      generateFallbackRecommendations();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateFallbackRecommendations = () => {
    const today = new Date();
    const fallbackList: SmartReminderRecommendation[] = subscriptions.map((sub) => {
      const isYearly = sub.billingCycle === 'Yearly';
      const leadDays = isYearly ? 7 : 3;
      const dueDate = sub.nextBillingDate || new Date(today.getFullYear(), today.getMonth(), 15).toISOString().split('T')[0];

      return {
        subscriptionId: sub.id,
        provider: sub.provider || sub.name,
        name: sub.name || sub.provider,
        amount: sub.amount,
        billingCycle: sub.billingCycle,
        predictedDueDate: dueDate,
        confidence: 0.9,
        optimalReminderLeadDays: leadDays,
        notificationLeadMinutes: isYearly ? [10080, 4320, 1440] : [4320, 1440, 120],
        calendarEventTitle: `💳 Bill Due: ${sub.name || sub.provider} ($${sub.amount.toFixed(2)}) - Aura Smart Reminder`,
        calendarEventDescription: `Automated bill reminder for ${sub.name || sub.provider}. Due date: ${dueDate}. Amount: $${sub.amount.toFixed(2)} (${sub.billingCycle}).`,
        urgencyLevel: sub.amount > 50 || isYearly ? 'High' : 'Medium',
        aiInsight: isYearly
          ? `Yearly billing of $${sub.amount.toFixed(2)} renewal scheduled on ${dueDate}. Check renewal options.`
          : `Regular monthly renewal for ${sub.name || sub.provider}.`,
        isFlaggedForReview: isYearly || sub.amount > 100,
        category: sub.category
      };
    });

    const totalMonthly = fallbackList.reduce((acc, r) => acc + (r.billingCycle === 'Yearly' ? r.amount / 12 : r.amount), 0);
    const totalAnnual = totalMonthly * 12;

    setAnalysisResult({
      analysisSummary: `Generated schedule for ${fallbackList.length} active subscription services.`,
      totalMonthlyObligations: totalMonthly,
      totalAnnualObligations: totalAnnual,
      activeSubscriptionsCount: fallbackList.length,
      highRiskAlerts: fallbackList.filter((r) => r.urgencyLevel === 'High').map((r) => `${r.name}: High amount ($${r.amount}) with upcoming renewal`),
      recommendations: fallbackList,
      analyzedAt: new Date().toISOString()
    });
    setRecommendations(fallbackList);
  };

  // Sync single reminder to Google Calendar
  const handleSyncSingleReminder = async (rec: SmartReminderRecommendation) => {
    setSyncingId(rec.subscriptionId || rec.name);
    setSyncSuccessMsg(null);
    setSyncErrorMsg(null);

    try {
      const createdEvent = await createSmartCalendarReminder(rec);
      setRecommendations((prev) =>
        prev.map((item) =>
          (item.subscriptionId === rec.subscriptionId && item.name === rec.name)
            ? { ...item, isSyncedToCalendar: true, calendarEventId: createdEvent.id }
            : item
        )
      );
      setSyncSuccessMsg(`Scheduled notification for "${rec.name}" on Google Calendar with ${rec.optimalReminderLeadDays}-day advance alerts!`);
      if (onRefreshWorkspace) onRefreshWorkspace();
    } catch (err: any) {
      console.error('Failed to sync reminder:', err);
      setSyncErrorMsg(`Google Calendar sync error: ${err.message || 'Check connection'}`);
    } finally {
      setSyncingId(null);
    }
  };

  // Batch sync all filtered reminders to Google Calendar
  const handleBatchSyncConfirm = async () => {
    setIsConfirmModalOpen(false);
    setIsBatchSyncing(true);
    setSyncSuccessMsg(null);
    setSyncErrorMsg(null);

    try {
      const toSync = filteredRecommendations.filter((r) => !r.isSyncedToCalendar);
      if (toSync.length === 0) {
        setSyncSuccessMsg('All selected smart reminders are already synced to Google Calendar!');
        setIsBatchSyncing(false);
        return;
      }

      const result = await batchSyncSmartRemindersToCalendar(toSync);
      
      // Update local state
      setRecommendations((prev) =>
        prev.map((rec) => {
          const matched = result.updatedRecommendations.find(
            (u) => u.subscriptionId === rec.subscriptionId || u.name === rec.name
          );
          return matched || rec;
        })
      );

      if (result.errors.length > 0) {
        setSyncErrorMsg(`Synced ${result.syncedCount} events with ${result.errors.length} errors.`);
      } else {
        setSyncSuccessMsg(`Successfully scheduled ${result.syncedCount} bill notifications on your Google Calendar!`);
      }

      if (onRefreshWorkspace) onRefreshWorkspace();
    } catch (err: any) {
      console.error('Batch sync error:', err);
      setSyncErrorMsg(err.message || 'Failed to batch sync reminders to Google Calendar.');
    } finally {
      setIsBatchSyncing(false);
    }
  };

  // Filter recommendations
  const filteredRecommendations = recommendations.filter((rec) => {
    if (filterUrgency !== 'All' && rec.urgencyLevel !== filterUrgency) return false;
    if (filterStatus === 'Synced' && !rec.isSyncedToCalendar) return false;
    if (filterStatus === 'Pending' && rec.isSyncedToCalendar) return false;
    if (filterStatus === 'Flagged' && !rec.isFlaggedForReview) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        rec.name.toLowerCase().includes(term) ||
        rec.provider.toLowerCase().includes(term) ||
        rec.aiInsight.toLowerCase().includes(term) ||
        (rec.category && rec.category.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const getDaysUntilDue = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-950/60 via-[#14161c] to-[#0d0f14] p-6 rounded-2xl border border-indigo-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Gemini 3.7 Flash Cadence Intelligence</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              Smart Bill Reminders & Calendar Alerts
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Gemini analyzes your subscription frequency, billing cadence, and renewal windows to automatically schedule proactive popup alerts on your Google Calendar before charges occur.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={runAiAnalysis}
              disabled={isAnalyzing}
              className="px-4 py-2.5 rounded-xl bg-[#1e2230] hover:bg-[#282d40] text-slate-200 text-xs font-semibold flex items-center gap-2 border border-white/10 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
              <span>{isAnalyzing ? 'Analyzing Cadence...' : 'Re-Analyze with AI'}</span>
            </button>

            <button
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={isBatchSyncing || isAnalyzing || filteredRecommendations.length === 0}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-950/60 border border-indigo-400/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>
                {isBatchSyncing ? 'Scheduling Events...' : `Sync ${filteredRecommendations.filter(r => !r.isSyncedToCalendar).length} to Google Calendar`}
              </span>
            </button>
          </div>
        </div>

        {/* Feedback messages */}
        {syncSuccessMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-300 text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncSuccessMsg}</span>
            </div>
            <button onClick={() => setSyncSuccessMsg(null)} className="text-emerald-400/60 hover:text-emerald-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {syncErrorMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-300 text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{syncErrorMsg}</span>
            </div>
            <button onClick={() => setSyncErrorMsg(null)} className="text-rose-400/60 hover:text-rose-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* AI Summary KPI Cards */}
      {analysisResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 shadow-md hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Monthly Obligations</span>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white font-serif mt-1">
              ${analysisResult.totalMonthlyObligations.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Projected monthly recurring bills
            </div>
          </div>

          <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 shadow-md hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Annual Projected</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white font-serif mt-1">
              ${analysisResult.totalAnnualObligations.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Annual recurring cost across {analysisResult.activeSubscriptionsCount} services
            </div>
          </div>

          <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 shadow-md hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Calendar Sync Status</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white font-serif mt-1">
              {recommendations.filter(r => r.isSyncedToCalendar).length} / {recommendations.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Bills scheduled on primary Google Calendar
            </div>
          </div>

          <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 shadow-md hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Attention & Risk Alerts</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white font-serif mt-1">
              {analysisResult.highRiskAlerts.length} Flagged
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              High amount, trials, or renewal cutoffs
            </div>
          </div>
        </div>
      )}

      {/* AI Executive Summary & Alerts Callout */}
      {analysisResult && (
        <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 mt-0.5 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white">AI Recurring Cadence Assessment</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {analysisResult.analysisSummary}
              </p>
            </div>
          </div>

          {analysisResult.highRiskAlerts.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
              <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Attention Recommendations ({analysisResult.highRiskAlerts.length})</span>
              </div>
              <ul className="space-y-1 pl-5 list-disc text-xs text-amber-200/90">
                {analysisResult.highRiskAlerts.map((alert, idx) => (
                  <li key={idx}>{alert}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#14161c] p-4 rounded-2xl border border-white/5">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search provider, AI insight, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Urgency Filter */}
          <div className="flex items-center bg-[#090a0c] p-1 rounded-xl border border-white/10 text-xs">
            <span className="text-[10px] text-slate-400 px-2 font-medium">Urgency:</span>
            {(['All', 'High', 'Medium', 'Low'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterUrgency(lvl)}
                className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                  filterUrgency === lvl
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Sync Status Filter */}
          <div className="flex items-center bg-[#090a0c] p-1 rounded-xl border border-white/10 text-xs">
            <span className="text-[10px] text-slate-400 px-2 font-medium">Status:</span>
            {(['All', 'Pending', 'Synced', 'Flagged'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                  filterStatus === st
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecommendations.map((rec) => {
          const daysUntil = getDaysUntilDue(rec.predictedDueDate);
          const isDueSoon = daysUntil <= 3 && daysUntil >= 0;
          const isOverdue = daysUntil < 0;

          return (
            <div
              key={rec.subscriptionId || rec.name}
              className={`bg-[#14161c] rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 hover:border-white/20 relative overflow-hidden group shadow-lg ${
                rec.urgencyLevel === 'High'
                  ? 'border-rose-500/30'
                  : rec.urgencyLevel === 'Medium'
                  ? 'border-amber-500/20'
                  : 'border-white/5'
              }`}
            >
              {/* Top Card Header */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 text-base font-serif">
                      {rec.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white leading-tight">
                        {rec.name}
                      </h3>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>{rec.provider}</span>
                        {rec.category && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500">{rec.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-white font-serif">
                      ${rec.amount.toFixed(2)}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                      {rec.billingCycle}
                    </span>
                  </div>
                </div>

                {/* Due Date & Urgency Row */}
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#090a0c] border border-white/5 mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Due Date</div>
                      <div className="text-xs font-semibold text-white">{rec.predictedDueDate}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Cadence Status</div>
                    <div className={`text-xs font-bold ${
                      isOverdue
                        ? 'text-rose-400'
                        : isDueSoon
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}>
                      {isOverdue
                        ? `${Math.abs(daysUntil)}d past due`
                        : daysUntil === 0
                        ? 'Due Today'
                        : `In ${daysUntil} days`}
                    </div>
                  </div>
                </div>

                {/* Gemini AI Insight */}
                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 mb-3 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Gemini Cadence Insight</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {rec.aiInsight}
                  </p>
                  {rec.cancellationWindowNotes && (
                    <div className="text-[11px] text-amber-300/90 pt-1 border-t border-indigo-500/10">
                      ⚠️ {rec.cancellationWindowNotes}
                    </div>
                  )}
                </div>

                {/* Notification Alarm Lead Times */}
                <div className="mb-4">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
                    <Bell className="w-3 h-3 text-indigo-400" />
                    <span>Google Calendar Popups:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] bg-[#090a0c] text-indigo-300 px-2 py-1 rounded-md border border-white/10 font-mono">
                      {rec.optimalReminderLeadDays} days prior
                    </span>
                    <span className="text-[10px] bg-[#090a0c] text-slate-300 px-2 py-1 rounded-md border border-white/10 font-mono">
                      1 day prior
                    </span>
                    <span className="text-[10px] bg-[#090a0c] text-slate-400 px-2 py-1 rounded-md border border-white/10 font-mono">
                      2 hrs prior
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Sync Action */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                {rec.isSyncedToCalendar ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Scheduled on Calendar</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Not scheduled yet
                  </span>
                )}

                <button
                  onClick={() => handleSyncSingleReminder(rec)}
                  disabled={syncingId === (rec.subscriptionId || rec.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    rec.isSyncedToCalendar
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/10'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/40'
                  }`}
                >
                  <CalendarCheck className={`w-3.5 h-3.5 ${syncingId === (rec.subscriptionId || rec.name) ? 'animate-spin' : ''}`} />
                  <span>
                    {syncingId === (rec.subscriptionId || rec.name)
                      ? 'Syncing...'
                      : rec.isSyncedToCalendar
                      ? 'Re-Sync Alert'
                      : 'Set Reminder'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredRecommendations.length === 0 && (
        <div className="p-12 text-center bg-[#14161c] rounded-2xl border border-white/5">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-white">No Smart Reminders Match Filter</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query, urgency filter, or status filter above.
          </p>
        </div>
      )}

      {/* Confirmation Modal for Batch Calendar Scheduling */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#14161c] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-indigo-400">
                <CalendarCheck className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white">Confirm Google Calendar Sync</h3>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to schedule <strong>{filteredRecommendations.filter(r => !r.isSyncedToCalendar).length}</strong> smart bill due date reminders onto your primary Google Calendar.
            </p>

            <div className="p-4 rounded-xl bg-[#090a0c] border border-white/5 space-y-2 max-h-48 overflow-y-auto">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Events to be created:</div>
              {filteredRecommendations.filter(r => !r.isSyncedToCalendar).map((r, i) => (
                <div key={i} className="text-xs text-slate-200 flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                  <span className="font-medium">{r.name} (${r.amount.toFixed(2)})</span>
                  <span className="text-indigo-400 font-mono">{r.predictedDueDate} ({r.optimalReminderLeadDays}d lead)</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchSyncConfirm}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/50 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Schedule All</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
