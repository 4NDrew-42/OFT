/**
 * Calculation Utilities for Financial Tracker
 * 
 * Business logic functions for calculating budgets, recurring dates,
 * summaries, and other financial computations.
 * All functions are pure and side-effect free.
 * 
 * @module calculations
 */

import type { Amount, ISODate, RecurrencePattern, BudgetStatus, CategorySummary } from '../types/domain';
import { createAmount, createISODate, parseISODate, amountToDollars } from '../types/domain';

// ============================================================================
// Budget Calculations
// ============================================================================

/**
 * Calculate budget status based on spending percentage
 * 
 * @param spent - Amount spent
 * @param limit - Budget limit
 * @param alertThreshold - Alert threshold percentage (default: 80)
 * @returns Budget status ('ok', 'warning', or 'over')
 * 
 * @example
 * ```typescript
 * const spent = createAmountFromDollars(500);
 * const limit = createAmountFromDollars(1000);
 * calculateBudgetStatus(spent, limit); // 'ok' (50% spent)
 * 
 * const spent2 = createAmountFromDollars(850);
 * calculateBudgetStatus(spent2, limit); // 'warning' (85% spent)
 * 
 * const spent3 = createAmountFromDollars(1100);
 * calculateBudgetStatus(spent3, limit); // 'over' (110% spent)
 * ```
 */
export function calculateBudgetStatus(
  spent: Amount,
  limit: Amount,
  alertThreshold: number = 80
): BudgetStatus {
  const percentage = calculateBudgetPercentage(spent, limit);
  
  if (percentage >= 100) {
    return 'over';
  } else if (percentage >= alertThreshold) {
    return 'warning';
  } else {
    return 'ok';
  }
}

/**
 * Calculate budget usage percentage
 * 
 * @param spent - Amount spent
 * @param limit - Budget limit
 * @returns Percentage (0-100+)
 * 
 * @example
 * ```typescript
 * const spent = createAmountFromDollars(750);
 * const limit = createAmountFromDollars(1000);
 * calculateBudgetPercentage(spent, limit); // 75
 * ```
 */
export function calculateBudgetPercentage(spent: Amount, limit: Amount): number {
  if (limit === 0) {
    return 0;
  }
  return Math.round((spent / limit) * 100);
}

/**
 * Calculate remaining budget amount
 * 
 * @param spent - Amount spent
 * @param limit - Budget limit
 * @returns Remaining amount (can be negative if over budget)
 * 
 * @example
 * ```typescript
 * const spent = createAmountFromDollars(750);
 * const limit = createAmountFromDollars(1000);
 * const remaining = calculateBudgetRemaining(spent, limit);
 * amountToDollars(remaining); // 250
 * ```
 */
export function calculateBudgetRemaining(spent: Amount, limit: Amount): Amount {
  return createAmount(limit - spent);
}

// ============================================================================
// Recurring Transaction Calculations
// ============================================================================

/**
 * Calculate the next occurrence date for a recurring transaction
 * 
 * @param startDate - Start date of recurrence
 * @param pattern - Recurrence pattern
 * @param occurrences - Number of occurrences to calculate (default: 1)
 * @returns Next occurrence date
 * 
 * @example
 * ```typescript
 * const start = createISODate(new Date('2025-10-01'));
 * calculateNextOccurrence(start, 'monthly'); // 2025-11-01
 * calculateNextOccurrence(start, 'weekly'); // 2025-10-08
 * calculateNextOccurrence(start, 'monthly', 2); // 2025-12-01
 * ```
 */
export function calculateNextOccurrence(
  startDate: ISODate,
  pattern: RecurrencePattern,
  occurrences: number = 1
): ISODate {
  const date = parseISODate(startDate);
  
  switch (pattern) {
    case 'daily':
      date.setDate(date.getDate() + occurrences);
      break;
    case 'weekly':
      date.setDate(date.getDate() + (7 * occurrences));
      break;
    case 'biweekly':
      date.setDate(date.getDate() + (14 * occurrences));
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + occurrences);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + (3 * occurrences));
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + occurrences);
      break;
    default:
      // Exhaustive check - TypeScript will error if we miss a pattern
      const _exhaustive: never = pattern;
      throw new Error(`Unknown recurrence pattern: ${_exhaustive}`);
  }
  
  return createISODate(date);
}

/**
 * Calculate all occurrences between two dates
 * 
 * @param startDate - Start date of recurrence
 * @param endDate - End date (optional)
 * @param pattern - Recurrence pattern
 * @param maxOccurrences - Maximum number of occurrences to calculate (default: 100)
 * @returns Array of occurrence dates
 * 
 * @example
 * ```typescript
 * const start = createISODate(new Date('2025-10-01'));
 * const end = createISODate(new Date('2025-12-31'));
 * const occurrences = calculateOccurrences(start, end, 'monthly');
 * // [2025-10-01, 2025-11-01, 2025-12-01]
 * ```
 */
export function calculateOccurrences(
  startDate: ISODate,
  endDate: ISODate | undefined,
  pattern: RecurrencePattern,
  maxOccurrences: number = 100
): ReadonlyArray<ISODate> {
  const occurrences: ISODate[] = [];
  let currentDate = startDate;
  let count = 0;
  
  const endTime = endDate ? parseISODate(endDate).getTime() : Infinity;
  
  while (count < maxOccurrences) {
    const currentTime = parseISODate(currentDate).getTime();
    
    if (currentTime > endTime) {
      break;
    }
    
    occurrences.push(currentDate);
    currentDate = calculateNextOccurrence(currentDate, pattern);
    count++;
  }
  
  return occurrences;
}

/**
 * Check if a recurring transaction is due for creation
 * 
 * @param nextOccurrenceDate - Next occurrence date
 * @param today - Today's date (default: current date)
 * @returns True if due for creation
 * 
 * @example
 * ```typescript
 * const nextDate = createISODate(new Date('2025-10-01'));
 * const today = createISODate(new Date('2025-10-01'));
 * isRecurringDue(nextDate, today); // true
 * 
 * const futureDate = createISODate(new Date('2025-11-01'));
 * isRecurringDue(futureDate, today); // false
 * ```
 */
export function isRecurringDue(
  nextOccurrenceDate: ISODate,
  today: ISODate = createISODate(new Date())
): boolean {
  const nextTime = parseISODate(nextOccurrenceDate).getTime();
  const todayTime = parseISODate(today).getTime();
  
  return nextTime <= todayTime;
}

// ============================================================================
// Summary Calculations
// ============================================================================

/**
 * Calculate category summaries from transactions
 * 
 * @param transactions - Array of transactions with category and amount
 * @returns Array of category summaries sorted by total (descending)
 * 
 * @example
 * ```typescript
 * const transactions = [
 *   { category: 'Food', amount: createAmountFromDollars(100) },
 *   { category: 'Food', amount: createAmountFromDollars(50) },
 *   { category: 'Transport', amount: createAmountFromDollars(75) },
 * ];
 * const summaries = calculateCategorySummaries(transactions);
 * // [
 * //   { category: 'Food', total: 15000, count: 2, percentage: 66.7 },
 * //   { category: 'Transport', total: 7500, count: 1, percentage: 33.3 }
 * // ]
 * ```
 */
export function calculateCategorySummaries(
  transactions: ReadonlyArray<{ readonly category?: string; readonly amount: Amount }>
): ReadonlyArray<CategorySummary> {
  // Group by category
  const categoryMap = new Map<string, { total: number; count: number }>();
  let grandTotal = 0;
  
  for (const transaction of transactions) {
    const category = transaction.category || 'Uncategorized';
    const existing = categoryMap.get(category) || { total: 0, count: 0 };
    
    categoryMap.set(category, {
      total: existing.total + transaction.amount,
      count: existing.count + 1,
    });
    
    grandTotal += transaction.amount;
  }
  
  // Convert to array and calculate percentages
  const summaries: CategorySummary[] = [];
  
  for (const [category, data] of categoryMap.entries()) {
    summaries.push({
      category,
      total: createAmount(data.total),
      count: data.count,
      percentage: grandTotal > 0 ? Math.round((data.total / grandTotal) * 100) : 0,
    });
  }
  
  // Sort by total (descending)
  summaries.sort((a, b) => b.total - a.total);
  
  return summaries;
}

/**
 * Calculate total amount from transactions
 * 
 * @param transactions - Array of transactions with amount
 * @returns Total amount
 * 
 * @example
 * ```typescript
 * const transactions = [
 *   { amount: createAmountFromDollars(100) },
 *   { amount: createAmountFromDollars(50) },
 *   { amount: createAmountFromDollars(75) },
 * ];
 * const total = calculateTotal(transactions);
 * amountToDollars(total); // 225
 * ```
 */
export function calculateTotal(
  transactions: ReadonlyArray<{ readonly amount: Amount }>
): Amount {
  const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  return createAmount(total);
}

/**
 * Calculate average amount from transactions
 * 
 * @param transactions - Array of transactions with amount
 * @returns Average amount
 * 
 * @example
 * ```typescript
 * const transactions = [
 *   { amount: createAmountFromDollars(100) },
 *   { amount: createAmountFromDollars(50) },
 *   { amount: createAmountFromDollars(75) },
 * ];
 * const average = calculateAverage(transactions);
 * amountToDollars(average); // 75
 * ```
 */
export function calculateAverage(
  transactions: ReadonlyArray<{ readonly amount: Amount }>
): Amount {
  if (transactions.length === 0) {
    return createAmount(0);
  }
  
  const total = calculateTotal(transactions);
  return createAmount(Math.round(total / transactions.length));
}

// ============================================================================
// Date Range Calculations
// ============================================================================

/**
 * Get the first day of the month for a given date
 * 
 * @param date - Date to get first day for
 * @returns First day of the month
 * 
 * @example
 * ```typescript
 * const date = createISODate(new Date('2025-10-15'));
 * getFirstDayOfMonth(date); // 2025-10-01
 * ```
 */
export function getFirstDayOfMonth(date: ISODate): ISODate {
  const d = parseISODate(date);
  return createISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

/**
 * Get the last day of the month for a given date
 * 
 * @param date - Date to get last day for
 * @returns Last day of the month
 * 
 * @example
 * ```typescript
 * const date = createISODate(new Date('2025-10-15'));
 * getLastDayOfMonth(date); // 2025-10-31
 * ```
 */
export function getLastDayOfMonth(date: ISODate): ISODate {
  const d = parseISODate(date);
  return createISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/**
 * Get date range for current month
 * 
 * @returns Object with startDate and endDate for current month
 * 
 * @example
 * ```typescript
 * const range = getCurrentMonthRange();
 * // { startDate: '2025-10-01', endDate: '2025-10-31' }
 * ```
 */
export function getCurrentMonthRange(): {
  readonly startDate: ISODate;
  readonly endDate: ISODate;
} {
  const today = createISODate(new Date());
  return {
    startDate: getFirstDayOfMonth(today),
    endDate: getLastDayOfMonth(today),
  };
}

/**
 * Get date range for previous month
 * 
 * @returns Object with startDate and endDate for previous month
 */
export function getPreviousMonthRange(): {
  readonly startDate: ISODate;
  readonly endDate: ISODate;
} {
  const today = new Date();
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousMonthDate = createISODate(previousMonth);
  
  return {
    startDate: getFirstDayOfMonth(previousMonthDate),
    endDate: getLastDayOfMonth(previousMonthDate),
  };
}

/**
 * Get date range for current year
 * 
 * @returns Object with startDate and endDate for current year
 */
export function getCurrentYearRange(): {
  readonly startDate: ISODate;
  readonly endDate: ISODate;
} {
  const today = new Date();
  return {
    startDate: createISODate(new Date(today.getFullYear(), 0, 1)),
    endDate: createISODate(new Date(today.getFullYear(), 11, 31)),
  };
}

