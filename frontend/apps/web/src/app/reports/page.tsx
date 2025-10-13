"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Calendar, Download, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { getMyExpenses, getExpenseSummary } from "@/lib/orionClient";
import { getMyIncome, getIncomeSummary } from "@/lib/orionClient";

// Helper to mint JWT via API endpoint
async function mintJWT(): Promise<string> {
  const response = await fetch('/api/auth/mint-jwt', { method: 'POST' });
  if (!response.ok) throw new Error('Failed to mint JWT');
  const data = await response.json();
  return data.token;
}

interface ReportData {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  incomeByCategory: any[];
  expensesByCategory: any[];
  transactions: any[];
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const sub = session?.user?.email || "";
  
  const [reportData, setReportData] = useState<ReportData>({
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    incomeByCategory: [],
    expensesByCategory: [],
    transactions: []
  });
  const [loading, setLoading] = useState(false);
  
  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });
  
  useEffect(() => {
    if (sub) {
      generateReport();
    }
  }, [sub]);
  
  async function generateReport() {
    if (!sub) return;
    try {
      setLoading(true);
      const token = await mintJWT(sub);
      
      // Load expenses
      const expensesData = await getMyExpenses(sub, token, {
        start_date: startDate,
        end_date: endDate
      });
      const expenses = expensesData.expenses || [];
      const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0);
      
      // Load expense summary
      const expenseSummaryData = await getExpenseSummary(sub, token, {
        start_date: startDate,
        end_date: endDate
      });
      const expensesByCategory = expenseSummaryData.summary || [];
      
      // Load income
      const incomeData = await getMyIncome(sub, token, {
        start_date: startDate,
        end_date: endDate
      });
      const income = incomeData.income || [];
      const totalIncome = income.reduce((sum: number, inc: any) => sum + parseFloat(inc.amount), 0);
      
      // Load income summary
      const incomeSummaryData = await getIncomeSummary(sub, token, {
        start_date: startDate,
        end_date: endDate
      });
      const incomeByCategory = incomeSummaryData.summary || [];
      
      // Combine transactions for detailed view
      const transactions = [
        ...income.map((inc: any) => ({ ...inc, type: 'income', date: inc.income_date })),
        ...expenses.map((exp: any) => ({ ...exp, type: 'expense', date: exp.expense_date }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setReportData({
        totalIncome,
        totalExpenses,
        netIncome: totalIncome - totalExpenses,
        incomeByCategory,
        expensesByCategory,
        transactions
      });
    } catch (err) {
      console.error("Generate report error:", err);
    } finally {
      setLoading(false);
    }
  }
  
  function exportToCSV() {
    const csvRows = [
      ['Date', 'Type', 'Category', 'Description', 'Amount'],
      ...reportData.transactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.type,
        t.category || 'N/A',
        t.description || t.merchant || t.source || 'N/A',
        t.amount
      ])
    ];
    
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
  
  function setQuickRange(range: 'this_month' | 'last_month' | 'this_year' | 'last_year') {
    const now = new Date();
    let start: Date, end: Date;
    
    switch (range) {
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case 'last_year':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }
  
  const netIncomeColor = reportData.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Financial Reports</h1>
          <button
            onClick={exportToCSV}
            disabled={reportData.transactions.length === 0}
            className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={20} />
            Export CSV
          </button>
        </div>
        
        {/* Date Range Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={20} className="text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-gray-100">Date Range</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <button
              onClick={() => setQuickRange('this_month')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              This Month
            </button>
            <button
              onClick={() => setQuickRange('last_month')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Last Month
            </button>
            <button
              onClick={() => setQuickRange('this_year')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              This Year
            </button>
            <button
              onClick={() => setQuickRange('last_year')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Last Year
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={generateReport}
                disabled={loading}
                className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Income</div>
              <TrendingUp size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              ${reportData.totalIncome.toFixed(2)}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</div>
              <TrendingDown size={20} className="text-red-600 dark:text-red-400" />
            </div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              ${reportData.totalExpenses.toFixed(2)}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">Net Income</div>
              <DollarSign size={20} className={netIncomeColor} />
            </div>
            <div className={`text-3xl font-bold ${netIncomeColor}`}>
              ${Math.abs(reportData.netIncome).toFixed(2)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {reportData.netIncome >= 0 ? 'Surplus' : 'Deficit'}
            </div>
          </div>
        </div>
        
        {/* Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Income by Category */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Income by Category</h2>
            {reportData.incomeByCategory.length === 0 ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">No income data</div>
            ) : (
              <div className="space-y-2">
                {reportData.incomeByCategory.map((cat, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-900 dark:text-gray-100">{cat.category || 'Uncategorized'}</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">${parseFloat(cat.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Expenses by Category */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Expenses by Category</h2>
            {reportData.expensesByCategory.length === 0 ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">No expense data</div>
            ) : (
              <div className="space-y-2">
                {reportData.expensesByCategory.map((cat, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-900 dark:text-gray-100">{cat.category || 'Uncategorized'}</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">${parseFloat(cat.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Transaction History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Transaction History ({reportData.transactions.length} transactions)
          </h2>
          {reportData.transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">No transactions found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-2 text-gray-900 dark:text-gray-100">Date</th>
                    <th className="text-left py-2 px-2 text-gray-900 dark:text-gray-100">Type</th>
                    <th className="text-left py-2 px-2 text-gray-900 dark:text-gray-100">Category</th>
                    <th className="text-left py-2 px-2 text-gray-900 dark:text-gray-100">Description</th>
                    <th className="text-right py-2 px-2 text-gray-900 dark:text-gray-100">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.transactions.slice(0, 50).map((transaction, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-2 text-gray-900 dark:text-gray-100">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          transaction.type === 'income' 
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        }`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-gray-900 dark:text-gray-100">
                        {transaction.category || 'N/A'}
                      </td>
                      <td className="py-2 px-2 text-gray-900 dark:text-gray-100">
                        {transaction.description || transaction.merchant || transaction.source || 'N/A'}
                      </td>
                      <td className={`py-2 px-2 text-right font-semibold ${
                        transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        ${parseFloat(transaction.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reportData.transactions.length > 50 && (
                <div className="text-center py-4 text-sm text-gray-600 dark:text-gray-400">
                  Showing first 50 of {reportData.transactions.length} transactions. Export CSV for full list.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
