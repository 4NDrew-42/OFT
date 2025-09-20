/**
 * ORION-CORE Recommendations Hook
 * React hook for AI-powered product recommendations using ORION-CORE memory and RAG
 * Leverages user behavior patterns stored in ORION-CORE for personalization
 */

import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { API_BASE_URL } from '@/lib/env';

interface Recommendation {
  id: string;
  title: string;
  artist: string;
  imageUrl: string;
  price: number;
  confidence: number;
  reason: string;
  category: string;
  style: string;
  tags: string[];
  orionScore: number;
  contextType: 'similar_viewed' | 'style_match' | 'artist_preference' | 'ai_curated' | 'trending';
}

interface RecommendationOptions {
  limit?: number;
  contextType?: string;
  includeReasons?: boolean;
  updateUserProfile?: boolean;
  diversityWeight?: number;
  timeWindow?: string;
}

interface RecommendationResult {
  recommendations: Recommendation[];
  confidence: number;
  userProfile: any;
  contextUsed: string[];
  processingTime: number;
}

export const useOrionRecommendations = (enabled: boolean = true) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [lastContext, setLastContext] = useState<string>('');

  const queryClient = useQueryClient();
  const isBrowser = typeof window !== 'undefined';

  // ORION-CORE API configuration
  const AI_SERVICE_URL = API_BASE_URL;

  /**
   * Get personalized recommendations using ORION-CORE RAG
   */
  const getRecommendations = useCallback(async (
    userId: string,
    options: RecommendationOptions = {}
  ): Promise<RecommendationResult | null> => {
    if (!enabled || !userId) return null;

    setIsLoading(true);
    setError(null);

    try {
      // Call our AI service which interfaces with ORION-CORE
      const response = await fetch(`${AI_SERVICE_URL}/api/ai/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          context: options.contextType || 'general_browsing',
          limit: options.limit || 12,
          diversityWeight: options.diversityWeight || 0.3,
          timeWindow: options.timeWindow || '30d',
          includeReasons: options.includeReasons !== false,
          updateProfile: options.updateUserProfile !== false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Recommendation generation failed');
      }

      // Transform recommendations to our format
      const transformedRecs: Recommendation[] = data.recommendations.map((rec: any) => ({
        id: rec.id,
        title: rec.title,
        artist: rec.artist,
        imageUrl: rec.imageUrl,
        price: rec.price,
        confidence: rec.confidence || rec.orionScore || 0.5,
        reason: rec.reason || generateDefaultReason(rec),
        category: rec.category,
        style: rec.style,
        tags: rec.tags || [],
        orionScore: rec.orionScore || rec.confidence || 0.5,
        contextType: determineContextType(rec.reason || rec.context)
      }));

      const result: RecommendationResult = {
        recommendations: transformedRecs,
        confidence: data.confidence || calculateAverageConfidence(transformedRecs),
        userProfile: data.userProfile || {},
        contextUsed: data.contextUsed || [],
        processingTime: data.processingTime || 0
      };

      setRecommendations(transformedRecs);
      setConfidence(result.confidence);
      setLastContext(options.contextType || 'general');

      // Cache recommendations
      queryClient.setQueryData(['orion-recommendations', userId, options], result);

      return result;

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to get recommendations';
      setError(errorMessage);
      console.error('ORION recommendations error:', error);
      return null;

    } finally {
      setIsLoading(false);
    }
  }, [enabled, AI_SERVICE_URL, queryClient]);

  /**
   * Get recommendations based on specific product interaction
   */
  const getProductBasedRecommendations = useCallback(async (
    userId: string,
    productId: string,
    interactionType: 'viewed' | 'liked' | 'purchased' | 'shared',
    options: RecommendationOptions = {}
  ): Promise<RecommendationResult | null> => {
    if (!enabled) return null;

    setIsLoading(true);
    setError(null);

    try {
      // Store the interaction in ORION-CORE first
      await fetch(`${AI_SERVICE_URL}/api/ai/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          productId,
          interactionType,
          timestamp: new Date().toISOString(),
          context: options.contextType || 'product_interaction'
        })
      });

      // Get contextual recommendations based on this interaction
      const response = await fetch(`${AI_SERVICE_URL}/api/ai/recommendations/contextual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          productId,
          interactionType,
          limit: options.limit || 8,
          diversityWeight: options.diversityWeight || 0.4,
          includeReasons: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contextual recommendations');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Contextual recommendation failed');
      }

      const transformedRecs: Recommendation[] = data.recommendations.map((rec: any) => ({
        id: rec.id,
        title: rec.title,
        artist: rec.artist,
        imageUrl: rec.imageUrl,
        price: rec.price,
        confidence: rec.confidence || 0.5,
        reason: rec.reason || `Similar to ${interactionType} product`,
        category: rec.category,
        style: rec.style,
        tags: rec.tags || [],
        orionScore: rec.orionScore || rec.confidence || 0.5,
        contextType: 'similar_viewed'
      }));

      const result: RecommendationResult = {
        recommendations: transformedRecs,
        confidence: data.confidence || calculateAverageConfidence(transformedRecs),
        userProfile: data.userProfile || {},
        contextUsed: data.contextUsed || [interactionType],
        processingTime: data.processingTime || 0
      };

      setRecommendations(transformedRecs);
      setConfidence(result.confidence);
      setLastContext(`${interactionType}_${productId}`);

      return result;

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to get contextual recommendations';
      setError(errorMessage);
      console.error('ORION contextual recommendations error:', error);
      return null;

    } finally {
      setIsLoading(false);
    }
  }, [enabled, AI_SERVICE_URL]);

  /**
   * Get trending recommendations using ORION-CORE analytics
   */
  const getTrendingRecommendations = useCallback(async (
    options: RecommendationOptions = {}
  ): Promise<RecommendationResult | null> => {
    if (!enabled) return null;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/ai/recommendations/trending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          limit: options.limit || 16,
          timeWindow: options.timeWindow || '7d',
          diversityWeight: options.diversityWeight || 0.5,
          includeReasons: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trending recommendations');
      }

      const data = await response.json();

      const transformedRecs: Recommendation[] = data.recommendations.map((rec: any) => ({
        id: rec.id,
        title: rec.title,
        artist: rec.artist,
        imageUrl: rec.imageUrl,
        price: rec.price,
        confidence: rec.trendingScore || 0.7,
        reason: rec.reason || 'Trending based on community interest',
        category: rec.category,
        style: rec.style,
        tags: rec.tags || [],
        orionScore: rec.trendingScore || 0.7,
        contextType: 'trending'
      }));

      const result: RecommendationResult = {
        recommendations: transformedRecs,
        confidence: 0.8, // High confidence for trending
        userProfile: {},
        contextUsed: ['trending_analysis'],
        processingTime: data.processingTime || 0
      };

      setRecommendations(transformedRecs);
      setConfidence(result.confidence);
      setLastContext('trending');

      return result;

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to get trending recommendations';
      setError(errorMessage);
      console.error('ORION trending recommendations error:', error);
      return null;

    } finally {
      setIsLoading(false);
    }
  }, [enabled, AI_SERVICE_URL]);

  /**
   * Refresh recommendations with new context
   */
  const refreshRecommendations = useCallback(async (
    userId: string,
    newContext?: string
  ) => {
    return getRecommendations(userId, {
      contextType: newContext || lastContext,
      updateUserProfile: true,
      limit: recommendations.length || 12
    });
  }, [getRecommendations, lastContext, recommendations.length]);

  /**
   * Get cached recommendations
   */
  const getCachedRecommendations = useCallback((
    userId: string,
    options: RecommendationOptions = {}
  ) => {
    return queryClient.getQueryData(['orion-recommendations', userId, options]) as RecommendationResult | undefined;
  }, [queryClient]);

  /**
   * Prefetch recommendations for performance
   */
  const prefetchRecommendations = useCallback((
    userId: string,
    options: RecommendationOptions = {}
  ) => {
    if (!enabled) return;

    queryClient.prefetchQuery({
      queryKey: ['orion-recommendations', userId, options],
      queryFn: () => getRecommendations(userId, options),
      staleTime: 10 * 60 * 1000 // 10 minutes
    });
  }, [enabled, getRecommendations, queryClient]);

  /**
   * Clear recommendations
   */
  const clearRecommendations = useCallback(() => {
    setRecommendations([]);
    setConfidence(0);
    setLastContext('');
    setError(null);
  }, []);

  // Auto-refresh recommendations periodically for active users
  useEffect(() => {
    if (!enabled || recommendations.length === 0 || !isBrowser) return;

    const refreshInterval = window.setInterval(() => {
      const storedUserId = window.localStorage?.getItem('userId');
      if (storedUserId && lastContext) {
        refreshRecommendations(storedUserId);
      }
    }, 15 * 60 * 1000); // 15 minutes

    return () => window.clearInterval(refreshInterval);
  }, [enabled, isBrowser, lastContext, recommendations.length, refreshRecommendations]);

  return {
    // State
    isLoading,
    error,
    recommendations,
    confidence,
    lastContext,

    // Actions
    getRecommendations,
    getProductBasedRecommendations,
    getTrendingRecommendations,
    refreshRecommendations,
    clearRecommendations,

    // Utilities
    getCachedRecommendations,
    prefetchRecommendations,

    // Computed
    hasRecommendations: recommendations.length > 0,
    highConfidenceRecommendations: recommendations.filter(r => r.confidence > 0.7),
    recommendationsByContext: groupRecommendationsByContext(recommendations)
  };
};

/**
 * Generate default reason if none provided
 */
function generateDefaultReason(rec: any): string {
  const reasons = [];

  if (rec.category) reasons.push(`Popular in ${rec.category}`);
  if (rec.style) reasons.push(`${rec.style} style`);
  if (rec.orionScore > 0.8) reasons.push('Highly recommended by AI');

  return reasons.length > 0 ? reasons.join(', ') : 'Recommended for you';
}

/**
 * Determine context type from reason string
 */
function determineContextType(reason: string): Recommendation['contextType'] {
  if (reason.includes('similar') || reason.includes('viewed')) return 'similar_viewed';
  if (reason.includes('style')) return 'style_match';
  if (reason.includes('artist')) return 'artist_preference';
  if (reason.includes('trending') || reason.includes('popular')) return 'trending';
  return 'ai_curated';
}

/**
 * Calculate average confidence across recommendations
 */
function calculateAverageConfidence(recommendations: Recommendation[]): number {
  if (recommendations.length === 0) return 0;

  const total = recommendations.reduce((sum, rec) => sum + rec.confidence, 0);
  return total / recommendations.length;
}

/**
 * Group recommendations by context type
 */
function groupRecommendationsByContext(recommendations: Recommendation[]): Record<string, Recommendation[]> {
  return recommendations.reduce((groups, rec) => {
    const context = rec.contextType;
    if (!groups[context]) groups[context] = [];
    groups[context].push(rec);
    return groups;
  }, {} as Record<string, Recommendation[]>);
}

export default useOrionRecommendations;
