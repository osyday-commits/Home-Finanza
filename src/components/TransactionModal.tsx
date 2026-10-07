import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Plus, 
  DollarSign, 
  Calendar, 
  Tag, 
  CreditCard, 
  FileText, 
  CheckCircle2, 
  Upload, 
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Link as LinkIcon,
  RefreshCw,
  Eye,
  Check,
  ExternalLink,
  Trash2,
  ZoomIn,
  Sparkles
} from 'lucide-react';
import { Transaction, TransactionType, Frequency, Account, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../data/initialData';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Partial<Transaction>) => void;
  accounts: Account[];
  initialData?: Partial<Transaction>;
  settings?: AppSettings;
}

export const CATEGORIES_WITH_SUBCATEGORIES: Record<string, string[]> = DEFAULT_SETTINGS.subcategories;

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  accounts,
  initialData,
  settings
}) => {
  const activeCategories = settings?.categories || Object.keys(DEFAULT_SETTINGS.subcategories);
  const activeSubcategoriesMap = settings?.subcategories || DEFAULT_SETTINGS.subcategories;
  const activeMerchants = settings?.merchants || DEFAULT_SETTINGS.merchants;

  const [type, setType] = useState<TransactionType>(initialData?.type || 'Expense');
  const [amount, setAmount] = useState<string>(initialData?.amount ? String(initialData.amount) : '');
  const [provider, setProvider] = useState<string>(initialData?.provider || '');
  const [description, setDescription] = useState<string>(initialData?.description || '');
  const [category, setCategory] = useState<string>(
    initialData?.category || (initialData?.type === 'Income' ? 'Income' : activeCategories[0] || 'Everyday')
  );
  const [subcategory, setSubcategory] = useState<string>(
    initialData?.subcategory || (activeSubcategoriesMap[category]?.[0] || 'General')
  );
  const [date, setDate] = useState<string>(initialData?.date || new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState<string>(initialData?.accountId || accounts[0]?.id || 'acc-1');
  const [frequency, setFrequency] = useState<Frequency>(initialData?.frequency || 'One Time');
  const [notes, setNotes] = useState<string>(initialData?.notes || '');
  const [receiptUrl, setReceiptUrl] = useState<string>(initialData?.receiptUrl || '');
  const [receiptTab, setReceiptTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState<string>(
    initialData?.receiptUrl && !initialData.receiptUrl.startsWith('data:') ? initialData.receiptUrl : ''
  );
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [error, setError] = useState<string>('');

  // Camera capture state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError('');
    setCapturedFrame(null);
    setIsCameraOpen(true);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera hardware access is not supported by your browser.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      setStream(mediaStream);
      setFacingMode(mode);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera permissions in browser site settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device detected on this system.');
      } else {
        setCameraError(err.message || 'Unable to access device camera.');
      }
    }
  };

  const handleCloseCamera = () => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCapturedFrame(null);
    setCameraError('');
  };

  const handleSnapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedFrame(dataUrl);
    }
  };

  const handleConfirmPhoto = () => {
    if (capturedFrame) {
      setReceiptUrl(capturedFrame);
      setImageLoadError(false);
      handleCloseCamera();
    }
  };

  const handleSwitchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setReceiptUrl(result);
        setImageLoadError(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (trimmed) {
      setReceiptUrl(trimmed);
      setImageLoadError(false);
    }
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'Income') {
      setCategory('Income');
      setSubcategory('Salary');
    } else {
      setCategory('Everyday');
      setSubcategory('Groceries');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    if (!provider.trim()) {
      setError('Please specify a merchant, provider, or payer name.');
      return;
    }

    const d = new Date(date);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = months[d.getMonth()] || 'August';
    const yearNum = d.getFullYear() || 2026;

    onSave({
      id: initialData?.id || `TRX-${Math.floor(100 + Math.random() * 900)}`,
      type,
      amount: parseFloat(amount),
      provider,
      description: description || `${provider} (${type})`,
      category,
      subcategory: subcategory || CATEGORIES_WITH_SUBCATEGORIES[category]?.[0] || 'General',
      date,
      accountId,
      frequency,
      notes,
      receiptUrl,
      month: monthName,
      year: yearNum,
      isSubscription: frequency !== 'One Time',
      status: 'Cleared'
    });

    onClose();
  };

  // Determine if receiptUrl looks like a valid image link/data
  const isValidUrlFormat = receiptUrl && (
    receiptUrl.startsWith('http://') || 
    receiptUrl.startsWith('https://') || 
    receiptUrl.startsWith('data:image/') ||
    receiptUrl.startsWith('blob:')
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-[#14161c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#090a0c]">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${type === 'Income' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {initialData?.id ? 'Edit Transaction' : 'Record Transaction / Income'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Log financial entries, attach receipt proofs, and manage statements
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Type Selector Toggle */}
          <div className="grid grid-cols-3 gap-2 bg-[#090a0c] p-1.5 rounded-xl border border-white/5">
            {(['Expense', 'Income', 'Transfer'] as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  type === t
                    ? t === 'Income'
                      ? 'bg-emerald-600 text-white shadow'
                      : t === 'Expense'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'Income' ? '+ Income' : t === 'Expense' ? '- Expense' : '⇄ Transfer'}
              </button>
            ))}
          </div>

          {/* Amount & Provider */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Amount ($) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#090a0c] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white font-serif text-base focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {type === 'Income' ? 'Payer / Source' : 'Merchant / Provider'} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                list="merchants-list"
                placeholder={type === 'Income' ? 'e.g., Acme Corp' : "e.g., Target, Costco, Apple"}
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
                required
              />
              <datalist id="merchants-list">
                {activeMerchants.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Description & Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Description / Memo
              </label>
              <input
                type="text"
                placeholder="e.g., Dinner with team, monthly software license"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Target Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.bankName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  const subs = activeSubcategoriesMap[e.target.value] || [];
                  setSubcategory(subs[0] || 'General');
                }}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
              >
                {activeCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Subcategory
              </label>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
              >
                {(activeSubcategoriesMap[category] || ['General']).map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Frequency / Recurrence
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="One Time">One Time</option>
                <option value="Weekly">Weekly</option>
                <option value="Bi-Weekly">Bi-Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RECEIPT IMAGE ATTACHMENT WITH CAMERA & IMAGE PREVIEW / URL VALIDATION     */}
          {/* ========================================================================= */}
          <div className="bg-[#0c0d12] border border-white/10 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span>Receipt Photo / Proof Attachment</span>
              </label>

              {/* Toggle between Camera/Upload and Direct URL */}
              <div className="flex items-center gap-1 bg-[#14161c] p-0.5 rounded-lg border border-white/5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setReceiptTab('upload')}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                    receiptTab === 'upload'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Camera className="w-3 h-3" />
                  <span>Device / Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptTab('url')}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                    receiptTab === 'url'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>Image URL</span>
                </button>
              </div>
            </div>

            {/* If Receipt exists, render the Live Image Preview Box */}
            {receiptUrl ? (
              <div className="space-y-3">
                <div className="relative bg-[#14161c] border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 overflow-hidden">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Thumbnail Image with click to zoom */}
                    <div 
                      onClick={() => !imageLoadError && setIsPreviewOpen(true)}
                      className="relative w-16 h-16 rounded-lg bg-black overflow-hidden border border-white/10 shrink-0 cursor-pointer group shadow-md"
                    >
                      <img
                        src={receiptUrl}
                        alt="Receipt preview"
                        onError={() => setImageLoadError(true)}
                        onLoad={() => setImageLoadError(false)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {!imageLoadError && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ZoomIn className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {imageLoadError && (
                        <div className="absolute inset-0 bg-rose-950/80 flex flex-col items-center justify-center text-rose-300 p-1 text-center">
                          <AlertCircle className="w-4 h-4 text-rose-400 mb-0.5" />
                          <span className="text-[8px] font-semibold">Error</span>
                        </div>
                      )}
                    </div>

                    {/* Receipt Details & Status */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white truncate">
                          Receipt Image Attached
                        </span>
                        {!imageLoadError ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Check className="w-3 h-3" /> Valid Image
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <AlertCircle className="w-3 h-3" /> Invalid URL / Failed to Load
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-sm mt-0.5 font-mono">
                        {receiptUrl.startsWith('data:') 
                          ? 'Captured via Device Camera / File Upload' 
                          : receiptUrl}
                      </p>

                      {imageLoadError && (
                        <p className="text-[10px] text-rose-400 mt-1">
                          The provided URL could not be rendered as an image. Please verify the link or take a new photo.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    {!imageLoadError && (
                      <button
                        type="button"
                        onClick={() => setIsPreviewOpen(true)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
                        title="Zoom Preview"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Preview</span>
                      </button>
                    )}

                    {receiptUrl.startsWith('http') && (
                      <a
                        href={receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-colors"
                        title="Open Link in New Tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="p-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-xs transition-colors"
                      title="Retake with Camera"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReceiptUrl('');
                        setUrlInput('');
                        setImageLoadError(false);
                      }}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs transition-colors"
                      title="Remove Receipt"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Tab 1: Device Camera & File Upload */}
            {receiptTab === 'upload' && !receiptUrl && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Take Photo with Device Camera */}
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-semibold transition-all group active:scale-95 shadow-md shadow-indigo-950/40"
                >
                  <Camera className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span>Take Photo with Camera</span>
                </button>

                {/* Upload File / Document */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#14161c] hover:bg-white/5 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all group active:scale-95"
                >
                  <Upload className="w-4 h-4 text-slate-400 group-hover:scale-110 transition-transform" />
                  <span>Upload Receipt from Device</span>
                </button>
              </div>
            )}

            {/* Tab 2: Direct Image URL Entry */}
            {receiptTab === 'url' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="url"
                      placeholder="Paste image URL (e.g., https://example.com/receipt.jpg)"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        if (e.target.value.trim().startsWith('http')) {
                          setReceiptUrl(e.target.value.trim());
                          setImageLoadError(false);
                        }
                      }}
                      className="w-full bg-[#14161c] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shrink-0"
                  >
                    Apply URL
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Enter any direct public image link (HTTPS / HTTP / Base64 Data URI) to attach and preview receipt.
                </p>
              </div>
            )}

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Notes & Tags
            </label>
            <textarea
              rows={2}
              placeholder="Add optional notes, tax deductible tags, or reimbursement comments..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Submit Controls */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-950/50 flex items-center gap-2 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Transaction</span>
            </button>
          </div>
        </form>

      </div>

      {/* Hidden Canvas for Camera Snapshots */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ========================================================================= */}
      {/* FULL CAMERA VIEWFINDER MODAL                                              */}
      {/* ========================================================================= */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#14161c] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col space-y-4 p-5 animate-in zoom-in-95 duration-150">
            
            {/* Camera Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Capture Receipt Photo</h3>
              </div>
              <button
                type="button"
                onClick={handleCloseCamera}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewfinder Video / Snapshot Screen */}
            <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
              {cameraError ? (
                <div className="p-6 text-center space-y-3 max-w-xs">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-xs text-slate-300">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseCamera();
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow"
                  >
                    Upload from Device Instead
                  </button>
                </div>
              ) : capturedFrame ? (
                <img
                  src={capturedFrame}
                  alt="Captured Receipt Snapshot"
                  className="w-full h-full object-contain"
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Receipt Framing Guide Overlay */}
                  <div className="absolute inset-6 border-2 border-dashed border-indigo-400/60 rounded-xl pointer-events-none flex flex-col items-center justify-between p-3">
                    <span className="text-[10px] text-indigo-200 bg-black/70 px-2.5 py-1 rounded-full backdrop-blur-sm">
                      Align receipt within frame
                    </span>
                    <span className="text-[9px] text-slate-400 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                      Hold steady for clear focus
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Camera Controls */}
            {!cameraError && (
              <div className="flex items-center justify-between pt-1">
                {capturedFrame ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setCapturedFrame(null)}
                      className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retake Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmPhoto}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-950/50 active:scale-95 transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>Attach Receipt Photo</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleSwitchCamera}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
                      title="Flip Camera (Back / Front)"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Flip</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSnapPhoto}
                      className="px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-xl shadow-indigo-900/50 active:scale-95 transition-all"
                    >
                      <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                      <span>Snap Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCloseCamera}
                      className="px-3.5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULL RECEIPT ZOOM / LIGHTBOX PREVIEW MODAL                                */}
      {/* ========================================================================= */}
      {isPreviewOpen && receiptUrl && (
        <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#14161c] border border-white/10 rounded-2xl max-w-2xl w-full p-4 space-y-3 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white">Receipt Proof Full Preview</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-black rounded-xl p-2 border border-white/5">
              <img 
                src={receiptUrl} 
                alt="Receipt proof zoom" 
                className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-lg" 
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-[11px] text-slate-400">
                {receiptUrl.startsWith('data:') ? 'Captured image proof' : 'Remote receipt asset'}
              </span>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

