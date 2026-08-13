import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  ScanLine, 
  Search, 
  Filter, 
  Calendar, 
  Tag, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Upload, 
  Sparkles, 
  Edit, 
  Trash2, 
  X, 
  Camera, 
  RefreshCw, 
  Grid, 
  List as ListIcon,
  ShoppingBag,
  Box,
  Layers,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { InventoryItem, InventoryMetric, AppSettings, Transaction } from '../types';
import { CameraDocUploader } from './CameraDocUploader';

interface InventoryViewProps {
  inventory: InventoryItem[];
  onUpdateInventory: (items: InventoryItem[]) => void;
  settings: AppSettings;
  onAddTransaction?: (tx: Partial<Transaction>) => void;
}

const METRICS_OPTIONS: { value: InventoryMetric; label: string }[] = [
  { value: 'Unit', label: 'Unit / Piece' },
  { value: 'Box', label: 'Box' },
  { value: 'Can', label: 'Can' },
  { value: 'Lt', label: 'Liter (Lt)' },
  { value: 'Gallon', label: 'Gallon' },
  { value: 'Pound', label: 'Pound (Lb)' },
  { value: 'Kg', label: 'Kilogram (Kg)' },
  { value: 'Oz', label: 'Ounce (Oz)' },
  { value: 'Bag', label: 'Bag' },
  { value: 'Pack', label: 'Pack' },
  { value: 'Bottle', label: 'Bottle' },
  { value: 'Other', label: 'Other' }
];

const LOCATIONS_LIST = [
  'Pantry',
  'Refrigerator',
  'Cabinet',
  'Office',
  'Drawer',
  'Garage',
  'General Storage'
];

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  onUpdateInventory,
  settings,
  onAddTransaction
}) => {
  const invCategories = settings.inventoryCategories || [
    'Food & Pantry',
    'Beverages',
    'Household & Cleaning',
    'Personal Care & Health',
    'Office & Supplies',
    'Tools & Hardware',
    'Electronics & Appliances',
    'Other Inventory'
  ];

  const invSubcategories = settings.inventorySubcategories || {
    'Food & Pantry': ['Dry Goods', 'Canned Goods', 'Spices & Oils', 'Snacks', 'Baking', 'Fresh Produce', 'Dairy & Refrigerated', 'Frozen Foods'],
    'Beverages': ['Coffee & Tea', 'Water & Juice', 'Soda & Soft Drinks', 'Wine & Spirits'],
    'Household & Cleaning': ['Paper Products', 'Detergents & Cleaners', 'Trash Bags', 'Kitchenware'],
    'Personal Care & Health': ['Toiletries', 'Vitamins & Supplements', 'First Aid', 'Skincare'],
    'Office & Supplies': ['Stationery & Paper', 'Printer Supplies', 'Shipping & Boxes', 'Desk Accessories'],
    'Tools & Hardware': ['Hand Tools', 'Fasteners & Hardware', 'Electrical', 'Safety Equipment'],
    'Electronics & Appliances': ['Cables & Adapters', 'Batteries', 'Gadgets', 'Small Appliances'],
    'Other Inventory': ['General Item', 'Miscellaneous']
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // AI Receipt Scan for Inventory Modal State
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanImageBase64, setScanImageBase64] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanErrorMessage, setScanErrorMessage] = useState('');
  const [extractedScanData, setExtractedScanData] = useState<{
    merchant: string;
    purchaseDate: string;
    totalAmount: number;
    items: Partial<InventoryItem>[];
  } | null>(null);
  const [recordAsTransaction, setRecordAsTransaction] = useState(true);

  // Form states for item modal
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState(invCategories[0] || 'Food & Pantry');
  const [itemSubcategory, setItemSubcategory] = useState(invSubcategories[invCategories[0]]?.[0] || 'Dry Goods');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemMetric, setItemMetric] = useState<InventoryMetric>('Unit');
  const [itemUnitPrice, setItemUnitPrice] = useState<string>('');
  const [itemTotalCost, setItemTotalCost] = useState<string>('');
  const [itemMerchant, setItemMerchant] = useState('');
  const [itemPurchaseDate, setItemPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [itemExpirationDate, setItemExpirationDate] = useState('');
  const [itemLocation, setItemLocation] = useState('Pantry');
  const [itemNotes, setItemNotes] = useState('');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [itemStatus, setItemStatus] = useState<'In Stock' | 'Low Stock' | 'Expired' | 'Depleted'>('In Stock');

  // Preview image modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Calculate Expiration Status & Alerts
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMs = new Date().getTime();

  const getItemExpirationState = (expDate?: string) => {
    if (!expDate) return { isExpired: false, isExpiringSoon: false, daysLeft: null };
    const expMs = new Date(expDate).getTime();
    const diffDays = Math.ceil((expMs - todayMs) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { isExpired: true, isExpiringSoon: false, daysLeft: diffDays };
    if (diffDays <= 7) return { isExpired: false, isExpiringSoon: true, daysLeft: diffDays };
    return { isExpired: false, isExpiringSoon: false, daysLeft: diffDays };
  };

  // Stats
  const totalItemsCount = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const totalValuation = inventory.reduce((sum, item) => sum + (item.totalCost || (item.unitPrice ? item.unitPrice * item.quantity : 0)), 0);
  
  const expiringSoonCount = inventory.filter((item) => {
    const { isExpiringSoon } = getItemExpirationState(item.expirationDate);
    return isExpiringSoon || item.status === 'Expiring Soon';
  }).length;

  const expiredCount = inventory.filter((item) => {
    const { isExpired } = getItemExpirationState(item.expirationDate);
    return isExpired || item.status === 'Expired';
  }).length;

  // Filtered List
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.merchant && item.merchant.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesLocation = selectedLocation === 'All' || item.location === selectedLocation;

    const { isExpired, isExpiringSoon } = getItemExpirationState(item.expirationDate);
    let computedStatus = item.status || 'In Stock';
    if (isExpired) computedStatus = 'Expired';
    else if (isExpiringSoon && computedStatus !== 'Depleted') computedStatus = 'Low Stock';

    const matchesStatus = 
      selectedStatus === 'All' || 
      (selectedStatus === 'Expiring Soon' ? (isExpiringSoon || computedStatus === 'Expiring Soon') : computedStatus === selectedStatus);

    return matchesSearch && matchesCategory && matchesLocation && matchesStatus;
  });

  // Modal Reset
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setItemName('');
    const defaultCat = invCategories[0] || 'Food & Pantry';
    const defaultSub = invSubcategories[defaultCat]?.[0] || 'Dry Goods';
    setItemCategory(defaultCat);
    setItemSubcategory(defaultSub);
    setItemQuantity(1);
    setItemMetric('Unit');
    setItemUnitPrice('');
    setItemTotalCost('');
    setItemMerchant('');
    setItemPurchaseDate(new Date().toISOString().split('T')[0]);
    setItemExpirationDate('');
    setItemLocation('Pantry');
    setItemNotes('');
    setItemImageUrl('');
    setItemStatus('In Stock');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setItemName(item.name);
    const cat = item.category || invCategories[0] || 'Food & Pantry';
    const sub = item.subcategory || invSubcategories[cat]?.[0] || 'Dry Goods';
    setItemCategory(cat);
    setItemSubcategory(sub);
    setItemQuantity(item.quantity);
    setItemMetric((item.metric as InventoryMetric) || 'Unit');
    setItemUnitPrice(item.unitPrice ? String(item.unitPrice) : '');
    setItemTotalCost(item.totalCost ? String(item.totalCost) : '');
    setItemMerchant(item.merchant || '');
    setItemPurchaseDate(item.purchaseDate || new Date().toISOString().split('T')[0]);
    setItemExpirationDate(item.expirationDate || '');
    setItemLocation(item.location || 'Pantry');
    setItemNotes(item.notes || '');
    setItemImageUrl(item.imageUrl || '');
    setItemStatus(item.status || 'In Stock');
    setIsModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const unitP = itemUnitPrice ? parseFloat(itemUnitPrice) : 0;
    const qty = Number(itemQuantity) || 1;
    const totC = itemTotalCost ? parseFloat(itemTotalCost) : unitP * qty;

    const { isExpired, isExpiringSoon } = getItemExpirationState(itemExpirationDate);
    let calculatedStatus = itemStatus;
    if (qty <= 0) calculatedStatus = 'Depleted';
    else if (isExpired) calculatedStatus = 'Expired';

    if (editingItem) {
      const updated = inventory.map((i) =>
        i.id === editingItem.id
          ? {
              ...i,
              name: itemName.trim(),
              category: itemCategory,
              subcategory: itemSubcategory,
              quantity: qty,
              metric: itemMetric,
              unitPrice: unitP,
              totalCost: totC,
              merchant: itemMerchant,
              purchaseDate: itemPurchaseDate,
              expirationDate: itemExpirationDate,
              location: itemLocation,
              notes: itemNotes,
              imageUrl: itemImageUrl,
              status: calculatedStatus
            }
          : i
      );
      onUpdateInventory(updated);
    } else {
      const newItem: InventoryItem = {
        id: `INV-${Math.floor(100 + Math.random() * 900)}`,
        name: itemName.trim(),
        category: itemCategory,
        subcategory: itemSubcategory,
        quantity: qty,
        metric: itemMetric,
        unitPrice: unitP,
        totalCost: totC,
        merchant: itemMerchant,
        purchaseDate: itemPurchaseDate,
        expirationDate: itemExpirationDate,
        location: itemLocation,
        notes: itemNotes,
        imageUrl: itemImageUrl,
        status: calculatedStatus,
        createdAt: new Date().toISOString()
      };
      onUpdateInventory([newItem, ...inventory]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Are you sure you want to delete this inventory item?')) {
      onUpdateInventory(inventory.filter((i) => i.id !== id));
    }
  };

  const handleAdjustQuantity = (id: string, delta: number) => {
    const updated = inventory.map((item) => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        let newStatus = item.status;
        if (newQty === 0) newStatus = 'Depleted';
        else if (newQty < 2 && newStatus !== 'Expired') newStatus = 'Low Stock';
        else if (newQty >= 2 && newStatus === 'Depleted') newStatus = 'In Stock';
        return {
          ...item,
          quantity: newQty,
          status: newStatus
        };
      }
      return item;
    });
    onUpdateInventory(updated);
  };

  // AI Receipt Scanner Handling
  const handleScanFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Str = reader.result as string;
        setScanImageBase64(base64Str);
        processInventoryReceiptAI(base64Str, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const processInventoryReceiptAI = async (base64Str: string, mimeType: string) => {
    setIsScanning(true);
    setScanErrorMessage('');
    try {
      const res = await fetch('/api/ai/analyze-receipt-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Str, imageMimeType: mimeType || 'image/jpeg' })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setExtractedScanData(json.data);
      } else {
        throw new Error(json.error || 'Failed to scan inventory items.');
      }
    } catch (err: any) {
      setScanErrorMessage(err.message || 'Error processing receipt photo.');
    } finally {
      setIsScanning(false);
    }
  };

  // Sample Receipt preset button for test
  const handleSampleReceiptScan = (preset: 'texas' | 'hiperkids') => {
    setIsScanning(true);
    setScanErrorMessage('');
    setTimeout(() => {
      if (preset === 'texas') {
        setExtractedScanData({
          merchant: "Texas's Route",
          purchaseDate: '2026-08-01',
          totalAmount: 40.00,
          items: [
            {
              name: 'Prime Angus Beef Cut',
              category: 'Everyday',
              subcategory: 'Groceries',
              quantity: 2,
              metric: 'Pound',
              unitPrice: 12.25,
              totalCost: 24.50,
              location: 'Refrigerator',
              expirationDate: '2026-08-10',
              notes: 'Family BBQ cut'
            },
            {
              name: 'Seasoning & Extra Virgin Olive Oil',
              category: 'Everyday',
              subcategory: 'Groceries',
              quantity: 1,
              metric: 'Bottle',
              unitPrice: 15.50,
              totalCost: 15.50,
              location: 'Pantry',
              expirationDate: '2027-08-01',
              notes: 'Seasoning blend'
            }
          ]
        });
      } else {
        setExtractedScanData({
          merchant: 'Hiperkids Play Center',
          purchaseDate: '2026-08-01',
          totalAmount: 22.00,
          items: [
            {
              name: 'Hiperkids Kid Pass Vouchers',
              category: 'Everyday',
              subcategory: 'Children & Family',
              quantity: 2,
              metric: 'Unit',
              unitPrice: 9.00,
              totalCost: 18.00,
              location: 'Drawer',
              expirationDate: '2026-08-31',
              notes: 'Playground vouchers'
            },
            {
              name: 'Organic Fruit Juice Pack',
              category: 'Everyday',
              subcategory: 'Groceries',
              quantity: 1,
              metric: 'Pack',
              unitPrice: 4.00,
              totalCost: 4.00,
              location: 'Refrigerator',
              expirationDate: '2026-08-20',
              notes: 'Apple & Berry'
            }
          ]
        });
      }
      setIsScanning(false);
    }, 800);
  };

  const handleConfirmImportScannedItems = () => {
    if (!extractedScanData || !extractedScanData.items) return;

    const newItems: InventoryItem[] = extractedScanData.items.map((it, index) => {
      const qty = it.quantity || 1;
      const uPrice = it.unitPrice || 0;
      const tCost = it.totalCost || uPrice * qty;
      return {
        id: `INV-${Math.floor(100 + Math.random() * 900)}-${index}`,
        name: it.name || 'Purchased Product',
        category: it.category || 'Everyday',
        subcategory: it.subcategory || 'Groceries',
        quantity: qty,
        metric: (it.metric as InventoryMetric) || 'Unit',
        unitPrice: uPrice,
        totalCost: tCost,
        merchant: extractedScanData.merchant || 'Store',
        purchaseDate: extractedScanData.purchaseDate || new Date().toISOString().split('T')[0],
        expirationDate: it.expirationDate || '',
        location: it.location || 'Pantry',
        notes: it.notes || `Scanned from ${extractedScanData.merchant} receipt`,
        imageUrl: scanImageBase64 || undefined,
        status: 'In Stock',
        createdAt: new Date().toISOString()
      };
    });

    onUpdateInventory([...newItems, ...inventory]);

    // Optionally also record as financial transaction
    if (recordAsTransaction && onAddTransaction && extractedScanData.totalAmount > 0) {
      onAddTransaction({
        id: `TRX-${Math.floor(100 + Math.random() * 900)}`,
        provider: extractedScanData.merchant || 'Receipt Merchant',
        amount: extractedScanData.totalAmount,
        date: extractedScanData.purchaseDate || new Date().toISOString().split('T')[0],
        type: 'Expense',
        category: 'Everyday',
        subcategory: 'Groceries',
        description: `Receipt Purchase (${newItems.length} inventory products)`,
        accountId: 'acc-1',
        receiptUrl: scanImageBase64 || '',
        status: 'Cleared'
      });
    }

    setIsScanModalOpen(false);
    setScanImageBase64(null);
    setExtractedScanData(null);
  };

  const handleItemImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setItemImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header Card */}
      <div className="bg-[#14161c] p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Package className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">Product & Pantry Inventory Tracker</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Keep track of purchased groceries, household goods, equipment, metrics, and auto-extracted products from scanned receipts.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setExtractedScanData(null);
              setScanImageBase64(null);
              setScanErrorMessage('');
              setIsScanModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#090a0c] hover:bg-white/5 border border-white/10 text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95"
          >
            <ScanLine className="w-4 h-4 text-indigo-400" />
            <span>AI Receipt Auto-Scan</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-950/50 border border-indigo-400/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Product Manually</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#14161c] p-4 rounded-2xl border border-white/5 shadow-lg space-y-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Products</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white font-serif">{inventory.length}</span>
            <span className="text-xs text-indigo-400 font-medium">({totalItemsCount} units)</span>
          </div>
        </div>

        <div className="bg-[#14161c] p-4 rounded-2xl border border-white/5 shadow-lg space-y-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Inventory Valuation</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-400 font-serif">${totalValuation.toFixed(2)}</span>
            <span className="text-[10px] text-slate-500">Asset Value</span>
          </div>
        </div>

        <div className="bg-[#14161c] p-4 rounded-2xl border border-white/5 shadow-lg space-y-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Expiring Soon (7 Days)</span>
          <div className="flex items-baseline justify-between">
            <span className={`text-2xl font-bold font-serif ${expiringSoonCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {expiringSoonCount}
            </span>
            {expiringSoonCount > 0 && <AlertTriangle className="w-4 h-4 text-amber-400" />}
          </div>
        </div>

        <div className="bg-[#14161c] p-4 rounded-2xl border border-white/5 shadow-lg space-y-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Expired / Out of Stock</span>
          <div className="flex items-baseline justify-between">
            <span className={`text-2xl font-bold font-serif ${expiredCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {expiredCount}
            </span>
            {expiredCount > 0 && <Clock className="w-4 h-4 text-rose-400" />}
          </div>
        </div>
      </div>

      {/* Filter Toolbar & View Mode Switch */}
      <div className="bg-[#14161c] p-4 rounded-2xl border border-white/5 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search product name, merchant, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#090a0c] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
            >
              <option value="All">All Categories</option>
              {invCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Location Filter */}
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
            >
              <option value="All">All Locations</option>
              {LOCATIONS_LIST.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Expiring Soon">Expiring Soon</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Expired">Expired</option>
              <option value="Depleted">Depleted</option>
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-[#090a0c] p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Table View"
              >
                <ListIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Grid Cards View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Main Inventory Display */}
      {filteredInventory.length === 0 ? (
        <div className="bg-[#14161c] p-12 rounded-2xl border border-white/5 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-slate-500">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Inventory Items Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No items matched your search query or filter settings. Click "+ Add Product" or "AI Receipt Auto-Scan" to populate your inventory.
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium"
            >
              + Add Product
            </button>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-[#14161c] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-[#090a0c]/50">
                  <th className="py-3.5 px-4">Item Name</th>
                  <th className="py-3.5 px-4">Category & Sub</th>
                  <th className="py-3.5 px-4 text-center">Quantity & Metric</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Purchased / Merchant</th>
                  <th className="py-3.5 px-4">Expiration Date</th>
                  <th className="py-3.5 px-4 text-right">Unit Price / Total</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {filteredInventory.map((item) => {
                  const { isExpired, isExpiringSoon, daysLeft } = getItemExpirationState(item.expirationDate);
                  
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                      
                      {/* Name & Photo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              onClick={() => setPreviewImage(item.imageUrl || null)}
                              className="w-9 h-9 rounded-xl object-cover border border-white/10 cursor-pointer hover:opacity-80 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 font-bold">
                              {item.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-white text-xs">{item.name}</div>
                            {item.notes && (
                              <div className="text-[10px] text-slate-500 line-clamp-1">{item.notes}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">{item.category}</div>
                        {item.subcategory && (
                          <div className="text-[10px] text-slate-500">{item.subcategory}</div>
                        )}
                      </td>

                      {/* Quantity & Metric */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-2 bg-[#090a0c] border border-white/10 px-2 py-1 rounded-xl">
                          <button
                            onClick={() => handleAdjustQuantity(item.id, -1)}
                            className="w-5 h-5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center font-bold text-xs"
                            title="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="font-bold text-white min-w-[24px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleAdjustQuantity(item.id, 1)}
                            className="w-5 h-5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center font-bold text-xs"
                            title="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{item.metric || 'Unit'}</div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/80 text-slate-300 text-[11px] border border-white/5">
                          <MapPin className="w-3 h-3 text-indigo-400" />
                          <span>{item.location || 'Pantry'}</span>
                        </span>
                      </td>

                      {/* Purchased */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-300">{item.merchant || 'Store'}</div>
                        <div className="text-[10px] text-slate-500">{item.purchaseDate || '-'}</div>
                      </td>

                      {/* Expiration Date */}
                      <td className="py-3.5 px-4">
                        {item.expirationDate ? (
                          <div>
                            <div className={`font-mono text-xs ${isExpired ? 'text-rose-400 font-bold' : isExpiringSoon ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                              {item.expirationDate}
                            </div>
                            <div className="text-[10px]">
                              {isExpired ? (
                                <span className="text-rose-400 font-semibold">Expired ({Math.abs(daysLeft || 0)}d ago)</span>
                              ) : isExpiringSoon ? (
                                <span className="text-amber-400 font-semibold">Expiring in {daysLeft}d</span>
                              ) : (
                                <span className="text-slate-500">{daysLeft} days left</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-[11px]">N/A</span>
                        )}
                      </td>

                      {/* Pricing */}
                      <td className="py-3.5 px-4 text-right font-serif">
                        <div className="font-bold text-white">
                          ${(item.totalCost || (item.unitPrice ? item.unitPrice * item.quantity : 0)).toFixed(2)}
                        </div>
                        {item.unitPrice && (
                          <div className="text-[10px] text-slate-500">${item.unitPrice.toFixed(2)} / {item.metric}</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {item.quantity === 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Depleted
                          </span>
                        ) : isExpired ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Expired
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Expiring Soon
                          </span>
                        ) : item.quantity < 2 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            In Stock
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title="Edit Product"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map((item) => {
            const { isExpired, isExpiringSoon, daysLeft } = getItemExpirationState(item.expirationDate);
            return (
              <div
                key={item.id}
                className="bg-[#14161c] p-4 rounded-2xl border border-white/5 space-y-3 hover:border-white/10 transition-all flex flex-col justify-between shadow-xl"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          onClick={() => setPreviewImage(item.imageUrl || null)}
                          className="w-10 h-10 rounded-xl object-cover border border-white/10 cursor-pointer hover:opacity-80"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-white text-sm line-clamp-1">{item.name}</h4>
                        <div className="text-[11px] text-slate-400">{item.category} • {item.subcategory || 'General'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1 text-slate-500 hover:text-white"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-[#090a0c] p-2.5 rounded-xl border border-white/5">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Location</span>
                      <span className="font-medium text-slate-300">{item.location || 'Pantry'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] block">Quantity</span>
                      <div className="inline-flex items-center gap-1.5 font-bold text-white">
                        <button onClick={() => handleAdjustQuantity(item.id, -1)} className="text-slate-400 hover:text-white">-</button>
                        <span>{item.quantity} {item.metric}</span>
                        <button onClick={() => handleAdjustQuantity(item.id, 1)} className="text-slate-400 hover:text-white">+</button>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-500 text-[10px] block">Total Cost</span>
                      <span className="font-bold text-emerald-400 font-serif">
                        ${(item.totalCost || (item.unitPrice ? item.unitPrice * item.quantity : 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {item.expirationDate && (
                    <div className={`p-2 rounded-xl text-xs flex items-center justify-between border ${
                      isExpired ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : isExpiringSoon ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-white/5 border-white/5 text-slate-400'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Expires: {item.expirationDate}</span>
                      </div>
                      <span className="font-semibold text-[11px]">
                        {isExpired ? 'EXPIRED' : isExpiringSoon ? `${daysLeft}d left` : `${daysLeft}d`}
                      </span>
                    </div>
                  )}

                  {item.notes && (
                    <p className="text-[11px] text-slate-400 line-clamp-2 bg-[#090a0c]/50 p-2 rounded-lg border border-white/5">
                      {item.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-white/5">
                  <span>Store: {item.merchant || 'General'}</span>
                  <span>Purchased: {item.purchaseDate || 'N/A'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#14161c] border border-white/10 rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-400" />
                <span>{editingItem ? 'Edit Product Inventory Record' : 'Add New Inventory Product'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              
              {/* Product Name */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Product / Item Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Organic Whole Milk, Prime Beef Cut, Printer Paper"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              {/* Category & Subcategory */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={itemCategory}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setItemCategory(newCat);
                      const subs = invSubcategories[newCat] || [];
                      setItemSubcategory(subs[0] || 'General Item');
                    }}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  >
                    {invCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Subcategory
                  </label>
                  <select
                    value={itemSubcategory}
                    onChange={(e) => setItemSubcategory(e.target.value)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  >
                    {(invSubcategories[itemCategory] || ['General Item']).map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quantity & Metric */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Metric / Packaging
                  </label>
                  <select
                    value={itemMetric}
                    onChange={(e) => setItemMetric(e.target.value as InventoryMetric)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  >
                    {METRICS_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Storage Location
                  </label>
                  <select
                    value={itemLocation}
                    onChange={(e) => setItemLocation(e.target.value)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  >
                    {LOCATIONS_LIST.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing & Merchant */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Unit Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={itemUnitPrice}
                    onChange={(e) => {
                      setItemUnitPrice(e.target.value);
                      if (e.target.value && itemQuantity) {
                        setItemTotalCost((parseFloat(e.target.value) * itemQuantity).toFixed(2));
                      }
                    }}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Total Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={itemTotalCost}
                    onChange={(e) => setItemTotalCost(e.target.value)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Merchant / Store
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Whole Foods, Texas Route"
                    value={itemMerchant}
                    onChange={(e) => setItemMerchant(e.target.value)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={itemPurchaseDate}
                    onChange={(e) => setItemPurchaseDate(e.target.value)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    value={itemExpirationDate}
                    onChange={(e) => setItemExpirationDate(e.target.value)}
                    className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Image Upload / URL with Camera & Document support */}
              <CameraDocUploader
                label="Product Photo / Receipt Proof"
                value={itemImageUrl}
                onChange={(base64) => setItemImageUrl(base64)}
                onClear={() => setItemImageUrl('')}
              />

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Notes / Specs
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Grass-fed, warranty until 2028, stored in shelf B"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  className="w-full bg-[#090a0c] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-950/50"
                >
                  {editingItem ? 'Update Inventory Record' : 'Save to Inventory'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* AI Receipt Scan Modal for Inventory */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#14161c] border border-white/10 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-indigo-400" />
                <span>AI Receipt Scanner for Product Inventory</span>
              </h3>
              <button
                onClick={() => setIsScanModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Upload a receipt photo or test with a sample. Gemini AI extracts product items, quantities, packaging metrics, unit costs, and estimated expiration dates into your inventory automatically.
            </p>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 bg-[#090a0c] p-2 rounded-xl border border-white/5">
              <span className="text-[11px] text-slate-400 font-medium">Quick Test Preset:</span>
              <button
                type="button"
                onClick={() => handleSampleReceiptScan('texas')}
                className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs border border-emerald-500/20 font-medium transition-colors"
              >
                Texas Route Receipt
              </button>
              <button
                type="button"
                onClick={() => handleSampleReceiptScan('hiperkids')}
                className="px-3 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs border border-indigo-500/20 font-medium transition-colors"
              >
                Hiperkids Receipt
              </button>
            </div>

            {/* Upload & Camera Capture Area */}
            <div className="bg-[#090a0c] p-4 rounded-2xl border border-white/10 space-y-3">
              <CameraDocUploader
                label="Upload Document or Take Picture with Camera"
                onChange={(base64) => processInventoryReceiptAI(base64, 'image/jpeg')}
              />
            </div>

            {isScanning && (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-indigo-400 font-medium">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Extracting purchased products, metrics, and prices with Gemini AI...</span>
              </div>
            )}

            {scanErrorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {scanErrorMessage}
              </div>
            )}

            {/* Extracted Products List Review */}
            {extractedScanData && (
              <div className="space-y-4 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Found {extractedScanData.items.length} Products from {extractedScanData.merchant}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">Total Purchase: ${extractedScanData.totalAmount.toFixed(2)} on {extractedScanData.purchaseDate}</p>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {extractedScanData.items.map((item, idx) => (
                    <div key={idx} className="bg-[#090a0c] p-3 rounded-xl border border-white/10 flex items-center justify-between gap-3 text-xs">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={item.name || ''}
                          onChange={(e) => {
                            const copy = [...extractedScanData.items];
                            copy[idx].name = e.target.value;
                            setExtractedScanData({ ...extractedScanData, items: copy });
                          }}
                          className="bg-transparent text-white font-semibold w-full focus:outline-none focus:underline"
                        />
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>Cat: {item.category || 'Everyday'}</span>
                          <span>• Location: {item.location || 'Pantry'}</span>
                          <span>• Exp: {item.expirationDate || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={item.quantity || 1}
                          onChange={(e) => {
                            const copy = [...extractedScanData.items];
                            copy[idx].quantity = parseFloat(e.target.value) || 1;
                            setExtractedScanData({ ...extractedScanData, items: copy });
                          }}
                          className="w-12 bg-[#14161c] border border-white/10 rounded px-1.5 py-1 text-center text-white font-bold text-xs"
                        />
                        <select
                          value={item.metric || 'Unit'}
                          onChange={(e) => {
                            const copy = [...extractedScanData.items];
                            copy[idx].metric = e.target.value as InventoryMetric;
                            setExtractedScanData({ ...extractedScanData, items: copy });
                          }}
                          className="bg-[#14161c] border border-white/10 rounded px-1.5 py-1 text-xs text-slate-300"
                        >
                          {METRICS_OPTIONS.map((m) => (
                            <option key={m.value} value={m.value}>{m.value}</option>
                          ))}
                        </select>
                        <span className="font-serif font-bold text-emerald-400 text-xs min-w-[50px] text-right">
                          ${((item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Option to also record in transaction ledger */}
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={recordAsTransaction}
                    onChange={(e) => setRecordAsTransaction(e.target.checked)}
                    className="rounded border-white/10 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Also record ${extractedScanData.totalAmount.toFixed(2)} transaction entry in financial ledger</span>
                </label>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsScanModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImportScannedItems}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-950/50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Import {extractedScanData.items.length} Products to Inventory</span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-xl max-h-[80vh] overflow-hidden rounded-2xl border border-white/10">
            <img src={previewImage} alt="Enlarged product photo" className="w-full h-full object-contain" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
