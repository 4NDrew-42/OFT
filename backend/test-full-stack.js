#!/usr/bin/env node

/**
 * AI Marketplace Full Stack Connection Test
 * Tests all backend services, security, and API endpoints
 */

const axios = require('axios');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  AI_SERVICE: 'http://localhost:4001',
  WS_SERVICE: 'ws://localhost:3004',
  ORION_VECTOR: 'http://192.168.50.79:8081',
  TUNNEL_API: process.env.TUNNEL_API_URL || null,
  TUNNEL_WS: process.env.TUNNEL_WS_URL || null,
  TIMEOUT: 10000
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warning: '\x1b[33m', // Yellow
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function addResult(testName, passed, message, data = null) {
  results.tests.push({ testName, passed, message, data, timestamp: new Date().toISOString() });
  if (passed) {
    results.passed++;
    log(`✅ ${testName}: ${message}`, 'success');
  } else {
    results.failed++;
    log(`❌ ${testName}: ${message}`, 'error');
  }
}

// Test functions
async function testHealthEndpoints() {
  log('Testing health endpoints...', 'info');
  
  const services = [
    { name: 'AI Service', url: `${CONFIG.AI_SERVICE}/health` },
    { name: 'WebSocket Service', url: `${CONFIG.WS_SERVICE.replace('ws://', 'http://')}/health` },
    { name: 'ORION Vector Service', url: `${CONFIG.ORION_VECTOR}/health` }
  ];

  for (const service of services) {
    try {
      const start = performance.now();
      const response = await axios.get(service.url, { timeout: CONFIG.TIMEOUT });
      const duration = Math.round(performance.now() - start);
      
      if (response.status === 200 && response.data.status) {
        addResult(
          `Health Check - ${service.name}`,
          true,
          `Healthy (${duration}ms)`,
          { status: response.data.status, duration }
        );
      } else {
        addResult(`Health Check - ${service.name}`, false, 'Invalid health response');
      }
    } catch (error) {
      addResult(`Health Check - ${service.name}`, false, `Connection failed: ${error.message}`);
    }
  }
}

async function testVectorSearchAPI() {
  log('Testing vector search API...', 'info');
  
  const testQueries = [
    { query: 'modern art', limit: 3 },
    { query: 'abstract painting', limit: 5 },
    { query: 'digital artwork', limit: 2 }
  ];

  for (const testQuery of testQueries) {
    try {
      const start = performance.now();
      const response = await axios.post(
        `${CONFIG.AI_SERVICE}/api/ai/search/vector`,
        testQuery,
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: CONFIG.TIMEOUT 
        }
      );
      const duration = Math.round(performance.now() - start);

      if (response.status === 200 && response.data.success && response.data.results) {
        addResult(
          `Vector Search - "${testQuery.query}"`,
          true,
          `${response.data.results.length} results (${duration}ms)`,
          { 
            resultCount: response.data.results.length,
            duration,
            orionPowered: response.data.orionPowered 
          }
        );
      } else {
        addResult(`Vector Search - "${testQuery.query}"`, false, 'Invalid API response');
      }
    } catch (error) {
      addResult(`Vector Search - "${testQuery.query}"`, false, `API call failed: ${error.message}`);
    }
  }
}

async function testWebSocketConnection() {
  log('Testing WebSocket connection...', 'info');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(`${CONFIG.WS_SERVICE}/?userId=test-connection`);
    let messagesReceived = 0;
    let connectionEstablished = false;
    
    const timeout = setTimeout(() => {
      if (!connectionEstablished) {
        addResult('WebSocket Connection', false, 'Connection timeout');
        ws.terminate();
        resolve();
      }
    }, CONFIG.TIMEOUT);

    ws.on('open', () => {
      connectionEstablished = true;
      log('WebSocket connected, testing message exchange...', 'info');
      
      // Send ping
      ws.send(JSON.stringify({ type: 'ping' }));
      
      // Request content
      ws.send(JSON.stringify({ 
        type: 'request_content', 
        count: 2,
        requestId: 'test-123'
      }));
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        messagesReceived++;
        
        if (message.type === 'connection') {
          addResult('WebSocket Connection', true, 'Connection established');
        } else if (message.type === 'pong') {
          addResult('WebSocket Ping/Pong', true, 'Ping/pong successful');
        } else if (message.type === 'content_response') {
          addResult(
            'WebSocket Content Request', 
            true, 
            `Received ${message.data.items?.length || 0} items`,
            { itemCount: message.data.items?.length }
          );
        }
        
        // Close after receiving a few messages
        if (messagesReceived >= 3) {
          clearTimeout(timeout);
          ws.close();
          resolve();
        }
      } catch (error) {
        addResult('WebSocket Message Parse', false, `Invalid JSON: ${error.message}`);
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      addResult('WebSocket Connection', false, `Connection error: ${error.message}`);
      resolve();
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      if (messagesReceived === 0) {
        addResult('WebSocket Connection', false, 'Connection closed without messages');
      }
      resolve();
    });
  });
}

async function testSecurityHeaders() {
  log('Testing security headers...', 'info');
  
  try {
    const response = await axios.get(`${CONFIG.AI_SERVICE}/health`, { timeout: CONFIG.TIMEOUT });
    const headers = response.headers;
    
    // Check CORS headers
    const corsOrigin = headers['access-control-allow-origin'];
    if (corsOrigin) {
      addResult('Security - CORS Headers', true, `CORS configured: ${corsOrigin}`);
    } else {
      addResult('Security - CORS Headers', false, 'CORS headers missing');
    }
    
    // Check for security headers
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection'
    ];
    
    let securityScore = 0;
    securityHeaders.forEach(header => {
      if (headers[header]) {
        securityScore++;
      }
    });
    
    addResult(
      'Security - HTTP Headers',
      securityScore > 0,
      `${securityScore}/${securityHeaders.length} security headers present`
    );
    
  } catch (error) {
    addResult('Security - Headers Test', false, `Failed to test headers: ${error.message}`);
  }
}

async function testTunnelConnections() {
  if (!CONFIG.TUNNEL_API && !CONFIG.TUNNEL_WS) {
    log('Skipping tunnel tests - no tunnel URLs provided', 'warning');
    return;
  }
  
  log('Testing tunnel connections...', 'info');
  
  if (CONFIG.TUNNEL_API) {
    try {
      const response = await axios.get(`${CONFIG.TUNNEL_API}/health`, { timeout: CONFIG.TIMEOUT });
      if (response.status === 200) {
        addResult('Tunnel - API Health', true, 'Tunnel API accessible');
      } else {
        addResult('Tunnel - API Health', false, `Unexpected status: ${response.status}`);
      }
    } catch (error) {
      addResult('Tunnel - API Health', false, `Tunnel not accessible: ${error.message}`);
    }
  }
  
  if (CONFIG.TUNNEL_WS) {
    // Test WebSocket tunnel (convert wss:// to https:// for health check)
    const httpUrl = CONFIG.TUNNEL_WS.replace('wss://', 'https://').replace('ws://', 'http://');
    try {
      const response = await axios.get(`${httpUrl}/health`, { timeout: CONFIG.TIMEOUT });
      if (response.status === 200) {
        addResult('Tunnel - WebSocket Health', true, 'Tunnel WebSocket accessible');
      } else {
        addResult('Tunnel - WebSocket Health', false, `Unexpected status: ${response.status}`);
      }
    } catch (error) {
      addResult('Tunnel - WebSocket Health', false, `Tunnel not accessible: ${error.message}`);
    }
  }
}

async function testAPIRateLimiting() {
  log('Testing API rate limiting...', 'info');
  
  const requests = [];
  const testQuery = { query: 'rate limit test', limit: 1 };
  
  // Send 10 rapid requests
  for (let i = 0; i < 10; i++) {
    requests.push(
      axios.post(
        `${CONFIG.AI_SERVICE}/api/ai/search/vector`,
        testQuery,
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: CONFIG.TIMEOUT,
          validateStatus: () => true // Accept all status codes
        }
      )
    );
  }
  
  try {
    const responses = await Promise.all(requests);
    const statusCodes = responses.map(r => r.status);
    const rateLimited = statusCodes.filter(code => code === 429).length;
    
    if (rateLimited > 0) {
      addResult('Security - Rate Limiting', true, `${rateLimited}/10 requests rate limited`);
    } else {
      addResult('Security - Rate Limiting', false, 'No rate limiting detected (may be intentional)');
    }
  } catch (error) {
    addResult('Security - Rate Limiting', false, `Rate limit test failed: ${error.message}`);
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting AI Marketplace Full Stack Tests', 'info');
  log(`Configuration: ${JSON.stringify(CONFIG, null, 2)}`, 'info');
  
  const startTime = performance.now();
  
  try {
    await testHealthEndpoints();
    await testVectorSearchAPI();
    await testWebSocketConnection();
    await testSecurityHeaders();
    await testTunnelConnections();
    await testAPIRateLimiting();
  } catch (error) {
    log(`Test suite error: ${error.message}`, 'error');
  }
  
  const duration = Math.round(performance.now() - startTime);
  
  // Print summary
  log('\n📊 TEST SUMMARY', 'info');
  log(`Total Tests: ${results.passed + results.failed}`, 'info');
  log(`Passed: ${results.passed}`, 'success');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'error' : 'info');
  log(`Duration: ${duration}ms`, 'info');
  
  if (results.failed === 0) {
    log('🎉 All tests passed! Backend is ready for production.', 'success');
  } else {
    log('⚠️  Some tests failed. Check the issues above.', 'warning');
  }
  
  // Export results for CI/CD
  if (process.env.EXPORT_RESULTS) {
    require('fs').writeFileSync('test-results.json', JSON.stringify(results, null, 2));
    log('Test results exported to test-results.json', 'info');
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { runAllTests, CONFIG };
