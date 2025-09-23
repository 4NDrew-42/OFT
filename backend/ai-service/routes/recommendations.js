/**
 * AI Service Recommendations Endpoint
 * Provides template recommendations using ORION-CORE RAG capabilities
 * Enhanced with rich template schemas and advanced AI generation
 */

const express = require('express');
const axios = require('axios');
const { performance } = require('perf_hooks');
const { EnhancedTemplateGenerator } = require('../templates/enhanced-template-engine');
const router = express.Router();

// ORION-CORE configuration
const ORION_API_BASE = process.env.ORION_API_URL || 'http://192.168.50.79:8081';

/**
 * Template recommendation patterns for ORION-CORE RAG
 */
const TEMPLATE_CONTEXTS = {
  'modular_design_templates': {
    searchTerms: ['modular design templates', 'creative layouts', 'UI component patterns'],
    enhanceWith: ['motion design', 'visual hierarchy', 'user experience patterns']
  },
  'landing_page_templates': {
    searchTerms: ['landing page designs', 'hero sections', 'conversion layouts'],
    enhanceWith: ['call to action patterns', 'engagement mechanics', 'visual storytelling']
  },
  'dashboard_templates': {
    searchTerms: ['dashboard layouts', 'data visualization', 'admin interfaces'],
    enhanceWith: ['information architecture', 'user workflow', 'analytics presentation']
  }
};

/**
 * Generate template recommendations using ORION-CORE memory search
 */
async function generateTemplateRecommendations(userId, context, options = {}) {
  const templateContext = TEMPLATE_CONTEXTS[context] || TEMPLATE_CONTEXTS['modular_design_templates'];
  const limit = options.limit || 6;

  const start = performance.now();

  try {
    // Search ORION-CORE memory for relevant design patterns
    const searchPromises = templateContext.searchTerms.map(async (term) => {
      const response = await axios.post(`${ORION_API_BASE}/api/memory/search`, {
        query: term,
        limit: Math.ceil(limit / templateContext.searchTerms.length),
        threshold: 0.6
      });
      return response.data.results || [];
    });

    const searchResults = await Promise.all(searchPromises);
    const allResults = searchResults.flat();

    // Transform search results into template recommendations
    const recommendations = allResults.slice(0, limit).map((result, index) => {
      const baseTemplate = generateBaseTemplate(result, context, index);

      return {
        id: result.id || `template_${Date.now()}_${index}`,
        title: extractTemplateTitle(result.content, baseTemplate.name),
        description: extractTemplateDescription(result.content, baseTemplate.summary),
        reason: `Generated from ORION-CORE memory: "${result.content.substring(0, 100)}..."`,
        orionScore: result.similarity || (0.7 + Math.random() * 0.3),
        confidence: result.similarity || (0.7 + Math.random() * 0.3),
        context: context,
        contextType: context,
        palette: extractPalette(result.content) || baseTemplate.palette,
        motionPresets: extractMotionPresets(result.content) || baseTemplate.motionPresets,
        modules: generateModules(result.content, baseTemplate.modules),
        tags: extractTags(result.content) || baseTemplate.tags,
        metadata: {
          orionMemoryId: result.id,
          searchTerm: templateContext.searchTerms[index % templateContext.searchTerms.length],
          timestamp: result.timestamp || new Date().toISOString()
        }
      };
    });

    // If we don't have enough results, pad with generated templates
    while (recommendations.length < limit) {
      const generatedTemplate = generateSyntheticTemplate(context, recommendations.length);
      recommendations.push(generatedTemplate);
    }

    const duration = performance.now() - start;

    return {
      success: true,
      recommendations,
      context: [context],
      processingTime: duration,
      orionEnabled: true
    };

  } catch (error) {
    console.error('ORION template generation error:', error);

    // Fallback to synthetic templates
    const syntheticRecommendations = Array.from({ length: limit }, (_, index) =>
      generateSyntheticTemplate(context, index)
    );

    return {
      success: true,
      recommendations: syntheticRecommendations,
      context: [context],
      processingTime: performance.now() - start,
      orionEnabled: false,
      fallback: true
    };
  }
}

/**
 * Extract template title from ORION memory content
 */
function extractTemplateTitle(content, fallback) {
  const titlePatterns = [
    /(?:created|built|implemented)\s+([A-Z][^.!?]*(?:component|template|layout|design))/i,
    /([A-Z][^.!?]*(?:template|design|layout|component))/i
  ];

  for (const pattern of titlePatterns) {
    const match = content.match(pattern);
    if (match) return match[1].trim();
  }

  return fallback;
}

/**
 * Extract template description from ORION memory content
 */
function extractTemplateDescription(content, fallback) {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  return sentences[0]?.trim() || fallback;
}

/**
 * Extract color palette from content
 */
function extractPalette(content) {
  const colorRegex = /#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g;
  const colors = content.match(colorRegex);
  return colors?.slice(0, 4) || null;
}

/**
 * Extract motion presets from content
 */
function extractMotionPresets(content) {
  const motionTerms = ['fade', 'slide', 'zoom', 'rotate', 'bounce', 'elastic', 'spring'];
  const foundMotions = motionTerms.filter(term =>
    content.toLowerCase().includes(term)
  );
  return foundMotions.length > 0 ? foundMotions.slice(0, 3) : null;
}

/**
 * Extract tags from content
 */
function extractTags(content) {
  const commonTags = ['responsive', 'mobile', 'desktop', 'animation', 'interactive', 'modern', 'minimal'];
  const foundTags = commonTags.filter(tag =>
    content.toLowerCase().includes(tag)
  );
  return foundTags.length > 0 ? foundTags : null;
}

/**
 * Generate modules based on content analysis
 */
function generateModules(content, fallbackModules) {
  const moduleKeywords = {
    'header': { emphasis: 'layout', animation: 'fade-in-down' },
    'navigation': { emphasis: 'layout', animation: 'slide-in-left' },
    'hero': { emphasis: 'media', animation: 'zoom-in' },
    'gallery': { emphasis: 'media', animation: 'stagger-fade' },
    'form': { emphasis: 'layout', animation: 'fade-in-up' },
    'footer': { emphasis: 'layout', animation: 'fade-in' }
  };

  const detectedModules = [];

  for (const [keyword, config] of Object.entries(moduleKeywords)) {
    if (content.toLowerCase().includes(keyword)) {
      detectedModules.push({
        name: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Module`,
        description: `AI-detected ${keyword} component from ORION memory`,
        animation: config.animation,
        emphasis: config.emphasis
      });
    }
  }

  return detectedModules.length > 0 ? detectedModules : fallbackModules;
}

/**
 * Generate base template structure
 */
function generateBaseTemplate(result, context, index) {
  const baseTemplates = {
    'modular_design_templates': {
      name: 'Modular Grid Layout',
      summary: 'Flexible grid system with interchangeable components',
      palette: ['#1E293B', '#3B82F6', '#10B981', '#F59E0B'],
      motionPresets: ['fade-stagger', 'slide-grid', 'zoom-tiles'],
      modules: [
        { name: 'Grid Container', description: 'Responsive grid wrapper', animation: 'fade-in', emphasis: 'layout' },
        { name: 'Card Components', description: 'Modular content cards', animation: 'stagger-up', emphasis: 'media' }
      ],
      tags: ['grid', 'modular', 'responsive']
    },
    'landing_page_templates': {
      name: 'Hero Landing Page',
      summary: 'High-impact landing page with conversion focus',
      palette: ['#0F172A', '#6366F1', '#EC4899', '#FBBF24'],
      motionPresets: ['hero-entrance', 'scroll-reveal', 'cta-pulse'],
      modules: [
        { name: 'Hero Section', description: 'Compelling hero with CTA', animation: 'hero-entrance', emphasis: 'copy' },
        { name: 'Feature Grid', description: 'Product features showcase', animation: 'scroll-reveal', emphasis: 'layout' }
      ],
      tags: ['landing', 'conversion', 'hero']
    }
  };

  return baseTemplates[context] || baseTemplates['modular_design_templates'];
}

/**
 * Generate synthetic template when ORION data is insufficient
 */
function generateSyntheticTemplate(context, index) {
  const base = generateBaseTemplate({}, context, index);

  return {
    id: `synthetic_${context}_${index}_${Date.now()}`,
    title: `${base.name} ${index + 1}`,
    description: `${base.summary} - AI-generated template`,
    reason: 'Synthetic template generated when ORION-CORE memory insufficient',
    orionScore: 0.6 + (Math.random() * 0.2),
    confidence: 0.6 + (Math.random() * 0.2),
    context: context,
    contextType: context,
    palette: base.palette,
    motionPresets: base.motionPresets,
    modules: base.modules,
    tags: base.tags,
    metadata: {
      synthetic: true,
      timestamp: new Date().toISOString()
    }
  };
}

// Initialize enhanced template generator
const enhancedGenerator = new EnhancedTemplateGenerator();

/**
 * POST /api/ai/recommendations
 * Get AI-powered template recommendations with enhanced schemas
 */
router.post('/recommendations', async (req, res) => {
  try {
    const {
      userId = 'anonymous',
      context = 'modular_design_templates',
      limit = 6,
      diversityWeight = 0.4,
      timeWindow = '30d',
      includeReasons = true,
      includeModules = true,
      updateProfile = false,
      enhanced = true // New parameter for enhanced templates
    } = req.body;

    console.log(`📋 Template recommendations request: userId=${userId}, context=${context}, limit=${limit}, enhanced=${enhanced}`);

    let result;

    if (enhanced) {
      // Use enhanced template generator with rich schemas
      result = await enhancedGenerator.generateEnhancedTemplates(userId, context, {
        limit,
        diversityWeight,
        timeWindow,
        includeReasons,
        includeModules,
        updateProfile
      });
    } else {
      // Fallback to legacy generator
      result = await generateTemplateRecommendations(userId, context, {
        limit,
        diversityWeight,
        timeWindow,
        includeReasons,
        includeModules,
        updateProfile
      });
    }

    if (result && Array.isArray(result.templates) && !Array.isArray(result.recommendations)) {
      result.recommendations = result.templates;
    }

    // Add performance metadata
    result.performance = {
      generatedAt: new Date().toISOString(),
      enhanced: enhanced,
      orionVectorsUsed: result.metadata?.orionPowered || false,
      templateCount: result.templates?.length || 0
    };

    res.json(result);

  } catch (error) {
    console.error('❌ Template recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate template recommendations',
      details: error.message,
      enhanced: false
    });
  }
});

/**
 * POST /api/ai/recommendations/enhanced
 * Get enhanced template recommendations with full schema
 */
router.post('/recommendations/enhanced', async (req, res) => {
  try {
    const {
      userId = 'anonymous',
      context = 'modular_design_templates',
      limit = 6,
      includeFullSchema = true
    } = req.body;

    console.log(`🚀 Enhanced template request: userId=${userId}, context=${context}`);

    const result = await enhancedGenerator.generateEnhancedTemplates(userId, context, {
      limit,
      includeFullSchema
    });

    // Include full enhanced schema if requested
    if (includeFullSchema && result.success) {
      result.enhancedSchemas = true;
      result.schemaVersion = '2.0';
    }

    res.json(result);

  } catch (error) {
    console.error('❌ Enhanced template generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate enhanced templates',
      details: error.message
    });
  }
});

/**
 * GET /api/ai/recommendations/health
 * Health check for template recommendation service
 */
router.get('/recommendations/health', async (req, res) => {
  try {
    // Test ORION-CORE connectivity
    const orionResponse = await axios.get(`${ORION_API_BASE}/health`, { timeout: 5000 });

    res.json({
      status: 'healthy',
      service: 'template-recommendations',
      orion_connected: orionResponse.status === 200,
      orion_vectors: orionResponse.data?.vectors_stored || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      service: 'template-recommendations',
      orion_connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
