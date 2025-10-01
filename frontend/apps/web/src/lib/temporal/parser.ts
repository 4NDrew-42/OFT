/**
 * Temporal Query Parser
 * 
 * Parses natural language temporal references in user queries and converts them
 * to absolute date ranges for session filtering.
 * 
 * Supports patterns like:
 * - "yesterday", "today", "this morning"
 * - "last week", "this week", "last month"
 * - "recently", "last N days", "N days ago"
 * 
 * @module temporal/parser
 */

import { 
  startOfDay, 
  endOfDay, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  subWeeks,
  startOfMonth,
  endOfMonth,
  subMonths
} from 'date-fns';

/**
 * Represents a temporal date range with metadata
 */
export interface TemporalRange {
  /** Start date of the range (inclusive) */
  startDate: Date;
  /** End date of the range (inclusive) */
  endDate: Date;
  /** Human-readable description of the range */
  description: string;
  /** Confidence score (0-1) indicating parsing certainty */
  confidence: number;
}

/**
 * Internal interface for temporal keyword patterns
 */
export interface TemporalKeyword {
  /** Regular expression pattern to match */
  pattern: RegExp;
  /** Handler function to convert match to TemporalRange */
  handler: (now: Date, match: RegExpMatchArray) => TemporalRange;
}

/**
 * Define temporal keyword patterns with their handlers
 * Ordered by specificity (more specific patterns first)
 */
const TEMPORAL_KEYWORDS: TemporalKeyword[] = [
  // Yesterday
  {
    pattern: /\b(yesterday|last night)\b/i,
    handler: (now) => {
      const yesterday = subDays(now, 1);
      return {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday),
        description: "yesterday",
        confidence: 1.0
      };
    }
  },
  
  // Today / This morning / This afternoon
  {
    pattern: /\b(today|this morning|this afternoon|this evening)\b/i,
    handler: (now) => ({
      startDate: startOfDay(now),
      endDate: now,
      description: "today",
      confidence: 1.0
    })
  },
  
  // Last week
  {
    pattern: /\blast week\b/i,
    handler: (now) => {
      const lastWeek = subWeeks(now, 1);
      return {
        startDate: startOfWeek(lastWeek, { weekStartsOn: 1 }), // Monday
        endDate: endOfWeek(lastWeek, { weekStartsOn: 1 }),
        description: "last week",
        confidence: 0.9
      };
    }
  },
  
  // This week
  {
    pattern: /\bthis week\b/i,
    handler: (now) => ({
      startDate: startOfWeek(now, { weekStartsOn: 1 }),
      endDate: now,
      description: "this week",
      confidence: 1.0
    })
  },
  
  // Last month
  {
    pattern: /\blast month\b/i,
    handler: (now) => {
      const lastMonth = subMonths(now, 1);
      return {
        startDate: startOfMonth(lastMonth),
        endDate: endOfMonth(lastMonth),
        description: "last month",
        confidence: 0.8
      };
    }
  },
  
  // This month
  {
    pattern: /\bthis month\b/i,
    handler: (now) => ({
      startDate: startOfMonth(now),
      endDate: now,
      description: "this month",
      confidence: 1.0
    })
  },
  
  // Recently (last 7 days)
  {
    pattern: /\b(recently|lately|past (few )?days?)\b/i,
    handler: (now) => ({
      startDate: subDays(now, 7),
      endDate: now,
      description: "recently (last 7 days)",
      confidence: 0.7
    })
  },
  
  // Last N days
  {
    pattern: /\blast (\d+) days?\b/i,
    handler: (now, match) => {
      const days = parseInt(match[1] || "0");
      return {
        startDate: subDays(now, days),
        endDate: now,
        description: `last ${days} days`,
        confidence: 1.0
      };
    }
  },
  
  // N days ago (specific day)
  {
    pattern: /\b(\d+) days? ago\b/i,
    handler: (now, match) => {
      const days = parseInt(match[1] || "0");
      const targetDay = subDays(now, days);
      return {
        startDate: startOfDay(targetDay),
        endDate: endOfDay(targetDay),
        description: `${days} days ago`,
        confidence: 1.0
      };
    }
  },
  
  // Last N weeks
  {
    pattern: /\blast (\d+) weeks?\b/i,
    handler: (now, match) => {
      const weeks = parseInt(match[1] || "0");
      return {
        startDate: subWeeks(now, weeks),
        endDate: now,
        description: `last ${weeks} weeks`,
        confidence: 0.9
      };
    }
  }
];

/**
 * Parse a query string for temporal references
 * 
 * @param query - The user's query string
 * @returns TemporalRange if temporal reference found, null otherwise
 * 
 * @example
 * ```typescript
 * const result = parseTemporalQuery("What did we do yesterday?");
 * // Returns: { startDate: ..., endDate: ..., description: "yesterday", confidence: 1.0 }
 * ```
 */
export function parseTemporalQuery(query: string): TemporalRange | null {
  const now = new Date();
  const lowerQuery = query.toLowerCase();
  
  // Try each temporal keyword pattern
  for (const keyword of TEMPORAL_KEYWORDS) {
    const match = lowerQuery.match(keyword.pattern);
    if (match) {
      return keyword.handler(now, match);
    }
  }
  
  return null;
}

/**
 * Check if a query contains temporal keywords
 * 
 * @param query - The user's query string
 * @returns true if temporal keywords detected
 * 
 * @example
 * ```typescript
 * hasTemporalKeywords("What did we do yesterday?"); // true
 * hasTemporalKeywords("What is AI?"); // false
 * ```
 */
export function hasTemporalKeywords(query: string): boolean {
  return parseTemporalQuery(query) !== null;
}

/**
 * Extract temporal context from query and return cleaned query
 * 
 * @param query - The user's query string
 * @returns Object with temporal info and cleaned query (temporal keywords removed)
 * 
 * @example
 * ```typescript
 * const result = extractTemporalContext("What did we do yesterday?");
 * // Returns: { temporal: {...}, cleanedQuery: "What did we do?" }
 * ```
 */
export function extractTemporalContext(query: string): {
  temporal: TemporalRange | null;
  cleanedQuery: string;
} {
  const temporal = parseTemporalQuery(query);
  
  if (!temporal) {
    return { temporal: null, cleanedQuery: query };
  }
  
  // Remove temporal keywords from query
  let cleanedQuery = query;
  for (const keyword of TEMPORAL_KEYWORDS) {
    cleanedQuery = cleanedQuery.replace(keyword.pattern, '').trim();
  }
  
  // Clean up extra whitespace
  cleanedQuery = cleanedQuery.replace(/\s+/g, ' ').trim();
  
  return { temporal, cleanedQuery };
}

/**
 * Format a TemporalRange for display to users
 * 
 * @param range - The temporal range to format
 * @returns Human-readable string representation
 * 
 * @example
 * ```typescript
 * const range = parseTemporalQuery("yesterday");
 * formatTemporalRange(range); // "yesterday (Oct 1, 2025)"
 * ```
 */
export function formatTemporalRange(range: TemporalRange): string {
  const startStr = range.startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  const endStr = range.endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  if (startStr === endStr) {
    return `${range.description} (${startStr})`;
  }
  
  return `${range.description} (${startStr} - ${endStr})`;
}
