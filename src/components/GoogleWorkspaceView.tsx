import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Mail, 
  Calendar, 
  Cloud, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Upload, 
  Download, 
  Plus, 
  Send, 
  Trash2, 
  Clock, 
  Tag, 
  ArrowRight, 
  Sparkles, 
  AlertTriangle,
  FolderCheck,
  Search,
  Check
} from 'lucide-react';
import { 
  FinancialDataStore, 
  GoogleWorkspaceState, 
  GmailMessageItem, 
  GoogleCalendarEvent, 
  GoogleSheetMeta, 
  Transaction,
  DriveSyncState 
} from '../types';
import { 
  signInWithGoogleDrive, 
  logoutFromGoogleDrive, 
  getCachedAccessToken 
} from '../services/driveService';
import { 
  exportStoreToGoogleSheets, 
  importTransactionsFromGoogleSheet, 
  getSavedSheetsMeta 
} from '../services/sheetsService';
import { 
  searchFinancialEmails, 
  sendFinancialEmail 
} from '../services/gmailService';
import { 
  listUpcomingEvents, 
  syncSubscriptionsToCalendar, 
  createFinancialCalendarEvent, 
  deleteCalendarEvent 
} from '../services/calendarService';
import { SmartRemindersView } from './SmartRemindersView';

interface GoogleWorkspaceViewProps {
  store: FinancialDataStore;
  driveState: DriveSyncState;
  onAddTransaction: (tx: Partial<Transaction>) => void;
  onRefreshDrive: () => Promise<void>;
}

type WorkspaceSubTab = 'smart-reminders' | 'calendar' | 'sheets' | 'gmail' | 'drive';

export const GoogleWorkspaceView: React.FC<GoogleWorkspaceViewProps> = ({
  store,
  driveState,
  onAddTransaction,
  onRefreshDrive
}) => {
  const [activeSubTab, setActiveSubTab] = useState<WorkspaceSubTab>('smart-reminders');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Sheets State
  const [sheetsMeta, setSheetsMeta] = useState<GoogleSheetMeta | null>(() => getSavedSheetsMeta());
  const [customSheetId, setCustomSheetId] = useState('');
  const [customSheetTab, setCustomSheetTab] = useState('Transactions');

  // Gmail State
  const [gmailQuery, setGmailQuery] = useState('receipt OR invoice OR subscription OR payment OR order');
  const [gmailMessages, setGmailMessages] = useState<GmailMessageItem[]>([]);
  const [isSearchingGmail, setIsSearchingGmail] = useState(false);
  const [importedMsgIds, setImportedMsgIds] = useState<Set<string>>(new Set());

  // Email Send Modal State
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState(driveState.userEmail || '');
  const [emailSubject, setEmailSubject] = useState('My Monthly Financial Summary - Aura Finance');

  // Calendar State
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventAmount, setNewEventAmount] = useState('');
  const [newEventNotes, setNewEventNotes] = useState('');

  // Confirmation Modals (Destructive / Mutating operations per guidelines)
  const [showSheetsConfirmModal, setShowSheetsConfirmModal] = useState(false);
  const [showCalendarSyncModal, setShowCalendarSyncModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<GoogleCalendarEvent | null>(null);

  useEffect(() => {
    if (driveState.isConnected) {
      if (activeSubTab === 'calendar') {
        loadCalendarEvents();
      } else if (activeSubTab === 'gmail' && gmailMessages.length === 0) {
        handleSearchGmail();
      }
    }
  }, [activeSubTab, driveState.isConnected]);

  const loadCalendarEvents = async () => {
    setIsLoadingCalendar(true);
    try {
      const events = await listUpcomingEvents();
      setCalendarEvents(events);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  const handleGoogleConnect = async () => {
    setIsLoading(true);
    setMessage('');
    setErrorMessage('');
    try {
      const result = await signInWithGoogleDrive();
      if (result) {
        setMessage(`Connected with Google Workspace (${result.user.email})!`);
        setEmailRecipient(result.user.email || '');
        setTimeout(() => setMessage(''), 3500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to connect Google account.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== SHEETS HANDLERS ====================
  const handleExportSheets = async () => {
    setIsLoading(true);
    setMessage('');
    setErrorMessage('');
    setShowSheetsConfirmModal(false);
    try {
      const meta = await exportStoreToGoogleSheets(store);
      setSheetsMeta(meta);
      setMessage('Successfully synced all financial data into Google Sheets!');
      setTimeout(() => setMessage(''), 4500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to export to Google Sheets.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportSheets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSheetId.trim()) {
      setErrorMessage('Please enter a valid Google Spreadsheet ID or URL.');
      return;
    }
    // Extract ID if full URL pasted
    let cleanId = customSheetId.trim();
    const match = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      cleanId = match[1];
    }

    setIsLoading(true);
    setMessage('');
    setErrorMessage('');
    try {
      const imported = await importTransactionsFromGoogleSheet(cleanId, customSheetTab);
      if (imported.length === 0) {
        setMessage('No transaction rows found in that sheet tab.');
      } else {
        imported.forEach((t) => onAddTransaction(t));
        setMessage(`Successfully imported ${imported.length} transactions from Google Sheets!`);
        setCustomSheetId('');
      }
      setTimeout(() => setMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to import from Google Sheet.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== GMAIL HANDLERS ====================
  const handleSearchGmail = async () => {
    setIsSearchingGmail(true);
    setMessage('');
    setErrorMessage('');
    try {
      const results = await searchFinancialEmails(gmailQuery);
      setGmailMessages(results);
      if (results.length === 0) {
        setMessage('No matching financial receipts or emails found for that query.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to search Gmail messages.');
    } finally {
      setIsSearchingGmail(false);
    }
  };

  const handleImportGmailReceipt = (msg: GmailMessageItem) => {
    const newTx: Partial<Transaction> = {
      id: `GMAIL-${msg.id.slice(-6)}`,
      date: new Date(msg.date).toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      type: 'Expense',
      category: msg.extractedCategory || 'Everyday',
      subcategory: 'Receipt',
      description: msg.extractedMerchant || msg.subject,
      provider: msg.extractedMerchant || 'Email Merchant',
      amount: msg.extractedAmount || 0,
      frequency: 'One Time',
      notes: `Extracted from Gmail: "${msg.subject}" (From: ${msg.from})`,
      status: 'Cleared'
    };

    onAddTransaction(newTx);
    setImportedMsgIds((prev) => new Set([...prev, msg.id]));
    setMessage(`Imported transaction: ${newTx.description} ($${newTx.amount}) from Gmail!`);
    setTimeout(() => setMessage(''), 3500);
  };

  const handleSendSummaryEmail = async () => {
    if (!emailRecipient.trim()) {
      setErrorMessage('Please provide a recipient email address.');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setErrorMessage('');
    setShowSendEmailModal(false);

    try {
      const totalIncome = store.transactions
        .filter((t) => t.type === 'Income')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = store.transactions
        .filter((t) => t.type === 'Expense')
        .reduce((sum, t) => sum + t.amount, 0);
      const netSavings = totalIncome - totalExpenses;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
          <div style="background: #4f46e5; color: #ffffff; padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Aura Finance - Financial Summary</h1>
            <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Automated report generated on ${new Date().toLocaleDateString()}</p>
          </div>
          <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; background: #ffffff;">
            <h2 style="font-size: 18px; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">Monthly Overview</h2>
            <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Total Income:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #10b981;">$${totalIncome.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Total Expenses:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #f43f5e;">$${totalExpenses.toFixed(2)}</td>
              </tr>
              <tr style="border-top: 1px solid #e2e8f0;">
                <td style="padding: 10px 0; font-weight: bold; color: #0f172a;">Net Savings:</td>
                <td style="padding: 10px 0; text-align: right; font-weight: bold; color: ${netSavings >= 0 ? '#10b981' : '#f43f5e'}; font-size: 16px;">$${netSavings.toFixed(2)}</td>
              </tr>
            </table>

            <h3 style="font-size: 16px; margin-top: 20px; color: #0f172a;">Active Subscriptions (${store.subscriptions.length})</h3>
            <ul style="padding-left: 20px; color: #475569;">
              ${store.subscriptions.map((s) => `<li><strong>${s.name || s.provider}</strong>: $${s.amount.toFixed(2)} / ${s.billingCycle} (Due: ${s.nextBillingDate || 'Monthly'})</li>`).join('')}
            </ul>

            <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">
              This email was dispatched securely from Aura Finance via your linked Google Workspace account.
            </p>
          </div>
        </div>
      `;

      await sendFinancialEmail(emailRecipient, emailSubject, htmlBody);
      setMessage(`Financial report email successfully sent to ${emailRecipient}!`);
      setTimeout(() => setMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send email via Gmail.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== CALENDAR HANDLERS ====================
  const handleSyncCalendar = async () => {
    setIsLoadingCalendar(true);
    setMessage('');
    setErrorMessage('');
    setShowCalendarSyncModal(false);
    try {
      const result = await syncSubscriptionsToCalendar(store.subscriptions, store.savingsGoals);
      setMessage(`Successfully scheduled ${result.addedCount} bill due dates and savings milestones on Google Calendar!`);
      await loadCalendarEvents();
      setTimeout(() => setMessage(''), 4500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sync with Google Calendar.');
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  const handleCreateCustomEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) {
      setErrorMessage('Please provide an event title.');
      return;
    }

    setIsLoadingCalendar(true);
    setMessage('');
    setErrorMessage('');
    setShowAddEventModal(false);
    try {
      const parsedAmt = newEventAmount ? parseFloat(newEventAmount) : undefined;
      await createFinancialCalendarEvent(newEventTitle, newEventDate, parsedAmt, newEventNotes);
      setMessage(`Created reminder "${newEventTitle}" on Google Calendar for ${newEventDate}!`);
      setNewEventTitle('');
      setNewEventAmount('');
      setNewEventNotes('');
      await loadCalendarEvents();
      setTimeout(() => setMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create calendar event.');
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  const handleDeleteCalendarEvent = async () => {
    if (!eventToDelete) return;
    setIsLoadingCalendar(true);
    setMessage('');
    setErrorMessage('');
    const eventName = eventToDelete.summary;
    const eventId = eventToDelete.id;
    setEventToDelete(null);

    try {
      await deleteCalendarEvent(eventId);
      setMessage(`Removed "${eventName}" from Google Calendar.`);
      await loadCalendarEvents();
      setTimeout(() => setMessage(''), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete calendar event.');
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="google-workspace-hub">
      
      {/* Top Banner Bar */}
      <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Google Workspace Integration Hub
              </h2>
              <p className="text-xs text-slate-400">
                Connected Google Sheets spreadsheets, Gmail receipt intelligence, Google Calendar bill reminders & Google Drive backup.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!driveState.isConnected ? (
            <button
              onClick={handleGoogleConnect}
              disabled={isLoading}
              className="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" /> : <Cloud className="w-4 h-4 text-indigo-600" />}
              <span>Sign in with Google</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5 bg-[#090a0c] px-3 py-1.5 rounded-xl border border-white/5 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-medium">{driveState.userEmail}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-2xl flex items-center gap-2 font-medium shadow-md">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-2xl flex items-center gap-2 font-medium shadow-md">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Workspace App Sub-Navigation */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('smart-reminders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'smart-reminders'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/60 border border-indigo-400/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#14161c]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-300 animate-pulse" />
          <span>Gemini Smart Reminders</span>
        </button>

        <button
          onClick={() => setActiveSubTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'calendar'
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#14161c]'
          }`}
        >
          <Calendar className="w-4 h-4 text-blue-400" />
          <span>Google Calendar Reminders</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sheets')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'sheets'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#14161c]'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Google Sheets</span>
        </button>

        <button
          onClick={() => setActiveSubTab('gmail')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'gmail'
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#14161c]'
          }`}
        >
          <Mail className="w-4 h-4 text-rose-400" />
          <span>Gmail Receipt Scanner</span>
        </button>

        <button
          onClick={() => setActiveSubTab('drive')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'drive'
              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#14161c]'
          }`}
        >
          <Cloud className="w-4 h-4 text-indigo-400" />
          <span>Google Drive Cloud Folder</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 0. GEMINI SMART REMINDERS & CADENCE INTELLIGENCE TAB                      */}
      {/* ========================================================================= */}
      {activeSubTab === 'smart-reminders' && (
        <SmartRemindersView
          subscriptions={store.subscriptions}
          transactions={store.transactions}
          workspaceState={{
            isConnected: driveState.isConnected,
            userEmail: driveState.userEmail,
            userName: driveState.userName,
            userPhoto: driveState.userPhoto
          }}
          onRefreshWorkspace={loadCalendarEvents}
        />
      )}

      {/* ========================================================================= */}
      {/* 1. GOOGLE SHEETS TAB                                                      */}
      {/* ========================================================================= */}
      {activeSubTab === 'sheets' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Live Sheets Sync Card */}
            <div className="lg:col-span-2 bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Google Sheets Live Financial Export</h3>
                    <p className="text-xs text-slate-400">Formats multi-tab spreadsheet with real-time numbers</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSheetsConfirmModal(true)}
                  disabled={isLoading || !driveState.isConnected}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-lg transition-all"
                >
                  <Upload className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Sync to Google Sheets</span>
                </button>
              </div>

              {/* Connected Spreadsheet Status */}
              <div className="bg-[#090a0c] p-4 rounded-xl border border-white/5 space-y-3 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Spreadsheet Name:</span>
                  <div className="flex items-center gap-2">
                    <strong className="text-white">{sheetsMeta?.title || 'Aura Finance - Live Dashboard (2026)'}</strong>
                    {sheetsMeta?.spreadsheetUrl && (
                      <a
                        href={sheetsMeta.spreadsheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                        title="Open spreadsheet in Google Sheets"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in Google Sheets</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Tabs Included:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Transactions', 'Budgets', 'Accounts', 'Subscriptions', 'Inventory'].map((tab) => (
                      <span key={tab} className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium">
                        {tab}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Last Synced to Sheets:</span>
                  <strong className="text-slate-300">
                    {sheetsMeta?.lastExportedAt ? new Date(sheetsMeta.lastExportedAt).toLocaleString() : 'Not yet exported'}
                  </strong>
                </div>
              </div>

              {/* Data Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center">
                <div className="bg-[#090a0c] p-3 rounded-xl border border-white/5">
                  <div className="text-[11px] text-slate-400">Transactions</div>
                  <div className="text-base font-bold text-white mt-0.5">{store.transactions.length}</div>
                </div>
                <div className="bg-[#090a0c] p-3 rounded-xl border border-white/5">
                  <div className="text-[11px] text-slate-400">Budgets</div>
                  <div className="text-base font-bold text-white mt-0.5">{store.budgets.length}</div>
                </div>
                <div className="bg-[#090a0c] p-3 rounded-xl border border-white/5">
                  <div className="text-[11px] text-slate-400">Accounts</div>
                  <div className="text-base font-bold text-white mt-0.5">{store.accounts.length}</div>
                </div>
                <div className="bg-[#090a0c] p-3 rounded-xl border border-white/5">
                  <div className="text-[11px] text-slate-400">Inventory Items</div>
                  <div className="text-base font-bold text-white mt-0.5">{store.inventory?.length || 0}</div>
                </div>
              </div>
            </div>

            {/* Import from Google Sheet Card */}
            <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-4 shadow-xl">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Import from Sheets</h3>
                  <p className="text-[11px] text-slate-400">Pull rows from any spreadsheet</p>
                </div>
              </div>

              <form onSubmit={handleImportSheets} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Spreadsheet ID or URL</label>
                  <input
                    type="text"
                    placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    value={customSheetId}
                    onChange={(e) => setCustomSheetId(e.target.value)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Sheet Tab Name</label>
                  <input
                    type="text"
                    placeholder="Transactions"
                    value={customSheetTab}
                    onChange={(e) => setCustomSheetTab(e.target.value)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !driveState.isConnected}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all mt-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Import Transactions</span>
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. GMAIL RECEIPT SCANNER TAB                                              */}
      {/* ========================================================================= */}
      {activeSubTab === 'gmail' && (
        <div className="space-y-6">
          
          {/* Controls Bar */}
          <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Gmail Financial Receipt & Invoice Scanner</h3>
                  <p className="text-xs text-slate-400">Searches inbox for receipts, orders, and payment confirmations</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSendEmailModal(true)}
                  disabled={!driveState.isConnected}
                  className="px-3.5 py-2 rounded-xl bg-[#090a0c] hover:bg-white/5 text-slate-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Send Financial Report Email</span>
                </button>

                <button
                  onClick={handleSearchGmail}
                  disabled={isSearchingGmail || !driveState.isConnected}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-colors"
                >
                  <Search className={`w-3.5 h-3.5 ${isSearchingGmail ? 'animate-spin' : ''}`} />
                  <span>{isSearchingGmail ? 'Searching Inbox...' : 'Scan Gmail'}</span>
                </button>
              </div>
            </div>

            {/* Query Filter Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={gmailQuery}
                onChange={(e) => setGmailQuery(e.target.value)}
                placeholder="Search filter (e.g. receipt OR invoice OR order OR uber OR starbucks)"
                className="flex-1 bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
              />
              <button
                onClick={handleSearchGmail}
                disabled={isSearchingGmail || !driveState.isConnected}
                className="px-4 py-2 rounded-xl bg-[#090a0c] hover:bg-white/5 text-slate-200 border border-white/10 text-xs font-semibold transition-colors"
              >
                Filter
              </button>
            </div>
          </div>

          {/* Extracted Gmail Items List */}
          <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-4 shadow-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Extracted Financial Emails & Receipts ({gmailMessages.length})
            </h4>

            {gmailMessages.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs space-y-2">
                <Mail className="w-8 h-8 mx-auto text-slate-600" />
                <p>No financial messages loaded. Click "Scan Gmail" to search your inbox for receipts and invoices.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {gmailMessages.map((msg) => {
                  const isImported = importedMsgIds.has(msg.id);
                  return (
                    <div key={msg.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/5 p-3 rounded-xl transition-colors">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{msg.extractedMerchant || msg.from}</span>
                          <span className="text-[10px] text-slate-400">• {new Date(msg.date).toLocaleDateString()}</span>
                          {msg.extractedCategory && (
                            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-medium">
                              {msg.extractedCategory}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-300 font-medium">{msg.subject}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{msg.snippet}</div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {msg.extractedAmount !== undefined && (
                          <div className="text-sm font-bold text-emerald-400 font-serif">
                            ${msg.extractedAmount.toFixed(2)}
                          </div>
                        )}
                        <button
                          onClick={() => handleImportGmailReceipt(msg)}
                          disabled={isImported}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            isImported
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                          }`}
                        >
                          {isImported ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>{isImported ? 'Imported' : 'Add to Transactions'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. GOOGLE CALENDAR TAB                                                    */}
      {/* ========================================================================= */}
      {activeSubTab === 'calendar' && (
        <div className="space-y-6">
          
          {/* Calendar Header Card */}
          <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Google Calendar Financial Due Dates & Reminders</h3>
                  <p className="text-xs text-slate-400">Automatically sync bill renewal dates and savings milestones</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddEventModal(true)}
                  disabled={!driveState.isConnected}
                  className="px-3.5 py-2 rounded-xl bg-[#090a0c] hover:bg-white/5 text-slate-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-400" />
                  <span>Add Reminder</span>
                </button>

                <button
                  onClick={() => setShowCalendarSyncModal(true)}
                  disabled={isLoadingCalendar || !driveState.isConnected}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCalendar ? 'animate-spin' : ''}`} />
                  <span>Sync Subscriptions to Calendar</span>
                </button>
              </div>
            </div>

            {/* Upcoming Financial Events List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Upcoming Google Calendar Financial Events ({calendarEvents.length})
                </h4>
                <button
                  onClick={loadCalendarEvents}
                  disabled={isLoadingCalendar || !driveState.isConnected}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingCalendar ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {calendarEvents.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs space-y-2 bg-[#090a0c] rounded-xl border border-white/5">
                  <Calendar className="w-8 h-8 mx-auto text-slate-600" />
                  <p>No upcoming events loaded. Click "Sync Subscriptions to Calendar" to create due date reminders.</p>
                </div>
              ) : (
                <div className="bg-[#090a0c] rounded-xl border border-white/5 divide-y divide-white/5">
                  {calendarEvents.map((ev) => {
                    const eventDate = ev.start.date || ev.start.dateTime || '';
                    return (
                      <div key={ev.id} className="p-3.5 flex items-center justify-between hover:bg-white/5 transition-colors text-xs">
                        <div className="space-y-1">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{ev.summary}</span>
                            {ev.isFinancialReminder && (
                              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-semibold border border-blue-500/20">
                                Financial Alert
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{eventDate ? new Date(eventDate).toLocaleDateString() : 'Scheduled'}</span>
                            {ev.description && <span>• {ev.description}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {ev.htmlLink && (
                            <a
                              href={ev.htmlLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-[#14161c] hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                              title="Open in Google Calendar"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => setEventToDelete(ev)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="Delete event from Google Calendar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. GOOGLE DRIVE SUMMARY TAB                                               */}
      {/* ========================================================================= */}
      {activeSubTab === 'drive' && (
        <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Google Drive Cloud Storage Folder</h3>
                <p className="text-xs text-slate-400">Dedicated Directory: "Home Finance Data"</p>
              </div>
            </div>
            {driveState.folderId && (
              <a
                href={`https://drive.google.com/drive/folders/${driveState.folderId}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Folder in Google Drive</span>
              </a>
            )}
          </div>

          <div className="bg-[#090a0c] p-4 rounded-xl border border-white/5 space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Account:</span>
              <strong className="text-white">{driveState.userEmail || 'Not linked'}</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Dedicated Drive Folder:</span>
              <strong className="text-amber-400">{driveState.folderName || 'Home Finance Data'}</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Storage Payload File:</span>
              <strong className="font-mono text-emerald-400">{driveState.fileName || 'home_finance_backup.json'}</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Last Synchronized:</span>
              <strong className="text-slate-300">{driveState.lastSyncedAt ? new Date(driveState.lastSyncedAt).toLocaleString() : 'Never'}</strong>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION MODALS (REQUIRED FOR MUTATING / DESTRUCTIVE WORKSPACE ACTIONS)*/}
      {/* ========================================================================= */}

      {/* Sheets Sync Confirmation Modal */}
      {showSheetsConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14161c] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Export to Google Sheets?</h3>
                <p className="text-xs text-slate-400">Format & update spreadsheet tabs</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#090a0c] p-3.5 rounded-xl border border-white/5">
              This will update your Google Spreadsheet <strong className="text-white">"Aura Finance - Live Dashboard (2026)"</strong> with all current transactions ({store.transactions.length}), budgets ({store.budgets.length}), accounts ({store.accounts.length}), subscriptions ({store.subscriptions.length}), and inventory items ({store.inventory?.length || 0}).
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSheetsConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-[#090a0c] hover:bg-white/5 text-slate-300 text-xs font-semibold border border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExportSheets}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow"
              >
                Confirm & Sync Sheets
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Sync Confirmation Modal */}
      {showCalendarSyncModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14161c] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-blue-400">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Sync Due Dates to Google Calendar?</h3>
                <p className="text-xs text-slate-400">Schedule billing alerts</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#090a0c] p-3.5 rounded-xl border border-white/5">
              This will create reminder events with popup notifications on your primary Google Calendar for <strong className="text-white">{store.subscriptions.length} active subscriptions</strong> and future savings goal target dates.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCalendarSyncModal(false)}
                className="px-4 py-2 rounded-xl bg-[#090a0c] hover:bg-white/5 text-slate-300 text-xs font-semibold border border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSyncCalendar}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow"
              >
                Confirm & Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Event Delete Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14161c] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Calendar Reminder?</h3>
                <p className="text-xs text-slate-400">Confirm removal from Google Calendar</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#090a0c] p-3.5 rounded-xl border border-white/5">
              Are you sure you want to delete <strong className="text-white">"{eventToDelete.summary}"</strong> from your Google Calendar? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 rounded-xl bg-[#090a0c] hover:bg-white/5 text-slate-300 text-xs font-semibold border border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCalendarEvent}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Email Report Modal */}
      {showSendEmailModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14161c] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-indigo-400">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Send Financial Summary via Gmail</h3>
                <p className="text-xs text-slate-400">Dispatches report directly to your inbox</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Recipient Email</label>
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSendEmailModal(false)}
                className="px-4 py-2 rounded-xl bg-[#090a0c] hover:bg-white/5 text-slate-300 text-xs font-semibold border border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendSummaryEmail}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow"
              >
                Send Email via Gmail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Calendar Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14161c] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-blue-400 border-b border-white/5 pb-3">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Add Financial Reminder</h3>
                <p className="text-xs text-slate-400">Create event on Google Calendar</p>
              </div>
            </div>

            <form onSubmit={handleCreateCustomEvent} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Reminder Title</label>
                <input
                  type="text"
                  placeholder="e.g. Electric Bill Due or Property Tax"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Amount ($ Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="120.00"
                    value={newEventAmount}
                    onChange={(e) => setNewEventAmount(e.target.value)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Notes / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Pay via Chase Checking online portal"
                  value={newEventNotes}
                  onChange={(e) => setNewEventNotes(e.target.value)}
                  className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#090a0c] hover:bg-white/5 text-slate-300 text-xs font-semibold border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
