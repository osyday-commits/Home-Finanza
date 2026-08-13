import React from 'react';
import {
  Sparkles,
  Shield,
  Gem,
  DollarSign,
  Landmark,
  Crown,
  Flame,
  Wallet,
  Compass,
  Building2,
  Coins,
  Zap,
  Lock
} from 'lucide-react';

export const LOGO_PRESETS = [
  { id: 'Sparkles', label: 'Sparkles AI', icon: Sparkles },
  { id: 'Shield', label: 'Shield', icon: Shield },
  { id: 'Gem', label: 'Diamond Gem', icon: Gem },
  { id: 'DollarSign', label: 'Dollar', icon: DollarSign },
  { id: 'Landmark', label: 'Bank Landmark', icon: Landmark },
  { id: 'Crown', label: 'Crown Wealth', icon: Crown },
  { id: 'Flame', label: 'Flame Energy', icon: Flame },
  { id: 'Wallet', label: 'Digital Wallet', icon: Wallet },
  { id: 'Compass', label: 'Compass', icon: Compass },
  { id: 'Building2', label: 'Enterprise', icon: Building2 },
  { id: 'Coins', label: 'Crypto Coins', icon: Coins },
  { id: 'Zap', label: 'Zap Power', icon: Zap },
  { id: 'Lock', label: 'Vault Lock', icon: Lock }
];

interface BrandLogoProps {
  logo?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ logo = 'Sparkles', size = 'md', className = '' }) => {
  const isImageUrl = logo && (logo.startsWith('data:') || logo.startsWith('http://') || logo.startsWith('https://') || logo.startsWith('blob:'));

  const sizeClasses = {
    sm: 'w-7 h-7 rounded-lg p-0.5',
    md: 'w-10 h-10 rounded-xl p-0.5',
    lg: 'w-14 h-14 rounded-2xl p-1'
  }[size];

  const innerRadius = {
    sm: 'rounded-[6px]',
    md: 'rounded-[10px]',
    lg: 'rounded-[12px]'
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-7 h-7'
  }[size];

  if (isImageUrl) {
    return (
      <div className={`relative bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 p-0.5 shadow-lg shadow-indigo-950/50 flex-shrink-0 ${sizeClasses} ${className}`}>
        <img
          src={logo}
          alt="App Logo"
          className={`w-full h-full object-cover bg-[#090a0c] ${innerRadius}`}
        />
      </div>
    );
  }

  const preset = LOGO_PRESETS.find((p) => p.id === logo) || LOGO_PRESETS[0];
  const IconComponent = preset.icon;

  return (
    <div className={`relative bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 shadow-lg shadow-indigo-950/50 flex-shrink-0 ${sizeClasses} ${className}`}>
      <div className={`w-full h-full bg-[#090a0c] flex items-center justify-center ${innerRadius}`}>
        <IconComponent className={`${iconSizes} text-indigo-400`} />
      </div>
    </div>
  );
};
