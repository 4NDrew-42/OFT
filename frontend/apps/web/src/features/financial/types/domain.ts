/**
 * Domain Types for Financial Tracker
 * 
 * This file contains branded types and domain models following DDD principles.
 * All types are immutable and use branded types for type safety.
 */

// ============================================================================
// Branded Types (Nominal Typing)
// ============================================================================

/**
 * Branded type helper for creating nominal types
 */
type Brand<K, T> = K & { __brand: T };

/**
 * User identifier - branded string to prevent mixing with other IDs
 */
export type UserId = Brand<string, 'UserId'>;

/**
 * Transaction identifier - branded string
 */
export type TransactionId = Brand<string, 'TransactionId'>;

/**
 * Budget identifier - branded string
 */
export type BudgetId = Brand<string, 'BudgetId'>;

/**
 * Monetary amount - branded number to prevent arithmetic errors
 * Always stored in cents to avoid floating point issues
 */
export type Amount = Brand<number, 'Amount'>;

/**
 * Email address - branded string with validation
 */
export type Email = Brand<string, 'Email'>;

/**
 * ISO 8601 date string - branded string
 */
export type ISODate = Brand<string, 'ISODate'>;

// ============================================================================
// Enums and Literal Types
// ============================================================================

/**
 * Payment methods supported by the system
 */
export const PaymentMethod = {
  CASH: 'cash',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  BANK_TRANSFER: 'bank_transfer',
  PAYPAL: 'paypal',
  VENMO: 'venmo',
  OTHER: 'other',
} as const;

export type PaymentMethod = typeof PaymentMethod[keyof typeof PaymentMethod];

/**
 * Recurrence patterns for recurring transactions
 */
export const RecurrencePattern = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
} as const;

export type RecurrencePattern = typeof RecurrencePattern[keyof typeof RecurrencePattern];

/**
 * Budget status based on spending percentage
 */
export const BudgetStatus = {
  OK: 'ok',
  WARNING: 'warning',
  OVER: 'over',
} as const;

export type BudgetStatus = typeof BudgetStatus[keyof typeof BudgetStatus];

/**
 * Transaction categories for expenses
 */
export const ExpenseCategory = {
  FOOD_DINING: 'Food & Dining',
  TRANSPORTATION: 'Transportation',
  SHOPPING: 'Shopping',
  ENTERTAINMENT: 'Entertainment',
  BILLS_UTILITIES: 'Bills & Utilities',
  HEALTHCARE: 'Healthcare',
  TRAVEL: 'Travel',
  EDUCATION: 'Education',
  OTHER: 'Other',
} as const;

export type ExpenseCategory = typeof ExpenseCategory[keyof typeof ExpenseCategory];

/**
 * Transaction categories for income
 */
export const IncomeCategory = {
  SALARY: 'Salary',
  FREELANCE: 'Freelance',
  INVESTMENT: 'Investment',
  GIFT: 'Gift',
  REFUND: 'Refund',
  BUSINESS: 'Business',
  RENTAL: 'Rental',
  OTHER: 'Other',
} as const;

export type IncomeCategory = typeof IncomeCategory[keyof typeof IncomeCategory];

// ============================================================================
// Base Transaction Interface
// ============================================================================

/**
 * Base interface for all financial transactions
 */
interface BaseTransaction {
  readonly id: TransactionId;
  readonly userId: UserId;
  readonly amount: Amount;
  readonly date: ISODate;
  readonly category?: string;
  readonly description?: string;
  readonly tags: ReadonlyArray<string>;
  readonly paymentMethod?: PaymentMethod;
  readonly createdAt: ISODate;
  readonly updatedAt: ISODate;
}

/**
 * Recurring transaction metadata
 */
interface RecurringMetadata {
  readonly isRecurring: true;
  readonly recurrencePattern: RecurrencePattern;
  readonly recurrenceStartDate: ISODate;
  readonly recurrenceEndDate?: ISODate;
  readonly nextOccurrenceDate?: ISODate;
  readonly parentRecurringId?: TransactionId;
}

/**
 * Non-recurring transaction metadata
 */
interface NonRecurringMetadata {
  readonly isRecurring: false;
}

// ============================================================================
// Income Domain Model
// ============================================================================

/**
 * Income transaction - discriminated union based on recurrence
 */
export type Income = BaseTransaction & {
  readonly source?: string;
} & (RecurringMetadata | NonRecurringMetadata);

/**
 * Type guard for recurring income
 */
export function isRecurringIncome(income: Income): income is Income & RecurringMetadata {
  return income.isRecurring === true;
}

/**
 * Input for creating new income
 */
export interface CreateIncomeInput {
  readonly userId: UserId;
  readonly amount: Amount;
  readonly date: ISODate;
  readonly source?: string;
  readonly category?: IncomeCategory;
  readonly description?: string;
  readonly tags?: ReadonlyArray<string>;
  readonly paymentMethod?: PaymentMethod;
  readonly isRecurring?: boolean;
  readonly recurrencePattern?: RecurrencePattern;
  readonly recurrenceStartDate?: ISODate;
  readonly recurrenceEndDate?: ISODate;
}

/**
 * Input for updating existing income
 */
export type UpdateIncomeInput = Partial<Omit<CreateIncomeInput, 'userId'>>;

// ============================================================================
// Expense Domain Model
// ============================================================================

/**
 * Expense transaction - discriminated union based on recurrence
 */
export type Expense = BaseTransaction & {
  readonly merchant?: string;
  readonly receiptUrl?: string;
} & (RecurringMetadata | NonRecurringMetadata);

/**
 * Type guard for recurring expense
 */
export function isRecurringExpense(expense: Expense): expense is Expense & RecurringMetadata {
  return expense.isRecurring === true;
}

/**
 * Input for creating new expense
 */
export interface CreateExpenseInput {
  readonly userId: UserId;
  readonly amount: Amount;
  readonly date: ISODate;
  readonly merchant?: string;
  readonly category?: ExpenseCategory;
  readonly description?: string;
  readonly tags?: ReadonlyArray<string>;
  readonly paymentMethod?: PaymentMethod;
  readonly receiptUrl?: string;
  readonly isRecurring?: boolean;
  readonly recurrencePattern?: RecurrencePattern;
  readonly recurrenceStartDate?: ISODate;
  readonly recurrenceEndDate?: ISODate;
}

/**
 * Input for updating existing expense
 */
export type UpdateExpenseInput = Partial<Omit<CreateExpenseInput, 'userId'>>;

// ============================================================================
// Budget Domain Model
// ============================================================================

/**
 * Budget with spending tracking
 */
export interface Budget {
  readonly id: BudgetId;
  readonly userId: UserId;
  readonly category: ExpenseCategory;
  readonly monthlyLimit: Amount;
  readonly startDate: ISODate;
  readonly endDate?: ISODate;
  readonly alertThreshold: number; // Percentage (0-100)
  readonly isActive: boolean;
  readonly spent: Amount;
  readonly remaining: Amount;
  readonly percentage: number;
  readonly status: BudgetStatus;
  readonly createdAt: ISODate;
  readonly updatedAt: ISODate;
}

/**
 * Input for creating new budget
 */
export interface CreateBudgetInput {
  readonly userId: UserId;
  readonly category: ExpenseCategory;
  readonly monthlyLimit: Amount;
  readonly startDate: ISODate;
  readonly endDate?: ISODate;
  readonly alertThreshold?: number;
}

/**
 * Input for updating existing budget
 */
export type UpdateBudgetInput = Partial<Omit<CreateBudgetInput, 'userId'>>;

// ============================================================================
// Summary and Analytics Types
// ============================================================================

/**
 * Category summary for income or expenses
 */
export interface CategorySummary {
  readonly category: string;
  readonly total: Amount;
  readonly count: number;
  readonly percentage: number;
}

/**
 * Financial summary for a time period
 */
export interface FinancialSummary {
  readonly totalIncome: Amount;
  readonly totalExpenses: Amount;
  readonly netIncome: Amount;
  readonly budgetUtilization: number;
  readonly topExpenseCategory?: string;
  readonly topIncomeCategory?: string;
  readonly incomeByCategory: ReadonlyArray<CategorySummary>;
  readonly expensesByCategory: ReadonlyArray<CategorySummary>;
}

// ============================================================================
// Helper Functions for Branded Types
// ============================================================================

/**
 * Create a UserId from a string (with validation)
 */
export function createUserId(value: string): UserId {
  if (!value || value.trim().length === 0) {
    throw new Error('UserId cannot be empty');
  }
  return value as UserId;
}

/**
 * Create an Amount from a number (in cents)
 */
export function createAmount(cents: number): Amount {
  if (!Number.isFinite(cents) || cents < 0) {
    throw new Error('Amount must be a non-negative finite number');
  }
  return Math.round(cents) as Amount;
}

/**
 * Create an Amount from dollars
 */
export function createAmountFromDollars(dollars: number): Amount {
  return createAmount(Math.round(dollars * 100));
}

/**
 * Convert Amount to dollars
 */
export function amountToDollars(amount: Amount): number {
  return amount / 100;
}

/**
 * Create an Email from a string (with validation)
 */
export function createEmail(value: string): Email {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    throw new Error('Invalid email format');
  }
  return value as Email;
}

/**
 * Create an ISODate from a Date object
 */
export function createISODate(date: Date): ISODate {
  return date.toISOString() as ISODate;
}

/**
 * Parse an ISODate to a Date object
 */
export function parseISODate(isoDate: ISODate): Date {
  return new Date(isoDate);
}

