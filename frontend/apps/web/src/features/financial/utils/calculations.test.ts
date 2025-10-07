/**
 * Unit Tests for Calculation Utilities
 * 
 * Comprehensive tests for all calculation functions.
 * Run with: npm test calculations.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBudgetStatus,
  calculateBudgetPercentage,
  calculateBudgetRemaining,
  calculateNextOccurrence,
  calculateOccurrences,
  isRecurringDue,
  calculateCategorySummaries,
  calculateTotal,
  calculateAverage,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getCurrentMonthRange,
  getPreviousMonthRange,
  getCurrentYearRange,
} from './calculations';
import { createAmountFromDollars, createISODate, amountToDollars } from '../types/domain';

describe('Budget Calculations', () => {
  it('should calculate budget status as ok', () => {
    const spent = createAmountFromDollars(500);
    const limit = createAmountFromDollars(1000);
    expect(calculateBudgetStatus(spent, limit)).toBe('ok');
  });

  it('should calculate budget status as warning', () => {
    const spent = createAmountFromDollars(850);
    const limit = createAmountFromDollars(1000);
    expect(calculateBudgetStatus(spent, limit)).toBe('warning');
  });

  it('should calculate budget status as over', () => {
    const spent = createAmountFromDollars(1100);
    const limit = createAmountFromDollars(1000);
    expect(calculateBudgetStatus(spent, limit)).toBe('over');
  });

  it('should calculate budget percentage', () => {
    const spent = createAmountFromDollars(750);
    const limit = createAmountFromDollars(1000);
    expect(calculateBudgetPercentage(spent, limit)).toBe(75);
  });

  it('should handle zero limit', () => {
    const spent = createAmountFromDollars(100);
    const limit = createAmountFromDollars(0);
    expect(calculateBudgetPercentage(spent, limit)).toBe(0);
  });

  it('should calculate remaining budget', () => {
    const spent = createAmountFromDollars(750);
    const limit = createAmountFromDollars(1000);
    const remaining = calculateBudgetRemaining(spent, limit);
    expect(amountToDollars(remaining)).toBe(250);
  });

  it('should calculate negative remaining when over budget', () => {
    const spent = createAmountFromDollars(1100);
    const limit = createAmountFromDollars(1000);
    const remaining = calculateBudgetRemaining(spent, limit);
    expect(amountToDollars(remaining)).toBe(-100);
  });

  it('should use custom alert threshold', () => {
    const spent = createAmountFromDollars(700);
    const limit = createAmountFromDollars(1000);
    expect(calculateBudgetStatus(spent, limit, 70)).toBe('warning');
    expect(calculateBudgetStatus(spent, limit, 80)).toBe('ok');
  });
});

describe('Recurring Transaction Calculations', () => {
  it('should calculate next daily occurrence', () => {
    const start = createISODate(new Date('2025-10-01'));
    const next = calculateNextOccurrence(start, 'daily');
    expect(next).toBe('2025-10-02T00:00:00.000Z');
  });

  it('should calculate next weekly occurrence', () => {
    const start = createISODate(new Date('2025-10-01'));
    const next = calculateNextOccurrence(start, 'weekly');
    expect(next).toContain('2025-10-08');
  });

  it('should calculate next biweekly occurrence', () => {
    const start = createISODate(new Date('2025-10-01'));
    const next = calculateNextOccurrence(start, 'biweekly');
    expect(next).toContain('2025-10-15');
  });

  it('should calculate next monthly occurrence', () => {
    const start = createISODate(new Date('2025-10-01'));
    const next = calculateNextOccurrence(start, 'monthly');
    expect(next).toContain('2025-11-01');
  });

  it('should calculate next quarterly occurrence', () => {
    const start = createISODate(new Date('2025-10-01'));
    const next = calculateNextOccurrence(start, 'quarterly');
    expect(next).toContain('2026-01-01');
  });

  it('should calculate next yearly occurrence', () => {
    const start = createISODate(new Date('2025-10-01'));
    const next = calculateNextOccurrence(start, 'yearly');
    expect(next).toContain('2026-10-01');
  });

  it('should calculate multiple occurrences', () => {
    const start = createISODate(new Date('2025-10-01'));
    const next = calculateNextOccurrence(start, 'monthly', 2);
    expect(next).toContain('2025-12-01');
  });

  it('should calculate all occurrences in date range', () => {
    const start = createISODate(new Date('2025-10-01'));
    const end = createISODate(new Date('2025-12-31'));
    const occurrences = calculateOccurrences(start, end, 'monthly');
    expect(occurrences.length).toBe(3); // Oct, Nov, Dec
  });

  it('should limit occurrences to maxOccurrences', () => {
    const start = createISODate(new Date('2025-10-01'));
    const occurrences = calculateOccurrences(start, undefined, 'daily', 5);
    expect(occurrences.length).toBe(5);
  });

  it('should check if recurring is due', () => {
    const today = createISODate(new Date('2025-10-01'));
    const nextDate = createISODate(new Date('2025-10-01'));
    expect(isRecurringDue(nextDate, today)).toBe(true);
  });

  it('should check if recurring is not due', () => {
    const today = createISODate(new Date('2025-10-01'));
    const futureDate = createISODate(new Date('2025-11-01'));
    expect(isRecurringDue(futureDate, today)).toBe(false);
  });
});

describe('Summary Calculations', () => {
  it('should calculate category summaries', () => {
    const transactions = [
      { category: 'Food', amount: createAmountFromDollars(100) },
      { category: 'Food', amount: createAmountFromDollars(50) },
      { category: 'Transport', amount: createAmountFromDollars(75) },
    ];
    
    const summaries = calculateCategorySummaries(transactions);
    
    expect(summaries.length).toBe(2);
    expect(summaries[0].category).toBe('Food');
    expect(amountToDollars(summaries[0].total)).toBe(150);
    expect(summaries[0].count).toBe(2);
    expect(summaries[0].percentage).toBe(67); // 150/225 = 66.67% rounded to 67
  });

  it('should handle uncategorized transactions', () => {
    const transactions = [
      { amount: createAmountFromDollars(100) },
    ];
    
    const summaries = calculateCategorySummaries(transactions);
    
    expect(summaries.length).toBe(1);
    expect(summaries[0].category).toBe('Uncategorized');
  });

  it('should sort summaries by total descending', () => {
    const transactions = [
      { category: 'A', amount: createAmountFromDollars(50) },
      { category: 'B', amount: createAmountFromDollars(100) },
      { category: 'C', amount: createAmountFromDollars(75) },
    ];
    
    const summaries = calculateCategorySummaries(transactions);
    
    expect(summaries[0].category).toBe('B');
    expect(summaries[1].category).toBe('C');
    expect(summaries[2].category).toBe('A');
  });

  it('should calculate total amount', () => {
    const transactions = [
      { amount: createAmountFromDollars(100) },
      { amount: createAmountFromDollars(50) },
      { amount: createAmountFromDollars(75) },
    ];
    
    const total = calculateTotal(transactions);
    expect(amountToDollars(total)).toBe(225);
  });

  it('should calculate average amount', () => {
    const transactions = [
      { amount: createAmountFromDollars(100) },
      { amount: createAmountFromDollars(50) },
      { amount: createAmountFromDollars(75) },
    ];
    
    const average = calculateAverage(transactions);
    expect(amountToDollars(average)).toBe(75);
  });

  it('should handle empty transactions for average', () => {
    const transactions: Array<{ amount: any }> = [];
    const average = calculateAverage(transactions);
    expect(amountToDollars(average)).toBe(0);
  });
});

describe('Date Range Calculations', () => {
  it('should get first day of month', () => {
    const date = createISODate(new Date('2025-10-15'));
    const firstDay = getFirstDayOfMonth(date);
    expect(firstDay).toContain('2025-10-01');
  });

  it('should get last day of month', () => {
    const date = createISODate(new Date('2025-10-15'));
    const lastDay = getLastDayOfMonth(date);
    expect(lastDay).toContain('2025-10-31');
  });

  it('should get last day of February (non-leap year)', () => {
    const date = createISODate(new Date('2025-02-15'));
    const lastDay = getLastDayOfMonth(date);
    expect(lastDay).toContain('2025-02-28');
  });

  it('should get last day of February (leap year)', () => {
    const date = createISODate(new Date('2024-02-15'));
    const lastDay = getLastDayOfMonth(date);
    expect(lastDay).toContain('2024-02-29');
  });

  it('should get current month range', () => {
    const range = getCurrentMonthRange();
    expect(range.startDate).toBeDefined();
    expect(range.endDate).toBeDefined();
    
    // Verify it's actually the current month
    const now = new Date();
    expect(range.startDate).toContain(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  });

  it('should get previous month range', () => {
    const range = getPreviousMonthRange();
    expect(range.startDate).toBeDefined();
    expect(range.endDate).toBeDefined();
  });

  it('should get current year range', () => {
    const range = getCurrentYearRange();
    const now = new Date();
    expect(range.startDate).toContain(`${now.getFullYear()}-01-01`);
    expect(range.endDate).toContain(`${now.getFullYear()}-12-31`);
  });
});

