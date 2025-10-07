/**
 * Validation Schemas for Financial Tracker
 * 
 * Zod schemas for validating form inputs with comprehensive error messages.
 * These schemas integrate with React Hook Form via @hookform/resolvers.
 * 
 * @module validation
 */

import { z } from 'zod';
import { VALIDATION_LIMITS } from '../constants';
import type { ExpenseCategory, IncomeCategory, PaymentMethod, RecurrencePattern } from '../types/domain';

// ============================================================================
// Base Schemas
// ============================================================================

/**
 * Schema for monetary amount (in dollars)
 * Validates positive numbers with up to 2 decimal places
 */
export const amountSchema = z
  .number({
    required_error: 'Amount is required',
    invalid_type_error: 'Amount must be a number',
  })
  .positive('Amount must be greater than zero')
  .min(VALIDATION_LIMITS.AMOUNT.MIN, `Amount must be at least $${VALIDATION_LIMITS.AMOUNT.MIN}`)
  .max(VALIDATION_LIMITS.AMOUNT.MAX, `Amount cannot exceed $${VALIDATION_LIMITS.AMOUNT.MAX.toLocaleString()}`)
  .refine(
    (val) => {
      // Check if number has at most 2 decimal places
      const decimalPlaces = (val.toString().split('.')[1] || '').length;
      return decimalPlaces <= 2;
    },
    { message: 'Amount can have at most 2 decimal places' }
  );

/**
 * Schema for ISO date string
 */
export const dateSchema = z
  .string({
    required_error: 'Date is required',
    invalid_type_error: 'Date must be a string',
  })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: 'Invalid date' }
  );

/**
 * Schema for optional description
 */
export const descriptionSchema = z
  .string()
  .max(VALIDATION_LIMITS.DESCRIPTION.MAX_LENGTH, 
    `Description cannot exceed ${VALIDATION_LIMITS.DESCRIPTION.MAX_LENGTH} characters`)
  .optional();

/**
 * Schema for tags array
 */
export const tagsSchema = z
  .array(
    z.string()
      .min(1, 'Tag cannot be empty')
      .max(VALIDATION_LIMITS.TAGS.MAX_LENGTH, 
        `Tag cannot exceed ${VALIDATION_LIMITS.TAGS.MAX_LENGTH} characters`)
  )
  .max(VALIDATION_LIMITS.TAGS.MAX_COUNT, 
    `Cannot have more than ${VALIDATION_LIMITS.TAGS.MAX_COUNT} tags`)
  .optional();

/**
 * Schema for payment method
 */
export const paymentMethodSchema = z
  .enum(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'venmo', 'other'], {
    errorMap: () => ({ message: 'Invalid payment method' }),
  })
  .optional() as z.ZodOptional<z.ZodType<PaymentMethod>>;

/**
 * Schema for recurrence pattern
 */
export const recurrencePatternSchema = z
  .enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'], {
    errorMap: () => ({ message: 'Invalid recurrence pattern' }),
  }) as z.ZodType<RecurrencePattern>;

// ============================================================================
// Income Schemas
// ============================================================================

/**
 * Schema for income category
 */
export const incomeCategorySchema = z
  .enum(['Salary', 'Freelance', 'Investment', 'Gift', 'Refund', 'Business', 'Rental', 'Other'], {
    errorMap: () => ({ message: 'Invalid income category' }),
  })
  .optional() as z.ZodOptional<z.ZodType<IncomeCategory>>;

/**
 * Base income schema (non-recurring)
 */
export const baseIncomeSchema = z.object({
  amount: amountSchema,
  date: dateSchema,
  source: z.string().max(200, 'Source cannot exceed 200 characters').optional(),
  category: incomeCategorySchema,
  description: descriptionSchema,
  tags: tagsSchema,
  paymentMethod: paymentMethodSchema,
});

/**
 * Recurring income metadata schema
 */
export const recurringIncomeMetadataSchema = z.object({
  isRecurring: z.literal(true),
  recurrencePattern: recurrencePatternSchema,
  recurrenceStartDate: dateSchema,
  recurrenceEndDate: dateSchema.optional(),
});

/**
 * Non-recurring income metadata schema
 */
export const nonRecurringIncomeMetadataSchema = z.object({
  isRecurring: z.literal(false),
});

/**
 * Complete income schema (discriminated union)
 */
export const incomeSchema = z.intersection(
  baseIncomeSchema,
  z.discriminatedUnion('isRecurring', [
    recurringIncomeMetadataSchema,
    nonRecurringIncomeMetadataSchema,
  ])
).refine(
  (data) => {
    // If recurring, validate that end date is after start date
    if (data.isRecurring && data.recurrenceEndDate) {
      const start = new Date(data.recurrenceStartDate);
      const end = new Date(data.recurrenceEndDate);
      return end > start;
    }
    return true;
  },
  {
    message: 'Recurrence end date must be after start date',
    path: ['recurrenceEndDate'],
  }
);

/**
 * Type inference for income form data
 */
export type IncomeFormData = z.infer<typeof incomeSchema>;

// ============================================================================
// Expense Schemas
// ============================================================================

/**
 * Schema for expense category
 */
export const expenseCategorySchema = z
  .enum([
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Healthcare',
    'Travel',
    'Education',
    'Other',
  ], {
    errorMap: () => ({ message: 'Invalid expense category' }),
  })
  .optional() as z.ZodOptional<z.ZodType<ExpenseCategory>>;

/**
 * Base expense schema (non-recurring)
 */
export const baseExpenseSchema = z.object({
  amount: amountSchema,
  date: dateSchema,
  merchant: z.string().max(200, 'Merchant cannot exceed 200 characters').optional(),
  category: expenseCategorySchema,
  description: descriptionSchema,
  tags: tagsSchema,
  paymentMethod: paymentMethodSchema,
  receiptUrl: z.string().url('Invalid receipt URL').optional(),
});

/**
 * Recurring expense metadata schema
 */
export const recurringExpenseMetadataSchema = z.object({
  isRecurring: z.literal(true),
  recurrencePattern: recurrencePatternSchema,
  recurrenceStartDate: dateSchema,
  recurrenceEndDate: dateSchema.optional(),
});

/**
 * Non-recurring expense metadata schema
 */
export const nonRecurringExpenseMetadataSchema = z.object({
  isRecurring: z.literal(false),
});

/**
 * Complete expense schema (discriminated union)
 */
export const expenseSchema = z.intersection(
  baseExpenseSchema,
  z.discriminatedUnion('isRecurring', [
    recurringExpenseMetadataSchema,
    nonRecurringExpenseMetadataSchema,
  ])
).refine(
  (data) => {
    // If recurring, validate that end date is after start date
    if (data.isRecurring && data.recurrenceEndDate) {
      const start = new Date(data.recurrenceStartDate);
      const end = new Date(data.recurrenceEndDate);
      return end > start;
    }
    return true;
  },
  {
    message: 'Recurrence end date must be after start date',
    path: ['recurrenceEndDate'],
  }
);

/**
 * Type inference for expense form data
 */
export type ExpenseFormData = z.infer<typeof expenseSchema>;

// ============================================================================
// Budget Schemas
// ============================================================================

/**
 * Budget schema
 */
export const budgetSchema = z.object({
  category: expenseCategorySchema.refine((val) => val !== undefined, {
    message: 'Category is required for budgets',
  }),
  monthlyLimit: amountSchema,
  startDate: dateSchema,
  endDate: dateSchema.optional(),
  alertThreshold: z
    .number({
      invalid_type_error: 'Alert threshold must be a number',
    })
    .int('Alert threshold must be a whole number')
    .min(VALIDATION_LIMITS.BUDGET_ALERT_THRESHOLD.MIN, 'Alert threshold must be at least 0')
    .max(VALIDATION_LIMITS.BUDGET_ALERT_THRESHOLD.MAX, 'Alert threshold cannot exceed 100')
    .optional()
    .default(80),
}).refine(
  (data) => {
    // Validate that end date is after start date
    if (data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end > start;
    }
    return true;
  },
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

/**
 * Type inference for budget form data
 */
export type BudgetFormData = z.infer<typeof budgetSchema>;

// ============================================================================
// Filter Schemas
// ============================================================================

/**
 * Schema for date range filters
 */
export const dateRangeFilterSchema = z.object({
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
}).refine(
  (data) => {
    // If both dates provided, validate that end is after start
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end >= start;
    }
    return true;
  },
  {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  }
);

/**
 * Schema for income filters
 */
export const incomeFilterSchema = z.object({
  category: incomeCategorySchema,
  paymentMethod: paymentMethodSchema,
  ...dateRangeFilterSchema.shape,
});

/**
 * Schema for expense filters
 */
export const expenseFilterSchema = z.object({
  category: expenseCategorySchema,
  paymentMethod: paymentMethodSchema,
  ...dateRangeFilterSchema.shape,
});

/**
 * Type inference for filter data
 */
export type IncomeFilterData = z.infer<typeof incomeFilterSchema>;
export type ExpenseFilterData = z.infer<typeof expenseFilterSchema>;
export type DateRangeFilterData = z.infer<typeof dateRangeFilterSchema>;

