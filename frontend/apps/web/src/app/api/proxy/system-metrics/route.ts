import crypto from "crypto";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

function base64url(input: Buffer | string) {
  const b = (typeof input === "string" ? Buffer.from(input) : input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return b;
}

function signHS256(payload: Record<string, any>, secret: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  const encodedSig = base64url(sig);
  return `${data}.${encodedSig}`;
}

// ORION-CORE node endpoints for real system metrics
const ORION_NODES = {
  'ORION-MEM': 'http://192.168.50.79:8081',
  'ORION-ORACLE': 'http://192.168.50.77:8089', 
  'ORION-PC': 'http://192.168.50.83:8000',
  'ORIONLPC': 'http://192.168.50.115:8090',
  'LEVIATHAN': 'http://192.168.50.79:9000' // Storage service
};

interface NodeMetrics {
  name: string;
  status: 'online' | 'warning' | 'error';
  uptime: number;
  services: Array<{
    name: string;
    port: number;
    status: 'running' | 'stopped' | 'error';
    latency?: number;
  }>;
  hardware?: {
    cpu: string;
    memory: string;
    gpu?: string;
  };
  metrics?: {
    cpuUsage: number;
    memoryUsage: number;
    networkLatency: number;
  };
}

async function checkNodeHealth(nodeName: string, baseUrl: string, token: string): Promise<NodeMetrics> {
  const startTime = Date.now();
  
  try {
    // Try health endpoint first
    const healthResponse = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Request-Id': crypto.randomUUID(),
      },
      signal: AbortSignal.timeout(5000)
    });

    const latency = Date.now() - startTime;
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      
      // Extract real metrics from health response
      const hardware = getNodeHardware(nodeName);
      return {
        name: nodeName,
        status: 'online',
        uptime: healthData.uptime_seconds || 0,
        services: getNodeServices(nodeName, 'running', latency),
        ...(hardware && { hardware }),
        metrics: {
          cpuUsage: Math.random() * 100, // TODO: Get real CPU usage
          memoryUsage: Math.random() * 100, // TODO: Get real memory usage
          networkLatency: latency
        }
      };
    } else {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }
  } catch (error) {
    console.warn(`Node ${nodeName} health check failed:`, error);
    
    const hardware = getNodeHardware(nodeName);
    return {
      name: nodeName,
      status: 'error',
      uptime: 0,
      services: getNodeServices(nodeName, 'error', 0),
      ...(hardware && { hardware }),
      metrics: {
        cpuUsage: 0,
        memoryUsage: 0,
        networkLatency: 9999
      }
    };
  }
}

function getNodeServices(nodeName: string, status: 'running' | 'error', latency: number): Array<{
  name: string;
  port: number;
  status: 'running' | 'stopped' | 'error';
  latency?: number;
}> {
  const serviceMap: Record<string, Array<{name: string, port: number}>> = {
    'ORION-MEM': [
      { name: 'PostgreSQL', port: 5432 },
      { name: 'Qdrant', port: 6333 },
      { name: 'Redis', port: 6379 },
      { name: 'Vector Service', port: 8081 }
    ],
    'ORION-ORACLE': [
      { name: 'Fabric Bridge', port: 8089 },
      { name: 'Gate API', port: 8085 }
    ],
    'ORION-PC': [
      { name: 'vLLM', port: 8000 },
      { name: 'Ollama', port: 11434 }
    ],
    'ORIONLPC': [
      { name: 'Vision Service', port: 8090 },
      { name: 'Embedding Service', port: 8091 }
    ],
    'LEVIATHAN': [
      { name: 'Storage Service', port: 9000 },
      { name: 'Backup Service', port: 9001 }
    ]
  };

  return (serviceMap[nodeName] || []).map(service => ({
    ...service,
    status: (status === 'running' ? 'running' : 'error') as 'running' | 'stopped' | 'error',
    latency: status === 'running' ? latency : undefined
  }));
}

function getNodeHardware(nodeName: string): {cpu: string, memory: string, gpu?: string} | undefined {
  const hardwareMap: Record<string, {cpu: string, memory: string, gpu?: string}> = {
    'ORION-MEM': {
      cpu: 'Intel Xeon E5-2680 v4',
      memory: '64GB DDR4'
    },
    'ORION-ORACLE': {
      cpu: 'AMD Ryzen 9 5950X',
      memory: '32GB DDR4'
    },
    'ORION-PC': {
      cpu: 'Intel Core i7-12700K',
      memory: '32GB DDR4',
      gpu: 'RTX 3070 8GB'
    },
    'ORIONLPC': {
      cpu: 'Intel Core i5-10400F',
      memory: '16GB DDR4',
      gpu: 'RTX 2070 8GB'
    },
    'LEVIATHAN': {
      cpu: 'AMD Threadripper 3970X',
      memory: '128GB DDR4'
    }
  };

  return hardwareMap[nodeName] || undefined;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sub = url.searchParams.get("sub");
  if (!sub) return new Response("missing sub", { status: 400 });

  const iss = process.env.ORION_SHARED_JWT_ISS || "https://www.sidekickportal.com";
  const aud = process.env.ORION_SHARED_JWT_AUD || "orion-core";
  const secret = process.env.ORION_SHARED_JWT_SECRET;
  if (!secret) return new Response("server_not_configured", { status: 500 });

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 5;
  const token = signHS256({ iss, aud, sub, iat: now, exp }, secret);

  try {
    // Check all ORION-CORE nodes in parallel
    const nodePromises = Object.entries(ORION_NODES).map(([nodeName, baseUrl]) =>
      checkNodeHealth(nodeName, baseUrl, token)
    );

    const nodes = await Promise.all(nodePromises);
    
    // Calculate system metrics
    const activeNodes = nodes.filter(node => node.status === 'online').length;
    const runningServices = nodes.reduce((total, node) => 
      total + node.services.filter(service => service.status === 'running').length, 0
    );
    const totalUptime = Math.max(...nodes.map(node => node.uptime));
    const systemHealth = activeNodes === nodes.length ? 'healthy' : 
                        activeNodes > nodes.length / 2 ? 'degraded' : 'critical';

    const response = {
      nodes,
      systemMetrics: {
        activeNodes,
        runningServices,
        totalUptime,
        systemHealth,
        aiMetrics: {
          ragMemories: 245, // TODO: Get real count from vector service
          fabricPatterns: 8, // TODO: Get real count from fabric service
          activeChats: 0 // TODO: Get real count from session service
        }
      },
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    });

  } catch (error) {
    console.error('System metrics error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch system metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
