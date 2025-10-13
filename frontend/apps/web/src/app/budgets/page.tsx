"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { DollarSign, Plus, X, Save, Trash2, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { getMyBudgets, getBudgetStatus, createBudget, updateBudget, deleteBudget } from "@/lib/orionClient";

// Helper to mint JWT via API endpoint
async function mintJWT(): Promise<string> {
  const response = await fetch('/api/auth/mint-jwt', { method: 'POST' });
  if (!response.ok) throw new Error('Failed to mint JWT');
  const data = await response.json();
  return data.token;
}

const CATEGORIES = ['Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities', 'Healthcare', 'Travel', 'Education', 'Other'];

interface Budget {
  id: string;
  user_email: string;
  category: string;
  monthly_limit: string;
  start_date: string;
  end_date?: string;
  alert_threshold: number;
  is_active: boolean;
  spent?: string;
  remaining?: string;
  percentage?: string;
  status?: 'ok' | 'warning' | 'over';
}

export default function BudgetsPage() {
  const { data: session } = useSession();
  const sub = session?.user?.email || "";
  
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetCategory, setBudgetCategory] = useState("");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [budgetStartDate, setBudgetStartDate] = useState("");
  const [budgetEndDate, setBudgetEndDate] = useState("");
  const [budgetAlertThreshold, setBudgetAlertThreshold] = useState("80");
  
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Current month/year for status
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  useEffect(() => {
    if (sub) {
      loadBudgets();
    }
  }, [sub]);
  
  async function loadBudgets() {
    if (!sub) return;
    try {
      setLoading(true);
      const token = await mintJWT(sub);
      
      // Get budget status with spending data
      const statusData = await getBudgetStatus(sub, token, currentMonth, currentYear);
      setBudgets(statusData.budgets || []);
    } catch (err) {
      console.error("Load budgets error:", err);
    } finally {
      setLoading(false);
    }
  }
  
  function openEditor(budget?: Budget) {
    if (budget) {
      setEditingBudget(budget);
      setBudgetCategory(budget.category);
      setBudgetLimit(budget.monthly_limit);
      setBudgetStartDate(budget.start_date.split('T')[0]);
      setBudgetEndDate(budget.end_date ? budget.end_date.split('T')[0] : "");
      setBudgetAlertThreshold(String(budget.alert_threshold));
    } else {
      setEditingBudget(null);
      setBudgetCategory("");
      setBudgetLimit("");
      setBudgetStartDate(new Date().toISOString().split('T')[0]);
      setBudgetEndDate("");
      setBudgetAlertThreshold("80");
    }
    setShowEditor(true);
    setSaveError(null);
  }
  
  function closeEditor() {
    setShowEditor(false);
    setEditingBudget(null);
  }
  
  async function handleSave() {
    setSaveError(null);
    if (!sub) { 
      setSaveError("Authentication required. Please log in."); 
      return; 
    }
    
    if (!budgetCategory || !budgetLimit || !budgetStartDate) { 
      setSaveError("Category, monthly limit, and start date are required."); 
      return; 
    }
    
    const limitNum = parseFloat(budgetLimit);
    if (isNaN(limitNum) || limitNum <= 0) {
      setSaveError("Monthly limit must be a positive number.");
      return;
    }
    
    const thresholdNum = parseInt(budgetAlertThreshold);
    if (isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 100) {
      setSaveError("Alert threshold must be between 0 and 100.");
      return;
    }
    
    try {
      setSaveLoading(true);
      const token = await mintJWT(sub);
      
      const budgetData: any = {
        user_email: sub,
        category: budgetCategory.trim(),
        monthly_limit: limitNum,
        start_date: budgetStartDate,
        alert_threshold: thresholdNum
      };
      
      if (budgetEndDate) {
        budgetData.end_date = budgetEndDate;
      }
      
      console.log("Saving budget:", {
        isEdit: !!editingBudget,
        payload: budgetData
      });
      
      if (editingBudget) {
        await updateBudget(editingBudget.id, budgetData, token);
      } else {
        await createBudget(budgetData, token);
      }
      
      await loadBudgets();
      closeEditor();
    } catch (err: any) {
      console.error("Save budget error:", err);
      setSaveError(err?.message || "Failed to save budget. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  }
  
  async function handleDelete(id: string) {
    if (!confirm("Delete this budget?")) return;
    try {
      const token = await mintJWT(sub);
      await deleteBudget(id, token);
      await loadBudgets();
    } catch (err) {
      console.error("Delete budget error:", err);
    }
  }
  
  async function handleToggleActive(budget: Budget) {
    try {
      const token = await mintJWT(sub);
      await updateBudget(budget.id, { is_active: !budget.is_active }, token);
      await loadBudgets();
    } catch (err) {
      console.error("Toggle active error:", err);
    }
  }
  
  function getStatusColor(status?: string) {
    switch (status) {
      case 'ok': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'over': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  }
  
  function getStatusIcon(status?: string) {
    switch (status) {
      case 'ok': return <CheckCircle size={20} className="text-green-600 dark:text-green-400" />;
      case 'warning': return <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400" />;
      case 'over': return <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />;
      default: return null;
    }
  }
  
  const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.monthly_limit), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + parseFloat(b.spent || '0'), 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Budget Management</h1>
          <button
            onClick={() => openEditor()}
            className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Plus size={20} />
            Add Budget
          </button>
        </div>
        
        {/* Overall Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Overall Budget Status - {new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Budget</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">${totalBudget.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Spent</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">${totalSpent.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Remaining</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">${totalRemaining.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Used</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{overallPercentage.toFixed(1)}%</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all ${
                overallPercentage >= 100 ? 'bg-red-500' : overallPercentage >= 80 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(overallPercentage, 100)}%` }}
            />
          </div>
        </div>
        
        {/* Budget List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading...</div>
          ) : budgets.length === 0 ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              No budgets found. Create your first budget to start tracking spending!
            </div>
          ) : (
            budgets.map(budget => (
              <div key={budget.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{budget.category}</h3>
                    {getStatusIcon(budget.status)}
                    {!budget.is_active && (
                      <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(budget)}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      {budget.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => openEditor(budget)} className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(budget.id)} className="text-red-600 hover:text-red-700 dark:text-red-400">
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Monthly Limit</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      ${parseFloat(budget.monthly_limit).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Spent</div>
                    <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                      ${parseFloat(budget.spent || '0').toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Remaining</div>
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                      ${parseFloat(budget.remaining || '0').toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Used</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {budget.percentage}%
                    </div>
                  </div>
                </div>
                
                <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
                  <div
                    className={`h-3 rounded-full transition-all ${getStatusColor(budget.status)}`}
                    style={{ width: `${Math.min(parseFloat(budget.percentage || '0'), 100)}%` }}
                  />
                  {budget.alert_threshold < 100 && (
                    <div
                      className="absolute top-0 h-3 w-0.5 bg-gray-900 dark:bg-gray-100"
                      style={{ left: `${budget.alert_threshold}%` }}
                      title={`Alert threshold: ${budget.alert_threshold}%`}
                    />
                  )}
                </div>
                
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Alert at {budget.alert_threshold}% • 
                  Active from {new Date(budget.start_date).toLocaleDateString()}
                  {budget.end_date && ` to ${new Date(budget.end_date).toLocaleDateString()}`}
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
                  {editingBudget ? 'Edit Budget' : 'Add Budget'}
                </h2>
                <button onClick={closeEditor} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Category *
                  </label>
                  <select
                    value={budgetCategory}
                    onChange={(e) => setBudgetCategory(e.target.value)}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Monthly Limit *
                  </label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      value={budgetLimit}
                      onChange={(e) => setBudgetLimit(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={budgetStartDate}
                      onChange={(e) => setBudgetStartDate(e.target.value)}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={budgetEndDate}
                      onChange={(e) => setBudgetEndDate(e.target.value)}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Alert Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={budgetAlertThreshold}
                    onChange={(e) => setBudgetAlertThreshold(e.target.value)}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    You'll be alerted when spending reaches this percentage of your budget
                  </p>
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
                  {saveLoading ? 'Saving...' : 'Save Budget'}
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
