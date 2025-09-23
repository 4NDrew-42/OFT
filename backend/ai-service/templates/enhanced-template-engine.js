/**
 * Enhanced Template Recommendation Engine
 * Advanced AI-powered template generation using ORION-CORE RAG with rich schemas
 */

const axios = require('axios');

// ORION-CORE configuration
const ORION_API_BASE = process.env.ORION_API_URL || 'http://192.168.50.79:8081';

/**
 * Enhanced template schema with rich metadata
 */
class EnhancedTemplate {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.metadata = {
      name: data.name || 'Untitled Template',
      category: data.category || 'general',
      complexity: data.complexity || 'medium', // simple, medium, complex
      industry: data.industry || 'general', // tech, art, ecommerce, etc.
      purpose: data.purpose || 'landing', // landing, dashboard, portfolio, etc.
      responsive: data.responsive !== false,
      accessibility: data.accessibility !== false,
      performance: {
        loadTime: data.loadTime || 'fast',
        bundleSize: data.bundleSize || 'optimized',
        coreWebVitals: data.coreWebVitals || 'good'
      }
    };

    this.design = {
      summary: data.summary || 'AI-generated template design',
      reason: data.reason || 'Generated using ORION-CORE intelligence',
      confidence: data.confidence || 0.8,
      orionScore: data.orionScore || 0.8,
      visualStyle: data.visualStyle || 'modern',
      colorScheme: data.colorScheme || 'balanced'
    };

    this.styling = {
      palette: {
        primary: data.palette || ['#1E293B', '#3B82F6', '#10B981', '#F59E0B'],
        semantic: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6'
        },
        gradients: data.gradients || [
          'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        ]
      },
      typography: {
        fontFamily: data.fontFamily || 'Inter, system-ui, sans-serif',
        headingScale: data.headingScale || 'harmonious',
        readability: data.readability || 'high'
      },
      spacing: {
        scale: data.spacingScale || 'consistent',
        rhythm: data.rhythm || 'balanced'
      },
      layout: {
        grid: data.grid || 'responsive-12-col',
        breakpoints: data.breakpoints || 'standard',
        containerMaxWidth: data.containerMaxWidth || '1200px'
      }
    };

    this.interaction = {
      motionPresets: data.motionPresets || ['fade-in', 'slide-up', 'scale-in'],
      animations: {
        duration: data.animationDuration || 'moderate',
        easing: data.easing || 'ease-out',
        respectsReducedMotion: data.respectsReducedMotion !== false
      },
      microInteractions: data.microInteractions || [
        'hover-elevate',
        'click-feedback',
        'focus-highlight'
      ],
      gestureSupport: data.gestureSupport !== false
    };

    this.architecture = {
      modules: data.modules || this.generateDefaultModules(),
      dependencies: data.dependencies || this.inferDependencies(),
      codeStructure: data.codeStructure || 'component-based',
      stateManagement: data.stateManagement || 'local',
      dataFlow: data.dataFlow || 'unidirectional'
    };

    this.features = {
      tags: data.tags || ['responsive', 'modern', 'accessible'],
      capabilities: data.capabilities || ['mobile-first', 'seo-optimized'],
      integrations: data.integrations || ['analytics', 'performance-monitoring'],
      contentTypes: data.contentTypes || ['text', 'images', 'interactive']
    };

    this.ai = {
      orionMemoryId: data.orionMemoryId,
      contextType: data.contextType || 'design_templates',
      generationMethod: data.generationMethod || 'rag-enhanced',
      learningData: data.learningData || {},
      userPersonalization: data.userPersonalization || {},
      adaptiveFeatures: data.adaptiveFeatures || []
    };

    this.deployment = {
      framework: data.framework || 'React',
      buildTool: data.buildTool || 'Vite',
      hosting: data.hosting || 'static',
      cdn: data.cdn !== false,
      monitoring: data.monitoring !== false
    };
  }

  generateId() {
    return `enhanced-template-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  generateDefaultModules() {
    return [
      {
        name: 'Hero Section',
        type: 'layout',
        description: 'Compelling hero with clear value proposition',
        emphasis: 'visual-impact',
        animation: 'hero-entrance',
        customizable: true,
        aiGenerated: true
      },
      {
        name: 'Feature Grid',
        type: 'content',
        description: 'Showcases key features with visual hierarchy',
        emphasis: 'information',
        animation: 'stagger-reveal',
        customizable: true,
        aiGenerated: true
      },
      {
        name: 'Call to Action',
        type: 'conversion',
        description: 'Conversion-optimized action section',
        emphasis: 'engagement',
        animation: 'attention-draw',
        customizable: true,
        aiGenerated: true
      }
    ];
  }

  inferDependencies() {
    return {
      core: ['react', 'next'],
      styling: ['tailwindcss', 'framer-motion'],
      utils: ['clsx', 'date-fns'],
      optional: ['@headlessui/react', '@heroicons/react']
    };
  }

  toPlaygroundFormat() {
    return {
      id: this.id,
      name: this.metadata.name,
      summary: this.design.summary,
      reason: this.design.reason,
      palette: this.styling.palette.primary,
      motionPresets: this.interaction.motionPresets,
      modules: this.architecture.modules,
      tags: this.features.tags,
      contextType: this.ai.contextType,
      orionScore: this.design.orionScore,
      previewImage: this.metadata.previewImage,
      insights: {
        bestFor: this.inferBestFor(),
        behaviors: this.inferBehaviors()
      }
    };
  }

  inferBestFor() {
    const purposes = {
      'landing': ['Product launches', 'Marketing campaigns', 'Lead generation'],
      'dashboard': ['Data visualization', 'Admin interfaces', 'Analytics'],
      'portfolio': ['Creative showcases', 'Professional profiles', 'Case studies'],
      'ecommerce': ['Product catalogs', 'Online stores', 'Marketplace'],
      'blog': ['Content publishing', 'Editorial sites', 'News platforms']
    };
    return purposes[this.metadata.purpose] || ['General websites', 'Flexible layouts'];
  }

  inferBehaviors() {
    const behaviors = {
      'high': ['Extended engagement', 'Deep exploration', 'Return visits'],
      'medium': ['Moderate browsing', 'Task completion', 'Social sharing'],
      'simple': ['Quick scanning', 'Single actions', 'Mobile usage']
    };
    return behaviors[this.metadata.complexity] || ['Balanced interaction'];
  }
}

/**
 * Enhanced Template Generator using ORION-CORE RAG
 */
class EnhancedTemplateGenerator {
  constructor() {
    this.orionApi = ORION_API_BASE;
    this.templatePatterns = this.loadTemplatePatterns();
  }

  loadTemplatePatterns() {
    return {
      'landing_pages': {
        searchQueries: [
          'landing page design high conversion',
          'hero section layout engagement',
          'call to action optimization patterns'
        ],
        characteristics: {
          purpose: 'landing',
          complexity: 'medium',
          focusAreas: ['conversion', 'visual-impact', 'clear-messaging']
        }
      },
      'dashboards': {
        searchQueries: [
          'dashboard layout data visualization',
          'admin interface user experience',
          'analytics presentation patterns'
        ],
        characteristics: {
          purpose: 'dashboard',
          complexity: 'complex',
          focusAreas: ['data-clarity', 'workflow', 'functionality']
        }
      },
      'portfolios': {
        searchQueries: [
          'portfolio design creative showcase',
          'visual storytelling layouts',
          'artist gallery presentation'
        ],
        characteristics: {
          purpose: 'portfolio',
          complexity: 'medium',
          focusAreas: ['visual-storytelling', 'personal-branding', 'creativity']
        }
      },
      'modular_systems': {
        searchQueries: [
          'modular design system components',
          'reusable UI component patterns',
          'scalable design architecture'
        ],
        characteristics: {
          purpose: 'system',
          complexity: 'complex',
          focusAreas: ['modularity', 'consistency', 'scalability']
        }
      }
    };
  }

  async generateEnhancedTemplates(userId, context = 'modular_systems', options = {}) {
    const limit = options.limit || 6;
    const pattern = this.templatePatterns[context] || this.templatePatterns['modular_systems'];

    try {
      console.log(`🎨 Generating enhanced templates for context: ${context}`);

      // Multi-query ORION search for richer context
      const searchPromises = pattern.searchQueries.map(query =>
        this.searchOrionMemory(query, Math.ceil(limit / pattern.searchQueries.length))
      );

      const searchResults = await Promise.all(searchPromises);
      const allResults = searchResults.flat().slice(0, limit * 2); // Get extra for filtering

      // Generate enhanced templates with rich schemas
      const enhancedTemplates = await Promise.all(
        allResults.slice(0, limit).map((result, index) =>
          this.createEnhancedTemplate(result, pattern, context, index)
        )
      );

      // Ensure we have enough templates
      while (enhancedTemplates.length < limit) {
        const syntheticTemplate = this.createSyntheticTemplate(pattern, context, enhancedTemplates.length);
        enhancedTemplates.push(syntheticTemplate);
      }

      // Sort by ORION score and confidence
      enhancedTemplates.sort((a, b) => b.design.orionScore - a.design.orionScore);

      console.log(`✅ Generated ${enhancedTemplates.length} enhanced templates`);

      return {
        success: true,
        templates: enhancedTemplates.map(t => t.toPlaygroundFormat()),
        metadata: {
          context,
          pattern: pattern.characteristics,
          enhancedSchemas: true,
          orionPowered: true,
          generationTime: Date.now()
        },
        contextUsed: [context],
        confidence: this.calculateOverallConfidence(enhancedTemplates),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Enhanced template generation error:', error);
      return this.generateFallbackTemplates(context, limit);
    }
  }

  async searchOrionMemory(query, limit) {
    try {
      const response = await axios.post(`${this.orionApi}/api/memory/search`, {
        query,
        limit,
        threshold: 0.6
      }, { timeout: 10000 });

      return response.data.results || [];
    } catch (error) {
      console.warn(`ORION search failed for query: ${query}`, error.message);
      return [];
    }
  }

  async createEnhancedTemplate(orionResult, pattern, context, index) {
    const baseData = {
      id: `enhanced-${context}-${index}-${Date.now()}`,
      name: this.extractTemplateName(orionResult.content),
      summary: this.extractSummary(orionResult.content),
      reason: `Generated from ORION-CORE memory: "${orionResult.content.substring(0, 80)}..."`,
      orionScore: orionResult.similarity || 0.7,
      confidence: orionResult.similarity || 0.7,
      contextType: context,
      orionMemoryId: orionResult.id,

      // Enhanced schema fields
      category: this.inferCategory(orionResult.content),
      complexity: pattern.characteristics.complexity,
      purpose: pattern.characteristics.purpose,
      visualStyle: this.inferVisualStyle(orionResult.content),

      // Extract rich information from ORION content
      palette: this.extractPalette(orionResult.content),
      motionPresets: this.extractMotionPresets(orionResult.content),
      modules: this.generateModulesFromContent(orionResult.content, pattern),
      tags: this.extractTags(orionResult.content, pattern),

      // AI-enhanced features
      generationMethod: 'orion-rag-enhanced',
      learningData: {
        sourceMemory: orionResult.id,
        similarity: orionResult.similarity,
        extractedFeatures: this.extractFeatures(orionResult.content)
      }
    };

    return new EnhancedTemplate(baseData);
  }

  createSyntheticTemplate(pattern, context, index) {
    const syntheticData = {
      id: `synthetic-${context}-${index}-${Date.now()}`,
      name: this.generateSyntheticName(pattern, context),
      summary: `AI-synthesized ${pattern.characteristics.purpose} template optimized for ${pattern.characteristics.focusAreas.join(', ')}`,
      reason: 'Synthesized template generated when ORION memory patterns insufficient',
      orionScore: 0.6 + (Math.random() * 0.2),
      confidence: 0.6 + (Math.random() * 0.2),
      contextType: context,

      category: this.mapContextToCategory(context),
      complexity: pattern.characteristics.complexity,
      purpose: pattern.characteristics.purpose,
      visualStyle: 'modern',

      generationMethod: 'synthetic-enhanced',
      learningData: {
        sourcePattern: pattern.characteristics,
        synthetic: true
      }
    };

    return new EnhancedTemplate(syntheticData);
  }

  extractTemplateName(content) {
    const patterns = [
      /(?:created|built|implemented|designed)\s+([A-Z][^.!?]*(?:component|template|layout|design|interface|system))/i,
      /([A-Z][^.!?]*(?:template|design|layout|component|interface|system))/i,
      /ORION[^.!?]*(?:enhanced|powered|integrated)\s+([A-Z][^.!?]*)/i
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[1].trim();
    }

    return 'ORION-Enhanced Template';
  }

  extractSummary(content) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30);
    return sentences[0]?.trim().substring(0, 150) + '...' || 'AI-generated template with ORION-CORE intelligence';
  }

  extractPalette(content) {
    const colorRegex = /#[0-9A-Fa-f]{6}/g;
    const colors = content.match(colorRegex);

    if (colors && colors.length >= 3) {
      return colors.slice(0, 4);
    }

    // Generate semantic palette based on content themes
    if (content.toLowerCase().includes('dashboard')) {
      return ['#1E293B', '#3B82F6', '#10B981', '#F59E0B'];
    } else if (content.toLowerCase().includes('creative') || content.toLowerCase().includes('art')) {
      return ['#0F172A', '#8B5CF6', '#EC4899', '#F59E0B'];
    }

    return ['#1E293B', '#3B82F6', '#10B981', '#F59E0B']; // Default modern palette
  }

  extractMotionPresets(content) {
    const motionKeywords = {
      'fade': ['fade-in', 'fade-out', 'fade-through'],
      'slide': ['slide-in', 'slide-up', 'slide-panel'],
      'zoom': ['zoom-in', 'scale-up', 'zoom-reveal'],
      'bounce': ['bounce-in', 'elastic-bounce', 'spring-bounce'],
      'rotate': ['rotate-in', 'spin-reveal', 'twist-enter'],
      'stagger': ['stagger-children', 'cascade-in', 'sequence-reveal'],
      'parallax': ['parallax-scroll', 'depth-movement', 'layered-motion'],
      'morph': ['shape-morph', 'liquid-transition', 'organic-flow']
    };

    const detectedMotions = [];
    const lowerContent = content.toLowerCase();

    for (const [keyword, presets] of Object.entries(motionKeywords)) {
      if (lowerContent.includes(keyword)) {
        detectedMotions.push(...presets.slice(0, 1)); // Add first preset for each detected keyword
      }
    }

    return detectedMotions.length > 0 ? detectedMotions.slice(0, 3) : ['fade-in', 'slide-up', 'scale-in'];
  }

  generateModulesFromContent(content, pattern) {
    const moduleKeywords = {
      'header': { type: 'navigation', emphasis: 'layout' },
      'hero': { type: 'visual', emphasis: 'impact' },
      'navigation': { type: 'navigation', emphasis: 'usability' },
      'gallery': { type: 'media', emphasis: 'visual' },
      'form': { type: 'input', emphasis: 'interaction' },
      'dashboard': { type: 'data', emphasis: 'information' },
      'card': { type: 'content', emphasis: 'modularity' },
      'search': { type: 'functional', emphasis: 'utility' },
      'footer': { type: 'navigation', emphasis: 'completion' }
    };

    const detectedModules = [];
    const lowerContent = content.toLowerCase();

    for (const [keyword, config] of Object.entries(moduleKeywords)) {
      if (lowerContent.includes(keyword)) {
        detectedModules.push({
          name: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Component`,
          type: config.type,
          description: `AI-extracted ${keyword} component optimized for ${config.emphasis}`,
          emphasis: config.emphasis,
          animation: this.selectAppropriateAnimation(config.type),
          customizable: true,
          aiGenerated: true,
          orionExtracted: true
        });
      }
    }

    // Ensure minimum modules based on pattern focus areas
    if (detectedModules.length < 2) {
      pattern.characteristics.focusAreas.forEach(area => {
        detectedModules.push(this.generateModuleForFocusArea(area));
      });
    }

    return detectedModules.slice(0, 4); // Limit to 4 modules
  }

  selectAppropriateAnimation(moduleType) {
    const animations = {
      'navigation': 'slide-in',
      'visual': 'fade-in-scale',
      'data': 'stagger-reveal',
      'content': 'fade-up',
      'input': 'focus-highlight',
      'functional': 'zoom-in',
      'media': 'image-reveal'
    };

    return animations[moduleType] || 'fade-in';
  }

  generateModuleForFocusArea(focusArea) {
    const focusModules = {
      'conversion': {
        name: 'Conversion Optimizer',
        description: 'AI-optimized conversion flow component',
        emphasis: 'engagement',
        animation: 'attention-pulse'
      },
      'visual-impact': {
        name: 'Visual Impact Hero',
        description: 'High-impact visual storytelling component',
        emphasis: 'visual',
        animation: 'dramatic-entrance'
      },
      'data-clarity': {
        name: 'Data Clarity Dashboard',
        description: 'Clear data presentation and visualization',
        emphasis: 'information',
        animation: 'data-reveal'
      },
      'modularity': {
        name: 'Modular Building Block',
        description: 'Flexible, reusable component system',
        emphasis: 'architecture',
        animation: 'component-assembly'
      }
    };

    return focusModules[focusArea] || {
      name: 'Smart Component',
      description: 'AI-generated component for enhanced user experience',
      emphasis: 'utility',
      animation: 'smart-reveal'
    };
  }

  extractTags(content, pattern) {
    const commonTags = ['responsive', 'modern', 'accessible', 'performance', 'mobile-first', 'seo-friendly'];
    const contextTags = {
      'landing_pages': ['conversion', 'marketing', 'hero-focused'],
      'dashboards': ['data-driven', 'functional', 'workflow'],
      'portfolios': ['creative', 'showcase', 'visual-story'],
      'modular_systems': ['component-based', 'scalable', 'systematic']
    };

    const extractedTags = [...commonTags.slice(0, 3)];

    if (contextTags[pattern]) {
      extractedTags.push(...contextTags[pattern]);
    }

    // Add AI-specific tags
    extractedTags.push('orion-powered', 'ai-enhanced');

    return [...new Set(extractedTags)].slice(0, 8);
  }

  // Helper methods
  inferCategory(content) {
    if (content.toLowerCase().includes('dashboard')) return 'dashboard';
    if (content.toLowerCase().includes('landing')) return 'landing';
    if (content.toLowerCase().includes('portfolio')) return 'portfolio';
    if (content.toLowerCase().includes('ecommerce')) return 'ecommerce';
    return 'general';
  }

  inferVisualStyle(content) {
    if (content.toLowerCase().includes('minimal')) return 'minimal';
    if (content.toLowerCase().includes('bold')) return 'bold';
    if (content.toLowerCase().includes('elegant')) return 'elegant';
    if (content.toLowerCase().includes('playful')) return 'playful';
    return 'modern';
  }

  extractFeatures(content) {
    const features = [];
    const featureKeywords = ['responsive', 'animated', 'interactive', 'accessible', 'performance', 'seo'];

    featureKeywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword)) {
        features.push(keyword);
      }
    });

    return features;
  }

  generateSyntheticName(pattern, context) {
    const names = {
      'landing_pages': ['Conversion Hero', 'Impact Landing', 'Engagement Focus'],
      'dashboards': ['Analytics Hub', 'Data Command', 'Insight Center'],
      'portfolios': ['Creative Showcase', 'Visual Story', 'Artist Gallery'],
      'modular_systems': ['Component Library', 'Design System', 'Modular Framework']
    };

    const contextNames = names[context] || ['Modern Template'];
    return contextNames[Math.floor(Math.random() * contextNames.length)];
  }

  mapContextToCategory(context) {
    const mapping = {
      'landing_pages': 'landing',
      'dashboards': 'dashboard',
      'portfolios': 'portfolio',
      'modular_systems': 'system'
    };
    return mapping[context] || 'general';
  }

  calculateOverallConfidence(templates) {
    if (templates.length === 0) return 0;
    const total = templates.reduce((sum, template) => sum + template.design.confidence, 0);
    return total / templates.length;
  }

  generateFallbackTemplates(context, limit) {
    console.log('🔄 Generating fallback enhanced templates...');

    const fallbackTemplates = Array.from({ length: limit }, (_, index) => {
      const template = this.createSyntheticTemplate(
        this.templatePatterns[context] || this.templatePatterns['modular_systems'],
        context,
        index
      );
      return template.toPlaygroundFormat();
    });

    return {
      success: true,
      templates: fallbackTemplates,
      metadata: {
        context,
        enhancedSchemas: true,
        fallbackMode: true
      },
      contextUsed: [context],
      confidence: 0.6,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { EnhancedTemplate, EnhancedTemplateGenerator };