import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Cloud, 
  Lock, 
  KeyRound, 
  RefreshCw, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  FileCode, 
  HardDrive,
  ExternalLink,
  Folder,
  User as UserIcon,
  LogOut,
  FolderSync,
  Clock,
  Sparkles,
  FileCheck,
  AlertTriangle
} from 'lucide-react';
import { BiometricSettings, DriveSyncState, FinancialDataStore } from '../types';
import { exportStoreToJSON } from '../services/storageService';
import { 
  signInWithGoogleDrive, 
  logoutFromGoogleDrive, 
  listDriveFolderContents 
} from '../services/driveService';

interface SecurityDriveViewProps {
  biometricSettings: BiometricSettings;
  onUpdateBiometrics: (settings: BiometricSettings) => void;
  driveState: DriveSyncState;
  onSyncDriveNow: () => Promise<void>;
  onRestoreDriveNow: () => Promise<void>;
  onToggleAutoSync: (enabled: boolean) => void;
  store: FinancialDataStore;
  onImportStore: (jsonStr: string) => void;
}

export const SecurityDriveView: React.FC<SecurityDriveViewProps> = ({
  biometricSettings,
  onUpdateBiometrics,
  driveState,
  onSyncDriveNow,
  onRestoreDriveNow,
  onToggleAutoSync,
  store,
  onImportStore
}) => {
  const [pinInput, setPinInput] = useState(biometricSettings.pinCode);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Confirmation Modal for Restoring from Drive (Destructive/Overwrite operation)
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Drive folder files list
  const [driveFiles, setDriveFiles] = useState<Array<{ id: string; name: string; size?: string; modifiedTime: string; webViewLink?: string }>>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  useEffect(() => {
    if (driveState.isConnected) {
      loadDriveFiles();
    }
  }, [driveState.isConnected, driveState.lastSyncedAt]);

  const loadDriveFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const files = await listDriveFolderContents();
      setDriveFiles(files);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleToggleBiometric = () => {
    onUpdateBiometrics({
      ...biometricSettings,
      isEnabled: !biometricSettings.isEnabled
    });
  };

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length !== 4) {
      setErrorMessage('PIN must be exactly 4 digits.');
      return;
    }
    onUpdateBiometrics({
      ...biometricSettings,
      pinCode: pinInput
    });
    setMessage('Biometric PIN updated successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setMessage('');
    setErrorMessage('');
    try {
      const result = await signInWithGoogleDrive();
      if (result) {
        setMessage(`Connected to Google Account (${result.user.email}). Creating folder and syncing data...`);
        await onSyncDriveNow();
        setMessage('Successfully connected to Google Drive and synced "Home Finance Data" folder!');
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in with Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutFromGoogleDrive();
      setDriveFiles([]);
      setMessage('Disconnected from Google Drive.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage('Failed to sign out from Google Drive.');
    }
  };

  const handleDriveBackup = async () => {
    setIsSyncing(true);
    setMessage('');
    setErrorMessage('');
    setShowSyncModal(false);
    try {
      await onSyncDriveNow();
      setMessage('Successfully saved all financial records to "Home Finance Data" on Google Drive!');
      await loadDriveFiles();
      setTimeout(() => setMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to backup to Google Drive.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDriveRestore = async () => {
    setIsSyncing(true);
    setMessage('');
    setErrorMessage('');
    setShowRestoreModal(false);
    try {
      await onRestoreDriveNow();
      setMessage('Successfully restored the latest financial backup from Google Drive!');
      setTimeout(() => setMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to restore from Google Drive.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadLocalJSON = () => {
    const json = exportStoreToJSON(store);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `home_finance_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleLocalImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          onImportStore(content);
          setMessage('Successfully imported local JSON backup!');
          setTimeout(() => setMessage(''), 3000);
        } catch (err) {
          setErrorMessage('Invalid JSON backup file.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200" id="security-drive-view">
      
      {/* Header */}
      <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Security & Google Drive Cloud Synchronization
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Store and synchronize all transactions, accounts, budgets, and inventory to your dedicated Google Drive folder.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
            driveState.isConnected 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            <Cloud className="w-3.5 h-3.5" />
            <span>{driveState.isConnected ? 'Google Drive Active' : 'Drive Not Linked'}</span>
          </span>
        </div>
      </div>

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

      {/* Grid: Google Drive Integration & Biometrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Google Drive Integration Box */}
        <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-5 shadow-xl" id="google-drive-sync-card">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Google Drive Cloud Storage</h3>
                <p className="text-xs text-slate-400">Continuous synchronization every time app is opened</p>
              </div>
            </div>
            {driveState.isConnected ? (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Connected
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs font-semibold border border-white/10">
                Disconnected
              </span>
            )}
          </div>

          {/* Sign In with Google Button (when disconnected) */}
          {!driveState.isConnected ? (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-[#090a0c] border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Folder className="w-4 h-4 text-indigo-400" />
                  <span>Dedicated Google Drive Storage Folder</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Connecting your Google Drive will create a folder named <strong className="text-white">"Home Finance Data"</strong> and automatically save all financial entries, budgets, and receipts there whenever you use the application.
                </p>
              </div>

              {/* Official Google Sign-In Button */}
              <button
                type="button"
                id="google-signin-btn"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 shadow-lg transition-all active:scale-[0.99]"
              >
                {isLoggingIn ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                )}
                <span>{isLoggingIn ? 'Connecting to Google...' : 'Sign in with Google to Connect Drive'}</span>
              </button>
            </div>
          ) : (
            /* Connected Account Details & Folder Information */
            <div className="space-y-4">
              
              {/* Profile Bar */}
              <div className="flex items-center justify-between bg-[#090a0c] p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  {driveState.userPhoto ? (
                    <img src={driveState.userPhoto} alt="User" className="w-8 h-8 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                      {driveState.userName?.charAt(0) || driveState.userEmail?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-white truncate max-w-[200px]">
                      {driveState.userName || driveState.userEmail}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                      {driveState.userEmail}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleGoogleLogout}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Disconnect Google Account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Disconnect</span>
                </button>
              </div>

              {/* Folder & Sync Meta */}
              <div className="bg-[#090a0c] p-4 rounded-xl border border-white/5 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Folder className="w-3.5 h-3.5 text-amber-400" />
                    <span>Target Folder:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-white">{driveState.folderName || 'Home Finance Data'}</strong>
                    {driveState.folderId && (
                      <a
                        href={`https://drive.google.com/drive/folders/${driveState.folderId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 p-0.5"
                        title="Open folder in Google Drive"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Storage File:</span>
                  </span>
                  <strong className="font-mono text-emerald-400">{driveState.fileName || 'home_finance_backup.json'}</strong>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Last Cloud Sync:</span>
                  </span>
                  <strong className="text-slate-300">
                    {driveState.lastSyncedAt ? new Date(driveState.lastSyncedAt).toLocaleString() : 'Just now'}
                  </strong>
                </div>
              </div>

              {/* Auto Sync Toggle Switch */}
              <div className="flex items-center justify-between bg-[#090a0c] p-3.5 rounded-xl border border-white/5">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FolderSync className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Sync Every Time App Is Opened</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Keeps financial data automatically synchronized with your Google Drive
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleAutoSync(!driveState.autoSyncOnOpen)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    driveState.autoSyncOnOpen !== false ? 'bg-indigo-600' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      driveState.autoSyncOnOpen !== false ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  id="btn-sync-drive-now"
                  onClick={() => setShowSyncModal(true)}
                  disabled={isSyncing}
                  className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 border border-indigo-400/30 transition-all active:scale-[0.98]"
                >
                  <Upload className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Now to Drive'}</span>
                </button>

                <button
                  id="btn-restore-drive-now"
                  onClick={() => setShowRestoreModal(true)}
                  disabled={isSyncing}
                  className="py-2.5 px-4 rounded-xl bg-[#090a0c] hover:bg-white/5 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Restore from Drive</span>
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Biometric Passcode & Vault Box */}
        <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-6 shadow-xl" id="biometrics-card">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Biometric & Passcode Lock</h3>
                <p className="text-xs text-slate-400">Require PIN or biometric unlock on return</p>
              </div>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center justify-between bg-[#090a0c] p-4 rounded-xl border border-white/5">
            <div>
              <div className="text-xs font-bold text-white">Enable Lock Screen</div>
              <div className="text-[11px] text-slate-400">Require 4-digit PIN when session unlocks</div>
            </div>

            <button
              onClick={handleToggleBiometric}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                biometricSettings.isEnabled ? 'bg-indigo-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  biometricSettings.isEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Change PIN Form */}
          <form onSubmit={handleUpdatePin} className="space-y-3 pt-2">
            <label className="block text-xs font-medium text-slate-400">
              4-Digit Security Passcode
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="bg-[#090a0c] border border-white/10 rounded-xl px-4 py-2 text-white font-serif text-center tracking-widest font-bold text-base w-32 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#090a0c] hover:bg-white/5 text-slate-200 text-xs font-semibold border border-white/10 transition-colors"
              >
                Update PIN
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Google Drive Folder File Explorer & History */}
      {driveState.isConnected && (
        <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-4 shadow-xl" id="drive-files-list-section">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Google Drive Storage Folder Contents ({driveState.folderName || 'Home Finance Data'})
              </h3>
            </div>
            <button
              onClick={loadDriveFiles}
              disabled={isLoadingFiles}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
              <span>Refresh Files</span>
            </button>
          </div>

          <div className="bg-[#090a0c] rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5 text-xs">
            <div className="p-3.5 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <FileCode className="w-5 h-5 text-indigo-400" />
                <div>
                  <div className="font-mono font-semibold text-white">{driveState.fileName || 'home_finance_backup.json'}</div>
                  <div className="text-[10px] text-slate-400">
                    Primary Data Sync File • Updated {driveState.lastSyncedAt ? new Date(driveState.lastSyncedAt).toLocaleString() : 'Recently'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">
                  Live Sync Target
                </span>
                {driveState.driveWebLink && (
                  <a
                    href={driveState.driveWebLink}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-[#14161c] hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                    title="View in Google Drive"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {driveFiles.filter(f => f.name !== (driveState.fileName || 'home_finance_backup.json')).map((file) => (
              <div key={file.id} className="p-3.5 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <FileCode className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="font-mono text-slate-300">{file.name}</div>
                    <div className="text-[10px] text-slate-500">
                      Modified {new Date(file.modifiedTime).toLocaleString()} {file.size ? `• ${(Number(file.size)/1024).toFixed(1)} KB` : ''}
                    </div>
                  </div>
                </div>
                {file.webViewLink && (
                  <a
                    href={file.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-[#14161c] hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                    title="View file in Google Drive"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual File Backup & Export */}
      <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-4 shadow-xl">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400" /> Direct Offline JSON File Backup & Import
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Export a standalone encrypted copy of your financial records or import onto another device without Google Drive
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleDownloadLocalJSON}
            className="px-4 py-2.5 rounded-xl bg-[#090a0c] hover:bg-white/5 text-white font-semibold text-xs flex items-center gap-2 border border-white/10 transition-colors"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Download Backup (.JSON)</span>
          </button>

          <label className="px-4 py-2.5 rounded-xl bg-[#090a0c] hover:bg-white/5 text-white font-semibold text-xs flex items-center gap-2 border border-white/10 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-indigo-400" />
            <span>Import Backup File</span>
            <input type="file" accept=".json" onChange={handleLocalImport} className="hidden" />
          </label>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CONFIRMATION MODAL: RESTORE FROM GOOGLE DRIVE (DESTRUCTIVE OVERWRITE)     */}
      {/* ========================================================================= */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14161c] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Restore from Google Drive?</h3>
                <p className="text-xs text-slate-400">Confirm replacing local data</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#090a0c] p-3.5 rounded-xl border border-white/5">
              This will overwrite your current in-app transactions, accounts, budgets, and inventory with the backup file stored in your <strong className="text-white">"Home Finance Data"</strong> Google Drive folder.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2 rounded-xl bg-[#090a0c] hover:bg-white/5 text-slate-300 text-xs font-semibold border border-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDriveRestore}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
              >
                Confirm & Restore Backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: MANUAL SYNC TO GOOGLE DRIVE */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14161c] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-indigo-400">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Upload Sync to Google Drive?</h3>
                <p className="text-xs text-slate-400">Dedicated Folder: Home Finance Data</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#090a0c] p-3.5 rounded-xl border border-white/5">
              This will upload all current transactions ({store.transactions.length}), linked accounts ({store.accounts.length}), inventory items ({store.inventory?.length || 0}), and custom settings to your Google Drive.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="px-4 py-2 rounded-xl bg-[#090a0c] hover:bg-white/5 text-slate-300 text-xs font-semibold border border-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDriveBackup}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
              >
                Confirm & Sync
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
