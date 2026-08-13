import React, { useState } from 'react';
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
  HardDrive
} from 'lucide-react';
import { BiometricSettings, DriveSyncState, FinancialDataStore } from '../types';
import { exportStoreToJSON } from '../services/storageService';

interface SecurityDriveViewProps {
  biometricSettings: BiometricSettings;
  onUpdateBiometrics: (settings: BiometricSettings) => void;
  driveState: DriveSyncState;
  onSyncDriveNow: () => Promise<void>;
  onRestoreDriveNow: () => Promise<void>;
  store: FinancialDataStore;
  onImportStore: (jsonStr: string) => void;
}

export const SecurityDriveView: React.FC<SecurityDriveViewProps> = ({
  biometricSettings,
  onUpdateBiometrics,
  driveState,
  onSyncDriveNow,
  onRestoreDriveNow,
  store,
  onImportStore
}) => {
  const [pinInput, setPinInput] = useState(biometricSettings.pinCode);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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

  const handleDriveBackup = async () => {
    setIsSyncing(true);
    setMessage('');
    setErrorMessage('');
    try {
      await onSyncDriveNow();
      setMessage('Successfully saved financial backup to Google Drive!');
      setTimeout(() => setMessage(''), 3500);
    } catch (err: any) {
      setErrorMessage('Failed to backup to Google Drive.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDriveRestore = async () => {
    setIsSyncing(true);
    setMessage('');
    setErrorMessage('');
    try {
      await onRestoreDriveNow();
      setMessage('Restored latest financial backup from Google Drive!');
      setTimeout(() => setMessage(''), 3500);
    } catch (err: any) {
      setErrorMessage('Failed to restore from Google Drive.');
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
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Security Settings & Google Drive Backup
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Seamless cross-device cloud synchronization using Google Drive with local biometric locking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> AES-256 Encrypted
          </span>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-2xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {message}
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-2xl flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" /> {errorMessage}
        </div>
      )}

      {/* Grid: Google Drive Integration & Biometrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Google Drive Integration Box */}
        <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Google Drive Synchronization</h3>
                <p className="text-xs text-slate-400">Automatic backup across all user devices</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              Connected
            </span>
          </div>

          <div className="bg-[#090a0c] p-4 rounded-xl border border-white/5 space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Account:</span>
              <strong className="text-white">{driveState.userEmail}</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Backup File:</span>
              <strong className="font-serif text-emerald-400">{driveState.fileName}</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Last Cloud Sync:</span>
              <strong className="text-slate-400">{driveState.lastSyncedAt ? new Date(driveState.lastSyncedAt).toLocaleString() : 'Never'}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleDriveBackup}
              disabled={isSyncing}
              className="py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 border border-indigo-400/30 transition-all active:scale-[0.98]"
            >
              <Upload className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Backup Now to Drive'}</span>
            </button>

            <button
              onClick={handleDriveRestore}
              disabled={isSyncing}
              className="py-3 px-4 rounded-xl bg-[#090a0c] hover:bg-white/5 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Restore from Drive</span>
            </button>
          </div>
        </div>

        {/* Biometric Passcode & Vault Box */}
        <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Biometric & Passcode Lock</h3>
                <p className="text-xs text-slate-400">Require PIN or Face ID when opening financial app</p>
              </div>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center justify-between bg-[#090a0c] p-4 rounded-xl border border-white/5">
            <div>
              <div className="text-xs font-bold text-white">Enable Lock Screen</div>
              <div className="text-[11px] text-slate-400">Protect privacy when returning to session</div>
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

      {/* Manual File Backup & Export */}
      <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-4 shadow-xl">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400" /> Direct Offline JSON File Backup & Import
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Export a standalone encrypted copy of your financial records or import onto another device
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

    </div>
  );
};
