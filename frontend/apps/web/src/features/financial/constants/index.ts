/**
 * Financial Tracker Constants
 * 
 * Centralized constants for categories, payment methods, recurrence patterns,
 * and other configuration values used throughout the application.
 * 
 * @module constants
 */

import type { ExpenseCategory, IncomeCategory, PaymentMethod, RecurrencePattern } from '../types/domain';

// ============================================================================
// Expense Categories
// ============================================================================

/**
 * Available expense categories with display labels
 */
export const EXPENSE_CATEGORIES: ReadonlyArray<{
  readonly value: ExpenseCategory;
  readonly label: string;
  readonly icon: string;
  readonly color: string;
}> = [
  {
    value: 'Food & Dining',
    label: 'Food & Dining',
    icon: '🍽️',
    color: 'orange',
  },
  {
    value: 'Transportation',
    label: 'Transportation',
    icon: '🚗',
    color: 'blue',
  },
  {
    value: 'Shopping',
    label: 'Shopping',
    icon: '🛍️',
    color: 'pink',
  },
  {
    value: 'Entertainment',
    label: 'Entertainment',
    icon: '🎬',
    color: 'purple',
  },
  {
    value: 'Bills & Utilities',
    label: 'Bills & Utilities',
    icon: '💡',
    color: 'yellow',
  },
  {
    value: 'Healthcare',
    label: 'Healthcare',
    icon: '🏥',
    color: 'red',
  },
  {
    value: 'Travel',
    label: 'Travel',
    icon: '✈️',
    color: 'teal',
  },
  {
    value: 'Education',
    label: 'Education',
    icon: '📚',
    color: 'indigo',
  },
  {
    value: 'Other',
    label: 'Other',
    icon: '📌',
    color: 'gray',
  },
] as const;

/**
 * Get expense category by value
 */
export function getExpenseCategory(value: string) {
  return EXPENSE_CATEGORIES.find(cat => cat.value === value);
}

// ============================================================================
// Income Categories
// ============================================================================

/**
 * Available income categories with display labels
 */
export const INCOME_CATEGORIES: ReadonlyArray<{
  readonly value: IncomeCategory;
  readonly label: string;
  readonly icon: string;
  readonly color: string;
}> = [
  {
    value: 'Salary',
    label: 'Salary',
    icon: '💼',
    color: 'green',
  },
  {
    value: 'Freelance',
    label: 'Freelance',
    icon: '💻',
    color: 'blue',
  },
  {
    value: 'Investment',
    label: 'Investment',
    icon: '📈',
    color: 'purple',
  },
  {
    value: 'Gift',
    label: 'Gift',
    icon: '🎁',
    color: 'pink',
  },
  {
    value: 'Refund',
    label: 'Refund',
    icon: '↩️',
    color: 'orange',
  },
  {
    value: 'Business',
    label: 'Business',
    icon: '🏢',
    color: 'indigo',
  },
  {
    value: 'Rental',
    label: 'Rental',
    icon: '🏠',
    color: 'teal',
  },
  {
    value: 'Other',
    label: 'Other',
    icon: '📌',
    color: 'gray',
  },
] as const;

/**
 * Get income category by value
 */
export function getIncomeCategory(value: string) {
  return INCOME_CATEGORIES.find(cat => cat.value === value);
}

// ============================================================================
// Payment Methods
// ============================================================================

/**
 * Available payment methods with display labels
 */
export const PAYMENT_METHODS: ReadonlyArray<{
  readonly value: PaymentMethod;
  readonly label: string;
  readonly icon: string;
}> = [
  {
    value: 'cash',
    label: 'Cash',
    icon: '💵',
  },
  {
    value: 'credit_card',
    label: 'Credit Card',
    icon: '💳',
  },
  {
    value: 'debit_card',
    label: 'Debit Card',
    icon: '💳',
  },
  {
    value: 'bank_transfer',
    label: 'Bank Transfer',
    icon: '🏦',
  },
  {
    value: 'paypal',
    label: 'PayPal',
    icon: '🅿️',
  },
  {
    value: 'venmo',
    label: 'Venmo',
    icon: '📱',
  },
  {
    value: 'other',
    label: 'Other',
    icon: '📌',
  },
] as const;

/**
 * Get payment method by value
 */
export function getPaymentMethod(value: string) {
  return PAYMENT_METHODS.find(method => method.value === value);
}

// ============================================================================
// Recurrence Patterns
// ============================================================================

/**
 * Available recurrence patterns with display labels
 */
export const RECURRENCE_PATTERNS: ReadonlyArray<{
  readonly value: RecurrencePattern;
  readonly label: string;
  readonly description: string;
}> = [
  {
    value: 'daily',
    label: 'Daily',
    description: 'Repeats every day',
  },
  {
    value: 'weekly',
    label: 'Weekly',
    description: 'Repeats every week',
  },
  {
    value: 'biweekly',
    label: 'Bi-weekly',
    description: 'Repeats every 2 weeks',
  },
  {
    value: 'monthly',
    label: 'Monthly',
    description: 'Repeats every month',
  },
  {
    value: 'quarterly',
    label: 'Quarterly',
    description: 'Repeats every 3 months',
  },
  {
    value: 'yearly',
    label: 'Yearly',
    description: 'Repeats every year',
  },
] as const;

/**
 * Get recurrence pattern by value
 */
export function getRecurrencePattern(value: string) {
  return RECURRENCE_PATTERNS.find(pattern => pattern.value === value);
}

// ============================================================================
// Budget Configuration
// ============================================================================

/**
 * Default budget alert threshold (percentage)
 */
export const DEFAULT_BUDGET_ALERT_THRESHOLD = 80;

/**
 * Budget status thresholds
 */
export const BUDGET_STATUS_THRESHOLDS = {
  OK: 0,
  WARNING: 80,
  OVER: 100,
} as const;

/**
 * Budget status colors for UI
 */
export const BUDGET_STATUS_COLORS = {
  ok: {
    bg: 'bg-green-500',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500',
  },
  warning: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-500',
  },
  over: {
    bg: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500',
  },
} as const;

// ============================================================================
// Date Formats
// ============================================================================

/**
 * Date format options for display
 */
export const DATE_FORMATS = {
  SHORT: 'MM/DD/YYYY',
  MEDIUM: 'MMM DD, YYYY',
  LONG: 'MMMM DD, YYYY',
  ISO: 'YYYY-MM-DD',
} as const;

/**
 * Default date format for user display
 */
export const DEFAULT_DATE_FORMAT = DATE_FORMATS.MEDIUM;

// ============================================================================
// Currency Configuration
// ============================================================================

/**
 * Currency configuration
 */
export const CURRENCY_CONFIG = {
  locale: 'en-US',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;

// ============================================================================
// Validation Limits
// ============================================================================

/**
 * Validation limits for forms
 */
export const VALIDATION_LIMITS = {
  AMOUNT: {
    MIN: 0.01, // Minimum $0.01
    MAX: 1000000, // Maximum $1,000,000
  },
  DESCRIPTION: {
    MAX_LENGTH: 500,
  },
  TAGS: {
    MAX_COUNT: 10,
    MAX_LENGTH: 50,
  },
  BUDGET_ALERT_THRESHOLD: {
    MIN: 0,
    MAX: 100,
  },
} as const;

// ============================================================================
// API Configuration
// ============================================================================

/**
 * API endpoint base URL
 */
export const API_BASE_URL = 'https://fabric.sidekickportal.com/api';

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  INCOME: `${API_BASE_URL}/income`,
  EXPENSES: `${API_BASE_URL}/expenses`,
  BUDGETS: `${API_BASE_URL}/budgets`,
} as const;

// ============================================================================
// Query Keys for React Query
// ============================================================================

/**
 * Query keys for React Query cache management
 */
export const QUERY_KEYS = {
  INCOME: {
    ALL: ['income'] as const,
    LIST: (userId: string) => ['income', 'list', userId] as const,
    DETAIL: (id: string) => ['income', 'detail', id] as const,
    SUMMARY: (userId: string, filters?: Record<string, unknown>) => 
      ['income', 'summary', userId, filters] as const,
  },
  EXPENSES: {
    ALL: ['expenses'] as const,
    LIST: (userId: string) => ['expenses', 'list', userId] as const,
    DETAIL: (id: string) => ['expenses', 'detail', id] as const,
    SUMMARY: (userId: string, filters?: Record<string, unknown>) => 
      ['expenses', 'summary', userId, filters] as const,
  },
  BUDGETS: {
    ALL: ['budgets'] as const,
    LIST: (userId: string) => ['budgets', 'list', userId] as const,
    DETAIL: (id: string) => ['budgets', 'detail', id] as const,
    STATUS: (userId: string, month?: number, year?: number) => 
      ['budgets', 'status', userId, month, year] as const,
  },
} as const;

// ============================================================================
// UI Configuration
// ============================================================================

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100] as const,
} as const;

/**
 * Debounce delays (in milliseconds)
 */
export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  VALIDATION: 500,
  AUTO_SAVE: 1000,
} as const;

/**
 * Animation durations (in milliseconds)
 */
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

