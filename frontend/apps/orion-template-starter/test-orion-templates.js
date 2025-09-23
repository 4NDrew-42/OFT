// Test ORION-CORE template fetching
const http = require('http');

function testOrionTemplates() {
  console.log('🤖 Testing ORION-CORE template integration...\n');

  // Test ORION-CORE health
  const healthOptions = {
    hostname: '192.168.50.79',
    port: 8081,
    path: '/health',
    method: 'GET',
    timeout: 5000
  };

  const healthReq = http.request(healthOptions, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const health = JSON.parse(data);
        console.log('✅ ORION-CORE Health:', health);
        console.log(`📊 Vectors stored: ${health.vectors_stored}`);
        console.log(`🔄 Uptime: ${(health.uptime_seconds / 3600).toFixed(1)} hours\n`);
        
        // Test memory search for templates
        testMemorySearch();
      } catch (error) {
        console.error('❌ Health check failed:', error.message);
      }
    });
  });

  healthReq.on('error', (error) => {
    console.error('❌ ORION-CORE connection failed:', error.message);
  });

  healthReq.end();
}

function testMemorySearch() {
  console.log('🔍 Testing ORION memory search for templates...\n');

  const searchData = JSON.stringify({
    query: 'modular design templates creative layouts UI components',
    limit: 3,
    threshold: 0.6
  });

  const searchOptions = {
    hostname: '192.168.50.79',
    port: 8081,
    path: '/api/memory/search',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(searchData)
    }
  };

  const searchReq = http.request(searchOptions, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const results = JSON.parse(data);
        console.log('🎨 Template search results:');
        
        if (results.results && results.results.length > 0) {
          results.results.forEach((result, index) => {
            console.log(`\n${index + 1}. Template from ORION Memory:`);
            console.log(`   📝 Content: ${result.content.substring(0, 100)}...`);
            console.log(`   🎯 Similarity: ${(result.similarity * 100).toFixed(1)}%`);
            console.log(`   🔗 ID: ${result.id}`);
          });
          
          console.log('\n✨ Template generation would work with these results!');
          generateMockTemplates(results.results);
        } else {
          console.log('📭 No template results found - fallback templates would be used');
          generateFallbackTemplates();
        }
      } catch (error) {
        console.error('❌ Memory search failed:', error.message);
        generateFallbackTemplates();
      }
    });
  });

  searchReq.on('error', (error) => {
    console.error('❌ Search request failed:', error.message);
    generateFallbackTemplates();
  });

  searchReq.write(searchData);
  searchReq.end();
}

function generateMockTemplates(orionResults) {
  console.log('\n🏗️ Generating mock templates from ORION data...\n');

  const templates = orionResults.map((result, index) => {
    return {
      id: `orion-template-${index + 1}`,
      name: extractTemplateName(result.content),
      summary: result.content.substring(0, 120) + '...',
      reason: `Generated from ORION-CORE memory: "${result.content.substring(0, 50)}..."`,
      orionScore: result.similarity,
      confidence: result.similarity,
      palette: ['#1E293B', '#3B82F6', '#10B981', '#F59E0B'],
      motionPresets: ['fade-stagger', 'slide-in', 'zoom-tiles'],
      modules: [
        {
          name: 'Dynamic Component',
          description: 'AI-extracted component from ORION memory',
          animation: 'fade-in',
          emphasis: 'layout'
        }
      ],
      tags: ['orion-powered', 'ai-generated', 'dynamic']
    };
  });

  console.log('🎨 Generated Templates:');
  templates.forEach((template, index) => {
    console.log(`\n${index + 1}. ${template.name}`);
    console.log(`   📄 ${template.summary}`);
    console.log(`   🤖 ORION Score: ${(template.orionScore * 100).toFixed(1)}%`);
    console.log(`   🎨 Palette: ${template.palette.join(', ')}`);
  });

  console.log('\n🚀 Template playground is ready to serve these AI-generated templates!');
}

function generateFallbackTemplates() {
  console.log('\n🔄 Using fallback templates (ORION offline mode)...\n');
  
  const fallbackTemplates = [
    'Aurora Bloom Landing - Floating cards with layered parallax',
    'Nebula Story Carousel - Immersive storytelling canvas',
    'Lumen Modular Grid - Responsive grid with adaptive components'
  ];

  fallbackTemplates.forEach((template, index) => {
    console.log(`${index + 1}. ${template}`);
  });

  console.log('\n✅ Fallback system ensures playground always works!');
}

function extractTemplateName(content) {
  const patterns = [
    /(?:created|built|implemented)\s+([A-Z][^.!?]*(?:component|template|layout|design))/i,
    /([A-Z][^.!?]*(?:template|design|layout|component))/i
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) return match[1].trim();
  }

  return 'ORION-Enhanced Template';
}

// Run the test
testOrionTemplates();
