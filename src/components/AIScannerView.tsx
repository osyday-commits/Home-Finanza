import React, { useState, useMemo, useEffect } from 'react';
import { 
  ScanLine, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  DollarSign, 
  Calendar, 
  Tag, 
  RefreshCw, 
  Plus, 
  ArrowRight,
  Image as ImageIcon,
  Images,
  Eye,
  Download,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  Filter,
  SlidersHorizontal,
  Landmark,
  Layers,
  ArrowUpDown,
  ExternalLink
} from 'lucide-react';
import { Transaction, AIReceiptExtraction, Account } from '../types';
import { CameraDocUploader } from './CameraDocUploader';

interface AIScannerViewProps {
  onSaveExtracted: (tx: Partial<Transaction>) => void;
  accounts: Account[];
  transactions?: Transaction[];
}

export const AIScannerView: React.FC<AIScannerViewProps> = ({
  onSaveExtracted,
  accounts,
  transactions = []
}) => {
  // Mode toggle: 'scan' or 'gallery'
  const [activeMode, setActiveMode] = useState<'scan' | 'gallery'>('scan');

  // Scanner state
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [extractedData, setExtractedData] = useState<AIReceiptExtraction | null>(null);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Editable Form fields for manual adjustment
  const [editProvider, setEditProvider] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [editType, setEditType] = useState<'Expense' | 'Income'>('Expense');
  const [editAccount, setEditAccount] = useState(accounts[0]?.id || 'acc-1');

  // Gallery Filter & Search State
  const [gallerySearch, setGallerySearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedAccount, setSelectedAccount] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'provider-asc'>('date-desc');

  // Lightbox / Modal State
  const [lightboxTx, setLightboxTx] = useState<Transaction | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Filter transactions that have valid receipt images
  const receiptTransactions = useMemo(() => {
    return transactions.filter((t) => t.receiptUrl && t.receiptUrl.trim().length > 0);
  }, [transactions]);

  // Unique categories in receipts
  const receiptCategories = useMemo(() => {
    const cats = new Set<string>();
    receiptTransactions.forEach((t) => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats);
  }, [receiptTransactions]);

  // Filtered and sorted receipts for the gallery
  const filteredReceipts = useMemo(() => {
    return receiptTransactions
      .filter((t) => {
        const matchesSearch =
          !gallerySearch ||
          t.provider.toLowerCase().includes(gallerySearch.toLowerCase()) ||
          t.description.toLowerCase().includes(gallerySearch.toLowerCase()) ||
          t.category.toLowerCase().includes(gallerySearch.toLowerCase()) ||
          (t.subcategory && t.subcategory.toLowerCase().includes(gallerySearch.toLowerCase())) ||
          (t.notes && t.notes.toLowerCase().includes(gallerySearch.toLowerCase())) ||
          t.id.toLowerCase().includes(gallerySearch.toLowerCase());

        const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
        const matchesAcc = selectedAccount === 'All' || t.accountId === selectedAccount;

        return matchesSearch && matchesCat && matchesAcc;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortBy === 'amount-desc') return b.amount - a.amount;
        if (sortBy === 'amount-asc') return a.amount - b.amount;
        if (sortBy === 'provider-asc') return a.provider.localeCompare(b.provider);
        return 0;
      });
  }, [receiptTransactions, gallerySearch, selectedCategory, selectedAccount, sortBy]);

  // Total summary calculations for gallery
  const totalReceiptsValue = useMemo(() => {
    return receiptTransactions.reduce((acc, t) => acc + (t.type === 'Expense' ? t.amount : -t.amount), 0);
  }, [receiptTransactions]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxTx) return;
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        handlePrevLightbox();
      } else if (e.key === 'ArrowRight') {
        handleNextLightbox();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxTx, filteredReceipts]);

  const closeLightbox = () => {
    setLightboxTx(null);
    setZoomLevel(1);
    setRotation(0);
  };

  const handlePrevLightbox = () => {
    if (!lightboxTx) return;
    const currentIndex = filteredReceipts.findIndex((t) => t.id === lightboxTx.id);
    if (currentIndex > 0) {
      setLightboxTx(filteredReceipts[currentIndex - 1]);
      setZoomLevel(1);
      setRotation(0);
    } else if (filteredReceipts.length > 0) {
      setLightboxTx(filteredReceipts[filteredReceipts.length - 1]);
      setZoomLevel(1);
      setRotation(0);
    }
  };

  const handleNextLightbox = () => {
    if (!lightboxTx) return;
    const currentIndex = filteredReceipts.findIndex((t) => t.id === lightboxTx.id);
    if (currentIndex >= 0 && currentIndex < filteredReceipts.length - 1) {
      setLightboxTx(filteredReceipts[currentIndex + 1]);
      setZoomLevel(1);
      setRotation(0);
    } else if (filteredReceipts.length > 0) {
      setLightboxTx(filteredReceipts[0]);
      setZoomLevel(1);
      setRotation(0);
    }
  };

  const handleDownloadReceipt = (url: string, filename: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'scanned-receipt.jpg';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      window.open(url, '_blank');
    }
  };

  // Re-load a receipt from the gallery into the AI scanner
  const handleLoadReceiptIntoScanner = (tx: Transaction) => {
    if (!tx.receiptUrl) return;
    closeLightbox();
    setActiveMode('scan');
    setFileBase64(tx.receiptUrl);
    setFileName(`${tx.provider.replace(/\s+/g, '_')}_Receipt.jpg`);
    setEditProvider(tx.provider);
    setEditAmount(String(tx.amount.toFixed(2)));
    setEditDate(tx.date);
    setEditCategory(tx.category);
    setEditSubcategory(tx.subcategory || '');
    setEditType(tx.type);
    setEditAccount(tx.accountId || accounts[0]?.id || 'acc-1');

    // Run AI analysis automatically on this image
    processFileWithAI(tx.receiptUrl, tx.receiptUrl.startsWith('data:application/pdf') ? 'application/pdf' : 'image/jpeg');
    setSuccessMessage(`Loaded ${tx.provider} receipt into AI Scanner for re-analysis.`);
  };

  const processFileWithAI = async (base64Str: string, mimeType: string) => {
    setIsAnalyzing(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await fetch('/api/ai/analyze-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Str,
          imageMimeType: mimeType || 'image/jpeg'
        })
      });

      const json = await response.json();
      if (json.success && json.data) {
        const data: AIReceiptExtraction = json.data;
        setExtractedData(data);
        setEditProvider(data.provider || 'Texas Routes');
        setEditAmount(data.amount ? String(data.amount) : '40.00');
        setEditDate(data.date || new Date().toISOString().split('T')[0]);
        setEditCategory(data.category || 'Everyday');
        setEditSubcategory(data.subcategory || 'Groceries');
        setEditType(data.type === 'Income' ? 'Income' : 'Expense');
      } else {
        throw new Error(json.error || 'Failed to extract data.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process document with Gemini AI.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Preset Sample Testing
  const handleSampleReceipt = (sampleType: 'texas' | 'hiperkids' | 'statement' | 'chevron' | 'wholefoods') => {
    setIsAnalyzing(true);
    setError('');
    setTimeout(() => {
      if (sampleType === 'texas') {
        const sample: AIReceiptExtraction = {
          provider: "Texas's Route",
          amount: 40.00,
          date: '2026-08-01',
          category: 'Everyday',
          subcategory: 'Groceries',
          type: 'Expense',
          description: 'Texas house groceries & meat supplies',
          items: [
            { name: 'Prime Beef Cut', price: 24.50, qty: 1 },
            { name: 'Seasoning & Oil', price: 15.50, qty: 1 }
          ],
          confidence: 0.98,
          notes: 'Matched with TRX -002 receipt',
          isSubscription: false,
          frequency: 'One Time'
        };
        setFileBase64('https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=600');
        setFileName('Texas_Route_Receipt.jpg');
        setExtractedData(sample);
        setEditProvider(sample.provider);
        setEditAmount('40.00');
        setEditDate(sample.date);
        setEditCategory(sample.category);
        setEditSubcategory(sample.subcategory);
        setEditType('Expense');
      } else if (sampleType === 'hiperkids') {
        const sample: AIReceiptExtraction = {
          provider: 'Hiperkids Play Center',
          amount: 22.00,
          date: '2026-08-01',
          category: 'Everyday',
          subcategory: 'Children & Family',
          type: 'Expense',
          description: 'Hiperkids activity day pass',
          items: [
            { name: 'Kid Entry Ticket', price: 18.00, qty: 1 },
            { name: 'Fruit Juice Box', price: 4.00, qty: 1 }
          ],
          confidence: 0.96,
          notes: 'Matched with TRX -003 receipt',
          isSubscription: false,
          frequency: 'One Time'
        };
        setFileBase64('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=600');
        setFileName('Hiperkids_Pass_Receipt.jpg');
        setExtractedData(sample);
        setEditProvider(sample.provider);
        setEditAmount('22.00');
        setEditDate(sample.date);
        setEditCategory(sample.category);
        setEditSubcategory(sample.subcategory);
        setEditType('Expense');
      } else if (sampleType === 'chevron') {
        const sample: AIReceiptExtraction = {
          provider: 'Chevron Gas Station',
          amount: 48.50,
          date: '2026-08-05',
          category: 'Transportation',
          subcategory: 'Fuel & Gas',
          type: 'Expense',
          description: '12.5 Gallons Supreme Unleaded',
          items: [
            { name: 'Supreme Fuel (12.5 gal)', price: 48.50, qty: 1 }
          ],
          confidence: 0.97,
          notes: 'Chevron Fuel Pump #4',
          isSubscription: false,
          frequency: 'One Time'
        };
        setFileBase64('https://images.unsplash.com/photo-1527018607619-766bd32988c4?auto=format&fit=crop&q=80&w=600');
        setFileName('Chevron_Fuel_Receipt.jpg');
        setExtractedData(sample);
        setEditProvider(sample.provider);
        setEditAmount('48.50');
        setEditDate(sample.date);
        setEditCategory(sample.category);
        setEditSubcategory(sample.subcategory);
        setEditType('Expense');
      } else if (sampleType === 'wholefoods') {
        const sample: AIReceiptExtraction = {
          provider: 'Whole Foods Market',
          amount: 184.20,
          date: '2026-07-18',
          category: 'Everyday',
          subcategory: 'Groceries',
          type: 'Expense',
          description: 'Organic pantry staples & produce',
          items: [
            { name: 'Organic Almond Milk', price: 5.99, qty: 2 },
            { name: 'Organic Cold-Pressed Olive Oil', price: 18.50, qty: 1 },
            { name: 'Artisan Sourdough Loaf', price: 7.25, qty: 1 },
            { name: 'Pantry Fresh Produce Assortment', price: 146.47, qty: 1 }
          ],
          confidence: 0.99,
          notes: 'Whole Foods Store #1082',
          isSubscription: false,
          frequency: 'One Time'
        };
        setFileBase64('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600');
        setFileName('WholeFoods_Market_Receipt.jpg');
        setExtractedData(sample);
        setEditProvider(sample.provider);
        setEditAmount('184.20');
        setEditDate(sample.date);
        setEditCategory(sample.category);
        setEditSubcategory(sample.subcategory);
        setEditType('Expense');
      } else {
        // Statement
        const sample: AIReceiptExtraction = {
          provider: 'Chase Direct Deposit Payroll',
          amount: 3450.00,
          date: '2026-08-01',
          category: 'Income',
          subcategory: 'Salary',
          type: 'Income',
          description: 'Monthly direct payroll credit',
          confidence: 0.99,
          notes: 'Parsed from Chase PDF statement',
          isSubscription: false,
          frequency: 'Bi-Weekly'
        };
        setFileBase64(null);
        setFileName('Chase_Monthly_Statement_August.pdf');
        setExtractedData(sample);
        setEditProvider(sample.provider);
        setEditAmount('3450.00');
        setEditDate(sample.date);
        setEditCategory(sample.category);
        setEditSubcategory(sample.subcategory);
        setEditType('Income');
      }
      setIsAnalyzing(false);
    }, 800);
  };

  const handleSaveToTransactions = () => {
    if (!editAmount || isNaN(Number(editAmount))) {
      setError('Please enter a valid amount.');
      return;
    }

    onSaveExtracted({
      id: `TRX-${Math.floor(100 + Math.random() * 900)}`,
      provider: editProvider,
      amount: parseFloat(editAmount),
      date: editDate,
      type: editType,
      category: editCategory,
      subcategory: editSubcategory,
      description: `${editProvider} (${editCategory})`,
      accountId: editAccount,
      frequency: extractedData?.frequency || 'One Time',
      receiptUrl: fileBase64 || '',
      month: 'August',
      year: 2026,
      status: 'Cleared'
    });

    setSuccessMessage(`Successfully recorded ${editProvider} ($${editAmount}) with attached receipt!`);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const getAccountName = (accId?: string) => {
    const acc = accounts.find((a) => a.id === accId);
    return acc ? acc.name : 'Primary Checking';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="ai-scanner-container">
      
      {/* Top Header with Navigation Tabs */}
      <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl" id="scanner-header">
        <div>
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">
              AI Receipt & Statement Intelligence
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Multimodal OCR extraction powered by Gemini AI and an integrated receipt gallery archive.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center bg-[#090a0c] p-1.5 rounded-xl border border-white/10 self-start md:self-auto" id="scanner-mode-tabs">
          <button
            id="tab-btn-scanner"
            onClick={() => setActiveMode('scan')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'scan'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ScanLine className="w-4 h-4" />
            <span>AI Scanner</span>
          </button>

          <button
            id="tab-btn-gallery"
            onClick={() => setActiveMode('gallery')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'gallery'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Images className="w-4 h-4" />
            <span>Receipts Gallery</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeMode === 'gallery'
                ? 'bg-white/20 text-white'
                : 'bg-indigo-500/20 text-indigo-300'
            }`}>
              {receiptTransactions.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: AI SCANNER VIEW */}
      {/* ========================================================================= */}
      {activeMode === 'scan' && (
        <div className="space-y-6">
          {/* Quick Presets Bar */}
          <div className="bg-[#14161c] px-5 py-3 rounded-xl border border-white/5 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-slate-300">Quick Test Samples:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleSampleReceipt('texas')}
                className="px-3 py-1.5 rounded-lg bg-[#090a0c] hover:bg-white/5 text-xs text-emerald-400 font-medium border border-white/10 transition-colors flex items-center gap-1.5"
              >
                <span>Texas Route ($40.00)</span>
              </button>
              <button
                onClick={() => handleSampleReceipt('wholefoods')}
                className="px-3 py-1.5 rounded-lg bg-[#090a0c] hover:bg-white/5 text-xs text-amber-400 font-medium border border-white/10 transition-colors flex items-center gap-1.5"
              >
                <span>Whole Foods ($184.20)</span>
              </button>
              <button
                onClick={() => handleSampleReceipt('chevron')}
                className="px-3 py-1.5 rounded-lg bg-[#090a0c] hover:bg-white/5 text-xs text-cyan-400 font-medium border border-white/10 transition-colors flex items-center gap-1.5"
              >
                <span>Chevron Gas ($48.50)</span>
              </button>
              <button
                onClick={() => handleSampleReceipt('hiperkids')}
                className="px-3 py-1.5 rounded-lg bg-[#090a0c] hover:bg-white/5 text-xs text-indigo-400 font-medium border border-white/10 transition-colors flex items-center gap-1.5"
              >
                <span>Hiperkids ($22.00)</span>
              </button>
              <button
                onClick={() => handleSampleReceipt('statement')}
                className="px-3 py-1.5 rounded-lg bg-[#090a0c] hover:bg-white/5 text-xs text-slate-300 font-medium border border-white/10 transition-colors flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>PDF Statement</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Upload Dropzone & Camera Box */}
            <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center min-h-[380px] space-y-4 shadow-xl" id="scanner-dropzone-card">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/5">
                <ScanLine className="w-8 h-8" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-white">
                  Upload Receipt or Capture Photo
                </h3>
                <p className="text-xs text-slate-400 max-w-xs">
                  Upload PNG, JPG, or PDF statements, or take a high-res photo directly with your device camera.
                </p>
              </div>

              <div className="w-full max-w-sm pt-2">
                <CameraDocUploader
                  label=""
                  value={fileBase64}
                  fileName={fileName}
                  onChange={(base64, name) => {
                    const docName = name || 'Scanned_Receipt.jpg';
                    setFileName(docName);
                    setFileBase64(base64);
                    processFileWithAI(base64, base64.startsWith('data:application/pdf') ? 'application/pdf' : 'image/jpeg');
                  }}
                  onClear={() => {
                    setFileBase64(null);
                    setFileName('');
                    setExtractedData(null);
                  }}
                />
              </div>

              {isAnalyzing && (
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-medium py-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Gemini AI extracting document items & values...</span>
                </div>
              )}
            </div>

            {/* AI Extraction Adjuster Form */}
            <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-5 shadow-xl" id="scanner-form-card">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  AI Extracted Data Review & Adjustments
                </h3>
                {extractedData && (
                  <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-semibold border border-indigo-500/20">
                    Confidence: {Math.round((extractedData.confidence || 0.95) * 100)}%
                  </span>
                )}
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> 
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                  <button
                    onClick={() => setActiveMode('gallery')}
                    className="text-xs underline font-semibold text-emerald-300 hover:text-white"
                  >
                    View in Gallery →
                  </button>
                </div>
              )}

              {!extractedData && !isAnalyzing && (
                <div className="py-16 text-center text-slate-500 text-xs space-y-2">
                  <p>Upload a receipt photo or click one of the quick test samples above to extract data automatically.</p>
                  {receiptTransactions.length > 0 && (
                    <button
                      onClick={() => setActiveMode('gallery')}
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium underline pt-2"
                    >
                      <Images className="w-3.5 h-3.5" />
                      <span>Browse {receiptTransactions.length} existing receipt images in the Gallery</span>
                    </button>
                  )}
                </div>
              )}

              {extractedData && (
                <div className="space-y-4">
                  
                  {/* Type Toggle */}
                  <div className="grid grid-cols-2 gap-2 bg-[#090a0c] p-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => setEditType('Expense')}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        editType === 'Expense' ? 'bg-rose-600 text-white shadow' : 'text-slate-400'
                      }`}
                    >
                      - Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditType('Income')}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        editType === 'Income' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400'
                      }`}
                    >
                      + Income
                    </button>
                  </div>

                  {/* Amount & Merchant */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Extracted Amount ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white font-serif text-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Provider / Merchant
                      </label>
                      <input
                        type="text"
                        value={editProvider}
                        onChange={(e) => setEditProvider(e.target.value)}
                        className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Category & Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Target Account Selector */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Charge to Account
                    </label>
                    <select
                      value={editAccount}
                      onChange={(e) => setEditAccount(e.target.value)}
                      className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.accountNumber || acc.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Line Items parsed */}
                  {extractedData.items && extractedData.items.length > 0 && (
                    <div className="bg-[#090a0c] p-3 rounded-xl border border-white/10 space-y-2 max-h-36 overflow-y-auto">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Itemized Line Items Found</span>
                        <span className="text-[10px] text-slate-500">{extractedData.items.length} items</span>
                      </span>
                      <div className="space-y-1 divide-y divide-white/5">
                        {extractedData.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-slate-300 pt-1">
                            <span>{item.name}</span>
                            <span className="font-serif text-slate-400">${item.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <button
                    id="save-extracted-btn"
                    onClick={handleSaveToTransactions}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 border border-indigo-400/30 transition-all active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Save Entry & Image to Ledger</span>
                  </button>

                </div>
              )}

            </div>

          </div>

          {/* Quick Preview Strip for Stored Receipts */}
          {receiptTransactions.length > 0 && (
            <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 space-y-4 shadow-xl" id="recent-receipts-preview-strip">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">
                    Recently Stored Receipts ({receiptTransactions.length})
                  </h3>
                </div>
                <button
                  onClick={() => setActiveMode('gallery')}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  <span>Open Full Gallery</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {receiptTransactions.slice(0, 6).map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => {
                      setLightboxTx(tx);
                      setZoomLevel(1);
                      setRotation(0);
                    }}
                    className="group relative bg-[#090a0c] rounded-xl border border-white/5 hover:border-indigo-500/40 p-2 cursor-pointer transition-all duration-200 flex flex-col justify-between overflow-hidden shadow"
                  >
                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-black/40 relative mb-2">
                      <img
                        src={tx.receiptUrl}
                        alt={tx.provider}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white drop-shadow-md" />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white truncate">{tx.provider}</div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">{tx.date}</span>
                        <span className="font-serif font-semibold text-emerald-400">${tx.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: FULL RECEIPTS GALLERY VIEW */}
      {/* ========================================================================= */}
      {activeMode === 'gallery' && (
        <div className="space-y-6 animate-in fade-in duration-200" id="receipts-gallery-section">
          
          {/* Gallery Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="gallery-stats-cards">
            
            <div className="bg-[#14161c] p-4 rounded-xl border border-white/5 shadow flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Images className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Total Scanned Receipts</div>
                <div className="text-xl font-bold text-white">{receiptTransactions.length} Images</div>
              </div>
            </div>

            <div className="bg-[#14161c] p-4 rounded-xl border border-white/5 shadow flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Total Tracked Value</div>
                <div className="text-xl font-bold text-white font-serif">${totalReceiptsValue.toFixed(2)}</div>
              </div>
            </div>

            <div className="bg-[#14161c] p-4 rounded-xl border border-white/5 shadow flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Active Categories</div>
                <div className="text-xl font-bold text-white">{receiptCategories.length} Categories</div>
              </div>
            </div>

            <div className="bg-[#14161c] p-4 rounded-xl border border-white/5 shadow flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Need New Extraction?</div>
                <div className="text-xs text-slate-300 mt-0.5">Capture or upload receipt</div>
              </div>
              <button
                onClick={() => setActiveMode('scan')}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-all active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>Scan New</span>
              </button>
            </div>

          </div>

          {/* Search, Category & Sorting Filters */}
          <div className="bg-[#14161c] p-4 rounded-2xl border border-white/5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4" id="gallery-filter-bar">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={gallerySearch}
                onChange={(e) => setGallerySearch(e.target.value)}
                placeholder="Search merchant, notes, category, ID..."
                className="w-full bg-[#090a0c] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-white text-xs placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              {gallerySearch && (
                <button
                  onClick={() => setGallerySearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* Category Filter */}
              <div className="flex items-center gap-1.5 bg-[#090a0c] border border-white/10 rounded-xl px-2.5 py-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-transparent text-xs text-slate-300 focus:outline-none"
                >
                  <option value="All" className="bg-[#14161c]">All Categories</option>
                  {receiptCategories.map((c) => (
                    <option key={c} value={c} className="bg-[#14161c]">{c}</option>
                  ))}
                </select>
              </div>

              {/* Account Filter */}
              <div className="flex items-center gap-1.5 bg-[#090a0c] border border-white/10 rounded-xl px-2.5 py-1.5">
                <Landmark className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="bg-transparent text-xs text-slate-300 focus:outline-none"
                >
                  <option value="All" className="bg-[#14161c]">All Accounts</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id} className="bg-[#14161c]">{a.name}</option>
                  ))}
                </select>
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1.5 bg-[#090a0c] border border-white/10 rounded-xl px-2.5 py-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs text-slate-300 focus:outline-none"
                >
                  <option value="date-desc" className="bg-[#14161c]">Newest Date</option>
                  <option value="date-asc" className="bg-[#14161c]">Oldest Date</option>
                  <option value="amount-desc" className="bg-[#14161c]">Amount: High to Low</option>
                  <option value="amount-asc" className="bg-[#14161c]">Amount: Low to High</option>
                  <option value="provider-asc" className="bg-[#14161c]">Merchant (A-Z)</option>
                </select>
              </div>

              {(gallerySearch || selectedCategory !== 'All' || selectedAccount !== 'All') && (
                <button
                  onClick={() => {
                    setGallerySearch('');
                    setSelectedCategory('All');
                    setSelectedAccount('All');
                  }}
                  className="px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}

            </div>

          </div>

          {/* Empty State */}
          {filteredReceipts.length === 0 && (
            <div className="bg-[#14161c] p-12 rounded-2xl border border-white/5 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
                <ImageIcon className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No Stored Receipts Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {receiptTransactions.length === 0
                    ? 'You have not scanned or attached any receipt images yet. Use the AI Scanner to scan your first physical or digital receipt.'
                    : 'No receipts match your search or filter query. Try resetting your search filters.'}
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => {
                    if (receiptTransactions.length === 0) {
                      setActiveMode('scan');
                    } else {
                      setGallerySearch('');
                      setSelectedCategory('All');
                      setSelectedAccount('All');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-2 shadow"
                >
                  {receiptTransactions.length === 0 ? (
                    <>
                      <ScanLine className="w-4 h-4" />
                      <span>Scan Your First Receipt</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Clear All Filters</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Receipts Gallery Grid */}
          {filteredReceipts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5" id="receipts-gallery-grid">
              {filteredReceipts.map((tx) => (
                <div
                  key={tx.id}
                  className="group bg-[#14161c] rounded-2xl border border-white/5 hover:border-indigo-500/40 transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-xl"
                  id={`receipt-card-${tx.id}`}
                >
                  {/* Image Container with Badges */}
                  <div className="relative aspect-[4/3] bg-black/60 overflow-hidden cursor-pointer">
                    <img
                      src={tx.receiptUrl}
                      alt={tx.provider}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      onClick={() => {
                        setLightboxTx(tx);
                        setZoomLevel(1);
                        setRotation(0);
                      }}
                    />

                    {/* Gradient Overlay for Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                      <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-slate-200 text-[10px] font-semibold border border-white/10">
                        {tx.date}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-sm border ${
                        tx.type === 'Income'
                          ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                          : 'bg-rose-500/30 text-rose-300 border-rose-500/40'
                      }`}>
                        {tx.type}
                      </span>
                    </div>

                    {/* Bottom overlay in image container */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between pointer-events-none">
                      <div className="text-lg font-bold font-serif text-white drop-shadow-md">
                        ${tx.amount.toFixed(2)}
                      </div>
                      <span className="px-2 py-0.5 rounded bg-indigo-600/80 backdrop-blur-sm text-white text-[10px] font-semibold">
                        {tx.category}
                      </span>
                    </div>

                    {/* Hover Zoom Button Overlay */}
                    <button
                      onClick={() => {
                        setLightboxTx(tx);
                        setZoomLevel(1);
                        setRotation(0);
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <div className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-black/60">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Enlarge Receipt</span>
                      </div>
                    </button>
                  </div>

                  {/* Content Details Area */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-white truncate" title={tx.provider}>
                          {tx.provider}
                        </h4>
                        <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                          {tx.id}
                        </span>
                      </div>

                      {tx.subcategory && (
                        <div className="text-xs text-indigo-400 font-medium mt-0.5">
                          {tx.subcategory}
                        </div>
                      )}

                      {tx.notes ? (
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1.5">
                          {tx.notes}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic mt-1.5">
                          {tx.description || 'Receipt document'}
                        </p>
                      )}
                    </div>

                    {/* Account Badge & Action Toolbar */}
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 truncate max-w-[140px]">
                          <Landmark className="w-3 h-3 text-slate-500" />
                          {getAccountName(tx.accountId)}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold">
                          {tx.status || 'Cleared'}
                        </span>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => handleLoadReceiptIntoScanner(tx)}
                          className="py-1.5 px-2 rounded-lg bg-[#090a0c] hover:bg-indigo-600/20 hover:text-indigo-300 text-slate-300 text-[11px] font-medium border border-white/10 flex items-center justify-center gap-1 transition-colors"
                          title="Re-analyze or adjust this receipt in the AI scanner"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          <span>AI Re-Scan</span>
                        </button>

                        <button
                          onClick={() => handleDownloadReceipt(tx.receiptUrl!, `${tx.provider}_Receipt.jpg`)}
                          className="py-1.5 px-2 rounded-lg bg-[#090a0c] hover:bg-white/5 text-slate-300 text-[11px] font-medium border border-white/10 flex items-center justify-center gap-1 transition-colors"
                          title="Download original receipt file"
                        >
                          <Download className="w-3 h-3 text-slate-400" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>

                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* FULLSCREEN RECEIPT LIGHTBOX / MODAL */}
      {/* ========================================================================= */}
      {lightboxTx && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          id="receipt-lightbox-modal"
        >
          {/* Modal Container */}
          <div className="bg-[#14161c] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            
            {/* Modal Top Bar */}
            <div className="px-5 py-3.5 bg-[#090a0c] border-b border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{lightboxTx.provider}</h3>
                    <span className="text-[11px] font-serif font-bold text-emerald-400">
                      ${lightboxTx.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Date: {lightboxTx.date} • {lightboxTx.category} {lightboxTx.subcategory ? `(${lightboxTx.subcategory})` : ''} • ID: {lightboxTx.id}
                  </div>
                </div>
              </div>

              {/* Controls (Zoom, Rotate, Actions, Close) */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center bg-[#14161c] border border-white/10 rounded-xl p-1 gap-1">
                  <button
                    onClick={() => setZoomLevel((prev) => Math.max(0.6, prev - 0.2))}
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] text-slate-400 font-mono px-1">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((prev) => Math.min(3, prev + 0.2))}
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <div className="w-[1px] h-4 bg-white/10 mx-0.5" />
                  <button
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => handleDownloadReceipt(lightboxTx.receiptUrl!, `${lightboxTx.provider}_Receipt.jpg`)}
                  className="p-2 rounded-xl bg-[#14161c] hover:bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors"
                  title="Download receipt image"
                >
                  <Download className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleLoadReceiptIntoScanner(lightboxTx)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
                  title="Load into Gemini AI Scanner"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">AI Re-Scan</span>
                </button>

                <button
                  onClick={closeLightbox}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors ml-1"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Image Viewport + Sidebar Details */}
            <div className="grid grid-cols-1 lg:grid-cols-4 flex-1 overflow-hidden">
              
              {/* Image Viewport (3 cols on desktop) */}
              <div className="lg:col-span-3 bg-black/80 relative flex items-center justify-center p-4 overflow-auto min-h-[360px] lg:min-h-[460px]">
                
                {/* Prev / Next Buttons */}
                <button
                  onClick={handlePrevLightbox}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-indigo-600 text-white transition-all z-10 border border-white/10"
                  title="Previous Receipt (Left Arrow)"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  onClick={handleNextLightbox}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-indigo-600 text-white transition-all z-10 border border-white/10"
                  title="Next Receipt (Right Arrow)"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* The Transformed Receipt Image */}
                <div className="max-w-full max-h-full flex items-center justify-center transition-all duration-200">
                  <img
                    src={lightboxTx.receiptUrl}
                    alt={lightboxTx.provider}
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transformOrigin: 'center center'
                    }}
                    className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-200"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              {/* Side Info Panel (1 col on desktop) */}
              <div className="bg-[#14161c] p-5 border-t lg:border-t-0 lg:border-l border-white/10 space-y-4 overflow-y-auto max-h-[300px] lg:max-h-none">
                <div className="border-b border-white/5 pb-3">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Associated Entry</span>
                  <h4 className="text-base font-bold text-white mt-1">{lightboxTx.provider}</h4>
                  <div className="text-xl font-serif font-bold text-emerald-400 mt-0.5">
                    ${lightboxTx.amount.toFixed(2)}
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Date</span>
                    <span className="text-white font-medium">{lightboxTx.date}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Type</span>
                    <span className={`font-semibold ${lightboxTx.type === 'Income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {lightboxTx.type}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Category</span>
                    <span className="text-indigo-400 font-medium">{lightboxTx.category}</span>
                  </div>

                  {lightboxTx.subcategory && (
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-slate-400">Subcategory</span>
                      <span className="text-slate-200">{lightboxTx.subcategory}</span>
                    </div>
                  )}

                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Target Account</span>
                    <span className="text-slate-200">{getAccountName(lightboxTx.accountId)}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Status</span>
                    <span className="text-emerald-400 font-semibold">{lightboxTx.status || 'Cleared'}</span>
                  </div>

                  {lightboxTx.notes && (
                    <div className="pt-2">
                      <span className="text-slate-400 block mb-1">Notes / Description:</span>
                      <p className="text-slate-300 bg-[#090a0c] p-2.5 rounded-xl border border-white/5 text-[11px] leading-relaxed">
                        {lightboxTx.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3">
                  <button
                    onClick={() => handleLoadReceiptIntoScanner(lightboxTx)}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Re-Analyze with Gemini AI</span>
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
