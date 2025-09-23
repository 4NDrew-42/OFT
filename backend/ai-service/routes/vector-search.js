/**
 * Vector Search API Routes
 * Provides ORION-CORE powered vector search endpoints for the AI marketplace
 */

const express = require('express');
const { OrionVectorSearch } = require('../orion-bridge/vector-search');
const router = express.Router();

// Initialize ORION-CORE vector search
const vectorSearch = new OrionVectorSearch();

/**
 * POST /api/ai/search/vector
 * Main vector search endpoint for marketplace products
 */
router.post('/vector', async (req, res) => {
  try {
    const {
      query,
      filters = {},
      limit = 20,
      includeReasonings = true,
      enableRAG = true,
      semanticSearch = true
    } = req.body;

    console.log(`🔍 Vector search request: query="${query}", limit=${limit}`);

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required and must be a string'
      });
    }

    // Perform vector search using ORION-CORE
    const searchResults = await vectorSearch.searchSimilarProducts(query, {
      limit,
      threshold: 0.7,
      filters: {
        priceRange: filters.priceRange,
        categories: filters.categories,
        styles: filters.styles,
        colors: filters.colors,
        minAiScore: filters.minAiScore
      }
    });

    // Transform results to match frontend expectations
    const transformedResults = searchResults.results.map(result => ({
      id: result.id || `result_${Date.now()}_${Math.random()}`,
      title: result.title || result.name || 'Untitled Artwork',
      artist: result.artist || result.creator || 'Unknown Artist',
      imageUrl: result.imageUrl || result.image_url || '/placeholder-artwork.jpg',
      price: result.price || Math.floor(Math.random() * 1000) + 100,
      category: result.category || 'Digital Art',
      style: result.style || 'Contemporary',
      similarity: result.similarity || result.score || 0.8,
      reason: includeReasonings ? (result.reason || `Found similar to "${query}"`) : undefined,
      metadata: result.metadata || {}
    }));

    // Add AI suggestions if enabled
    let suggestions = [];
    if (enableRAG && searchResults.memoryContext) {
      suggestions = generateSearchSuggestions(query, searchResults.memoryContext);
    }

    res.json({
      success: true,
      results: transformedResults,
      total: transformedResults.length,
      query,
      processingTime: searchResults.processingTime || 0,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      orionPowered: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Vector search error:', error);
    res.status(500).json({
      success: false,
      error: 'Vector search failed',
      details: error.message,
      orionPowered: false
    });
  }
});

/**
 * POST /api/ai/search/image
 * Image-based vector search endpoint
 */
router.post('/image', async (req, res) => {
  try {
    const {
      imageUrl,
      imageData,
      limit = 15,
      threshold = 0.8
    } = req.body;

    console.log(`🖼️ Image search request: limit=${limit}`);

    if (!imageUrl && !imageData) {
      return res.status(400).json({
        success: false,
        error: 'Either imageUrl or imageData is required'
      });
    }

    const searchInput = imageUrl || imageData;
    const searchResults = await vectorSearch.searchByImage(searchInput, {
      limit,
      threshold
    });

    // Transform results for frontend
    const transformedResults = searchResults.results.map(result => ({
      id: result.id || `img_result_${Date.now()}_${Math.random()}`,
      title: result.title || 'Similar Artwork',
      artist: result.artist || 'Unknown Artist',
      imageUrl: result.imageUrl || result.image_url || '/placeholder-artwork.jpg',
      price: result.price || Math.floor(Math.random() * 1000) + 100,
      category: result.category || 'Digital Art',
      style: result.style || 'Contemporary',
      similarity: result.similarity || result.score || 0.8,
      reason: `Visually similar to uploaded image`,
      metadata: result.metadata || {}
    }));

    res.json({
      success: true,
      results: transformedResults,
      total: transformedResults.length,
      queryType: 'visual_search',
      embeddingInfo: searchResults.embedding_info,
      orionPowered: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Image search error:', error);
    res.status(500).json({
      success: false,
      error: 'Image search failed',
      details: error.message,
      orionPowered: false
    });
  }
});

/**
 * POST /api/ai/search/recommendations
 * Get personalized recommendations for a user
 */
router.post('/recommendations', async (req, res) => {
  try {
    const {
      userId = 'anonymous',
      context = {},
      limit = 12
    } = req.body;

    console.log(`💡 Personalized recommendations: userId=${userId}, limit=${limit}`);

    const recommendations = await vectorSearch.getPersonalizedRecommendations(userId, {
      ...context,
      limit
    });

    // Transform results
    const transformedResults = recommendations.results.map(result => ({
      id: result.id || `rec_${Date.now()}_${Math.random()}`,
      title: result.title || 'Recommended Artwork',
      artist: result.artist || 'Featured Artist',
      imageUrl: result.imageUrl || '/placeholder-artwork.jpg',
      price: result.price || Math.floor(Math.random() * 1000) + 100,
      category: result.category || 'Digital Art',
      style: result.style || 'Contemporary',
      similarity: result.similarity || 0.8,
      reason: result.reason || 'Recommended based on your preferences',
      metadata: result.metadata || {}
    }));

    res.json({
      success: true,
      results: transformedResults,
      total: transformedResults.length,
      userId,
      context,
      orionPowered: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations',
      details: error.message,
      orionPowered: false
    });
  }
});

/**
 * GET /api/ai/search/health
 * Health check for vector search service
 */
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await vectorSearch.healthCheck();
    
    res.json({
      status: healthStatus.orion_vector_healthy && healthStatus.orion_mcp_healthy ? 'healthy' : 'degraded',
      service: 'vector-search',
      orion_vector_connected: healthStatus.orion_vector_healthy,
      orion_mcp_connected: healthStatus.orion_mcp_healthy,
      vectors_available: healthStatus.vectors_stored || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'vector-search',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Generate search suggestions based on query and context
 */
function generateSearchSuggestions(query, context) {
  const suggestions = [
    `Similar to "${query}"`,
    `${query} variations`,
    `Popular ${query} styles`
  ];

  // Add context-based suggestions if available
  if (context && context.related_terms) {
    suggestions.push(...context.related_terms.slice(0, 2));
  }

  return suggestions.slice(0, 5);
}

module.exports = router;
