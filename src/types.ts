export type TransactionType = 'Expense' | 'Income' | 'Transfer';

export type Frequency = 'One Time' | 'Weekly' | 'Bi-Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD or MM/DD/YYYY
  type: TransactionType;
  category: string;
  subcategory: string;
  description: string;
  amount: number;
  provider: string; // Vendor, merchant, employer
  frequency: Frequency;
  receiptUrl?: string; // base64 or path
  month: string;
  year: number;
  notes?: string;
  accountId: string;
  isSubscription?: boolean;
  status?: 'Cleared' | 'Pending';
}

export interface Account {
  id: string;
  name: string;
  type: 'Checking' | 'Savings' | 'Credit Card' | 'Investment';
  balance: number;
  accountNumber: string;
  bankName: string;
  color: string;
  lastSynced?: string;
  isLinked?: boolean;
}

export interface BudgetCategory {
  category: string;
  monthlyLimit: number;
  color: string;
}

export interface Subscription {
  id: string;
  name: string;
  provider: string;
  amount: number;
  billingCycle: 'Monthly' | 'Yearly';
  nextBillingDate: string;
  category: string;
  accountId: string;
  autoAlert: boolean;
  status: 'Active' | 'Paused' | 'Cancelled';
  logo?: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentSaved: number;
  targetDate: string;
  category: string;
  monthlyContribution: number;
  color: string;
}

export interface LineItem {
  name: string;
  price: number;
  qty?: number;
}

export interface AIReceiptExtraction {
  provider: string;
  amount: number;
  date: string;
  category: string;
  subcategory: string;
  type: TransactionType;
  description: string;
  items?: LineItem[];
  confidence: number;
  notes?: string;
  isSubscription: boolean;
  frequency: Frequency;
}

export interface AIStatementExtraction {
  statementDate?: string;
  accountName?: string;
  startingBalance?: number;
  endingBalance?: number;
  transactions: AIReceiptExtraction[];
}

export interface AISpendingInsight {
  summary: string;
  totalSpend: number;
  topSpendingCategory: string;
  savingsRate: number;
  projectedSavingsVsGoal: string;
  recommendations: string[];
  anomalies: string[];
  potentialSavingsMonthly: number;
}

export interface DriveSyncState {
  isConnected: boolean;
  lastSyncedAt: string | null;
  fileName: string;
  fileId: string | null;
  isSyncing: boolean;
  userEmail?: string;
}

export interface BiometricSettings {
  isEnabled: boolean;
  isLocked: boolean;
  pinCode: string;
  useBiometricHardware: boolean;
  autoLockMinutes: number;
}

export interface AppSettings {
  appName: string;
  appLogo?: string;
  merchants: string[];
  categories: string[];
  subcategories: Record<string, string[]>;
  inventoryCategories?: string[];
  inventorySubcategories?: Record<string, string[]>;
}

export type InventoryMetric = 'Unit' | 'Box' | 'Can' | 'Lt' | 'Gallon' | 'Pound' | 'Kg' | 'Oz' | 'Bag' | 'Pack' | 'Bottle' | 'Other';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  quantity: number;
  metric: InventoryMetric | string;
  unitPrice?: number;
  totalCost?: number;
  merchant?: string;
  purchaseDate?: string;
  expirationDate?: string; // YYYY-MM-DD
  notes?: string;
  imageUrl?: string;
  location?: string; // e.g., Pantry, Refrigerator, Office, Storage, Garage
  status?: 'In Stock' | 'Low Stock' | 'Expiring Soon' | 'Expired' | 'Depleted';
  createdAt: string;
}

export interface FinancialDataStore {
  transactions: Transaction[];
  accounts: Account[];
  budgets: BudgetCategory[];
  subscriptions: Subscription[];
  savingsGoals: SavingsGoal[];
  inventory?: InventoryItem[];
  settings?: AppSettings;
  lastUpdated: string;
}
