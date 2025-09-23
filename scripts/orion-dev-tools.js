#!/usr/bin/env node

/**
 * ORION-CORE Development Tools
 * Command-line tools for leveraging ORION-CORE MCP in development workflow
 */

const { Command } = require('commander');
const DevelopmentContextManager = require('../backend/ai-service/orion-bridge/development-context');

const program = new Command();
const devContext = new DevelopmentContextManager();

program
  .name('orion-dev')
  .description('ORION-CORE powered development tools')
  .version('1.0.0');

// Store architecture decision
program
  .command('arch-decision')
  .description('Store an architecture decision in ORION-CORE memory')
  .requiredOption('-t, --title <title>', 'Decision title')
  .requiredOption('-p, --problem <problem>', 'Problem being solved')
  .requiredOption('-d, --decision <decision>', 'Decision made')
  .requiredOption('-r, --rationale <rationale>', 'Decision rationale')
  .option('-c, --consequences <consequences>', 'Decision consequences')
  .option('-s, --status <status>', 'Decision status', 'proposed')
  .option('--components <components>', 'Affected components (comma-separated)')
  .option('--stakeholders <stakeholders>', 'Stakeholders involved (comma-separated)')
  .option('--tags <tags>', 'Tags for categorization (comma-separated)')
  .action(async (options) => {
    try {
      const decision = {
        title: options.title,
        problem: options.problem,
        decision: options.decision,
        rationale: options.rationale,
        consequences: options.consequences,
        status: options.status,
        components: options.components?.split(',') || [],
        stakeholders: options.stakeholders?.split(',') || [],
        tags: options.tags?.split(',') || []
      };

      const result = await devContext.storeArchitectureDecision(decision);

      if (result.success) {
        console.log('✅ Architecture decision stored successfully');
        console.log(`📝 Decision ID: ${decision.title}`);
        console.log(`🔍 Searchable in ORION-CORE memory`);
      } else {
        console.error('❌ Failed to store architecture decision:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Store code pattern
program
  .command('code-pattern')
  .description('Store a reusable code pattern in ORION-CORE memory')
  .requiredOption('-n, --name <name>', 'Pattern name')
  .requiredOption('-d, --description <description>', 'Pattern description')
  .requiredOption('-u, --use-case <useCase>', 'When to use this pattern')
  .requiredOption('-c, --code <code>', 'Implementation code')
  .option('-l, --language <language>', 'Programming language', 'javascript')
  .option('--complexity <complexity>', 'Pattern complexity', 'medium')
  .option('--category <category>', 'Pattern category', 'general')
  .option('--framework <framework>', 'Framework used')
  .option('--orion-related', 'Mark as ORION-CORE related')
  .option('--best-practices <practices>', 'Best practices (comma-separated)')
  .option('--anti-patterns <antiPatterns>', 'Anti-patterns (comma-separated)')
  .option('--tags <tags>', 'Tags (comma-separated)')
  .action(async (options) => {
    try {
      const pattern = {
        name: options.name,
        description: options.description,
        useCase: options.useCase,
        code: options.code,
        language: options.language,
        complexity: options.complexity,
        category: options.category,
        framework: options.framework,
        orionRelated: options.orionRelated || false,
        bestPractices: options.bestPractices?.split(',') || [],
        antiPatterns: options.antiPatterns?.split(',') || [],
        tags: options.tags?.split(',') || []
      };

      const result = await devContext.storeCodePattern(pattern);

      if (result.success) {
        console.log('✅ Code pattern stored successfully');
        console.log(`📝 Pattern: ${pattern.name}`);
        console.log(`🔍 Searchable by: ${pattern.category}, ${pattern.language}, ORION-CORE`);
      } else {
        console.error('❌ Failed to store code pattern:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Store ORION integration
program
  .command('orion-integration')
  .description('Document ORION-CORE integration in memory')
  .requiredOption('-f, --feature <feature>', 'Feature name')
  .requiredOption('-t, --type <type>', 'Integration type (vector-search, embeddings, memory, etc.)')
  .requiredOption('-i, --implementation <implementation>', 'Implementation details')
  .option('-s, --services <services>', 'ORION services used (comma-separated)')
  .option('--config <config>', 'Configuration JSON')
  .option('--performance <performance>', 'Performance considerations (comma-separated)')
  .option('--testing <testing>', 'Testing strategy')
  .option('--monitoring <monitoring>', 'Monitoring points (comma-separated)')
  .option('--complexity <complexity>', 'Integration complexity', 'medium')
  .action(async (options) => {
    try {
      const integration = {
        feature: options.feature,
        type: options.type,
        implementation: options.implementation,
        services: options.services?.split(',') || [],
        config: options.config ? JSON.parse(options.config) : null,
        performance: options.performance?.split(',') || [],
        testing: options.testing,
        monitoring: options.monitoring?.split(',') || [],
        complexity: options.complexity
      };

      const result = await devContext.storeOrionIntegration(integration);

      if (result.success) {
        console.log('✅ ORION integration documented successfully');
        console.log(`🤖 Feature: ${integration.feature}`);
        console.log(`🔧 Type: ${integration.type}`);
        console.log(`📊 Services: ${integration.services.join(', ')}`);
      } else {
        console.error('❌ Failed to store ORION integration:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Store feature implementation
program
  .command('feature')
  .description('Document feature implementation in ORION-CORE memory')
  .requiredOption('-n, --name <name>', 'Feature name')
  .requiredOption('-u, --user-story <userStory>', 'User story')
  .requiredOption('-a, --approach <approach>', 'Implementation approach')
  .option('--acceptance-criteria <criteria>', 'Acceptance criteria (semicolon-separated)')
  .option('--components <components>', 'Technical components (semicolon-separated)')
  .option('--orion-integration <integration>', 'ORION-CORE integration details')
  .option('--dependencies <dependencies>', 'Dependencies (comma-separated)')
  .option('--testing <testing>', 'Testing strategy')
  .option('--performance <performance>', 'Performance considerations')
  .option('--security <security>', 'Security considerations')
  .option('--priority <priority>', 'Priority level', 'medium')
  .option('--complexity <complexity>', 'Implementation complexity', 'medium')
  .action(async (options) => {
    try {
      const feature = {
        name: options.name,
        userStory: options.userStory,
        approach: options.approach,
        acceptanceCriteria: options.acceptanceCriteria?.split(';') || [],
        components: options.components?.split(';').map(c => {
          const [name, description] = c.split(':');
          return { name: name?.trim(), description: description?.trim() || '' };
        }) || [],
        orionIntegration: options.orionIntegration,
        dependencies: options.dependencies?.split(',') || [],
        testing: options.testing,
        performance: options.performance,
        security: options.security,
        priority: options.priority,
        complexity: options.complexity,
        orionEnhanced: !!options.orionIntegration
      };

      const result = await devContext.storeFeatureImplementation(feature);

      if (result.success) {
        console.log('✅ Feature implementation documented successfully');
        console.log(`🎯 Feature: ${feature.name}`);
        console.log(`📋 Priority: ${feature.priority}`);
        console.log(`🤖 ORION Enhanced: ${feature.orionEnhanced ? 'Yes' : 'No'}`);
      } else {
        console.error('❌ Failed to store feature implementation:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Search development context
program
  .command('search')
  .description('Search development context using ORION-CORE RAG')
  .argument('<query>', 'Search query')
  .option('-l, --limit <limit>', 'Number of results', '10')
  .option('-t, --threshold <threshold>', 'Relevance threshold', '0.7')
  .option('--type <types>', 'Context types to search (comma-separated)')
  .option('--format <format>', 'Output format (json, table, summary)', 'summary')
  .action(async (query, options) => {
    try {
      const searchOptions = {
        limit: parseInt(options.limit),
        threshold: parseFloat(options.threshold),
        contextTypes: options.type?.split(',') || undefined
      };

      console.log(`🔍 Searching ORION-CORE memory for: "${query}"`);
      console.log(`📊 Parameters: limit=${searchOptions.limit}, threshold=${searchOptions.threshold}`);
      console.log('');

      const result = await devContext.searchDevelopmentContext(query, searchOptions);

      if (result.success) {
        console.log(`✅ Found ${result.results.length} relevant results`);
        console.log('');

        if (options.format === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else if (options.format === 'table') {
          // Table format implementation
          result.results.forEach((r, i) => {
            console.log(`${i + 1}. ${r.context_summary}`);
            console.log(`   Relevance: ${(r.relevance_score * 100).toFixed(1)}%`);
            console.log(`   ORION Integration: ${r.orion_integration_level}`);
            console.log('');
          });
        } else {
          // Summary format (default)
          result.results.forEach((r, i) => {
            console.log(`📝 ${i + 1}. ${r.context_summary}`);
            console.log(`   🎯 Relevance: ${(r.relevance_score * 100).toFixed(1)}%`);
            if (r.actionable_insights?.length > 0) {
              console.log(`   💡 Insights: ${r.actionable_insights.join(', ')}`);
            }
            console.log('');
          });

          if (result.recommendations?.length > 0) {
            console.log('🎯 Recommendations:');
            result.recommendations.forEach(rec => {
              console.log(`   • ${rec.title}: ${rec.description}`);
            });
            console.log('');
          }

          if (result.insights) {
            console.log('📊 Development Insights:');
            if (Object.keys(result.insights.orion_usage_patterns).length > 0) {
              console.log(`   🤖 ORION Usage: ${Object.entries(result.insights.orion_usage_patterns).map(([k, v]) => `${k}(${v})`).join(', ')}`);
            }
            if (Object.keys(result.insights.common_patterns).length > 0) {
              console.log(`   🔧 Common Patterns: ${Object.entries(result.insights.common_patterns).map(([k, v]) => `${k}(${v})`).join(', ')}`);
            }
          }
        }
      } else {
        console.error('❌ Search failed:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Project analytics
program
  .command('analytics')
  .description('Generate project analytics using ORION-CORE insights')
  .option('--format <format>', 'Output format (json, summary)', 'summary')
  .action(async (options) => {
    try {
      console.log('📊 Generating project analytics from ORION-CORE memory...');
      console.log('');

      const result = await devContext.generateProjectAnalytics();

      if (result.success) {
        if (options.format === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('✅ Project Analytics Generated');
          console.log('');

          const analytics = result.analytics;

          if (analytics.development_velocity) {
            console.log(`🚀 Development Velocity: ${analytics.development_velocity}`);
          }

          if (analytics.orion_adoption_rate) {
            console.log(`🤖 ORION Adoption Rate: ${analytics.orion_adoption_rate}%`);
          }

          if (analytics.code_quality_trends) {
            console.log(`📈 Code Quality Trend: ${analytics.code_quality_trends}`);
          }

          if (analytics.knowledge_coverage) {
            console.log(`📚 Knowledge Coverage: ${analytics.knowledge_coverage}%`);
          }

          if (result.recommendations?.length > 0) {
            console.log('');
            console.log('🎯 Project Recommendations:');
            result.recommendations.forEach(rec => {
              console.log(`   • ${rec.title}: ${rec.description}`);
            });
          }
        }
      } else {
        console.error('❌ Analytics generation failed:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Health check
program
  .command('health')
  .description('Check ORION-CORE development context system health')
  .action(async () => {
    try {
      console.log('🔍 Checking ORION-CORE development context system...');

      const health = await devContext.healthCheck();

      if (health.status === 'healthy') {
        console.log('✅ System Health: Healthy');
        console.log(`🔗 MCP Connection: ${health.mcp_connection}`);
        console.log(`📁 Project ID: ${health.project_id}`);
        console.log(`📊 Context Types: ${health.context_types}`);
        console.log(`🕐 Last Check: ${health.timestamp}`);
      } else {
        console.log('❌ System Health: Error');
        console.log(`🔗 MCP Connection: ${health.mcp_connection}`);
        console.log(`❌ Error: ${health.error}`);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      process.exit(1);
    }
  });

// Initialize project context
program
  .command('init')
  .description('Initialize project in ORION-CORE memory system')
  .action(async () => {
    try {
      console.log('🚀 Initializing AI-Marketplace project in ORION-CORE memory...');

      // Store initial project context
      const projectContext = {
        name: 'AI-Marketplace Project Initialization',
        description: 'Dynamic AI-powered art marketplace with ORION-CORE integration',
        implementation: `Project initialized with:
- Next.js 14 frontend with Framer Motion and GSAP
- Node.js backend with microservices architecture
- ORION-CORE integration for AI features
- Vector search, embeddings, and memory management
- Real-time features with WebSocket
- Motion-rich UI with dynamic content feed`,
        feature: 'Project Foundation',
        type: 'system_initialization',
        services: ['vector-search', 'embeddings', 'memory', 'mcp'],
        complexity: 'high',
        status: 'initialized'
      };

      const result = await devContext.storeOrionIntegration(projectContext);

      if (result.success) {
        console.log('✅ Project initialized in ORION-CORE memory');
        console.log('🤖 AI-enhanced development workflow activated');
        console.log('📚 Ready to store and search development context');
        console.log('');
        console.log('Next steps:');
        console.log('  • Use "orion-dev arch-decision" to document architecture decisions');
        console.log('  • Use "orion-dev code-pattern" to store reusable patterns');
        console.log('  • Use "orion-dev search <query>" to find relevant context');
        console.log('  • Use "orion-dev analytics" to get project insights');
      } else {
        console.error('❌ Project initialization failed:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Initialization error:', error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}