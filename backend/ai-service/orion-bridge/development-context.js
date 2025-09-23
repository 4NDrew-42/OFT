/**
 * ORION-CORE Development Context Manager
 * Stores and retrieves development context using ORION-CORE MCP for enhanced RAG capabilities
 */

const axios = require('axios');

class DevelopmentContextManager {
  constructor() {
    this.orionMcpUrl = process.env.ORION_MCP_URL || 'http://localhost:8090';
    this.projectId = 'ai-marketplace-dev';

    // Context categories for development workflow
    this.contextTypes = {
      ARCHITECTURE_DECISION: 'architecture_decision',
      CODE_PATTERN: 'code_pattern',
      BUG_RESOLUTION: 'bug_resolution',
      FEATURE_IMPLEMENTATION: 'feature_implementation',
      PERFORMANCE_OPTIMIZATION: 'performance_optimization',
      SECURITY_CONSIDERATION: 'security_consideration',
      ORION_INTEGRATION: 'orion_integration',
      USER_STORY: 'user_story',
      TECHNICAL_DEBT: 'technical_debt',
      TESTING_STRATEGY: 'testing_strategy'
    };

    this.mcpClient = this.initializeMcpClient();
  }

  /**
   * Initialize MCP client for development context storage
   */
  initializeMcpClient() {
    return {
      storeContext: async (content, metadata = {}) => {
        try {
          const response = await axios.post(`${this.orionMcpUrl}/api/mcp/store-memory`, {
            content,
            metadata: {
              ...metadata,
              project_id: this.projectId,
              timestamp: new Date().toISOString(),
              source: 'development_workflow',
              version: '1.0'
            }
          });
          return response.data;
        } catch (error) {
          console.error('Development context storage error:', error);
          return { success: false, error: error.message };
        }
      },

      searchContext: async (query, options = {}) => {
        try {
          const response = await axios.post(`${this.orionMcpUrl}/api/mcp/search-memories`, {
            query,
            top_k: options.limit || 10,
            threshold: options.threshold || 0.7,
            filters: {
              project_id: this.projectId,
              ...options.filters
            },
            include_metadata: true,
            include_context: true
          });
          return response.data;
        } catch (error) {
          console.error('Development context search error:', error);
          return { results: [], error: error.message };
        }
      },

      getProjectInsights: async () => {
        try {
          const response = await axios.get(`${this.orionMcpUrl}/api/mcp/project/${this.projectId}/insights`);
          return response.data;
        } catch (error) {
          console.error('Project insights error:', error);
          return { insights: [], error: error.message };
        }
      }
    };
  }

  /**
   * Store architecture decision with ORION-CORE memory
   * @param {Object} decision - Architecture decision details
   * @returns {Promise<Object>} Storage result
   */
  async storeArchitectureDecision(decision) {
    const content = `Architecture Decision: ${decision.title}

Problem: ${decision.problem}
Decision: ${decision.decision}
Rationale: ${decision.rationale}
Consequences: ${decision.consequences || 'To be determined'}

Status: ${decision.status || 'proposed'}
Decision Date: ${decision.date || new Date().toISOString()}`;

    const metadata = {
      context_type: this.contextTypes.ARCHITECTURE_DECISION,
      decision_id: decision.id || `arch-${Date.now()}`,
      title: decision.title,
      status: decision.status || 'proposed',
      impact_level: decision.impact || 'medium',
      stakeholders: decision.stakeholders || [],
      related_components: decision.components || [],
      tags: decision.tags || [],
      decision_date: decision.date || new Date().toISOString()
    };

    const result = await this.mcpClient.storeContext(content, metadata);

    if (result.success) {
      console.log(`✅ Architecture decision stored: ${decision.title}`);
    }

    return result;
  }

  /**
   * Store code pattern for reuse and knowledge sharing
   * @param {Object} pattern - Code pattern details
   * @returns {Promise<Object>} Storage result
   */
  async storeCodePattern(pattern) {
    const content = `Code Pattern: ${pattern.name}

Description: ${pattern.description}
Use Case: ${pattern.useCase}

Implementation:
\`\`\`${pattern.language || 'javascript'}
${pattern.code}
\`\`\`

Best Practices:
${pattern.bestPractices?.map(bp => `- ${bp}`).join('\n') || 'None specified'}

Anti-patterns:
${pattern.antiPatterns?.map(ap => `- ${ap}`).join('\n') || 'None specified'}

Related Patterns: ${pattern.relatedPatterns?.join(', ') || 'None'}`;

    const metadata = {
      context_type: this.contextTypes.CODE_PATTERN,
      pattern_id: pattern.id || `pattern-${Date.now()}`,
      name: pattern.name,
      language: pattern.language || 'javascript',
      complexity: pattern.complexity || 'medium',
      category: pattern.category || 'general',
      framework: pattern.framework || null,
      orion_related: pattern.orionRelated || false,
      tags: pattern.tags || [],
      usage_count: 0,
      last_used: new Date().toISOString()
    };

    const result = await this.mcpClient.storeContext(content, metadata);

    if (result.success) {
      console.log(`✅ Code pattern stored: ${pattern.name}`);
    }

    return result;
  }

  /**
   * Store ORION-CORE integration context
   * @param {Object} integration - Integration details
   * @returns {Promise<Object>} Storage result
   */
  async storeOrionIntegration(integration) {
    const content = `ORION-CORE Integration: ${integration.feature}

Integration Type: ${integration.type}
ORION Services Used: ${integration.services?.join(', ') || 'Not specified'}

Implementation Details:
${integration.implementation}

Configuration:
${integration.config ? JSON.stringify(integration.config, null, 2) : 'Default configuration'}

Performance Considerations:
${integration.performance?.map(p => `- ${p}`).join('\n') || 'None documented'}

Testing Strategy:
${integration.testing || 'Standard integration tests'}

Monitoring Points:
${integration.monitoring?.map(m => `- ${m}`).join('\n') || 'Default monitoring'}`;

    const metadata = {
      context_type: this.contextTypes.ORION_INTEGRATION,
      integration_id: integration.id || `orion-${Date.now()}`,
      feature: integration.feature,
      integration_type: integration.type,
      orion_services: integration.services || [],
      complexity: integration.complexity || 'medium',
      performance_impact: integration.performanceImpact || 'low',
      dependencies: integration.dependencies || [],
      version: integration.version || '1.0',
      status: integration.status || 'implemented'
    };

    const result = await this.mcpClient.storeContext(content, metadata);

    if (result.success) {
      console.log(`✅ ORION integration stored: ${integration.feature}`);
    }

    return result;
  }

  /**
   * Store feature implementation context
   * @param {Object} feature - Feature implementation details
   * @returns {Promise<Object>} Storage result
   */
  async storeFeatureImplementation(feature) {
    const content = `Feature Implementation: ${feature.name}

User Story: ${feature.userStory}
Acceptance Criteria:
${feature.acceptanceCriteria?.map(ac => `- ${ac}`).join('\n') || 'None specified'}

Implementation Approach:
${feature.approach}

Technical Components:
${feature.components?.map(c => `- ${c.name}: ${c.description}`).join('\n') || 'None specified'}

ORION-CORE Integration:
${feature.orionIntegration || 'No ORION-CORE integration'}

Dependencies:
${feature.dependencies?.join(', ') || 'None'}

Testing Strategy:
${feature.testing}

Performance Considerations:
${feature.performance || 'Standard performance requirements'}

Security Considerations:
${feature.security || 'Standard security practices'}`;

    const metadata = {
      context_type: this.contextTypes.FEATURE_IMPLEMENTATION,
      feature_id: feature.id || `feature-${Date.now()}`,
      name: feature.name,
      priority: feature.priority || 'medium',
      complexity: feature.complexity || 'medium',
      epic: feature.epic || null,
      sprint: feature.sprint || null,
      assignee: feature.assignee || null,
      status: feature.status || 'in_progress',
      estimated_hours: feature.estimatedHours || null,
      actual_hours: feature.actualHours || null,
      orion_enhanced: feature.orionEnhanced || false,
      frontend_components: feature.frontendComponents || [],
      backend_services: feature.backendServices || [],
      database_changes: feature.databaseChanges || false
    };

    const result = await this.mcpClient.storeContext(content, metadata);

    if (result.success) {
      console.log(`✅ Feature implementation stored: ${feature.name}`);
    }

    return result;
  }

  /**
   * Store performance optimization context
   * @param {Object} optimization - Optimization details
   * @returns {Promise<Object>} Storage result
   */
  async storePerformanceOptimization(optimization) {
    const content = `Performance Optimization: ${optimization.area}

Problem Identified:
${optimization.problem}

Metrics Before:
${optimization.metricsBefore ? JSON.stringify(optimization.metricsBefore, null, 2) : 'Not measured'}

Solution Implemented:
${optimization.solution}

Metrics After:
${optimization.metricsAfter ? JSON.stringify(optimization.metricsAfter, null, 2) : 'Not measured yet'}

Tools Used:
${optimization.tools?.join(', ') || 'None specified'}

Lessons Learned:
${optimization.lessons?.map(l => `- ${l}`).join('\n') || 'None documented'}

Future Optimizations:
${optimization.futureOptimizations?.map(fo => `- ${fo}`).join('\n') || 'None identified'}`;

    const metadata = {
      context_type: this.contextTypes.PERFORMANCE_OPTIMIZATION,
      optimization_id: optimization.id || `perf-${Date.now()}`,
      area: optimization.area,
      impact_level: optimization.impact || 'medium',
      optimization_type: optimization.type || 'general',
      metrics_improved: optimization.metricsImproved || [],
      percentage_improvement: optimization.improvement || null,
      cost: optimization.cost || 'low',
      maintenance_required: optimization.maintenance || false,
      orion_related: optimization.orionRelated || false
    };

    const result = await this.mcpClient.storeContext(content, metadata);

    if (result.success) {
      console.log(`✅ Performance optimization stored: ${optimization.area}`);
    }

    return result;
  }

  /**
   * Search for relevant development context using RAG
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results with context
   */
  async searchDevelopmentContext(query, options = {}) {
    try {
      const searchResults = await this.mcpClient.searchContext(query, {
        limit: options.limit || 10,
        threshold: options.threshold || 0.7,
        filters: {
          context_type: options.contextTypes || Object.values(this.contextTypes),
          ...options.filters
        }
      });

      // Enhance results with development insights
      const enhancedResults = await this.enhanceSearchResults(searchResults.results || []);

      return {
        success: true,
        query,
        results: enhancedResults,
        insights: this.extractDevelopmentInsights(enhancedResults),
        recommendations: this.generateDevelopmentRecommendations(enhancedResults, query)
      };

    } catch (error) {
      console.error('Development context search error:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Enhance search results with additional context
   * @param {Array} results - Raw search results
   * @returns {Array} Enhanced results
   */
  async enhanceSearchResults(results) {
    return results.map(result => ({
      ...result,
      relevance_score: result.score || 0,
      context_summary: this.summarizeContext(result),
      related_patterns: this.findRelatedPatterns(result),
      actionable_insights: this.extractActionableInsights(result),
      orion_integration_level: this.assessOrionIntegration(result)
    }));
  }

  /**
   * Extract development insights from search results
   * @param {Array} results - Enhanced search results
   * @returns {Object} Development insights
   */
  extractDevelopmentInsights(results) {
    const insights = {
      common_patterns: {},
      frequent_technologies: {},
      orion_usage_patterns: {},
      performance_hotspots: [],
      security_considerations: [],
      technical_debt_areas: []
    };

    results.forEach(result => {
      const metadata = result.metadata || {};

      // Track common patterns
      if (metadata.context_type === this.contextTypes.CODE_PATTERN) {
        insights.common_patterns[metadata.category] =
          (insights.common_patterns[metadata.category] || 0) + 1;
      }

      // Track ORION usage
      if (metadata.orion_related || metadata.orion_enhanced) {
        const services = metadata.orion_services || ['general'];
        services.forEach(service => {
          insights.orion_usage_patterns[service] =
            (insights.orion_usage_patterns[service] || 0) + 1;
        });
      }

      // Identify performance hotspots
      if (metadata.context_type === this.contextTypes.PERFORMANCE_OPTIMIZATION) {
        insights.performance_hotspots.push({
          area: metadata.area,
          impact: metadata.impact_level,
          frequency: 1
        });
      }
    });

    return insights;
  }

  /**
   * Generate development recommendations based on context
   * @param {Array} results - Search results
   * @param {string} query - Original query
   * @returns {Array} Development recommendations
   */
  generateDevelopmentRecommendations(results, query) {
    const recommendations = [];

    // Analyze query intent
    const queryLower = query.toLowerCase();

    if (queryLower.includes('orion') || queryLower.includes('ai')) {
      recommendations.push({
        type: 'orion_integration',
        title: 'Leverage ORION-CORE Capabilities',
        description: 'Consider using ORION-CORE vector search, embeddings, or memory features',
        priority: 'high',
        effort: 'medium'
      });
    }

    if (queryLower.includes('performance') || queryLower.includes('optimization')) {
      recommendations.push({
        type: 'performance',
        title: 'Performance Optimization Opportunity',
        description: 'Review performance optimization patterns and metrics',
        priority: 'medium',
        effort: 'low'
      });
    }

    if (queryLower.includes('pattern') || queryLower.includes('implementation')) {
      recommendations.push({
        type: 'code_reuse',
        title: 'Code Pattern Reuse',
        description: 'Consider reusing existing proven patterns from the codebase',
        priority: 'medium',
        effort: 'low'
      });
    }

    return recommendations;
  }

  /**
   * Summarize context for quick understanding
   * @param {Object} result - Search result
   * @returns {string} Context summary
   */
  summarizeContext(result) {
    const metadata = result.metadata || {};
    const contextType = metadata.context_type || 'unknown';

    switch (contextType) {
      case this.contextTypes.ARCHITECTURE_DECISION:
        return `Architecture decision: ${metadata.title} (${metadata.status})`;
      case this.contextTypes.CODE_PATTERN:
        return `Code pattern: ${metadata.name} (${metadata.language})`;
      case this.contextTypes.ORION_INTEGRATION:
        return `ORION integration: ${metadata.feature} (${metadata.integration_type})`;
      case this.contextTypes.FEATURE_IMPLEMENTATION:
        return `Feature: ${metadata.name} (${metadata.status})`;
      case this.contextTypes.PERFORMANCE_OPTIMIZATION:
        return `Performance: ${metadata.area} optimization`;
      default:
        return `${contextType}: ${result.content?.substring(0, 100)}...`;
    }
  }

  /**
   * Find related patterns for a given result
   * @param {Object} result - Search result
   * @returns {Array} Related patterns
   */
  findRelatedPatterns(result) {
    // Implementation would search for related patterns
    // Based on tags, categories, and content similarity
    return [];
  }

  /**
   * Extract actionable insights from context
   * @param {Object} result - Search result
   * @returns {Array} Actionable insights
   */
  extractActionableInsights(result) {
    const insights = [];
    const metadata = result.metadata || {};

    if (metadata.orion_related && !metadata.orion_enhanced) {
      insights.push('Consider enhancing with additional ORION-CORE features');
    }

    if (metadata.performance_impact === 'high') {
      insights.push('Monitor performance impact in production');
    }

    if (metadata.complexity === 'high') {
      insights.push('Consider breaking down into smaller components');
    }

    return insights;
  }

  /**
   * Assess ORION integration level
   * @param {Object} result - Search result
   * @returns {string} Integration level
   */
  assessOrionIntegration(result) {
    const metadata = result.metadata || {};

    if (metadata.orion_services?.length > 2) return 'deep';
    if (metadata.orion_enhanced || metadata.orion_related) return 'moderate';
    if (metadata.context_type === this.contextTypes.ORION_INTEGRATION) return 'specific';
    return 'none';
  }

  /**
   * Generate project analytics using ORION-CORE insights
   * @returns {Promise<Object>} Project analytics
   */
  async generateProjectAnalytics() {
    try {
      const insights = await this.mcpClient.getProjectInsights();

      const analytics = {
        development_velocity: await this.calculateDevelopmentVelocity(),
        orion_adoption_rate: await this.calculateOrionAdoption(),
        code_quality_trends: await this.analyzeCodeQualityTrends(),
        knowledge_coverage: await this.assessKnowledgeCoverage(),
        technical_debt_status: await this.analyzeTechnicalDebt(),
        performance_trends: await this.analyzePerformanceTrends()
      };

      return {
        success: true,
        analytics,
        insights: insights.insights || [],
        recommendations: this.generateProjectRecommendations(analytics)
      };

    } catch (error) {
      console.error('Project analytics error:', error);
      return {
        success: false,
        error: error.message,
        analytics: {}
      };
    }
  }

  /**
   * Health check for development context system
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const testQuery = 'system health check';
      const searchResult = await this.mcpClient.searchContext(testQuery, { limit: 1 });

      return {
        status: 'healthy',
        mcp_connection: 'active',
        project_id: this.projectId,
        context_types: Object.keys(this.contextTypes).length,
        last_search_successful: !!searchResult.results,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'error',
        mcp_connection: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Additional helper methods for analytics
  async calculateDevelopmentVelocity() { /* Implementation */ }
  async calculateOrionAdoption() { /* Implementation */ }
  async analyzeCodeQualityTrends() { /* Implementation */ }
  async assessKnowledgeCoverage() { /* Implementation */ }
  async analyzeTechnicalDebt() { /* Implementation */ }
  async analyzePerformanceTrends() { /* Implementation */ }
  generateProjectRecommendations(analytics) { /* Implementation */ }
}

module.exports = DevelopmentContextManager;