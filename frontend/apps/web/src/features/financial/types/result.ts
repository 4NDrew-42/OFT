/**
 * Result Type for Error Handling
 * 
 * Implements the Result pattern (also known as Either) for explicit error handling.
 * This eliminates the need for try-catch blocks and makes error handling explicit in types.
 * 
 * @example
 * ```typescript
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) {
 *     return err('Division by zero');
 *   }
 *   return ok(a / b);
 * }
 * 
 * const result = divide(10, 2);
 * if (result.ok) {
 *   console.log(result.value); // 5
 * } else {
 *   console.error(result.error); // Won't execute
 * }
 * ```
 */

// ============================================================================
// Result Type Definition
// ============================================================================

/**
 * Success result containing a value
 */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/**
 * Error result containing an error
 */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/**
 * Result type - discriminated union of Ok and Err
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

// ============================================================================
// Constructor Functions
// ============================================================================

/**
 * Create a successful result
 */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/**
 * Create an error result
 */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok === true;
}

/**
 * Type guard to check if result is Err
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.ok === false;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Map over the value of a Result
 * 
 * @example
 * ```typescript
 * const result = ok(5);
 * const doubled = map(result, x => x * 2); // Ok(10)
 * ```
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

/**
 * Map over the error of a Result
 * 
 * @example
 * ```typescript
 * const result = err('error');
 * const mapped = mapErr(result, e => new Error(e)); // Err(Error('error'))
 * ```
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  return result.ok ? result : err(fn(result.error));
}

/**
 * Chain multiple Result-returning operations
 * 
 * @example
 * ```typescript
 * const result = ok(5);
 * const chained = flatMap(result, x => ok(x * 2)); // Ok(10)
 * ```
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  return result.ok ? fn(result.value) : result;
}

/**
 * Get the value or throw the error
 * 
 * @throws {E} If result is Err
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) {
    return result.value;
  }
  throw result.error;
}

/**
 * Get the value or return a default
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.ok ? result.value : defaultValue;
}

/**
 * Get the value or compute a default
 */
export function unwrapOrElse<T, E>(
  result: Result<T, E>,
  fn: (error: E) => T
): T {
  return result.ok ? result.value : fn(result.error);
}

/**
 * Match on a Result and handle both cases
 * 
 * @example
 * ```typescript
 * const result = ok(5);
 * const message = match(result, {
 *   ok: value => `Success: ${value}`,
 *   err: error => `Error: ${error}`
 * }); // "Success: 5"
 * ```
 */
export function match<T, E, U>(
  result: Result<T, E>,
  handlers: {
    ok: (value: T) => U;
    err: (error: E) => U;
  }
): U {
  return result.ok ? handlers.ok(result.value) : handlers.err(result.error);
}

/**
 * Combine multiple Results into a single Result containing an array
 * Returns Err if any Result is Err
 * 
 * @example
 * ```typescript
 * const results = [ok(1), ok(2), ok(3)];
 * const combined = combine(results); // Ok([1, 2, 3])
 * 
 * const resultsWithError = [ok(1), err('error'), ok(3)];
 * const combined2 = combine(resultsWithError); // Err('error')
 * ```
 */
export function combine<T, E>(
  results: ReadonlyArray<Result<T, E>>
): Result<ReadonlyArray<T>, E> {
  const values: T[] = [];
  
  for (const result of results) {
    if (!result.ok) {
      return result;
    }
    values.push(result.value);
  }
  
  return ok(values);
}

/**
 * Wrap a function that might throw into a Result
 * 
 * @example
 * ```typescript
 * const result = tryCatch(
 *   () => JSON.parse('{"valid": "json"}'),
 *   (error) => new Error(`Parse error: ${error}`)
 * ); // Ok({valid: 'json'})
 * ```
 */
export function tryCatch<T, E>(
  fn: () => T,
  onError: (error: unknown) => E
): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    return err(onError(error));
  }
}

/**
 * Wrap an async function that might throw into a Result
 * 
 * @example
 * ```typescript
 * const result = await tryCatchAsync(
 *   async () => await fetch('/api/data'),
 *   (error) => new Error(`Fetch error: ${error}`)
 * );
 * ```
 */
export async function tryCatchAsync<T, E>(
  fn: () => Promise<T>,
  onError: (error: unknown) => E
): Promise<Result<T, E>> {
  try {
    return ok(await fn());
  } catch (error) {
    return err(onError(error));
  }
}

// ============================================================================
// Async Result Utilities
// ============================================================================

/**
 * Map over an async Result
 */
export async function mapAsync<T, U, E>(
  resultPromise: Promise<Result<T, E>>,
  fn: (value: T) => U | Promise<U>
): Promise<Result<U, E>> {
  const result = await resultPromise;
  if (!result.ok) {
    return result;
  }
  return ok(await fn(result.value));
}

/**
 * Chain async Result operations
 */
export async function flatMapAsync<T, U, E>(
  resultPromise: Promise<Result<T, E>>,
  fn: (value: T) => Promise<Result<U, E>>
): Promise<Result<U, E>> {
  const result = await resultPromise;
  return result.ok ? fn(result.value) : result;
}

// ============================================================================
// Domain-Specific Error Types
// ============================================================================

/**
 * Base error type for the application
 */
export interface AppError {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
}

/**
 * Validation error
 */
export interface ValidationError extends AppError {
  readonly code: 'VALIDATION_ERROR';
  readonly field?: string;
}

/**
 * API error
 */
export interface APIError extends AppError {
  readonly code: 'API_ERROR';
  readonly statusCode: number;
}

/**
 * Not found error
 */
export interface NotFoundError extends AppError {
  readonly code: 'NOT_FOUND';
  readonly resource: string;
}

/**
 * Unauthorized error
 */
export interface UnauthorizedError extends AppError {
  readonly code: 'UNAUTHORIZED';
}

/**
 * Network error
 */
export interface NetworkError extends AppError {
  readonly code: 'NETWORK_ERROR';
}

/**
 * Union of all possible errors
 */
export type DomainError =
  | ValidationError
  | APIError
  | NotFoundError
  | UnauthorizedError
  | NetworkError;

// ============================================================================
// Error Constructors
// ============================================================================

export function validationError(
  message: string,
  field?: string,
  details?: unknown
): ValidationError {
  return {
    code: 'VALIDATION_ERROR',
    message,
    field,
    details,
  };
}

export function apiError(
  message: string,
  statusCode: number,
  details?: unknown
): APIError {
  return {
    code: 'API_ERROR',
    message,
    statusCode,
    details,
  };
}

export function notFoundError(resource: string, details?: unknown): NotFoundError {
  return {
    code: 'NOT_FOUND',
    message: `${resource} not found`,
    resource,
    details,
  };
}

export function unauthorizedError(message: string = 'Unauthorized'): UnauthorizedError {
  return {
    code: 'UNAUTHORIZED',
    message,
  };
}

export function networkError(message: string, details?: unknown): NetworkError {
  return {
    code: 'NETWORK_ERROR',
    message,
    details,
  };
}

