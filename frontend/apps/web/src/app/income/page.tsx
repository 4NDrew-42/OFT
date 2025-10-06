"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { DollarSign, Plus, X, Save, Trash2, Filter, Tag, Calendar } from "lucide-react";
import { mintJWT } from "@/lib/auth";
import { getMyIncome, getIncomeSummary, createIncome, updateIncome, deleteIncome } from "@/lib/orionClient";

const CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Gift', 'Refund', 'Business', 'Rental', 'Other'];
const PAYMENT_METHODS = ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'venmo', 'other'];

interface Income {
  id: string;
  user_email: string;
  amount: string;
  income_date: string;
  source?: string;
  category?: string;
  description?: string;
  payment_method?: string;
  tags?: string[];
  created_at: string;
}

export default function IncomePage() {
  const { data: session } = useSession();
  const sub = session?.user?.email || "";
  
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeDate, setIncomeDate] = useState("");
  const [incomeSource, setIncomeSource] = useState("");
  const [incomeCategory, setIncomeCategory] = useState("");
  const [incomeDescription, setIncomeDescription] = useState("");
  const [incomePaymentMethod, setIncomePaymentMethod] = useState("");
  const [incomeTags, setIncomeTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  
  // Filter state
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  useEffect(() => {
    if (sub) {
      loadIncomes();
      loadSummary();
    }
  }, [sub, filterCategory, filterPaymentMethod, filterStartDate, filterEndDate]);
  
  async function loadIncomes() {
    if (!sub) return;
    try {
      setLoading(true);
      const token = await mintJWT(sub);
      const filters: any = {};
      if (filterCategory) filters.category = filterCategory;
      if (filterPaymentMethod) filters.payment_method = filterPaymentMethod;
      if (filterStartDate) filters.start_date = filterStartDate;
      if (filterEndDate) filters.end_date = filterEndDate;
      
      const data = await getMyIncome(sub, token, filters);
      setIncomes(data.income || []);
    } catch (err) {
      console.error("Load incomes error:", err);
    } finally {
      setLoading(false);
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
      setSummary(data);
    } catch (err) {
      console.error("Load summary error:", err);
    }
  }
  
  function openEditor(income?: Income) {
    if (income) {
      setEditingIncome(income);
      setIncomeAmount(income.amount);
      setIncomeDate(income.income_date.split('T')[0]);
      setIncomeSource(income.source || "");
      setIncomeCategory(income.category || "");
      setIncomeDescription(income.description || "");
      setIncomePaymentMethod(income.payment_method || "");
      setIncomeTags(income.tags || []);
    } else {
      setEditingIncome(null);
      setIncomeAmount("");
      setIncomeDate(new Date().toISOString().split('T')[0]);
      setIncomeSource("");
      setIncomeCategory("");
      setIncomeDescription("");
      setIncomePaymentMethod("");
      setIncomeTags([]);
    }
    setShowEditor(true);
    setSaveError(null);
  }
  
  function closeEditor() {
    setShowEditor(false);
    setEditingIncome(null);
  }
  
  async function handleSave() {
    setSaveError(null);
    if (!sub) { 
      setSaveError("Authentication required. Please log in."); 
      return; 
    }
    
    if (!incomeAmount || !incomeDate) { 
      setSaveError("Amount and date are required fields."); 
      return; 
    }
    
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
      
      const incomeData: any = {
        user_email: sub,
        amount: amountNum,
        income_date: incomeDate
      };
      
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
      if (incomeTags.length > 0) {
        incomeData.tags = incomeTags;
      }
      
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
  
  async function handleDelete(id: string) {
    if (!confirm("Delete this income entry?")) return;
    try {
      const token = await mintJWT(sub);
      await deleteIncome(id, token);
      await loadIncomes();
      await loadSummary();
    } catch (err) {
      console.error("Delete income error:", err);
    }
  }
  
  function addTag() {
    if (tagInput.trim() && !incomeTags.includes(tagInput.trim())) {
      setIncomeTags([...incomeTags, tagInput.trim()]);
      setTagInput("");
    }
  }
  
  function removeTag(tag: string) {
    setIncomeTags(incomeTags.filter(t => t !== tag));
  }
  
  const totalIncome = incomes.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
  const avgIncome = incomes.length > 0 ? totalIncome / incomes.length : 0;
  
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Income Tracker</h1>
          <button
            onClick={() => openEditor()}
            className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            <Plus size={20} />
            Add Income
          </button>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Income</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">${totalIncome.toFixed(2)}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Entries</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{incomes.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average Income</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">${avgIncome.toFixed(2)}</div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={20} className="text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-gray-100">Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2"
            >
              <option value="">All Payment Methods</option>
              {PAYMENT_METHODS.map(method => <option key={method} value={method}>{method.replace('_', ' ').toUpperCase()}</option>)}
            </select>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              placeholder="Start Date"
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2"
            />
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              placeholder="End Date"
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2"
            />
          </div>
        </div>
        
        {/* Income List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading...</div>
          ) : incomes.length === 0 ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">No income entries found. Add your first income!</div>
          ) : (
            incomes.map(income => (
              <div key={income.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">${parseFloat(income.amount).toFixed(2)}</span>
                      {income.category && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">{income.category}</span>
                      )}
                      {income.payment_method && (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded">{income.payment_method.replace('_', ' ').toUpperCase()}</span>
                      )}
                    </div>
                    {income.source && <div className="text-gray-900 dark:text-gray-100 font-medium mb-1">{income.source}</div>}
                    {income.description && <div className="text-gray-600 dark:text-gray-400 text-sm mb-2">{income.description}</div>}
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(income.income_date).toLocaleDateString()}
                      </span>
                    </div>
                    {income.tags && income.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {income.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditor(income)} className="text-blue-600 hover:text-blue-700 dark:text-blue-400">Edit</button>
                    <button onClick={() => handleDelete(income.id)} className="text-red-600 hover:text-red-700 dark:text-red-400">Delete</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
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
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Amount *</label>
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
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Date *</label>
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
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Category</label>
                    <select
                      value={incomeCategory}
                      onChange={(e) => setIncomeCategory(e.target.value)}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Payment Method</label>
                    <select
                      value={incomePaymentMethod}
                      onChange={(e) => setIncomePaymentMethod(e.target.value)}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                    >
                      <option value="">Select method</option>
                      {PAYMENT_METHODS.map(method => <option key={method} value={method}>{method.replace('_', ' ').toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Source</label>
                  <input
                    type="text"
                    value={incomeSource}
                    onChange={(e) => setIncomeSource(e.target.value)}
                    placeholder="e.g., Company Name, Client Name"
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Description</label>
                  <textarea
                    value={incomeDescription}
                    onChange={(e) => setIncomeDescription(e.target.value)}
                    placeholder="Add notes about this income..."
                    rows={3}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="Add tag..."
                      className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                    />
                    <button onClick={addTag} className="rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700">
                      <Tag size={16} />
                    </button>
                  </div>
                  {incomeTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {incomeTags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
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
                  className="flex-1 flex items-center justify-center gap-2 rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
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
