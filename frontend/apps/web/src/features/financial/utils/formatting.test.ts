/**
 * Unit Tests for Formatting Utilities
 * 
 * Comprehensive tests for all formatting functions.
 * Run with: npm test formatting.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDollars,
  formatCurrencyCompact,
  formatDate,
  formatRelativeDate,
  formatDateRange,
  formatPercentage,
  formatNumber,
  formatNumberCompact,
  truncateText,
  capitalize,
  toTitleCase,
  getBudgetStatusColor,
  getBudgetStatusBgColor,
} from './formatting';
import { createAmountFromDollars, createISODate } from '../types/domain';

describe('Currency Formatting', () => {
  it('should format amount as currency with cents', () => {
    const amount = createAmountFromDollars(1234.56);
    expect(formatCurrency(amount)).toBe('$1,234.56');
  });

  it('should format amount as currency without cents', () => {
    const amount = createAmountFromDollars(1234.56);
    expect(formatCurrency(amount, { showCents: false })).toBe('$1,235');
  });

  it('should format amount without currency symbol', () => {
    const amount = createAmountFromDollars(1234.56);
    expect(formatCurrency(amount, { showSymbol: false })).toBe('1,234.56');
  });

  it('should format dollars directly', () => {
    expect(formatDollars(1234.56)).toBe('$1,234.56');
  });

  it('should format large amounts with compact notation', () => {
    const amount = createAmountFromDollars(1234567.89);
    expect(formatCurrencyCompact(amount)).toBe('$1.2M');
  });

  it('should format thousands with compact notation', () => {
    const amount = createAmountFromDollars(1234.56);
    expect(formatCurrencyCompact(amount)).toBe('$1.2K');
  });

  it('should handle zero amount', () => {
    const amount = createAmountFromDollars(0);
    expect(formatCurrency(amount)).toBe('$0.00');
  });

  it('should handle negative amounts', () => {
    // Note: createAmountFromDollars doesn't allow negative, but testing the formatter
    const amount = -12345 as any; // cents
    expect(formatCurrency(amount)).toContain('-');
  });
});

describe('Date Formatting', () => {
  it('should format date in medium format', () => {
    const date = createISODate(new Date('2025-10-06'));
    const formatted = formatDate(date);
    expect(formatted).toMatch(/Oct 6, 2025/);
  });

  it('should format date in short format', () => {
    const date = createISODate(new Date('2025-10-06'));
    const formatted = formatDate(date, 'short');
    expect(formatted).toMatch(/10\/6\/25/);
  });

  it('should format date in long format', () => {
    const date = createISODate(new Date('2025-10-06'));
    const formatted = formatDate(date, 'long');
    expect(formatted).toMatch(/October 6, 2025/);
  });

  it('should format date in full format', () => {
    const date = createISODate(new Date('2025-10-06'));
    const formatted = formatDate(date, 'full');
    expect(formatted).toMatch(/Monday, October 6, 2025/);
  });

  it('should format relative date for today', () => {
    const today = createISODate(new Date());
    expect(formatRelativeDate(today)).toBe('today');
  });

  it('should format date range with same year', () => {
    const start = createISODate(new Date('2025-10-01'));
    const end = createISODate(new Date('2025-10-31'));
    const formatted = formatDateRange(start, end);
    expect(formatted).toContain('Oct 1');
    expect(formatted).toContain('Oct 31');
    expect(formatted).toContain('2025');
  });

  it('should format date range without end date', () => {
    const start = createISODate(new Date('2025-10-01'));
    const formatted = formatDateRange(start);
    expect(formatted).toContain('Present');
  });

  it('should format date range with different years', () => {
    const start = createISODate(new Date('2024-12-01'));
    const end = createISODate(new Date('2025-01-31'));
    const formatted = formatDateRange(start, end);
    expect(formatted).toContain('2024');
    expect(formatted).toContain('2025');
  });
});

describe('Number Formatting', () => {
  it('should format percentage with default decimals', () => {
    expect(formatPercentage(75.5)).toBe('75.5%');
  });

  it('should format percentage with no decimals', () => {
    expect(formatPercentage(75.5, 0)).toBe('76%');
  });

  it('should format percentage with two decimals', () => {
    expect(formatPercentage(75.555, 2)).toBe('75.56%');
  });

  it('should format number with thousands separator', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('should format number with decimals', () => {
    expect(formatNumber(1234.567, 2)).toBe('1,234.57');
  });

  it('should format number with compact notation', () => {
    expect(formatNumberCompact(1234)).toBe('1.2K');
    expect(formatNumberCompact(1234567)).toBe('1.2M');
    expect(formatNumberCompact(1234567890)).toBe('1.2B');
  });

  it('should handle zero', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatPercentage(0)).toBe('0.0%');
  });
});

describe('Text Formatting', () => {
  it('should truncate long text', () => {
    const text = 'This is a very long text that needs to be truncated';
    expect(truncateText(text, 20)).toBe('This is a very lo...');
  });

  it('should not truncate short text', () => {
    const text = 'Short text';
    expect(truncateText(text, 20)).toBe('Short text');
  });

  it('should capitalize first letter', () => {
    expect(capitalize('hello world')).toBe('Hello world');
  });

  it('should handle empty string', () => {
    expect(capitalize('')).toBe('');
  });

  it('should convert snake_case to Title Case', () => {
    expect(toTitleCase('credit_card')).toBe('Credit Card');
  });

  it('should convert kebab-case to Title Case', () => {
    expect(toTitleCase('bank-transfer')).toBe('Bank Transfer');
  });

  it('should handle mixed case', () => {
    expect(toTitleCase('hello_world-test')).toBe('Hello World Test');
  });
});

describe('Budget Status Colors', () => {
  it('should return green for low percentage', () => {
    expect(getBudgetStatusColor(50)).toContain('green');
  });

  it('should return yellow for warning percentage', () => {
    expect(getBudgetStatusColor(85)).toContain('yellow');
  });

  it('should return red for over budget', () => {
    expect(getBudgetStatusColor(105)).toContain('red');
  });

  it('should return green background for low percentage', () => {
    expect(getBudgetStatusBgColor(50)).toBe('bg-green-500');
  });

  it('should return yellow background for warning percentage', () => {
    expect(getBudgetStatusBgColor(85)).toBe('bg-yellow-500');
  });

  it('should return red background for over budget', () => {
    expect(getBudgetStatusBgColor(105)).toBe('bg-red-500');
  });

  it('should handle edge cases', () => {
    expect(getBudgetStatusColor(0)).toContain('green');
    expect(getBudgetStatusColor(80)).toContain('yellow');
    expect(getBudgetStatusColor(100)).toContain('red');
  });
});

