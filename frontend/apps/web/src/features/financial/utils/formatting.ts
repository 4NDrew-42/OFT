/**
 * Formatting Utilities for Financial Tracker
 * 
 * Functions for formatting currency, dates, numbers, and other display values.
 * All functions are pure and side-effect free.
 * 
 * @module formatting
 */

import type { Amount, ISODate } from '../types/domain';
import { amountToDollars, parseISODate } from '../types/domain';
import { CURRENCY_CONFIG } from '../constants';

// ============================================================================
// Currency Formatting
// ============================================================================

/**
 * Format an Amount (in cents) as currency string
 * 
 * @param amount - Amount in cents
 * @param options - Optional formatting options
 * @returns Formatted currency string (e.g., "$1,234.56")
 * 
 * @example
 * ```typescript
 * const amount = createAmountFromDollars(1234.56);
 * formatCurrency(amount); // "$1,234.56"
 * formatCurrency(amount, { showCents: false }); // "$1,235"
 * ```
 */
export function formatCurrency(
  amount: Amount,
  options?: {
    readonly showCents?: boolean;
    readonly showSymbol?: boolean;
  }
): string {
  const dollars = amountToDollars(amount);
  const showCents = options?.showCents ?? true;
  const showSymbol = options?.showSymbol ?? true;
  
  const formatted = new Intl.NumberFormat(CURRENCY_CONFIG.locale, {
    style: showSymbol ? 'currency' : 'decimal',
    currency: CURRENCY_CONFIG.currency,
    minimumFractionDigits: showCents ? CURRENCY_CONFIG.minimumFractionDigits : 0,
    maximumFractionDigits: showCents ? CURRENCY_CONFIG.maximumFractionDigits : 0,
  }).format(dollars);
  
  return formatted;
}

/**
 * Format a number as currency string (convenience function)
 * 
 * @param dollars - Amount in dollars
 * @returns Formatted currency string
 * 
 * @example
 * ```typescript
 * formatDollars(1234.56); // "$1,234.56"
 * ```
 */
export function formatDollars(dollars: number): string {
  return new Intl.NumberFormat(CURRENCY_CONFIG.locale, {
    style: 'currency',
    currency: CURRENCY_CONFIG.currency,
    minimumFractionDigits: CURRENCY_CONFIG.minimumFractionDigits,
    maximumFractionDigits: CURRENCY_CONFIG.maximumFractionDigits,
  }).format(dollars);
}

/**
 * Format currency with compact notation for large numbers
 * 
 * @param amount - Amount in cents
 * @returns Compact formatted string (e.g., "$1.2K", "$1.5M")
 * 
 * @example
 * ```typescript
 * const amount = createAmountFromDollars(1234.56);
 * formatCurrencyCompact(amount); // "$1.2K"
 * 
 * const largeAmount = createAmountFromDollars(1234567.89);
 * formatCurrencyCompact(largeAmount); // "$1.2M"
 * ```
 */
export function formatCurrencyCompact(amount: Amount): string {
  const dollars = amountToDollars(amount);
  
  return new Intl.NumberFormat(CURRENCY_CONFIG.locale, {
    style: 'currency',
    currency: CURRENCY_CONFIG.currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(dollars);
}

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Format an ISODate as a user-friendly string
 * 
 * @param date - ISO date string
 * @param format - Format style ('short', 'medium', 'long', 'full')
 * @returns Formatted date string
 * 
 * @example
 * ```typescript
 * const date = createISODate(new Date('2025-10-06'));
 * formatDate(date); // "Oct 6, 2025"
 * formatDate(date, 'short'); // "10/6/25"
 * formatDate(date, 'long'); // "October 6, 2025"
 * formatDate(date, 'full'); // "Monday, October 6, 2025"
 * ```
 */
export function formatDate(
  date: ISODate,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium'
): string {
  const dateObj = parseISODate(date);
  
  const formatOptions: Intl.DateTimeFormatOptions = {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  }[format];
  
  return new Intl.DateTimeFormat('en-US', formatOptions).format(dateObj);
}

/**
 * Format an ISODate as relative time (e.g., "2 days ago", "in 3 weeks")
 * 
 * @param date - ISO date string
 * @returns Relative time string
 * 
 * @example
 * ```typescript
 * const yesterday = createISODate(new Date(Date.now() - 86400000));
 * formatRelativeDate(yesterday); // "yesterday"
 * 
 * const nextWeek = createISODate(new Date(Date.now() + 7 * 86400000));
 * formatRelativeDate(nextWeek); // "in 7 days"
 * ```
 */
export function formatRelativeDate(date: ISODate): string {
  const dateObj = parseISODate(date);
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  // Use Intl.RelativeTimeFormat for proper localization
  const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
  
  if (Math.abs(diffDays) < 1) {
    return 'today';
  } else if (Math.abs(diffDays) < 7) {
    return rtf.format(diffDays, 'day');
  } else if (Math.abs(diffDays) < 30) {
    return rtf.format(Math.round(diffDays / 7), 'week');
  } else if (Math.abs(diffDays) < 365) {
    return rtf.format(Math.round(diffDays / 30), 'month');
  } else {
    return rtf.format(Math.round(diffDays / 365), 'year');
  }
}

/**
 * Format a date range as a string
 * 
 * @param startDate - Start date
 * @param endDate - End date (optional)
 * @returns Formatted date range string
 * 
 * @example
 * ```typescript
 * const start = createISODate(new Date('2025-10-01'));
 * const end = createISODate(new Date('2025-10-31'));
 * formatDateRange(start, end); // "Oct 1 - Oct 31, 2025"
 * formatDateRange(start); // "Oct 1, 2025 - Present"
 * ```
 */
export function formatDateRange(startDate: ISODate, endDate?: ISODate): string {
  const start = parseISODate(startDate);
  
  if (!endDate) {
    return `${formatDate(startDate)} - Present`;
  }
  
  const end = parseISODate(endDate);
  
  // Same year
  if (start.getFullYear() === end.getFullYear()) {
    // Same month
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.getDate()}, ${end.getFullYear()}`;
    }
    // Different months, same year
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${end.getFullYear()}`;
  }
  
  // Different years
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

// ============================================================================
// Number Formatting
// ============================================================================

/**
 * Format a number as a percentage
 * 
 * @param value - Number to format (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 * 
 * @example
 * ```typescript
 * formatPercentage(75.5); // "75.5%"
 * formatPercentage(75.5, 0); // "76%"
 * formatPercentage(75.5, 2); // "75.50%"
 * ```
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a number with thousands separators
 * 
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string
 * 
 * @example
 * ```typescript
 * formatNumber(1234567); // "1,234,567"
 * formatNumber(1234.567, 2); // "1,234.57"
 * ```
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a number with compact notation
 * 
 * @param value - Number to format
 * @returns Compact formatted string (e.g., "1.2K", "1.5M")
 * 
 * @example
 * ```typescript
 * formatNumberCompact(1234); // "1.2K"
 * formatNumberCompact(1234567); // "1.2M"
 * formatNumberCompact(1234567890); // "1.2B"
 * ```
 */
export function formatNumberCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

// ============================================================================
// Text Formatting
// ============================================================================

/**
 * Truncate text to a maximum length with ellipsis
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length (default: 50)
 * @returns Truncated text
 * 
 * @example
 * ```typescript
 * truncateText("This is a very long text that needs truncation", 20);
 * // "This is a very lo..."
 * ```
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Capitalize first letter of a string
 * 
 * @param text - Text to capitalize
 * @returns Capitalized text
 * 
 * @example
 * ```typescript
 * capitalize("hello world"); // "Hello world"
 * ```
 */
export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert snake_case or kebab-case to Title Case
 * 
 * @param text - Text to convert
 * @returns Title case text
 * 
 * @example
 * ```typescript
 * toTitleCase("credit_card"); // "Credit Card"
 * toTitleCase("bank-transfer"); // "Bank Transfer"
 * ```
 */
export function toTitleCase(text: string): string {
  return text
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
}

// ============================================================================
// Category & Status Formatting
// ============================================================================

/**
 * Get color class for budget status
 * 
 * @param percentage - Budget usage percentage
 * @returns Tailwind color class
 * 
 * @example
 * ```typescript
 * getBudgetStatusColor(50); // "text-green-600 dark:text-green-400"
 * getBudgetStatusColor(85); // "text-yellow-600 dark:text-yellow-400"
 * getBudgetStatusColor(105); // "text-red-600 dark:text-red-400"
 * ```
 */
export function getBudgetStatusColor(percentage: number): string {
  if (percentage >= 100) {
    return 'text-red-600 dark:text-red-400';
  } else if (percentage >= 80) {
    return 'text-yellow-600 dark:text-yellow-400';
  } else {
    return 'text-green-600 dark:text-green-400';
  }
}

/**
 * Get background color class for budget status
 * 
 * @param percentage - Budget usage percentage
 * @returns Tailwind background color class
 */
export function getBudgetStatusBgColor(percentage: number): string {
  if (percentage >= 100) {
    return 'bg-red-500';
  } else if (percentage >= 80) {
    return 'bg-yellow-500';
  } else {
    return 'bg-green-500';
  }
}

