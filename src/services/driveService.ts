import { DriveSyncState, FinancialDataStore } from '../types';
import { exportStoreToJSON, importStoreFromJSON } from './storageService';

const DRIVE_SYNC_KEY = 'home_finance_drive_sync_state';

export const getDriveSyncState = (): DriveSyncState => {
  try {
    const raw = localStorage.getItem(DRIVE_SYNC_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error(e);
  }
  return {
    isConnected: true,
    lastSyncedAt: new Date().toISOString(),
    fileName: 'home_finance_backup_2026.json',
    fileId: 'drive_file_88192a_finance',
    isSyncing: false,
    userEmail: 'osyday@gmail.com'
  };
};

export const saveDriveSyncState = (state: DriveSyncState): void => {
  localStorage.setItem(DRIVE_SYNC_KEY, JSON.stringify(state));
};

export const syncToGoogleDrive = async (store: FinancialDataStore): Promise<{ success: boolean; time: string; fileId: string }> => {
  // Simulate cloud drive encryption and upload
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const now = new Date().toISOString();
  const jsonContent = exportStoreToJSON(store);
  
  // Store backup payload in localStorage under drive simulation slot
  localStorage.setItem('google_drive_cloud_backup_file', jsonContent);

  const updatedState: DriveSyncState = {
    isConnected: true,
    lastSyncedAt: now,
    fileName: 'home_finance_backup_2026.json',
    fileId: 'drive_file_88192a_finance',
    isSyncing: false,
    userEmail: 'osyday@gmail.com'
  };
  saveDriveSyncState(updatedState);

  return {
    success: true,
    time: now,
    fileId: 'drive_file_88192a_finance'
  };
};

export const restoreFromGoogleDrive = async (): Promise<FinancialDataStore | null> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const backup = localStorage.getItem('google_drive_cloud_backup_file');
  if (backup) {
    return importStoreFromJSON(backup);
  }
  return null;
};
