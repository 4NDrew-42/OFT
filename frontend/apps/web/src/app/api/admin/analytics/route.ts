import { NextRequest, NextResponse } from 'next/server';
import { withAdminAction } from '@/middleware/admin';

export interface AnalyticsData {
  userActivity: {
    totalUsers: number;
    activeUsers24h: number;
    activeUsers7d: number;
    totalLogins: number;
    loginsByDay: { date: string; count: number }[];
  };
  systemPerformance: {
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
    requestsPerHour: number;
    errorsByType: { type: string; count: number }[];
  };
  orionCore: {
    nodes: {
      name: string;
      status: 'online' | 'offline' | 'degraded';
      cpuUsage: number;
      memoryUsage: number;
      uptime: number;
      requestCount: number;
    }[];
    vectorOperations: {
      searches24h: number;
      storageOperations24h: number;
      averageSearchTime: number;
      totalVectors: number;
    };
  };
  realTime: {
    activeUsers: number;
    activeSessions: number;
    currentRequests: number;
    systemLoad: number;
  };
}

/**
 * Generate mock analytics data - replace with real data sources
 */
function generateAnalyticsData(): AnalyticsData {
  const now = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    return {
      date: dateString as string, // Type assertion since we know toISOString().split('T')[0] is always a string
      count: Math.floor(Math.random() * 50) + 10
    };
  }).reverse();

  return {
    userActivity: {
      totalUsers: 12,
      activeUsers24h: 8,
      activeUsers7d: 11,
      totalLogins: 156,
      loginsByDay: last7Days
    },
    systemPerformance: {
      averageResponseTime: 245,
      errorRate: 0.02,
      uptime: 99.8,
      requestsPerHour: 1250,
      errorsByType: [
        { type: '4xx Client Error', count: 23 },
        { type: '5xx Server Error', count: 8 },
        { type: 'Timeout', count: 5 },
        { type: 'Rate Limit', count: 12 }
      ]
    },
    orionCore: {
      nodes: [
        {
          name: 'ORION-MEM',
          status: 'online',
          cpuUsage: 45.2,
          memoryUsage: 67.8,
          uptime: 608758,
          requestCount: 2341
        },
        {
          name: 'ORION-ORACLE',
          status: 'online',
          cpuUsage: 32.1,
          memoryUsage: 54.3,
          uptime: 608758,
          requestCount: 1876
        },
        {
          name: 'ORION-PC',
          status: 'online',
          cpuUsage: 78.9,
          memoryUsage: 82.1,
          uptime: 608758,
          requestCount: 3421
        },
        {
          name: 'ORIONLPC',
          status: 'degraded',
          cpuUsage: 91.2,
          memoryUsage: 95.7,
          uptime: 608758,
          requestCount: 987
        },
        {
          name: 'LEVIATHAN',
          status: 'online',
          cpuUsage: 23.4,
          memoryUsage: 41.2,
          uptime: 608758,
          requestCount: 5432
        }
      ],
      vectorOperations: {
        searches24h: 1247,
        storageOperations24h: 89,
        averageSearchTime: 0.234,
        totalVectors: 17014
      }
    },
    realTime: {
      activeUsers: Math.floor(Math.random() * 5) + 1,
      activeSessions: Math.floor(Math.random() * 8) + 2,
      currentRequests: Math.floor(Math.random() * 20) + 5,
      systemLoad: Math.random() * 0.8 + 0.1
    }
  };
}

/**
 * GET /api/admin/analytics - Get system analytics
 */
export async function GET(req: NextRequest) {
  try {
    return await withAdminAction(
      req,
      'GET_ANALYTICS',
      async (adminEmail) => {
        const url = new URL(req.url);
        const timeRange = url.searchParams.get('range') || '24h';
        const includeRealTime = url.searchParams.get('realtime') === 'true';

        // Generate analytics data
        const analyticsData = generateAnalyticsData();

        // If real-time data is not requested, remove it
        if (!includeRealTime) {
          delete (analyticsData as any).realTime;
        }

        // Try to get real ORION-CORE data
        try {
          const orionResponse = await fetch('/api/proxy/system-metrics', {
            headers: {
              'Authorization': `Bearer ${process.env.ORION_SHARED_JWT_SECRET}`,
            }
          });

          if (orionResponse.ok) {
            const orionData = await orionResponse.json();
            if (orionData.success && orionData.data) {
              // Merge real ORION-CORE data with mock data
              analyticsData.orionCore.nodes = orionData.data.map((node: any) => ({
                name: node.name,
                status: node.status === 'online' ? 'online' : 'offline',
                cpuUsage: node.metrics?.cpuUsage || 0,
                memoryUsage: node.metrics?.memoryUsage || 0,
                uptime: node.uptime || 0,
                requestCount: Math.floor(Math.random() * 5000) + 1000
              }));
            }
          }
        } catch (orionError) {
          console.error('Failed to fetch ORION-CORE data:', orionError);
        }

        return NextResponse.json({
          success: true,
          data: analyticsData,
          timestamp: new Date().toISOString(),
          timeRange
        });
      }
    );
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: error instanceof Error && error.message.includes('Admin') ? 403 : 500 }
    );
  }
}

/**
 * POST /api/admin/analytics/export - Export analytics data
 */
export async function POST(req: NextRequest) {
  try {
    return await withAdminAction(
      req,
      'EXPORT_ANALYTICS',
      async (adminEmail) => {
        const body = await req.json();
        const { format = 'json', timeRange = '24h', includeRealTime = false } = body;

        const analyticsData = generateAnalyticsData();

        if (!includeRealTime) {
          delete (analyticsData as any).realTime;
        }

        const exportData = {
          exportedBy: adminEmail,
          exportedAt: new Date().toISOString(),
          timeRange,
          data: analyticsData
        };

        if (format === 'csv') {
          // Convert to CSV format
          const csvData = convertToCSV(exportData);
          
          return new NextResponse(csvData, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="analytics-${timeRange}-${Date.now()}.csv"`
            }
          });
        }

        // Default JSON format
        return NextResponse.json(exportData, {
          headers: {
            'Content-Disposition': `attachment; filename="analytics-${timeRange}-${Date.now()}.json"`
          }
        });
      },
      {
        rateLimit: { maxRequests: 10, windowMs: 300000 }, // 10 exports per 5 minutes
        details: { format: body?.format, timeRange: body?.timeRange }
      }
    );
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: error instanceof Error && error.message.includes('Admin') ? 403 : 500 }
    );
  }
}

/**
 * Convert analytics data to CSV format
 */
function convertToCSV(data: any): string {
  const lines: string[] = [];
  
  // Add header
  lines.push('Category,Metric,Value,Timestamp');
  
  // Add user activity data
  lines.push(`User Activity,Total Users,${data.data.userActivity.totalUsers},${data.exportedAt}`);
  lines.push(`User Activity,Active Users 24h,${data.data.userActivity.activeUsers24h},${data.exportedAt}`);
  lines.push(`User Activity,Active Users 7d,${data.data.userActivity.activeUsers7d},${data.exportedAt}`);
  
  // Add system performance data
  lines.push(`System Performance,Average Response Time,${data.data.systemPerformance.averageResponseTime}ms,${data.exportedAt}`);
  lines.push(`System Performance,Error Rate,${data.data.systemPerformance.errorRate}%,${data.exportedAt}`);
  lines.push(`System Performance,Uptime,${data.data.systemPerformance.uptime}%,${data.exportedAt}`);
  
  // Add ORION-CORE node data
  data.data.orionCore.nodes.forEach((node: any) => {
    lines.push(`ORION Node,${node.name} Status,${node.status},${data.exportedAt}`);
    lines.push(`ORION Node,${node.name} CPU Usage,${node.cpuUsage}%,${data.exportedAt}`);
    lines.push(`ORION Node,${node.name} Memory Usage,${node.memoryUsage}%,${data.exportedAt}`);
  });
  
  return lines.join('\n');
}
