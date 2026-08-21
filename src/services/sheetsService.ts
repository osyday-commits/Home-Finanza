import { FinancialDataStore, GoogleSheetMeta, Transaction } from '../types';
import { getCachedAccessToken } from './driveService';

const SHEETS_META_KEY = 'home_finance_google_sheets_meta';

export const getSavedSheetsMeta = (): GoogleSheetMeta | null => {
  try {
    const raw = localStorage.getItem(SHEETS_META_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return null;
};

export const saveSheetsMeta = (meta: GoogleSheetMeta): void => {
  localStorage.setItem(SHEETS_META_KEY, JSON.stringify(meta));
};

/**
 * Creates or syncs all financial data (Transactions, Budgets, Accounts, Subscriptions, Inventory) into a formatted Google Spreadsheet.
 */
export const exportStoreToGoogleSheets = async (
  store: FinancialDataStore,
  customTitle?: string
): Promise<GoogleSheetMeta> => {
  const token = await getCachedAccessToken();
  if (!token) {
    throw new Error('You must be signed in with Google to export to Google Sheets.');
  }

  const title = customTitle || `Aura Finance - Live Dashboard (${new Date().getFullYear()})`;
  let meta = getSavedSheetsMeta();
  let spreadsheetId = meta?.spreadsheetId;
  let spreadsheetUrl = meta?.spreadsheetUrl;

  // 1. Create spreadsheet if it doesn't exist yet
  if (!spreadsheetId) {
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title
        },
        sheets: [
          { properties: { title: 'Transactions', gridProperties: { frozenRowCount: 1 } } },
          { properties: { title: 'Budgets', gridProperties: { frozenRowCount: 1 } } },
          { properties: { title: 'Accounts', gridProperties: { frozenRowCount: 1 } } },
          { properties: { title: 'Subscriptions', gridProperties: { frozenRowCount: 1 } } },
          { properties: { title: 'Inventory', gridProperties: { frozenRowCount: 1 } } }
        ]
      })
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create Google Spreadsheet: ${errText}`);
    }

    const created = await createRes.json();
    spreadsheetId = created.spreadsheetId;
    spreadsheetUrl = created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  }

  // 2. Prepare Tab Data
  // Tab 1: Transactions
  const txHeaders = ['ID', 'Date', 'Type', 'Description / Merchant', 'Category', 'Subcategory', 'Amount ($)', 'Account ID', 'Frequency', 'Status', 'Notes'];
  const txRows = store.transactions.map((t) => [
    t.id,
    t.date,
    t.type,
    t.description || t.provider || '',
    t.category,
    t.subcategory || '',
    t.amount,
    t.accountId || '',
    t.frequency || 'One Time',
    t.status || 'Cleared',
    t.notes || ''
  ]);

  // Tab 2: Budgets
  const budgetHeaders = ['Category', 'Monthly Limit ($)', 'Color'];
  const budgetRows = store.budgets.map((b) => [
    b.category,
    b.monthlyLimit,
    b.color || '#6366f1'
  ]);

  // Tab 3: Accounts
  const accountHeaders = ['Account Name', 'Type', 'Bank / Institution', 'Account Number / Mask', 'Current Balance ($)', 'Color'];
  const accountRows = store.accounts.map((a) => [
    a.name,
    a.type,
    a.bankName || '',
    a.accountNumber || '',
    a.balance,
    a.color || '#10b981'
  ]);

  // Tab 4: Subscriptions
  const subHeaders = ['Service / Merchant', 'Amount ($)', 'Billing Cycle', 'Next Billing Date', 'Category', 'Status'];
  const subRows = store.subscriptions.map((s) => [
    s.name || s.provider,
    s.amount,
    s.billingCycle,
    s.nextBillingDate || '',
    s.category || '',
    s.status || 'Active'
  ]);

  // Tab 5: Inventory
  const invHeaders = ['Item Name', 'Category', 'Subcategory', 'Quantity', 'Metric', 'Unit Price ($)', 'Total Cost ($)', 'Location', 'Expiration Date', 'Status'];
  const invRows = (store.inventory || []).map((i) => [
    i.name,
    i.category,
    i.subcategory || '',
    i.quantity,
    i.metric,
    i.unitPrice || 0,
    i.totalCost || (i.quantity * (i.unitPrice || 0)),
    i.location || 'General',
    i.expirationDate || '',
    i.status || 'In Stock'
  ]);

  // 3. Batch Update Values across all tabs
  const valueRanges = [
    { range: 'Transactions!A1:K', values: [txHeaders, ...txRows] },
    { range: 'Budgets!A1:D', values: [budgetHeaders, ...budgetRows] },
    { range: 'Accounts!A1:F', values: [accountHeaders, ...accountRows] },
    { range: 'Subscriptions!A1:G', values: [subHeaders, ...subRows] },
    { range: 'Inventory!A1:J', values: [invHeaders, ...invRows] }
  ];

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueRanges
      })
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Failed to write data into Google Spreadsheet: ${errText}`);
  }

  const updatedMeta: GoogleSheetMeta = {
    spreadsheetId: spreadsheetId!,
    spreadsheetUrl: spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    title,
    sheets: ['Transactions', 'Budgets', 'Accounts', 'Subscriptions', 'Inventory'],
    lastExportedAt: new Date().toISOString()
  };

  saveSheetsMeta(updatedMeta);
  return updatedMeta;
};

/**
 * Reads transactions from a custom Google Spreadsheet range.
 */
export const importTransactionsFromGoogleSheet = async (
  spreadsheetId: string,
  sheetName: string = 'Transactions'
): Promise<Partial<Transaction>[]> => {
  const token = await getCachedAccessToken();
  if (!token) {
    throw new Error('Google Workspace access token missing. Please sign in with Google.');
  }

  // Fetch sheet metadata to ensure tab exists
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!metaRes.ok) {
    throw new Error(`Could not access spreadsheet (${spreadsheetId}). Check permissions or spreadsheet ID.`);
  }

  const metaData = await metaRes.json();
  const availableSheets: string[] = (metaData.sheets || []).map((s: any) => s.properties.title);
  const targetSheet = availableSheets.find((s) => s.toLowerCase() === sheetName.toLowerCase()) || availableSheets[0] || 'Sheet1';

  // Read rows
  const readRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(targetSheet)}!A1:K200`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!readRes.ok) {
    throw new Error('Failed to read rows from Google Sheet.');
  }

  const readData = await readRes.json();
  const rows: any[][] = readData.values || [];
  if (rows.length <= 1) {
    return [];
  }

  // Row 0 is header
  const dataRows = rows.slice(1);
  const parsedTx: Partial<Transaction>[] = [];

  for (const r of dataRows) {
    if (!r[1] && !r[3] && !r[6]) continue; // Skip empty row

    parsedTx.push({
      id: r[0] || `SHEET-TRX-${Math.floor(1000 + Math.random() * 9000)}`,
      date: r[1] || new Date().toISOString().split('T')[0],
      type: (r[2] === 'Income' || r[2] === 'Expense') ? r[2] : 'Expense',
      description: r[3] || 'Sheet Import',
      provider: r[3] || 'Unknown',
      category: r[4] || 'Everyday',
      subcategory: r[5] || 'General',
      amount: parseFloat(r[6]) || 0,
      accountId: r[7] || 'acc-1',
      frequency: (r[8] as any) || 'One Time',
      status: (r[9] as any) || 'Cleared',
      notes: r[10] || 'Imported from Google Sheets'
    });
  }

  return parsedTx;
};
