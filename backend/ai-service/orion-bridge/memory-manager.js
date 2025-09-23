/**
 * ORION-CORE Memory Manager
 * Advanced RAG (Retrieval-Augmented Generation) with MCP extended memory tools
 */

const axios = require('axios');

class OrionMemoryManager {
  constructor() {
    this.orionMcpUrl = process.env.ORION_MCP_URL || 'http://localhost:8090';
    this.orionVectorUrl = process.env.ORION_VECTOR_API_BASE || 'http://192.168.50.79:8081';

    // Memory categories for the marketplace
    this.memoryTypes = {
      USER_INTERACTION: 'user_interaction',
      PRODUCT_VIEW: 'product_view',
      SEARCH_QUERY: 'search_query',
      PURCHASE_BEHAVIOR: 'purchase_behavior',
      PREFERENCE_LEARNING: 'preference_learning',
      CONTENT_ANALYSIS: 'content_analysis',
      TREND_DETECTION: 'trend_detection',
      RECOMMENDATION_FEEDBACK: 'recommendation_feedback'
    };

    this.mcpClient = this.initializeMcpClient();
  }

  /**
   * Initialize enhanced MCP client for RAG operations
   */
  initializeMcpClient() {
    return {
      storeMemory: async (content, metadata = {}) => {
        try {
          const response = await axios.post(`${this.orionMcpUrl}/api/mcp/store-memory`, {
            content,
            metadata: {
              ...metadata,
              timestamp: new Date().toISOString(),
              source: 'ai-marketplace',
              version: '1.0'
            }
          });
          return response.data;
        } catch (error) {
          console.error('MCP Memory storage error:', error);
          return { success: false, error: error.message };
        }
      },

      searchMemories: async (query, options = {}) => {
        try {
          const response = await axios.post(`${this.orionMcpUrl}/api/mcp/search-memories`, {
            query,
            top_k: options.limit || 10,
            threshold: options.threshold || 0.7,
            filters: options.filters || {},
            include_metadata: true,
            include_context: true
          });
          return response.data;
        } catch (error) {
          console.error('MCP Memory search error:', error);
          return { results: [], error: error.message };
        }
      },

      updateMemory: async (memoryId, updates) => {
        try {
          const response = await axios.put(`${this.orionMcpUrl}/api/mcp/memory/${memoryId}`, updates);
          return response.data;
        } catch (error) {
          console.error('MCP Memory update error:', error);
          return { success: false, error: error.message };
        }
      },

      deleteMemory: async (memoryId) => {
        try {
          const response = await axios.delete(`${this.orionMcpUrl}/api/mcp/memory/${memoryId}`);
          return response.data;
        } catch (error) {
          console.error('MCP Memory deletion error:', error);
          return { success: false, error: error.message };
        }
      },

      getMemoryContext: async (contextId, options = {}) => {
        try {
          const response = await axios.get(`${this.orionMcpUrl}/api/mcp/context/${contextId}`, {
            params: options
          });
          return response.data;
        } catch (error) {
          console.error('MCP Context retrieval error:', error);
          return { context: null, error: error.message };
        }
      }
    };
  }

  /**
   * Store user interaction with contextual understanding
   * @param {string} userId - User identifier
   * @param {string} action - Action performed
   * @param {Object} context - Interaction context
   * @returns {Promise<Object>} Storage result
   */
  async storeUserInteraction(userId, action, context = {}) {
    try {
      const interactionContent = `User ${userId} performed ${action}: ${JSON.stringify(context)}`;

      // Enrich context with temporal and behavioral insights
      const enrichedMetadata = {
        user_id: userId,
        action_type: action,
        memory_type: this.memoryTypes.USER_INTERACTION,
        timestamp: new Date().toISOString(),
        session_id: context.sessionId,
        device_type: context.deviceType || 'unknown',
        page_context: context.pageContext,
        interaction_sequence: context.sequence || 1,

        // Behavioral analysis
        time_spent: context.timeSpent || 0,
        scroll_depth: context.scrollDepth || 0,
        click_position: context.clickPosition,
        referrer: context.referrer,

        // Content interaction
        product_id: context.productId,
        category: context.category,
        search_query: context.searchQuery,
        filter_used: context.filters,

        // Contextual enrichment
        day_of_week: new Date().getDay(),
        hour_of_day: new Date().getHours(),
        user_agent: context.userAgent
      };

      const result = await this.mcpClient.storeMemory(interactionContent, enrichedMetadata);

      // Update user's interaction pattern analysis
      if (result.success) {
        await this.updateUserPattern(userId, action, context);
      }

      return result;

    } catch (error) {
      console.error('User interaction storage error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store product view with visual and contextual analysis
   * @param {string} userId - User identifier
   * @param {Object} product - Product details
   * @param {Object} viewContext - View context
   * @returns {Promise<Object>} Storage result
   */
  async storeProductView(userId, product, viewContext = {}) {
    try {
      const viewContent = `User ${userId} viewed product "${product.title}" (${product.id}) in category ${product.category}`;

      const viewMetadata = {
        user_id: userId,
        product_id: product.id,
        memory_type: this.memoryTypes.PRODUCT_VIEW,

        // Product details
        product_title: product.title,
        product_category: product.category,
        product_style: product.style,
        product_artist: product.artist,
        product_price: product.price,
        product_tags: product.tags || [],

        // View context
        view_duration: viewContext.duration || 0,
        zoom_interactions: viewContext.zoomCount || 0,
        image_views: viewContext.imageViews || [],
        came_from: viewContext.referrer,
        view_source: viewContext.source, // search, recommendation, browse

        // Visual analysis
        dominant_colors: product.colorPalette || [],
        image_complexity: product.imageComplexity,
        artistic_elements: product.artisticElements || [],

        // Engagement metrics
        added_to_wishlist: viewContext.wishlisted || false,
        shared: viewContext.shared || false,
        time_to_engagement: viewContext.timeToEngagement || null
      };

      const result = await this.mcpClient.storeMemory(viewContent, viewMetadata);

      // Update product popularity and user preferences
      if (result.success) {
        await Promise.all([
          this.updateProductPopularity(product.id, viewContext),
          this.updateUserPreferences(userId, product, viewContext)
        ]);
      }

      return result;

    } catch (error) {
      console.error('Product view storage error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store and analyze search queries for trend detection
   * @param {string} userId - User identifier
   * @param {string} query - Search query
   * @param {Object} searchContext - Search context and results
   * @returns {Promise<Object>} Storage result
   */
  async storeSearchQuery(userId, query, searchContext = {}) {
    try {
      const searchContent = `User ${userId} searched for "${query}" and found ${searchContext.resultCount || 0} results`;

      const searchMetadata = {
        user_id: userId,
        search_query: query,
        memory_type: this.memoryTypes.SEARCH_QUERY,

        // Search details
        query_type: searchContext.queryType || 'text', // text, visual, voice
        search_filters: searchContext.filters || {},
        result_count: searchContext.resultCount || 0,
        search_duration: searchContext.duration || 0,

        // Query analysis
        query_length: query.length,
        query_words: query.split(' ').length,
        query_categories: searchContext.detectedCategories || [],
        query_intent: searchContext.intent || 'browse', // browse, buy, research

        // Results interaction
        clicked_results: searchContext.clickedResults || [],
        result_positions_clicked: searchContext.clickPositions || [],
        time_to_first_click: searchContext.timeToFirstClick || null,
        refined_search: searchContext.refined || false,

        // Semantic analysis
        semantic_topics: searchContext.semanticTopics || [],
        related_searches: searchContext.relatedSearches || [],
        spelling_corrected: searchContext.corrected || false
      };

      const result = await this.mcpClient.storeMemory(searchContent, searchMetadata);

      // Update search trends and user search patterns
      if (result.success) {
        await Promise.all([
          this.updateSearchTrends(query, searchContext),
          this.updateUserSearchPattern(userId, query, searchContext)
        ]);
      }

      return result;

    } catch (error) {
      console.error('Search query storage error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Retrieve contextual memories for personalization
   * @param {string} userId - User identifier
   * @param {Object} context - Current context
   * @param {Object} options - Retrieval options
   * @returns {Promise<Object>} Contextual memories
   */
  async getContextualMemories(userId, context = {}, options = {}) {
    try {
      // Build contextual query based on current situation
      const contextQuery = this.buildContextualQuery(userId, context);

      const memories = await this.mcpClient.searchMemories(contextQuery, {
        limit: options.limit || 20,
        threshold: options.threshold || 0.6,
        filters: {
          user_id: userId,
          memory_type: options.memoryTypes || Object.values(this.memoryTypes),
          timestamp_range: options.timeRange || {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // Last 30 days
          }
        }
      });

      // Analyze and categorize memories
      const categorizedMemories = this.categorizeMemories(memories.results || []);

      // Extract insights and patterns
      const insights = this.extractInsights(categorizedMemories, context);

      return {
        success: true,
        memories: categorizedMemories,
        insights,
        context_query: contextQuery,
        total_memories: memories.results?.length || 0
      };

    } catch (error) {
      console.error('Contextual memory retrieval error:', error);
      return {
        success: false,
        error: error.message,
        memories: {},
        insights: {}
      };
    }
  }

  /**
   * Generate personalized recommendations using RAG
   * @param {string} userId - User identifier
   * @param {Object} context - Current context
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Personalized recommendations
   */
  async generatePersonalizedRecommendations(userId, context = {}, options = {}) {
    try {
      // Retrieve relevant user memories
      const userMemories = await this.getContextualMemories(userId, context, {
        limit: 50,
        memoryTypes: [
          this.memoryTypes.PRODUCT_VIEW,
          this.memoryTypes.SEARCH_QUERY,
          this.memoryTypes.PURCHASE_BEHAVIOR,
          this.memoryTypes.PREFERENCE_LEARNING
        ]
      });

      if (!userMemories.success) {
        throw new Error('Failed to retrieve user memories');
      }

      // Analyze user preferences and patterns
      const userProfile = this.buildUserProfile(userMemories.memories, userMemories.insights);

      // Generate recommendation query based on user profile
      const recommendationQuery = this.buildRecommendationQuery(userProfile, context);

      // Search for relevant products using RAG
      const productMemories = await this.mcpClient.searchMemories(recommendationQuery, {
        limit: options.limit || 25,
        threshold: 0.7,
        filters: {
          memory_type: [this.memoryTypes.CONTENT_ANALYSIS, this.memoryTypes.PRODUCT_VIEW],
          exclude_user: userId // Don't recommend products user already viewed recently
        }
      });

      // Score and rank recommendations
      const recommendations = this.scoreRecommendations(
        productMemories.results || [],
        userProfile,
        context
      );

      // Store recommendation generation event
      await this.storeRecommendationEvent(userId, {
        query: recommendationQuery,
        user_profile: userProfile,
        recommendations_generated: recommendations.length,
        context
      });

      return {
        success: true,
        recommendations,
        user_profile: userProfile,
        recommendation_query: recommendationQuery,
        confidence_score: this.calculateConfidenceScore(userProfile, recommendations)
      };

    } catch (error) {
      console.error('Personalized recommendations error:', error);
      return {
        success: false,
        error: error.message,
        recommendations: []
      };
    }
  }

  /**
   * Build contextual query for memory retrieval
   * @param {string} userId - User identifier
   * @param {Object} context - Current context
   * @returns {string} Contextual query
   */
  buildContextualQuery(userId, context) {
    const queryParts = [`user:${userId}`];

    if (context.currentPage) {
      queryParts.push(`page:${context.currentPage}`);
    }

    if (context.currentCategory) {
      queryParts.push(`category:${context.currentCategory}`);
    }

    if (context.timeOfDay) {
      queryParts.push(`time:${context.timeOfDay}`);
    }

    if (context.deviceType) {
      queryParts.push(`device:${context.deviceType}`);
    }

    if (context.intent) {
      queryParts.push(`intent:${context.intent}`);
    }

    return queryParts.join(' ');
  }

  /**
   * Categorize memories by type and recency
   * @param {Array} memories - Raw memories
   * @returns {Object} Categorized memories
   */
  categorizeMemories(memories) {
    const categorized = {
      recent_views: [],
      search_history: [],
      interactions: [],
      preferences: [],
      purchase_behavior: []
    };

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    memories.forEach(memory => {
      const age = now - new Date(memory.metadata?.timestamp || 0).getTime();
      memory.age_days = age / dayMs;
      memory.recency_weight = Math.exp(-age / (7 * dayMs)); // Exponential decay over 7 days

      switch (memory.metadata?.memory_type) {
        case this.memoryTypes.PRODUCT_VIEW:
          categorized.recent_views.push(memory);
          break;
        case this.memoryTypes.SEARCH_QUERY:
          categorized.search_history.push(memory);
          break;
        case this.memoryTypes.USER_INTERACTION:
          categorized.interactions.push(memory);
          break;
        case this.memoryTypes.PREFERENCE_LEARNING:
          categorized.preferences.push(memory);
          break;
        case this.memoryTypes.PURCHASE_BEHAVIOR:
          categorized.purchase_behavior.push(memory);
          break;
      }
    });

    // Sort each category by recency weight
    Object.keys(categorized).forEach(key => {
      categorized[key].sort((a, b) => b.recency_weight - a.recency_weight);
    });

    return categorized;
  }

  /**
   * Extract insights from categorized memories
   * @param {Object} memories - Categorized memories
   * @param {Object} context - Current context
   * @returns {Object} Extracted insights
   */
  extractInsights(memories, context) {
    const insights = {
      preferred_categories: {},
      preferred_styles: {},
      preferred_artists: {},
      color_preferences: {},
      price_sensitivity: null,
      shopping_patterns: {},
      engagement_patterns: {},
      seasonal_preferences: {}
    };

    // Analyze product views
    memories.recent_views.forEach(view => {
      const metadata = view.metadata || {};
      const weight = view.recency_weight || 1;

      // Category preferences
      if (metadata.product_category) {
        insights.preferred_categories[metadata.product_category] =
          (insights.preferred_categories[metadata.product_category] || 0) + weight;
      }

      // Style preferences
      if (metadata.product_style) {
        insights.preferred_styles[metadata.product_style] =
          (insights.preferred_styles[metadata.product_style] || 0) + weight;
      }

      // Artist preferences
      if (metadata.product_artist) {
        insights.preferred_artists[metadata.product_artist] =
          (insights.preferred_artists[metadata.product_artist] || 0) + weight;
      }

      // Color preferences
      if (metadata.dominant_colors) {
        metadata.dominant_colors.forEach(color => {
          insights.color_preferences[color] =
            (insights.color_preferences[color] || 0) + weight;
        });
      }

      // Engagement patterns
      if (metadata.view_duration) {
        const category = metadata.product_category || 'unknown';
        if (!insights.engagement_patterns[category]) {
          insights.engagement_patterns[category] = { total_time: 0, views: 0 };
        }
        insights.engagement_patterns[category].total_time += metadata.view_duration;
        insights.engagement_patterns[category].views += 1;
      }
    });

    // Analyze search patterns
    memories.search_history.forEach(search => {
      const metadata = search.metadata || {};
      const weight = search.recency_weight || 1;

      if (metadata.query_categories) {
        metadata.query_categories.forEach(category => {
          insights.preferred_categories[category] =
            (insights.preferred_categories[category] || 0) + weight * 0.8; // Slightly lower weight than views
        });
      }

      // Shopping intent analysis
      if (metadata.query_intent) {
        insights.shopping_patterns[metadata.query_intent] =
          (insights.shopping_patterns[metadata.query_intent] || 0) + weight;
      }
    });

    // Normalize and rank preferences
    Object.keys(insights).forEach(category => {
      if (typeof insights[category] === 'object' && insights[category] !== null) {
        const entries = Object.entries(insights[category]);
        const total = entries.reduce((sum, [, value]) => sum + (value.total_time || value), 0);

        if (total > 0) {
          const normalized = {};
          entries.forEach(([key, value]) => {
            const score = (value.total_time || value) / total;
            if (score > 0.05) { // Only keep preferences with >5% weight
              normalized[key] = score;
            }
          });
          insights[category] = normalized;
        }
      }
    });

    return insights;
  }

  /**
   * Build user profile from memories and insights
   * @param {Object} memories - Categorized memories
   * @param {Object} insights - Extracted insights
   * @returns {Object} User profile
   */
  buildUserProfile(memories, insights) {
    return {
      preferences: insights,
      activity_level: memories.recent_views.length + memories.search_history.length,
      last_active: memories.recent_views[0]?.metadata?.timestamp || null,
      exploration_vs_exploitation: this.calculateExplorationScore(memories),
      confidence_level: this.calculateProfileConfidence(memories, insights),
      dominant_characteristics: this.extractDominantCharacteristics(insights)
    };
  }

  /**
   * Calculate how exploratory vs exploitative user behavior is
   * @param {Object} memories - User memories
   * @returns {number} Exploration score (0-1, higher = more exploratory)
   */
  calculateExplorationScore(memories) {
    const uniqueCategories = new Set();
    const uniqueStyles = new Set();
    const totalViews = memories.recent_views.length;

    memories.recent_views.forEach(view => {
      if (view.metadata?.product_category) uniqueCategories.add(view.metadata.product_category);
      if (view.metadata?.product_style) uniqueStyles.add(view.metadata.product_style);
    });

    if (totalViews === 0) return 0.5; // Default neutral score

    const categoryDiversity = uniqueCategories.size / Math.max(totalViews, 1);
    const styleDiversity = uniqueStyles.size / Math.max(totalViews, 1);

    return (categoryDiversity + styleDiversity) / 2;
  }

  /**
   * Calculate confidence level in user profile
   * @param {Object} memories - User memories
   * @param {Object} insights - User insights
   * @returns {number} Confidence score (0-1)
   */
  calculateProfileConfidence(memories, insights) {
    const totalInteractions = memories.recent_views.length +
                             memories.search_history.length +
                             memories.interactions.length;

    const preferenceStrength = Math.max(
      ...Object.values(insights.preferred_categories || {}),
      0
    );

    const timeSpan = memories.recent_views.length > 0 ?
      (Date.now() - new Date(memories.recent_views[memories.recent_views.length - 1]?.metadata?.timestamp || 0).getTime()) /
      (7 * 24 * 60 * 60 * 1000) : 0; // Weeks of data

    return Math.min(1, (totalInteractions / 50) * preferenceStrength * Math.min(timeSpan / 2, 1));
  }

  /**
   * Extract dominant characteristics from insights
   * @param {Object} insights - User insights
   * @returns {Object} Dominant characteristics
   */
  extractDominantCharacteristics(insights) {
    const characteristics = {};

    // Top category
    const topCategory = Object.entries(insights.preferred_categories || {})
      .sort(([,a], [,b]) => b - a)[0];
    if (topCategory && topCategory[1] > 0.3) {
      characteristics.primary_category = topCategory[0];
    }

    // Top style
    const topStyle = Object.entries(insights.preferred_styles || {})
      .sort(([,a], [,b]) => b - a)[0];
    if (topStyle && topStyle[1] > 0.3) {
      characteristics.primary_style = topStyle[0];
    }

    // Engagement level
    const avgEngagement = Object.values(insights.engagement_patterns || {})
      .reduce((sum, pattern) => sum + (pattern.total_time / pattern.views), 0) /
      Math.max(Object.keys(insights.engagement_patterns || {}).length, 1);

    characteristics.engagement_level = avgEngagement > 30 ? 'high' :
                                     avgEngagement > 10 ? 'medium' : 'low';

    return characteristics;
  }

  /**
   * Update user interaction patterns
   * @param {string} userId - User identifier
   * @param {string} action - Action performed
   * @param {Object} context - Action context
   */
  async updateUserPattern(userId, action, context) {
    // Implementation for updating user patterns
    // This would analyze sequences of actions and store pattern insights
  }

  /**
   * Update product popularity metrics
   * @param {string} productId - Product identifier
   * @param {Object} viewContext - View context
   */
  async updateProductPopularity(productId, viewContext) {
    // Implementation for updating product popularity
    // This would track view counts, engagement metrics, etc.
  }

  /**
   * Update user preferences based on product interaction
   * @param {string} userId - User identifier
   * @param {Object} product - Product details
   * @param {Object} context - Interaction context
   */
  async updateUserPreferences(userId, product, context) {
    // Implementation for updating user preferences
    // This would learn from user behavior patterns
  }

  /**
   * Update search trends
   * @param {string} query - Search query
   * @param {Object} context - Search context
   */
  async updateSearchTrends(query, context) {
    // Implementation for tracking search trends
    // This would identify trending searches and topics
  }

  /**
   * Update user search patterns
   * @param {string} userId - User identifier
   * @param {string} query - Search query
   * @param {Object} context - Search context
   */
  async updateUserSearchPattern(userId, query, context) {
    // Implementation for learning user search patterns
    // This would identify search behavior and preferences
  }

  /**
   * Build recommendation query from user profile
   * @param {Object} userProfile - User profile
   * @param {Object} context - Current context
   * @returns {string} Recommendation query
   */
  buildRecommendationQuery(userProfile, context) {
    const queryParts = [];

    // Add primary preferences
    if (userProfile.dominant_characteristics?.primary_category) {
      queryParts.push(`category:${userProfile.dominant_characteristics.primary_category}`);
    }

    if (userProfile.dominant_characteristics?.primary_style) {
      queryParts.push(`style:${userProfile.dominant_characteristics.primary_style}`);
    }

    // Add top preferences
    const topCategories = Object.entries(userProfile.preferences?.preferred_categories || {})
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([category]) => category);

    if (topCategories.length > 0) {
      queryParts.push(`related_categories:${topCategories.join(',')}`);
    }

    // Add context
    if (context.mood) {
      queryParts.push(`mood:${context.mood}`);
    }

    if (context.budget) {
      queryParts.push(`budget:${context.budget}`);
    }

    return queryParts.join(' ') || 'popular artwork recommendations';
  }

  /**
   * Score and rank recommendations
   * @param {Array} candidates - Candidate products from memory
   * @param {Object} userProfile - User profile
   * @param {Object} context - Current context
   * @returns {Array} Scored and ranked recommendations
   */
  scoreRecommendations(candidates, userProfile, context) {
    return candidates.map(candidate => {
      let score = candidate.score || 0.5;

      // Boost based on user preferences
      if (candidate.metadata?.product_category &&
          userProfile.preferences?.preferred_categories?.[candidate.metadata.product_category]) {
        score *= (1 + userProfile.preferences.preferred_categories[candidate.metadata.product_category]);
      }

      // Apply recency decay
      const age = Date.now() - new Date(candidate.metadata?.timestamp || 0).getTime();
      const recencyFactor = Math.exp(-age / (30 * 24 * 60 * 60 * 1000)); // 30 day decay
      score *= (0.5 + 0.5 * recencyFactor);

      // Apply diversity factor for exploratory users
      if (userProfile.exploration_vs_exploitation > 0.7) {
        // Boost less common categories for exploratory users
        const categoryFreq = userProfile.preferences?.preferred_categories?.[candidate.metadata?.product_category] || 0;
        score *= (1 + 0.3 * (1 - categoryFreq));
      }

      return {
        ...candidate,
        recommendation_score: score
      };
    })
    .sort((a, b) => b.recommendation_score - a.recommendation_score)
    .slice(0, 20);
  }

  /**
   * Store recommendation generation event
   * @param {string} userId - User identifier
   * @param {Object} recommendationData - Recommendation generation data
   */
  async storeRecommendationEvent(userId, recommendationData) {
    const content = `Generated ${recommendationData.recommendations_generated} recommendations for user ${userId}`;

    await this.mcpClient.storeMemory(content, {
      user_id: userId,
      memory_type: this.memoryTypes.RECOMMENDATION_FEEDBACK,
      ...recommendationData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Calculate confidence score for recommendations
   * @param {Object} userProfile - User profile
   * @param {Array} recommendations - Generated recommendations
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidenceScore(userProfile, recommendations) {
    const profileConfidence = userProfile.confidence_level || 0;
    const recommendationStrength = recommendations.length > 0 ?
      recommendations.reduce((sum, rec) => sum + rec.recommendation_score, 0) / recommendations.length : 0;

    return (profileConfidence + recommendationStrength) / 2;
  }

  /**
   * Health check for memory services
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const mcpHealth = await axios.get(`${this.orionMcpUrl}/health`);

      return {
        mcp_service: {
          status: 'healthy',
          url: this.orionMcpUrl,
          response_time: mcpHealth.data?.response_time || null
        },
        memory_types: this.memoryTypes,
        overall_status: 'healthy'
      };
    } catch (error) {
      return {
        mcp_service: {
          status: 'error',
          url: this.orionMcpUrl,
          error: error.message
        },
        overall_status: 'error'
      };
    }
  }
}

module.exports = OrionMemoryManager;