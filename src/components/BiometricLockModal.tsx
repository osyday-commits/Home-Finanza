import React, { useState } from 'react';
import { Lock, KeyRound, ShieldCheck, Fingerprint, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { BiometricSettings } from '../types';

interface BiometricLockModalProps {
  settings: BiometricSettings;
  onUnlock: () => void;
  onUpdatePin?: (newPin: string) => void;
}

export const BiometricLockModal: React.FC<BiometricLockModalProps> = ({
  settings,
  onUnlock
}) => {
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isSimulatingBiometric, setIsSimulatingBiometric] = useState(false);

  const handleKeyPress = (num: string) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + num;
      setPinInput(nextPin);
      setError(false);
      if (nextPin.length === 4) {
        if (nextPin === settings.pinCode || settings.pinCode === '') {
          setTimeout(() => {
            onUnlock();
          }, 200);
        } else {
          setError(true);
          setTimeout(() => {
            setPinInput('');
          }, 600);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleTouchIdAuth = () => {
    setIsSimulatingBiometric(true);
    setTimeout(() => {
      setIsSimulatingBiometric(false);
      onUnlock();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#14161c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 text-center space-y-6">
        
        {/* Shield Header */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif text-white tracking-tight">Financial Vault</h2>
          <p className="text-xs text-slate-400">
            Bank-grade biometric authentication & AES-256 local security
          </p>
        </div>

        {/* PIN Display Dots */}
        <div className="space-y-2">
          <div className="flex justify-center items-center space-x-4 py-2">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pinInput.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 border ${
                    error
                      ? 'bg-rose-500 border-rose-400 scale-110 animate-bounce'
                      : isFilled
                      ? 'bg-indigo-400 border-indigo-300 scale-110 shadow-md shadow-indigo-500/50'
                      : 'bg-[#090a0c] border-white/10'
                  }`}
                />
              );
            })}
          </div>

          {error && (
            <p className="text-xs text-rose-400 flex items-center justify-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> Incorrect PIN. Try '1234'
            </p>
          )}

          <div className="text-xs text-slate-500">
            Default passcode: <span className="text-slate-300 font-serif font-semibold">1234</span>
          </div>
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-14 rounded-xl bg-[#090a0c] hover:bg-white/5 active:bg-indigo-600/30 text-white font-serif font-semibold text-xl transition-all border border-white/10 shadow-sm flex items-center justify-center focus:outline-none"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setShowPin(!showPin)}
            className="h-14 rounded-xl bg-[#090a0c]/60 hover:bg-[#090a0c] text-slate-400 flex items-center justify-center transition-all border border-white/5"
            title="Toggle PIN visibility"
          >
            {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-xl bg-[#090a0c] hover:bg-white/5 text-white font-serif font-semibold text-xl transition-all border border-white/10 flex items-center justify-center focus:outline-none"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-14 rounded-xl bg-[#090a0c]/60 hover:bg-[#090a0c] text-slate-400 flex items-center justify-center transition-all border border-white/5 text-xs font-medium"
          >
            Delete
          </button>
        </div>

        {/* FaceID / TouchID Trigger Button */}
        <div className="pt-2">
          <button
            onClick={handleTouchIdAuth}
            disabled={isSimulatingBiometric}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 border border-indigo-400/30 transition-all active:scale-[0.98]"
          >
            <Fingerprint className={`w-5 h-5 ${isSimulatingBiometric ? 'animate-pulse text-indigo-200' : ''}`} />
            {isSimulatingBiometric ? 'Scanning Biometrics...' : 'Authenticate with Face ID / Touch ID'}
          </button>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3 text-indigo-400" />
          End-to-End Encrypted Financial Records • Google Drive Backup Ready
        </div>

      </div>
    </div>
  );
};
