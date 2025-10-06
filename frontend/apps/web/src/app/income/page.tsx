"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  mintJWT, 
  postOCR, 
  getMyIncomes, 
  createIncome, 
  updateIncome, 
  deleteIncome,
  getIncomeSummary 
} from "@/lib/orionClient";
import { Plus, Search, Edit, Trash2, X, Save, Tag, Camera, Upload, DollarSign, Calendar, CreditCard } from "lucide-react";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

const CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Healthcare",
  "Travel",
  "Education",
  "Other"
];

const PAYMENT_METHODS = [
  "cash",
  "credit_card",
  "debit_card",
  "bank_transfer",
  "paypal",
  "venmo",
  "other"
];

interface Income {
  id: string;
  user_email: string;
  amount: number;
  income_date: string;
  category?: string;
  source?: string;
  description?: string;
  payment_method?: string;
  receipt_image_data?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

interface IncomeSummary {
  category: string;
  count: number;
  total: number;
  average: number;
}

export default function IncomesPage() {
  const { data: session } = useSession();
  const sub = session?.user?.email ?? "";
  
  // Incomes list state
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [incomesLoading, setIncomesLoading] = useState(false);
  const [summary, setSummary] = useState<IncomeSummary[]>([]);
  
  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [incomeCategory, setIncomeCategory] = useState("");
  const [incomeSource, setIncomeSource] = useState("");
  const [incomeDescription, setIncomeDescription] = useState("");
  const [incomePaymentMethod, setIncomePaymentMethod] = useState("");
  const [incomeTags, setIncomeTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Receipt upload state
  const [file, setFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  
  // Filter state
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  
  // Load incomes on mount
  useEffect(() => {
    if (sub) {
      loadIncomes();
      loadSummary();
    }
  }, [sub, filterCategory, filterPaymentMethod, filterStartDate, filterEndDate]);
  
  async function loadIncomes() {
    if (!sub) return;
    try {
      setIncomesLoading(true);
      const token = await mintJWT(sub);
      const filters: any = {};
      if (filterCategory) filters.category = filterCategory;
      if (filterPaymentMethod) filters.payment_method = filterPaymentMethod;
      if (filterStartDate) filters.start_date = filterStartDate;
      if (filterEndDate) filters.end_date = filterEndDate;
      
      const data = await getMyIncomes(sub, token, filters);
      setIncomes(data.incomes || []);
    } catch (e) {
      console.error('Failed to load incomes:', e);
    } finally {
      setIncomesLoading(false);
    }
  }
  
  async function loadSummary() {
    if (!sub) return;
    try {
      const token = await mintJWT(sub);
      const filters: any = {};
      if (filterStartDate) filters.start_date = filterStartDate;
      if (filterEndDate) filters.end_date = filterEndDate;
      
      const data = await getIncomeSummary(sub, token, filters);
      setSummary(data.summary || []);
    } catch (e) {
      console.error('Failed to load summary:', e);
    }
  }
  
  function openEditor(income?: Income) {
    if (income) {
      setEditingIncome(income);
      setIncomeAmount(income.amount.toString());
      setIncomeDate(income.income_date);
      setIncomeCategory(income.category || "");
      setIncomeSource(income.source || "");
      setIncomeDescription(income.description || "");
      setIncomePaymentMethod(income.payment_method || "");
      setIncomeTags(income.tags || []);
      setReceiptPreview(income.receipt_image_data || null);
    } else {
      setEditingIncome(null);
      setIncomeAmount("");
      setIncomeDate(new Date().toISOString().split('T')[0]);
      setIncomeCategory("");
      setIncomeSource("");
      setIncomeDescription("");
      setIncomePaymentMethod("");
      setIncomeTags([]);
      setReceiptPreview(null);
    }
    setFile(null);
    setSaveError(null);
    setShowEditor(true);
  }
  
  function closeEditor() {
    setShowEditor(false);
    setEditingIncome(null);
    setFile(null);
    setReceiptPreview(null);
  }
  
  async function handleSave() {
    setSaveError(null);
    if (!sub) { 
      setSaveError("Authentication required. Please log in."); 
      return; 
    }
    
    // Validate required fields
    if (!incomeAmount || !incomeDate) { 
      setSaveError("Amount and date are required fields."); 
      return; 
    }
    
    // Validate amount is a valid positive number
    const amountNum = parseFloat(incomeAmount);
    if (isNaN(amountNum)) {
      setSaveError("Amount must be a valid number.");
      return;
    }
    if (amountNum <= 0) {
      setSaveError("Amount must be greater than zero.");
      return;
    }
    
    try {
      setSaveLoading(true);
      const token = await mintJWT(sub);
      
      // Build income data object - only include fields with actual values
      const incomeData: any = {
        user_email: sub,
        amount: amountNum,
        income_date: incomeDate
      };
      
      // Only add optional fields if they have values (avoid sending undefined)
      if (incomeCategory && incomeCategory.trim()) {
        incomeData.category = incomeCategory.trim();
      }
      if (incomeSource && incomeSource.trim()) {
        incomeData.source = incomeSource.trim();
      }
      if (incomeDescription && incomeDescription.trim()) {
        incomeData.description = incomeDescription.trim();
      }
      if (incomePaymentMethod && incomePaymentMethod.trim()) {
        incomeData.payment_method = incomePaymentMethod.trim();
      }
      if (receiptPreview) {
        incomeData.receipt_image_data = receiptPreview;
      }
      if (incomeTags.length > 0) {
        incomeData.tags = incomeTags;
      }
      
      // Debug logging
      console.log("Saving income:", {
        isEdit: !!editingIncome,
        payload: incomeData
      });
      
      if (editingIncome) {
        await updateIncome(editingIncome.id, incomeData, token);
      } else {
        await createIncome(incomeData, token);
      }
      
      await loadIncomes();
      await loadSummary();
      closeEditor();
    } catch (err: any) {
      console.error("Save income error:", err);
      setSaveError(err?.message || "Failed to save income. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  }
  
  async function handleDelete(incomeId: string) {
    if (!confirm("Delete this income?")) return;
    try {
      const token = await mintJWT(sub);
      await deleteIncome(incomeId, token);
      await loadIncomes();
      await loadSummary();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }
  
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    if (selectedFile.size > MAX_FILE_BYTES) {
      setOcrError("file_too_large");
      return;
    }
    
    setFile(selectedFile);
    setOcrError(null);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setReceiptPreview(event.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  }
  
  async function handleOCR() {
    if (!file || !sub) return;
    
    try {
      setOcrLoading(true);
      setOcrError(null);
      const token = await mintJWT(sub);
      const result = await postOCR(file, token);
      
      // Auto-populate form fields from OCR
      if (result.amount) setIncomeAmount(result.amount.toString());
      if (result.date) setIncomeDate(result.date);
      if (result.source) setIncomeSource(result.source);
      if (result.description) setIncomeDescription(result.description);
      
    } catch (err: any) {
      setOcrError(err?.message || "ocr_failed");
    } finally {
      setOcrLoading(false);
    }
  }
  
  function addTag() {
    if (!tagInput.trim()) return;
    if (incomeTags.includes(tagInput.trim())) return;
    setIncomeTags([...incomeTags, tagInput.trim()]);
    setTagInput("");
  }
  
  function removeTag(tag: string) {
    setIncomeTags(incomeTags.filter(t => t !== tag));
  }
  
  const totalIncomes = incomes.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
  
  return (
    <main className="p-4 pb-24 max-w-screen-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Incomes</h1>
        <button
          onClick={() => openEditor()}
          className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          <Plus size={16} />
          Add Income
        </button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Incomes</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">${totalIncomes.toFixed(2)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Count</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{incomes.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Average</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            ${incomes.length > 0 ? (totalIncomes / incomes.length).toFixed(2) : '0.00'}
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Payment Method</label>
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            >
              <option value="">All Methods</option>
              {PAYMENT_METHODS.map(method => (
                <option key={method} value={method}>{method.replace('_', ' ').toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Start Date</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">End Date</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>
      
      {/* Incomes List */}
      <div className="space-y-3">
        {incomesLoading && <p className="text-sm text-gray-600 dark:text-gray-400">Loading incomes...</p>}
        {!incomesLoading && incomes.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">No incomes found. Add your first income!</p>
        )}
        {incomes.map((income) => (
          <div
            key={income.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    ${parseFloat(income.amount.toString()).toFixed(2)}
                  </span>
                  {income.category && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                      {income.category}
                    </span>
                  )}
                  {income.payment_method && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded flex items-center gap-1">
                      <CreditCard size={12} />
                      {income.payment_method.replace('_', ' ')}
                    </span>
                  )}
                </div>
                {income.source && (
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{income.source}</div>
                )}
                {income.description && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{income.description}</div>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(income.income_date).toLocaleDateString()}
                  </span>
                  {income.tags && income.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Tag size={12} />
                      {income.tags.map(tag => (
                        <span key={tag} className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditor(income)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(income.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {income.receipt_image_data && (
              <div className="mt-3">
                <img
                  src={income.receipt_image_data}
                  alt="Receipt"
                  className="max-w-xs rounded border border-gray-200 dark:border-gray-700"
                />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Editor Modal - CONTINUED IN NEXT PART */}
      
      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {editingIncome ? 'Edit Income' : 'Add Income'}
                </h2>
                <button onClick={closeEditor} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  <X size={24} />
                </button>
              </div>
              
              {/* Receipt Upload Section */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                {ocrError && <p className="text-sm text-red-600 mb-2">OCR Error: {ocrError}</p>}
                {receiptPreview && (
                  <div className="mt-3">
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="max-w-full max-h-64 rounded border border-gray-200 dark:border-gray-700"
                    />
                  </div>
                )}
              </div>
              
              {/* Form Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Amount *
                    </label>
                    <div className="relative">
                      <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        value={incomeAmount}
                        onChange={(e) => setIncomeAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-9 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={incomeDate}
                      onChange={(e) => setIncomeDate(e.target.value)}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Category
                    </label>
                    <select
                      value={incomeCategory}
                      onChange={(e) => setIncomeCategory(e.target.value)}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={incomePaymentMethod}
                      onChange={(e) => setIncomePaymentMethod(e.target.value)}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                    >
                      <option value="">Select method</option>
                      {PAYMENT_METHODS.map(method => (
                        <option key={method} value={method}>{method.replace('_', ' ').toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Source/Vendor
                  </label>
                  <input
                    type="text"
                    value={incomeSource}
                    onChange={(e) => setIncomeSource(e.target.value)}
                    placeholder="e.g., Whole Foods, Shell Gas Station"
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Description
                  </label>
                  <textarea
                    value={incomeDescription}
                    onChange={(e) => setIncomeDescription(e.target.value)}
                    placeholder="Add notes about this income..."
                    rows={3}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="Add tag..."
                      className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                    />
                    <button
                      onClick={addTag}
                      className="rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700"
                    >
                      <Tag size={16} />
                    </button>
                  </div>
                  {incomeTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {incomeTags.map(tag => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded"
                        >
                          {tag}
                          <button onClick={() => removeTag(tag)} className="hover:text-blue-600">
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {saveError && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
                  Error: {saveError}
                </div>
              )}
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSave}
                  disabled={saveLoading}
                  className="flex-1 flex items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={16} />
                  {saveLoading ? 'Saving...' : 'Save Income'}
                </button>
                <button
                  onClick={closeEditor}
                  className="rounded border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
