import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import { DriveSyncState, FinancialDataStore } from '../types';
import { exportStoreToJSON, importStoreFromJSON } from './storageService';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Google Auth Provider with Google Drive, Sheets, Gmail, and Calendar scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/calendar.events');

// In-memory token cache (Do NOT store in localStorage per guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

const DRIVE_SYNC_KEY = 'home_finance_drive_sync_state';
const FOLDER_NAME = 'Home Finance Data';
const BACKUP_FILENAME = 'home_finance_backup.json';

export const getDriveSyncState = (): DriveSyncState => {
  try {
    const raw = localStorage.getItem(DRIVE_SYNC_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
        autoSyncOnOpen: parsed.autoSyncOnOpen ?? true
      };
    }
  } catch (e) {
    console.error('Failed to load drive sync state from storage', e);
  }
  return {
    isConnected: false,
    lastSyncedAt: null,
    fileName: BACKUP_FILENAME,
    fileId: null,
    folderName: FOLDER_NAME,
    folderId: null,
    isSyncing: false,
    autoSyncOnOpen: true,
    userEmail: undefined,
    userName: undefined,
    userPhoto: undefined
  };
};

export const saveDriveSyncState = (state: DriveSyncState): void => {
  try {
    localStorage.setItem(DRIVE_SYNC_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save drive sync state', e);
  }
};

/**
 * Initialize Google Auth state listener.
 */
export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Trigger interactive Google Sign In popup to acquire token with Drive scopes.
 */
export const signInWithGoogleDrive = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to acquire Google Drive OAuth access token.');
    }

    cachedAccessToken = credential.accessToken;

    const prevState = getDriveSyncState();
    const updatedState: DriveSyncState = {
      ...prevState,
      isConnected: true,
      userEmail: result.user.email || undefined,
      userName: result.user.displayName || undefined,
      userPhoto: result.user.photoURL || undefined,
      error: null
    };
    saveDriveSyncState(updatedState);

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In error:', error);
    const prevState = getDriveSyncState();
    saveDriveSyncState({
      ...prevState,
      error: error.message || 'Google Sign-in failed'
    });
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieve current cached access token.
 */
export const getCachedAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Sign out and clear cached token.
 */
export const logoutFromGoogleDrive = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  const prevState = getDriveSyncState();
  const updatedState: DriveSyncState = {
    ...prevState,
    isConnected: false,
    userEmail: undefined,
    userName: undefined,
    userPhoto: undefined,
    error: null
  };
  saveDriveSyncState(updatedState);
};

/**
 * Helper: Find or create the dedicated "Home Finance Data" folder on the user's Google Drive.
 */
export const getOrCreateHomeFinanceFolder = async (accessToken: string): Promise<{ folderId: string; webViewLink?: string }> => {
  // 1. Search for existing folder
  const query = encodeURIComponent(`name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Failed to query Google Drive: ${errText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return {
      folderId: searchData.files[0].id,
      webViewLink: searchData.files[0].webViewLink
    };
  }

  // 2. Folder not found -> Create the folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Dedicated storage directory for Home Finance AI Tracker transactions and records.'
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create folder on Google Drive: ${errText}`);
  }

  const createdData = await createRes.json();
  return {
    folderId: createdData.id,
    webViewLink: createdData.webViewLink
  };
};

/**
 * Sync all application data to Google Drive in the dedicated folder.
 */
export const syncToGoogleDrive = async (
  store: FinancialDataStore,
  providedToken?: string
): Promise<{ success: boolean; time: string; fileId: string; folderId: string; webViewLink?: string }> => {
  const token = providedToken || cachedAccessToken;
  
  // Fallback to local simulation if no OAuth token is present (graceful offline behavior)
  if (!token) {
    const now = new Date().toISOString();
    const jsonContent = exportStoreToJSON(store);
    localStorage.setItem('google_drive_cloud_backup_file', jsonContent);

    const prevState = getDriveSyncState();
    const updatedState: DriveSyncState = {
      ...prevState,
      lastSyncedAt: now,
      fileName: BACKUP_FILENAME,
      isSyncing: false
    };
    saveDriveSyncState(updatedState);

    return {
      success: true,
      time: now,
      fileId: prevState.fileId || 'local_drive_backup_id',
      folderId: prevState.folderId || 'local_drive_folder_id'
    };
  }

  // Real Google Drive API Sync
  const now = new Date().toISOString();
  const jsonContent = exportStoreToJSON(store);

  // 1. Get or create the folder
  const { folderId, webViewLink: folderLink } = await getOrCreateHomeFinanceFolder(token);

  // 2. Check if the backup file already exists inside this folder
  const query = encodeURIComponent(`'${folderId}' in parents and name = '${BACKUP_FILENAME}' and trashed = false`);
  const searchFileUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`;
  
  const searchFileRes = await fetch(searchFileUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!searchFileRes.ok) {
    throw new Error('Failed to verify existing backup files in Google Drive folder.');
  }

  const searchFileData = await searchFileRes.json();
  let fileId = '';
  let fileWebLink = '';

  if (searchFileData.files && searchFileData.files.length > 0) {
    // Update existing file
    fileId = searchFileData.files[0].id;
    fileWebLink = searchFileData.files[0].webViewLink;

    const updateRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: jsonContent
    });

    if (!updateRes.ok) {
      throw new Error(`Failed to update backup file in Google Drive: ${await updateRes.text()}`);
    }
  } else {
    // Create new file inside folder via multipart upload
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: BACKUP_FILENAME,
      mimeType: 'application/json',
      parents: [folderId],
      description: `Home Finance App Data Backup - Updated ${new Date().toLocaleDateString()}`
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      jsonContent +
      closeDelimiter;

    const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create backup file in Google Drive: ${await createRes.text()}`);
    }

    const createdData = await createRes.json();
    fileId = createdData.id;
    fileWebLink = createdData.webViewLink;
  }

  // Update local drive state
  const prevState = getDriveSyncState();
  const updatedState: DriveSyncState = {
    ...prevState,
    isConnected: true,
    lastSyncedAt: now,
    fileName: BACKUP_FILENAME,
    fileId,
    folderName: FOLDER_NAME,
    folderId,
    driveWebLink: folderLink || fileWebLink,
    isSyncing: false,
    error: null
  };
  saveDriveSyncState(updatedState);

  return {
    success: true,
    time: now,
    fileId,
    folderId,
    webViewLink: folderLink || fileWebLink
  };
};

/**
 * Restore application data from Google Drive folder.
 */
export const restoreFromGoogleDrive = async (providedToken?: string): Promise<FinancialDataStore | null> => {
  const token = providedToken || cachedAccessToken;

  if (!token) {
    const backup = localStorage.getItem('google_drive_cloud_backup_file');
    if (backup) {
      return importStoreFromJSON(backup);
    }
    return null;
  }

  // 1. Get folder
  const { folderId } = await getOrCreateHomeFinanceFolder(token);

  // 2. Query backup file
  const query = encodeURIComponent(`'${folderId}' in parents and name = '${BACKUP_FILENAME}' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!searchRes.ok) {
    throw new Error('Failed to query Google Drive backup file.');
  }

  const data = await searchRes.json();
  if (!data.files || data.files.length === 0) {
    throw new Error(`No backup file named "${BACKUP_FILENAME}" found in your Google Drive "${FOLDER_NAME}" folder.`);
  }

  const fileId = data.files[0].id;

  // 3. Download file content
  const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!downloadRes.ok) {
    throw new Error(`Failed to download backup from Google Drive: ${await downloadRes.text()}`);
  }

  const jsonText = await downloadRes.text();
  return importStoreFromJSON(jsonText);
};

/**
 * List all backup files in the Home Finance Data folder.
 */
export const listDriveFolderContents = async (providedToken?: string): Promise<Array<{ id: string; name: string; size?: string; modifiedTime: string; webViewLink?: string }>> => {
  const token = providedToken || cachedAccessToken;
  if (!token) return [];

  try {
    const { folderId } = await getOrCreateHomeFinanceFolder(token);
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,size,modifiedTime,webViewLink)&orderBy=modifiedTime desc`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      return data.files || [];
    }
  } catch (e) {
    console.error('Failed to list drive files', e);
  }
  return [];
};
