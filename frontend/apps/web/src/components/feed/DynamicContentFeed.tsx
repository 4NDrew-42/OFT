/**
 * Dynamic Content Feed Component
 * AI-powered infinite scroll feed using ORION-CORE for intelligent content curation
 * Combines multiple content types with personalized recommendations and real-time updates
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Zap, TrendingUp, Clock, Eye, Heart, Share2 } from 'lucide-react';

// ORION-enhanced components
import { OrionEnhancedProductCard } from './OrionEnhancedProductCard';
import { OrionVectorSearch } from '../search/OrionVectorSearch';

// ORION-CORE integration hooks
import { useOrionRecommendations } from '@/hooks/useOrionRecommendations';
import { useOrionSimilarity } from '@/hooks/useOrionSimilarity';
import { useOrionAnalytics } from '@/hooks/useOrionAnalytics';

// Environment configuration
import { WS_BASE_URL } from '@/lib/env';

interface ContentItem {
  id: string;
  type: 'product' | 'video' | 'story' | 'trending' | 'ai_curated';
  data: any;
  timestamp: number;
  priority: number;
  aiScore: number;
  engagement: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
  };
}

interface FeedSection {
  id: string;
  title: string;
  type: string;
  items: ContentItem[];
  isLoading: boolean;
  hasMore: boolean;
}

interface DynamicContentFeedProps {
  userId?: string;
  enablePersonalization?: boolean;
  enableRealTimeUpdates?: boolean;
  contentTypes?: string[];
  maxItemsPerSection?: number;
  className?: string;
}

export const DynamicContentFeed: React.FC<DynamicContentFeedProps> = ({
  userId,
  enablePersonalization = true,
  enableRealTimeUpdates = true,
  contentTypes = ['product', 'trending', 'ai_curated'],
  maxItemsPerSection = 20,
  className = ""
}) => {
  const [feedSections, setFeedSections] = useState<FeedSection[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // Refs for managing state
  const wsRef = useRef<WebSocket | null>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scroll
  const { ref: loadMoreRef, inView: shouldLoadMore } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });

  // ORION-CORE hooks
  const {
    getRecommendations,
    getTrendingRecommendations,
    recommendations,
    confidence: recommendationConfidence
  } = useOrionRecommendations(enablePersonalization);

  const { findSimilar, similarProducts } = useOrionSimilarity();

  const {
    trackInteraction,
    getUserAnalytics,
    analytics,
    generateBehavioralInsights
  } = useOrionAnalytics();

  /**
   * Initialize feed with ORION-CORE personalized content
   */
  const initializeFeed = useCallback(async () => {
    setIsInitializing(true);

    try {
      const sections: FeedSection[] = [];

      // 1. AI-Curated Personal Recommendations
      if (enablePersonalization && userId) {
        const personalRecs = await getRecommendations(userId, {
          limit: maxItemsPerSection,
          contextType: 'feed_personalization',
          updateUserProfile: true,
          diversityWeight: 0.4
        });

        if (personalRecs?.recommendations.length) {
          sections.push({
            id: 'personal-recommendations',
            title: '🤖 AI Curated For You',
            type: 'ai_curated',
            items: personalRecs.recommendations.map(rec => ({
              id: rec.id,
              type: 'product' as const,
              data: rec,
              timestamp: Date.now(),
              priority: rec.confidence * 100,
              aiScore: rec.orionScore,
              engagement: {
                views: Math.floor(Math.random() * 1000),
                likes: Math.floor(Math.random() * 100),
                shares: Math.floor(Math.random() * 50),
                comments: Math.floor(Math.random() * 20)
              }
            })),
            isLoading: false,
            hasMore: true
          });
        }
      }

      // 2. Trending Content
      const trending = await getTrendingRecommendations({
        limit: maxItemsPerSection,
        timeWindow: '24h',
        diversityWeight: 0.6
      });

      if (trending?.recommendations.length) {
        sections.push({
          id: 'trending',
          title: '🔥 Trending Now',
          type: 'trending',
          items: trending.recommendations.map(rec => ({
            id: rec.id,
            type: 'product' as const,
            data: rec,
            timestamp: Date.now(),
            priority: rec.orionScore * 100,
            aiScore: rec.orionScore,
            engagement: {
              views: Math.floor(Math.random() * 5000),
              likes: Math.floor(Math.random() * 500),
              shares: Math.floor(Math.random() * 200),
              comments: Math.floor(Math.random() * 100)
            }
          })),
          isLoading: false,
          hasMore: true
        });
      }

      // 3. Recent Activity Based Recommendations
      if (analytics?.topCategories.length) {
        const categoryRecs = await getRecommendations(userId || 'anonymous', {
          limit: Math.floor(maxItemsPerSection * 0.6),
          contextType: 'category_preference',
          diversityWeight: 0.3
        });

        if (categoryRecs?.recommendations.length) {
          sections.push({
            id: 'category-based',
            title: `✨ More ${analytics.topCategories[0]}`,
            type: 'category_based',
            items: categoryRecs.recommendations.map(rec => ({
              id: rec.id,
              type: 'product' as const,
              data: rec,
              timestamp: Date.now(),
              priority: rec.confidence * 80,
              aiScore: rec.orionScore,
              engagement: {
                views: Math.floor(Math.random() * 2000),
                likes: Math.floor(Math.random() * 200),
                shares: Math.floor(Math.random() * 80),
                comments: Math.floor(Math.random() * 40)
              }
            })),
            isLoading: false,
            hasMore: true
          });
        }
      }

      setFeedSections(sections);

      // Track feed initialization
      await trackInteraction('feed_initialized', {
        sectionsCount: sections.length,
        totalItems: sections.reduce((sum, section) => sum + section.items.length, 0),
        personalizationEnabled: enablePersonalization,
        userId: userId || 'anonymous'
      });

    } catch (error) {
      console.error('Feed initialization error:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [userId, enablePersonalization, maxItemsPerSection, getRecommendations, getTrendingRecommendations, analytics, trackInteraction]);

  /**
   * Load more content for infinite scroll
   */
  const loadMoreContent = useCallback(async () => {
    if (isInitializing || refreshing) return;

    setCurrentPage(prev => prev + 1);

    try {
      // Generate behavioral insights for smarter content loading
      const insights = await generateBehavioralInsights();

      // Load more personalized content based on insights
      if (insights.length > 0 && userId) {
        const moreRecs = await getRecommendations(userId, {
          limit: 10,
          contextType: 'infinite_scroll',
          diversityWeight: 0.5
        });

        if (moreRecs?.recommendations.length) {
          setFeedSections(prev => {
            const updated = [...prev];
            const personalSection = updated.find(s => s.id === 'personal-recommendations');

            if (personalSection) {
              const newItems = moreRecs.recommendations.map(rec => ({
                id: rec.id,
                type: 'product' as const,
                data: rec,
                timestamp: Date.now(),
                priority: rec.confidence * 100,
                aiScore: rec.orionScore,
                engagement: {
                  views: Math.floor(Math.random() * 1000),
                  likes: Math.floor(Math.random() * 100),
                  shares: Math.floor(Math.random() * 50),
                  comments: Math.floor(Math.random() * 20)
                }
              }));

              personalSection.items = [...personalSection.items, ...newItems];
            }

            return updated;
          });
        }
      }

      // Track infinite scroll behavior
      await trackInteraction('infinite_scroll_load', {
        page: currentPage + 1,
        timestamp: Date.now(),
        insightsCount: insights.length
      });

    } catch (error) {
      console.error('Load more content error:', error);
    }
  }, [isInitializing, refreshing, currentPage, generateBehavioralInsights, userId, getRecommendations, trackInteraction]);

  /**
   * Refresh feed with new ORION insights
   */
  const refreshFeed = useCallback(async () => {
    setRefreshing(true);

    try {
      // Get fresh insights and update feed
      await initializeFeed();

      // Track refresh action
      await trackInteraction('feed_refresh', {
        timestamp: Date.now(),
        method: 'manual'
      });

    } catch (error) {
      console.error('Feed refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [initializeFeed, trackInteraction]);

  /**
   * Handle product interaction from cards
   */
  const handleProductInteraction = useCallback(async (type: string, data: any) => {
    // Track the interaction
    await trackInteraction(`feed_product_${type}`, {
      productId: data.productId,
      feedPosition: data.position,
      sectionType: data.sectionType,
      timestamp: Date.now()
    });

    // If it's a like, get similar products for dynamic injection
    if (type === 'like' && data.liked) {
      const similar = await findSimilar(data.productId, {
        limit: 3,
        threshold: 0.8,
        includeReasonings: true
      });

      if (similar?.products.length) {
        // Inject similar products into feed
        setFeedSections(prev => {
          const updated = [...prev];
          const personalSection = updated.find(s => s.id === 'personal-recommendations');

          if (personalSection) {
            const similarItems = similar.products.map(product => ({
              id: `similar_${product.id}`,
              type: 'product' as const,
              data: {
                ...product,
                orionScore: product.similarity,
                contextType: 'similar_liked'
              },
              timestamp: Date.now(),
              priority: product.similarity * 100,
              aiScore: product.similarity,
              engagement: {
                views: Math.floor(Math.random() * 500),
                likes: Math.floor(Math.random() * 50),
                shares: Math.floor(Math.random() * 25),
                comments: Math.floor(Math.random() * 10)
              }
            }));

            // Insert similar items after the liked item
            const likedIndex = personalSection.items.findIndex(item => item.id === data.productId);
            if (likedIndex !== -1) {
              personalSection.items.splice(likedIndex + 1, 0, ...similarItems);
            }
          }

          return updated;
        });
      }
    }
  }, [trackInteraction, findSimilar]);

  /**
   * Setup WebSocket for real-time updates
   */
  useEffect(() => {
    if (!enableRealTimeUpdates) return;

    const ws = new WebSocket(`${WS_BASE_URL}?userId=${userId || 'anonymous'}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);

        if (update.type === 'new_trending' || update.type === 'personalized_update') {
          // Real-time content injection
          setFeedSections(prev => {
            const updated = [...prev];
            const targetSection = updated.find(s =>
              s.type === (update.type === 'new_trending' ? 'trending' : 'ai_curated')
            );

            if (targetSection && update.content) {
              const newItem: ContentItem = {
                id: update.content.id,
                type: update.content.type,
                data: update.content.data,
                timestamp: Date.now(),
                priority: update.content.priority || 50,
                aiScore: update.content.aiScore || 0.5,
                engagement: update.content.engagement || {
                  views: 0, likes: 0, shares: 0, comments: 0
                }
              };

              targetSection.items.unshift(newItem);

              // Limit section size
              if (targetSection.items.length > maxItemsPerSection * 1.5) {
                targetSection.items = targetSection.items.slice(0, maxItemsPerSection);
              }
            }

            return updated;
          });
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [enableRealTimeUpdates, userId, maxItemsPerSection]);

  // Initialize feed on mount
  useEffect(() => {
    initializeFeed();
  }, [initializeFeed]);

  // Load more content when in view
  useEffect(() => {
    if (shouldLoadMore && !isInitializing) {
      loadMoreContent();
    }
  }, [shouldLoadMore, isInitializing, loadMoreContent]);

  return (
    <div className={`w-full max-w-6xl mx-auto ${className}`}>
      {/* Search Integration */}
      <div className="mb-8">
        <OrionVectorSearch
          onResultSelect={(result) => {
            // Handle search result selection
            handleProductInteraction('search_select', {
              productId: result.id,
              similarity: result.similarity
            });
          }}
          enableImageSearch
          enableVoiceSearch
          enableFilters
        />
      </div>

      {/* Feed Stats */}
      {analytics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 text-center">
            <Eye className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{analytics.viewCount}</div>
            <div className="text-sm text-gray-500">Views</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 text-center">
            <Heart className="w-6 h-6 mx-auto mb-2 text-red-500" />
            <div className="text-2xl font-bold">{analytics.interactionCount}</div>
            <div className="text-sm text-gray-500">Interactions</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">{(analytics.behaviorScore * 100).toFixed(0)}%</div>
            <div className="text-sm text-gray-500">Engagement</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 text-center">
            <Zap className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-bold">{recommendationConfidence.toFixed(1)}</div>
            <div className="text-sm text-gray-500">AI Confidence</div>
          </div>
        </motion.div>
      )}

      {/* Feed Sections */}
      <div ref={feedContainerRef} className="space-y-8">
        {isInitializing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 mx-auto mb-4"
            >
              <Zap className="w-full h-full text-blue-500" />
            </motion.div>
            <h2 className="text-xl font-semibold mb-2">AI Curating Your Feed</h2>
            <p className="text-gray-600">Using ORION-CORE to personalize your experience...</p>
          </motion.div>
        ) : (
          feedSections.map((section, sectionIndex) => (
            <motion.section
              key={section.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIndex * 0.2 }}
              className="space-y-4"
            >
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{section.title}</h2>
                <button
                  onClick={refreshFeed}
                  disabled={refreshing}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {/* Section Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {section.items.map((item, itemIndex) => (
                    <OrionEnhancedProductCard
                      key={item.id}
                      product={item.data}
                      index={itemIndex}
                      onInteraction={(type, data) =>
                        handleProductInteraction(type, {
                          ...data,
                          position: itemIndex,
                          sectionType: section.type
                        })
                      }
                      enableAIFeatures
                      showSimilarProducts
                      motionPreset="dynamic"
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          ))
        )}
      </div>

      {/* Infinite Scroll Trigger */}
      <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
        {shouldLoadMore && !isInitializing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-gray-500"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Zap size={20} />
            </motion.div>
            <span>Loading more AI-curated content...</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default DynamicContentFeed;