"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, Wallet, PieChart, Calendar, ArrowRight } from "lucide-react";
import { getMyExpenses, getExpenseSummary } from "@/lib/orionClient";
import { getMyIncome, getIncomeSummary } from "@/lib/orionClient";
import { getBudgetStatus } from "@/lib/orionClient";
import Link from "next/link";

// Helper to mint JWT via API endpoint
async function mintJWT(): Promise<string> {
  const response = await fetch('/api/auth/mint-jwt', { method: 'POST' });
  if (!response.ok) throw new Error('Failed to mint JWT');
  const data = await response.json();
  return data.token;
}

interface SummaryData {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  budgetUtilization: number;
  topExpenseCategory: string;
  topIncomeCategory: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const sub = session?.user?.email || "";
  
  const [summary, setSummary] = useState<SummaryData>({
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    budgetUtilization: 0,
    topExpenseCategory: 'N/A',
    topIncomeCategory: 'N/A'
  });
  const [expensesByCategory, setExpensesByCategory] = useState<any[]>([]);
  const [incomeByCategory, setIncomeByCategory] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Current month for filtering
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
  
  useEffect(() => {
    if (sub) {
      loadDashboardData();
    }
  }, [sub]);
  
  async function loadDashboardData() {
    if (!sub) return;
    try {
      setLoading(true);
      const token = await mintJWT(sub);
      
      // Load expenses for current month
      const expensesData = await getMyExpenses(sub, token, {
        start_date: firstDayOfMonth,
        end_date: lastDayOfMonth
      });
      const expenses = expensesData.expenses || [];
      const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0);
      
      // Load expense summary
      const expenseSummaryData = await getExpenseSummary(sub, token, {
        start_date: firstDayOfMonth,
        end_date: lastDayOfMonth
      });
      const expenseCategorySummary = expenseSummaryData.summary || [];
      setExpensesByCategory(expenseCategorySummary);
      
      // Load income for current month
      const incomeData = await getMyIncome(sub, token, {
        start_date: firstDayOfMonth,
        end_date: lastDayOfMonth
      });
      const income = incomeData.income || [];
      const totalIncome = income.reduce((sum: number, inc: any) => sum + parseFloat(inc.amount), 0);
      
      // Load income summary
      const incomeSummaryData = await getIncomeSummary(sub, token, {
        start_date: firstDayOfMonth,
        end_date: lastDayOfMonth
      });
      const incomeCategorySummary = incomeSummaryData.summary || [];
      setIncomeByCategory(incomeCategorySummary);
      
      // Load budgets
      const budgetData = await getBudgetStatus(sub, token, currentMonth, currentYear);
      const budgetsList = budgetData.budgets || [];
      setBudgets(budgetsList);
      
      const totalBudget = budgetsList.reduce((sum: number, b: any) => sum + parseFloat(b.monthly_limit), 0);
      const budgetUtilization = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;
      
      // Find top categories
      const topExpense = expenseCategorySummary.length > 0 
        ? expenseCategorySummary.reduce((max: any, cat: any) => 
            parseFloat(cat.total) > parseFloat(max.total) ? cat : max
          )
        : null;
      
      const topIncome = incomeCategorySummary.length > 0
        ? incomeCategorySummary.reduce((max: any, cat: any) =>
            parseFloat(cat.total) > parseFloat(max.total) ? cat : max
          )
        : null;
      
      setSummary({
        totalIncome,
        totalExpenses,
        netIncome: totalIncome - totalExpenses,
        budgetUtilization,
        topExpenseCategory: topExpense?.category || 'N/A',
        topIncomeCategory: topIncome?.category || 'N/A'
      });
    } catch (err) {
      console.error("Load dashboard error:", err);
    } finally {
      setLoading(false);
    }
  }
  
  const netIncomeColor = summary.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const budgetColor = summary.budgetUtilization >= 100 ? 'text-red-600 dark:text-red-400' 
    : summary.budgetUtilization >= 80 ? 'text-yellow-600 dark:text-yellow-400' 
    : 'text-green-600 dark:text-green-400';
  
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Financial Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">Loading dashboard...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Income</div>
                  <TrendingUp size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  ${summary.totalIncome.toFixed(2)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Top: {summary.topIncomeCategory}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</div>
                  <TrendingDown size={20} className="text-red-600 dark:text-red-400" />
                </div>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  ${summary.totalExpenses.toFixed(2)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Top: {summary.topExpenseCategory}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Net Income</div>
                  <Wallet size={20} className={netIncomeColor} />
                </div>
                <div className={`text-3xl font-bold ${netIncomeColor}`}>
                  ${Math.abs(summary.netIncome).toFixed(2)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {summary.netIncome >= 0 ? 'Surplus' : 'Deficit'}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Budget Used</div>
                  <PieChart size={20} className={budgetColor} />
                </div>
                <div className={`text-3xl font-bold ${budgetColor}`}>
                  {summary.budgetUtilization.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {summary.budgetUtilization >= 100 ? 'Over budget' : summary.budgetUtilization >= 80 ? 'Near limit' : 'On track'}
                </div>
              </div>
            </div>
            
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Expenses by Category */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Expenses by Category
                </h2>
                {expensesByCategory.length === 0 ? (
                  <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                    No expense data for this month
                  </div>
                ) : (
                  <div className="space-y-3">
                    {expensesByCategory.map((cat, idx) => {
                      const total = parseFloat(cat.total);
                      const maxTotal = Math.max(...expensesByCategory.map((c: any) => parseFloat(c.total)));
                      const percentage = (total / maxTotal) * 100;
                      
                      return (
                        <div key={idx}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-900 dark:text-gray-100">{cat.category || 'Uncategorized'}</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">${total.toFixed(2)}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-red-500 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* Income by Category */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Income by Category
                </h2>
                {incomeByCategory.length === 0 ? (
                  <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                    No income data for this month
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incomeByCategory.map((cat, idx) => {
                      const total = parseFloat(cat.total);
                      const maxTotal = Math.max(...incomeByCategory.map((c: any) => parseFloat(c.total)));
                      const percentage = (total / maxTotal) * 100;
                      
                      return (
                        <div key={idx}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-900 dark:text-gray-100">{cat.category || 'Uncategorized'}</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">${total.toFixed(2)}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            
            {/* Budget Status */}
            {budgets.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Budget Status</h2>
                  <Link href="/budgets" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1">
                    View All <ArrowRight size={16} />
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {budgets.slice(0, 6).map((budget) => (
                    <div key={budget.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        {budget.category}
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                        <span>${parseFloat(budget.spent || '0').toFixed(0)} / ${parseFloat(budget.monthly_limit).toFixed(0)}</span>
                        <span>{budget.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            budget.status === 'over' ? 'bg-red-500' : budget.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(parseFloat(budget.percentage || '0'), 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link
                  href="/income"
                  className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 dark:hover:border-green-500 transition-colors"
                >
                  <TrendingUp size={32} className="text-green-600 dark:text-green-400 mb-2" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Add Income</span>
                </Link>
                <Link
                  href="/expenses"
                  className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-red-500 dark:hover:border-red-500 transition-colors"
                >
                  <TrendingDown size={32} className="text-red-600 dark:text-red-400 mb-2" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Add Expense</span>
                </Link>
                <Link
                  href="/budgets"
                  className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                >
                  <PieChart size={32} className="text-blue-600 dark:text-blue-400 mb-2" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Manage Budgets</span>
                </Link>
                <Link
                  href="/reports"
                  className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-500 transition-colors"
                >
                  <Calendar size={32} className="text-purple-600 dark:text-purple-400 mb-2" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">View Reports</span>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
