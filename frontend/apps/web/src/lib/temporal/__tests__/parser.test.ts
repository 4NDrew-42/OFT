/**
 * Unit Tests for Temporal Query Parser
 * 
 * Tests all temporal patterns, edge cases, and error handling
 */

import { 
  parseTemporalQuery, 
  hasTemporalKeywords, 
  extractTemporalContext,
  formatTemporalRange,
  type TemporalRange 
} from '../parser';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

describe('Temporal Query Parser', () => {
  describe('parseTemporalQuery', () => {
    describe('Yesterday patterns', () => {
      it('should parse "yesterday" correctly', () => {
        const result = parseTemporalQuery("What did we do yesterday?");
        expect(result).not.toBeNull();
        expect(result?.description).toBe("yesterday");
        expect(result?.confidence).toBe(1.0);
        
        const yesterday = subDays(new Date(), 1);
        expect(result?.startDate.getDate()).toBe(startOfDay(yesterday).getDate());
        expect(result?.endDate.getDate()).toBe(endOfDay(yesterday).getDate());
      });

      it('should parse "last night" as yesterday', () => {
        const result = parseTemporalQuery("What happened last night?");
        expect(result).not.toBeNull();
        expect(result?.description).toBe("yesterday");
        expect(result?.confidence).toBe(1.0);
      });
    });

    describe('Today patterns', () => {
      it('should parse "today" correctly', () => {
        const result = parseTemporalQuery("What did we discuss today?");
        expect(result).not.toBeNull();
        expect(result?.description).toBe("today");
        expect(result?.confidence).toBe(1.0);
        
        const now = new Date();
        expect(result?.startDate.getDate()).toBe(startOfDay(now).getDate());
        expect(result?.endDate.getTime()).toBeLessThanOrEqual(now.getTime());
      });

      it('should parse "this morning" as today', () => {
        const result = parseTemporalQuery("What did we talk about this morning?");
        expect(result).not.toBeNull();
        expect(result?.description).toBe("today");
      });

      it('should parse "this afternoon" as today', () => {
        const result = parseTemporalQuery("Show me this afternoon's work");
        expect(result).not.toBeNull();
        expect(result?.description).toBe("today");
      });

      it('should parse "this evening" as today', () => {
        const result = parseTemporalQuery("What happened this evening?");
        expect(result).not.toBeNull();
        expect(result?.description).toBe("today");
      });
    });

    describe('Week patterns', () => {
      it('should parse "last week" correctly', () => {
        const result = parseTemporalQuery("Show me last week's conversations");
        expect(result).not.toBeNull();
        expect(result?.description).toBe("last week");
        expect(result?.confidence).toBe(0.9);
        
        const lastWeek = subWeeks(new Date(), 1);
        const expectedStart = startOfWeek(lastWeek, { weekStartsOn: 1 });
        const expectedEnd = endOfWeek(lastWeek, { weekStartsOn: 1 });
        
        expect(result?.startDate.getDate()).toBe(expectedStart.getDate());
        expect(result?.endDate.getDate()).toBe(expectedEnd.getDate());
      });

      it('should parse "this week" correctly', () => {
        const result = parseTemporalQuery("What have we done this week?");
        expect(result).not.toBeNull();
        expect(result?.description).toBe("this week");
        expect(result?.confidence).toBe(1.0);
      });
    });

    describe('Month patterns', () => {
      it('should parse "last month" correctly', () => {
        const result = parseTemporalQuery("Show me last month's activity");
        expect(result).not.toBeNull();
        expect(result?.description).toBe("last month");
        expect(result?.confidence).toBe(0.8);
      });

      it('should parse "this month" correctly', () => {
        const result = parseTemporalQuery("What happened this month?");
        expect(result).not.toBeNull();
        expect(result?.description).toBe("this month");
        expect(result?.confidence).toBe(1.0);
      });
    });

    describe('Recently patterns', () => {
      it('should parse "recently" as last 7 days', () => {
        const result = parseTemporalQuery("What have we discussed recently?");
        expect(result).not.toBeNull();
        expect(result?.description).toBe("recently (last 7 days)");
        expect(result?.confidence).toBe(0.7);
        
        const expectedStart = subDays(new Date(), 7);
        expect(result?.startDate.getDate()).toBe(expectedStart.getDate());
      });

      it('should parse "lately" as last 7 days', () => {
        const result = parseTemporalQuery("What's been happening lately?");
        expect(result).not.toBeNull();
        expect(result?.description).toBe("recently (last 7 days)");
      });

      it('should parse "past few days" as last 7 days', () => {
        const result = parseTemporalQuery("Show me the past few days");
        expect(result).not.toBeNull();
        expect(result?.description).toBe("recently (last 7 days)");
      });
    });

    describe('Numeric patterns', () => {
      it('should parse "last 3 days" correctly', () => {
        const result = parseTemporalQuery("Show me conversations from last 3 days");
        expect(result).not.toBeNull();
        expect(result?.description).toBe("last 3 days");
        expect(result?.confidence).toBe(1.0);
        
        const expectedStart = subDays(new Date(), 3);
        expect(result?.startDate.getDate()).toBe(expectedStart.getDate());
      });

      it('should parse "2 days ago" correctly', () => {
        const result = parseTemporalQuery("What happened 2 days ago?");
        expect(result).not.toBeNull();
        expect(result?.description).toBe("2 days ago");
        expect(result?.confidence).toBe(1.0);
        
        const targetDay = subDays(new Date(), 2);
        expect(result?.startDate.getDate()).toBe(startOfDay(targetDay).getDate());
        expect(result?.endDate.getDate()).toBe(endOfDay(targetDay).getDate());
      });

      it('should parse "last 2 weeks" correctly', () => {
        const result = parseTemporalQuery("Show me last 2 weeks");
        expect(result).not.toBeNull();
        expect(result?.description).toBe("last 2 weeks");
        expect(result?.confidence).toBe(0.9);
      });
    });

    describe('Non-temporal queries', () => {
      it('should return null for non-temporal queries', () => {
        const result = parseTemporalQuery("What is the capital of France?");
        expect(result).toBeNull();
      });

      it('should return null for technical questions', () => {
        const result = parseTemporalQuery("How do I implement a binary search tree?");
        expect(result).toBeNull();
      });

      it('should return null for empty strings', () => {
        const result = parseTemporalQuery("");
        expect(result).toBeNull();
      });
    });

    describe('Edge cases', () => {
      it('should handle queries with multiple temporal keywords (first match wins)', () => {
        const result = parseTemporalQuery("What did we do yesterday and last week?");
        expect(result).not.toBeNull();
        expect(result?.description).toBe("yesterday");
      });

      it('should be case-insensitive', () => {
        const result1 = parseTemporalQuery("YESTERDAY");
        const result2 = parseTemporalQuery("Yesterday");
        const result3 = parseTemporalQuery("yesterday");
        
        expect(result1?.description).toBe("yesterday");
        expect(result2?.description).toBe("yesterday");
        expect(result3?.description).toBe("yesterday");
      });

      it('should handle queries with extra whitespace', () => {
        const result = parseTemporalQuery("  What   did   we   do   yesterday?  ");
        expect(result).not.toBeNull();
        expect(result?.description).toBe("yesterday");
      });
    });
  });

  describe('hasTemporalKeywords', () => {
    it('should return true for temporal queries', () => {
      expect(hasTemporalKeywords("What did we do yesterday?")).toBe(true);
      expect(hasTemporalKeywords("Show me last week's work")).toBe(true);
      expect(hasTemporalKeywords("What happened recently?")).toBe(true);
    });

    it('should return false for non-temporal queries', () => {
      expect(hasTemporalKeywords("What is AI?")).toBe(false);
      expect(hasTemporalKeywords("How do I code in Python?")).toBe(false);
      expect(hasTemporalKeywords("")).toBe(false);
    });
  });

  describe('extractTemporalContext', () => {
    it('should extract temporal context and clean query', () => {
      const result = extractTemporalContext("What did we do yesterday?");
      
      expect(result.temporal).not.toBeNull();
      expect(result.temporal?.description).toBe("yesterday");
      expect(result.cleanedQuery).toBe("What did we do?");
    });

    it('should handle queries with temporal keywords in the middle', () => {
      const result = extractTemporalContext("Show me yesterday's conversations");
      
      expect(result.temporal).not.toBeNull();
      expect(result.cleanedQuery).not.toContain("yesterday");
    });

    it('should return original query if no temporal keywords', () => {
      const originalQuery = "What is the capital of France?";
      const result = extractTemporalContext(originalQuery);
      
      expect(result.temporal).toBeNull();
      expect(result.cleanedQuery).toBe(originalQuery);
    });

    it('should clean up extra whitespace', () => {
      const result = extractTemporalContext("What   did   we   do   yesterday?");
      
      expect(result.cleanedQuery).toBe("What did we do?");
      expect(result.cleanedQuery).not.toMatch(/\s{2,}/);
    });
  });

  describe('formatTemporalRange', () => {
    it('should format single-day ranges correctly', () => {
      const yesterday = subDays(new Date(), 1);
      const range: TemporalRange = {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday),
        description: "yesterday",
        confidence: 1.0
      };
      
      const formatted = formatTemporalRange(range);
      expect(formatted).toContain("yesterday");
      expect(formatted).toMatch(/\w+ \d+, \d{4}/); // e.g., "Oct 1, 2025"
    });

    it('should format multi-day ranges correctly', () => {
      const lastWeek = subWeeks(new Date(), 1);
      const range: TemporalRange = {
        startDate: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        endDate: endOfWeek(lastWeek, { weekStartsOn: 1 }),
        description: "last week",
        confidence: 0.9
      };
      
      const formatted = formatTemporalRange(range);
      expect(formatted).toContain("last week");
      expect(formatted).toContain("-"); // Should have date range separator
    });
  });

  describe('Confidence scoring', () => {
    it('should assign high confidence (1.0) to exact matches', () => {
      const queries = [
        "yesterday",
        "today",
        "this week",
        "this month",
        "last 3 days",
        "2 days ago"
      ];
      
      queries.forEach(query => {
        const result = parseTemporalQuery(query);
        expect(result?.confidence).toBe(1.0);
      });
    });

    it('should assign medium confidence (0.9) to week-based queries', () => {
      const result = parseTemporalQuery("last week");
      expect(result?.confidence).toBe(0.9);
    });

    it('should assign lower confidence (0.7-0.8) to fuzzy matches', () => {
      const recentlyResult = parseTemporalQuery("recently");
      expect(recentlyResult?.confidence).toBe(0.7);
      
      const lastMonthResult = parseTemporalQuery("last month");
      expect(lastMonthResult?.confidence).toBe(0.8);
    });
  });
});
