import { FinancialDataStore, Transaction, Account, BudgetCategory, Subscription, SavingsGoal, BiometricSettings } from '../types';
import { INITIAL_ACCOUNTS, INITIAL_TRANSACTIONS, INITIAL_BUDGETS, INITIAL_SUBSCRIPTIONS, INITIAL_SAVINGS_GOALS, DEFAULT_SETTINGS, INITIAL_INVENTORY } from '../data/initialData';

const STORE_KEY = 'home_finance_app_store_v1';
const BIOMETRIC_KEY = 'home_finance_biometric_v1';

export const loadFinancialStore = (): FinancialDataStore => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.transactions && parsed.accounts) {
        if (!parsed.inventory || !Array.isArray(parsed.inventory)) {
          parsed.inventory = INITIAL_INVENTORY;
        }
        if (!parsed.settings) {
          parsed.settings = DEFAULT_SETTINGS;
        } else {
          // Ensure sub-fields exist
          parsed.settings.appName = parsed.settings.appName || DEFAULT_SETTINGS.appName;
          parsed.settings.appLogo = parsed.settings.appLogo || DEFAULT_SETTINGS.appLogo;
          parsed.settings.merchants = parsed.settings.merchants || DEFAULT_SETTINGS.merchants;
          parsed.settings.categories = parsed.settings.categories || DEFAULT_SETTINGS.categories;
          parsed.settings.subcategories = parsed.settings.subcategories || DEFAULT_SETTINGS.subcategories;
          parsed.settings.inventoryCategories = parsed.settings.inventoryCategories || DEFAULT_SETTINGS.inventoryCategories;
          parsed.settings.inventorySubcategories = parsed.settings.inventorySubcategories || DEFAULT_SETTINGS.inventorySubcategories;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load financial store from localStorage', err);
  }

  // Fallback to default initial dataset
  const initialStore: FinancialDataStore = {
    transactions: INITIAL_TRANSACTIONS,
    accounts: INITIAL_ACCOUNTS,
    budgets: INITIAL_BUDGETS,
    subscriptions: INITIAL_SUBSCRIPTIONS,
    savingsGoals: INITIAL_SAVINGS_GOALS,
    inventory: INITIAL_INVENTORY,
    settings: DEFAULT_SETTINGS,
    lastUpdated: new Date().toISOString()
  };

  saveFinancialStore(initialStore);
  return initialStore;
};

export const saveFinancialStore = (store: FinancialDataStore): void => {
  try {
    store.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error('Failed to save financial store to localStorage', err);
  }
};

export const loadBiometricSettings = (): BiometricSettings => {
  try {
    const raw = localStorage.getItem(BIOMETRIC_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load biometric settings', err);
  }
  return {
    isEnabled: true,
    isLocked: false,
    pinCode: '1234',
    useBiometricHardware: true,
    autoLockMinutes: 5
  };
};

export const saveBiometricSettings = (settings: BiometricSettings): void => {
  try {
    localStorage.setItem(BIOMETRIC_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save biometric settings', err);
  }
};

export const exportStoreToJSON = (store: FinancialDataStore): string => {
  return JSON.stringify(store, null, 2);
};

export const importStoreFromJSON = (jsonString: string): FinancialDataStore => {
  const parsed = JSON.parse(jsonString);
  if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
    throw new Error('Invalid financial backup format: missing transactions array.');
  }
  saveFinancialStore(parsed);
  return parsed;
};
