/**
 * ORION-CORE Analytics Hook
 * React hook for user behavior analytics and insights using ORION-CORE memory system
 * Tracks user interactions and provides AI-powered insights
 */

import { useState, useCallback, useEffect } from 'react';

import { API_BASE_URL, ORION_ANALYTICS_ENABLED } from '@/lib/env';

let hasLoggedMissingAnalyticsEndpoint = false;

const logMissingAnalyticsEndpoint = (context: string) => {
  if (!hasLoggedMissingAnalyticsEndpoint) {
    console.info(`ORION analytics endpoint unavailable (404) – ${context}`);
    hasLoggedMissingAnalyticsEndpoint = true;
  }
};

interface UserInteraction {
  id: string;
  userId: string;
  type: string;
  productId?: string;
  timestamp: number;
  data: Record<string, any>;
  sessionId: string;
  deviceInfo?: Record<string, any>;
}

interface Analytics {
  viewCount: number;
  interactionCount: number;
  sessionDuration: number;
  averageEngagement: number;
  topCategories: string[];
  userPreferences: Record<string, any>;
  behaviorScore: number;
  lastActive: number;
}

interface InsightOptions {
  includeStyleAnalysis?: boolean;
  includeColorPreferences?: boolean;
  includeSimilarityReasons?: boolean;
  timeWindow?: string;
  aggregationLevel?: 'user' | 'product' | 'category';
}

interface Insight {
  type: string;
  confidence: number;
  description: string;
  data: Record<string, any>;
  recommendations: string[];
}

// Simple per-session rate limiting and circuit breaker to prevent request floods
let lastSendAt = 0;
let failCount = 0;
let suppressUntil = 0; // epoch ms
let hasWarnedSuppressed = false;

const MIN_INTERVAL_MS = 2000;      // minimum time between sends
const BREAKER_FAILS = 3;           // failures before suppression
const BREAKER_WINDOW_MS = 60000;   // 1 minute failure window (simplified)
const SUPPRESS_MS = 10 * 60 * 1000; // 10 minutes suppression

export const useOrionAnalytics = (enabled: boolean = ORION_ANALYTICS_ENABLED) => {
  const [isTracking, setIsTracking] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const [sessionStart] = useState(() => Date.now());
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);

  // ORION-CORE API configuration
  const AI_SERVICE_URL = API_BASE_URL;
  const isBrowser = typeof window !== 'undefined';

  const getUserId = useCallback(() => {
    if (!isBrowser) return 'anonymous';
    try {
      return window.localStorage.getItem('userId') || 'anonymous';
    } catch (error) {
      console.error('Failed to read userId from localStorage:', error);
      return 'anonymous';
    }
  }, [isBrowser]);

  const getDeviceInfo = useCallback(() => {
    if (!isBrowser) return undefined;
    try {
      return {
        userAgent: window.navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    } catch (error) {
      console.error('Failed to read device info:', error);
      return undefined;
    }
  }, [isBrowser]);

  /**
   * Track user interaction in ORION-CORE memory
   */
  const trackInteraction = useCallback(async (
    type: string,
    data: Record<string, any>
  ): Promise<boolean> => {
    if (!enabled) return false;

    // Global suppression (circuit breaker)
    const now = Date.now();
    if (suppressUntil && now < suppressUntil) {
      return false;
    }

    // Simple client-side rate limiting to avoid flooding the network
    if (now - lastSendAt < MIN_INTERVAL_MS) {
      return false;
    }

    setIsTracking(true);

    try {
      const deviceInfo = getDeviceInfo();

      const interaction: UserInteraction = {
        id: `interaction_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        userId: getUserId(),
        type,
        timestamp: Date.now(),
        data,
        sessionId,
      };

      if (deviceInfo) {
        interaction.deviceInfo = deviceInfo;
      }

      // Store interaction in ORION-CORE memory
      const response = await fetch(`${AI_SERVICE_URL}/api/ai/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(interaction)
      });

      if (response.status === 404) {
        logMissingAnalyticsEndpoint('skipping interaction tracking until service is ready.');
        return false;
      }

      if (!response.ok) {
        throw new Error('Failed to track interaction');
      }

      const result = await response.json();

      // Success path: reset failure counters and update last send time
      failCount = 0;
      lastSendAt = Date.now();
      hasWarnedSuppressed = false;

      // Update local analytics cache
      if (result.analytics) {
        setAnalytics(result.analytics);
      }

      return true;

    } catch (error) {
      // Failure path: increment fails and possibly enable suppression
      failCount += 1;
      if (failCount >= BREAKER_FAILS) {
        suppressUntil = Date.now() + SUPPRESS_MS;
        if (!hasWarnedSuppressed) {
          console.warn('ORION analytics suppressed for stability (temporary). Backend unavailable or rate-limited.');
          hasWarnedSuppressed = true;
        }
      }
      // Do not spam the console with every error
      if (failCount === 1) {
        console.info('ORION analytics first failure recorded; further failures temporarily suppressed in logs.');
      }
      return false;

    } finally {
      setIsTracking(false);
    }
  }, [AI_SERVICE_URL, enabled, getDeviceInfo, getUserId, sessionId]);

  /**
   * Track product view with enhanced context
   */
  const trackView = useCallback(async (
    productId: string,
    context: Record<string, any> = {}
  ): Promise<boolean> => {
    return trackInteraction('product_view', {
      productId,
      context,
      timestamp: Date.now(),
      viewDuration: 0 // Will be updated when view ends
    });
  }, [trackInteraction]);

  /**
   * Track search behavior
   */
  const trackSearch = useCallback(async (
    query: string,
    results: any[],
    options: Record<string, any> = {}
  ): Promise<boolean> => {
    return trackInteraction('search', {
      query,
      resultCount: results.length,
      resultIds: results.map(r => r.id).slice(0, 10), // First 10 results
      searchType: options.type || 'text',
      filters: options.filters || {},
      processingTime: options.processingTime || 0
    });
  }, [trackInteraction]);

  /**
   * Get AI-powered insights from ORION-CORE
   */
  const getInsights = useCallback(async (
    targetId: string,
    options: InsightOptions = {}
  ): Promise<Insight[]> => {
    if (!enabled) return [];

    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/ai/analytics/insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetId,
          userId: getUserId(),
          sessionId,
          options
        })
      });

      if (response.status === 404) {
        logMissingAnalyticsEndpoint('insights API not yet ready.');
        return [];
      }

      if (!response.ok) {
        throw new Error('Failed to get insights');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Insights generation failed');
      }

      const processedInsights: Insight[] = data.insights.map((insight: any) => ({
        type: insight.type,
        confidence: insight.confidence || 0.5,
        description: insight.description || 'AI-generated insight',
        data: insight.data || {},
        recommendations: insight.recommendations || []
      }));

      setInsights(processedInsights);
      return processedInsights;

    } catch (error) {
      console.error('ORION insights error:', error);
      return [];
    }
  }, [AI_SERVICE_URL, enabled, getUserId, sessionId]);

  /**
   * Get user analytics from ORION-CORE memory
   */
  const getUserAnalytics = useCallback(async (
    userId?: string
  ): Promise<Analytics | null> => {
    if (!enabled) return null;

    try {
      const targetUserId = userId || getUserId();

      const response = await fetch(`${AI_SERVICE_URL}/api/ai/analytics/user/${targetUserId}`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.status === 404) {
        logMissingAnalyticsEndpoint('user analytics API not yet ready.');
        return null;
      }

      if (!response.ok) {
        throw new Error('Failed to get user analytics');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Analytics retrieval failed');
      }

      const userAnalytics: Analytics = {
        viewCount: data.analytics.viewCount || 0,
        interactionCount: data.analytics.interactionCount || 0,
        sessionDuration: data.analytics.sessionDuration || 0,
        averageEngagement: data.analytics.averageEngagement || 0,
        topCategories: data.analytics.topCategories || [],
        userPreferences: data.analytics.userPreferences || {},
        behaviorScore: data.analytics.behaviorScore || 0.5,
        lastActive: data.analytics.lastActive || Date.now()
      };

      setAnalytics(userAnalytics);
      return userAnalytics;

    } catch (error) {
      console.error('ORION user analytics error:', error);
      return null;
    }
  }, [AI_SERVICE_URL, enabled, getUserId]);

  /**
   * Get product analytics and engagement metrics
   */
  const getProductAnalytics = useCallback(async (
    productId: string
  ): Promise<Record<string, any> | null> => {
    if (!enabled) return null;

    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/ai/analytics/product/${productId}`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.status === 404) {
        logMissingAnalyticsEndpoint('product analytics API not yet ready.');
        return null;
      }

      if (!response.ok) {
        throw new Error('Failed to get product analytics');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Product analytics retrieval failed');
      }

      return data.analytics;

    } catch (error) {
      console.error('ORION product analytics error:', error);
      return null;
    }
  }, [enabled, AI_SERVICE_URL]);

  /**
   * Generate real-time behavioral insights
   */
  const generateBehavioralInsights = useCallback(async (): Promise<Insight[]> => {
    if (!enabled) return [];

    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/ai/analytics/behavioral-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: getUserId(),
          sessionId,
          timeWindow: '1h' // Real-time insights
        })
      });

      if (response.status === 404) {
        logMissingAnalyticsEndpoint('behavioral insights API not yet ready.');
        return [];
      }

      if (!response.ok) {
        throw new Error('Failed to generate behavioral insights');
      }

      const data = await response.json();

      const behavioralInsights: Insight[] = data.insights.map((insight: any) => ({
        type: insight.type || 'behavioral',
        confidence: insight.confidence || 0.6,
        description: insight.description || 'Real-time behavioral pattern',
        data: insight.data || {},
        recommendations: insight.recommendations || []
      }));

      return behavioralInsights;

    } catch (error) {
      console.error('ORION behavioral insights error:', error);
      return [];
    }
  }, [AI_SERVICE_URL, enabled, getUserId, sessionId]);

  /**
   * Batch track multiple interactions for performance
   */
  const batchTrackInteractions = useCallback(async (
    interactions: Array<{ type: string; data: Record<string, any> }>
  ): Promise<boolean> => {
    if (!enabled || interactions.length === 0) return false;

    try {
      const batchInteractions = interactions.map(interaction => ({
        id: `interaction_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        userId: getUserId(),
        type: interaction.type,
        timestamp: Date.now(),
        data: interaction.data,
        sessionId,
      }));

      const response = await fetch(`${AI_SERVICE_URL}/api/ai/analytics/batch-track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interactions: batchInteractions })
      });

      if (response.status === 404) {
        logMissingAnalyticsEndpoint('batch tracking disabled until service is ready.');
        return false;
      }

      if (!response.ok) {
        throw new Error('Failed to batch track interactions');
      }

      return true;

    } catch (error) {
      console.error('ORION batch tracking error:', error);
      return false;
    }
  }, [AI_SERVICE_URL, enabled, getUserId, sessionId]);

  // Auto-load user analytics on hook initialization
  useEffect(() => {
    if (enabled) {
      getUserAnalytics();
    }
  }, [enabled, getUserAnalytics]);

  // Session heartbeat to track session duration
  useEffect(() => {
    if (!enabled || !isBrowser) return;

    const heartbeatInterval = window.setInterval(() => {
      trackInteraction('session_heartbeat', {
        sessionDuration: Date.now() - sessionStart,
        pageVisibility: document.visibilityState,
        timestamp: Date.now(),
      });
    }, 30000); // Every 30 seconds

    return () => window.clearInterval(heartbeatInterval);
  }, [enabled, isBrowser, sessionStart, trackInteraction]);

  return {
    // State
    isTracking,
    analytics,
    insights,
    sessionId,

    // Core tracking functions
    trackInteraction,
    trackView,
    trackSearch,
    batchTrackInteractions,

    // Analytics retrieval
    getUserAnalytics,
    getProductAnalytics,
    getInsights,
    generateBehavioralInsights,

    // Computed values
    hasAnalytics: analytics !== null,
    hasInsights: insights.length > 0,
    engagementLevel: analytics ? analytics.behaviorScore : 0,
    isHighEngagement: analytics ? analytics.behaviorScore > 0.7 : false
  };
};

export default useOrionAnalytics;
