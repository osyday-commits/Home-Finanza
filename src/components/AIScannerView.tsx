import React, { useState } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { Transaction, AIReceiptExtraction, Account } from '../types';
import { CameraDocUploader } from './CameraDocUploader';

interface AIScannerViewProps {
  onSaveExtracted: (tx: Partial<Transaction>) => void;
  accounts: Account[];
}

export const AIScannerView: React.FC<AIScannerViewProps> = ({
  onSaveExtracted,
  accounts
}) => {
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Str = reader.result as string;
        setFileBase64(base64Str);
        processFileWithAI(base64Str, file.type);
      };
      reader.readAsDataURL(file);
    }
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
        setEditDate(data.date || '2026-08-01');
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
  const handleSampleReceipt = (sampleType: 'texas' | 'hiperkids' | 'statement') => {
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
        setExtractedData(sample);
        setEditProvider(sample.provider);
        setEditAmount('22.00');
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
        setExtractedData(sample);
        setEditProvider(sample.provider);
        setEditAmount('3450.00');
        setEditDate(sample.date);
        setEditCategory(sample.category);
        setEditSubcategory(sample.subcategory);
        setEditType('Income');
      }
      setIsAnalyzing(false);
    }, 900);
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

    setSuccessMessage(`Successfully recorded ${editProvider} ($${editAmount}) to transactions!`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-[#14161c] p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-indigo-400" />
            AI Receipt & Bank Statement Multimodal Scanner
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Upload photos of receipts or PDF statements. Gemini AI extracts amounts, categories, and providers automatically.
          </p>
        </div>

        {/* Preset Sample Buttons for instant test */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-500 font-medium mr-1">Quick Sample:</span>
          <button
            onClick={() => handleSampleReceipt('texas')}
            className="px-3 py-1.5 rounded-lg bg-[#090a0c] hover:bg-white/5 text-xs text-emerald-400 font-medium border border-white/10 transition-colors"
          >
            Texas Route Receipt
          </button>
          <button
            onClick={() => handleSampleReceipt('hiperkids')}
            className="px-3 py-1.5 rounded-lg bg-[#090a0c] hover:bg-white/5 text-xs text-indigo-400 font-medium border border-white/10 transition-colors"
          >
            Hiperkids Receipt
          </button>
          <button
            onClick={() => handleSampleReceipt('statement')}
            className="px-3 py-1.5 rounded-lg bg-[#090a0c] hover:bg-white/5 text-xs text-slate-300 font-medium border border-white/10 transition-colors"
          >
            Bank Statement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Upload Dropzone & Camera Box */}
        <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center min-h-[350px] space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/5">
            <ScanLine className="w-8 h-8" />
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-base font-bold text-white">
              Upload Documents or Take Picture
            </h3>
            <p className="text-xs text-slate-400 max-w-xs">
              Upload PNG, JPG, or PDF statement files, or capture a live receipt photo using your device camera.
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
              <span>Gemini AI parsing document items & values...</span>
            </div>
          )}
        </div>

        {/* AI Extraction Adjuster Form */}
        <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 space-y-5 shadow-xl">
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
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {successMessage}
            </div>
          )}

          {!extractedData && !isAnalyzing && (
            <div className="py-16 text-center text-slate-500 text-xs">
              Upload a receipt photo or click one of the quick samples above to extract data automatically.
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
                    editType === 'Expense' ? 'bg-rose-600 text-white' : 'text-slate-400'
                  }`}
                >
                  - Expense
                </button>
                <button
                  type="button"
                  onClick={() => setEditType('Income')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    editType === 'Income' ? 'bg-emerald-600 text-white' : 'text-slate-400'
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

              {/* Line Items parsed */}
              {extractedData.items && extractedData.items.length > 0 && (
                <div className="bg-[#090a0c] p-3 rounded-xl border border-white/10 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Itemized Line Items Found
                  </span>
                  <div className="space-y-1">
                    {extractedData.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-slate-300">
                        <span>{item.name}</span>
                        <span className="font-serif text-slate-400">${item.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save Button */}
              <button
                onClick={handleSaveToTransactions}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 border border-indigo-400/30 transition-all active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>Save Adjusted Entry to Ledger</span>
              </button>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
