"use client";

import { useEffect, useState, useCallback } from 'react';
import { 
  TrendingUp, 
  Users, 
  Activity, 
  Server,
  Download,
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { GlassPanel, GlassButton, NebulaBackground } from '@/components/ui/glass-components';
import { AdminNavigation } from '@/components/admin/admin-navigation';

interface AnalyticsData {
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

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadAnalytics();

    if (autoRefresh) {
      const interval = setInterval(loadAnalytics, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }

    // Return empty cleanup function when autoRefresh is false
    return () => {};
  }, [timeRange, autoRefresh, loadAnalytics]);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics?range=${timeRange}&realtime=true`);
      const data = await response.json();

      if (data.success) {
        setAnalyticsData(data.data);
      } else {
        console.error('Failed to load analytics:', data.error);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch('/api/admin/analytics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          timeRange,
          includeRealTime: true
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${timeRange}-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <NebulaBackground variant="dashboard" className="min-h-screen">
      <div className="flex">
        <AdminNavigation />
        
        <div className="flex-1 p-6 ml-64">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Analytics Dashboard
                </h1>
                <p className="text-white/60">
                  System performance and usage analytics
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Time Range Selector */}
                <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                  {(['24h', '7d', '30d'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        timeRange === range
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>

                {/* Auto Refresh Toggle */}
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    autoRefresh
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                  Auto Refresh
                </button>

                {/* Export Buttons */}
                <div className="flex gap-2">
                  <GlassButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handleExport('json')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    JSON
                  </GlassButton>
                  
                  <GlassButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handleExport('csv')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    CSV
                  </GlassButton>
                </div>
              </div>
            </div>
          </div>

          {loading && !analyticsData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <GlassPanel key={i} className="p-6 animate-pulse">
                  <div className="h-4 bg-white/10 rounded mb-2"></div>
                  <div className="h-8 bg-white/10 rounded"></div>
                </GlassPanel>
              ))}
            </div>
          ) : analyticsData ? (
            <div className="space-y-8">
              {/* Real-time Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <GlassPanel className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white/80">Active Users</h3>
                      <p className="text-xs text-white/50">Currently online</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {analyticsData.realTime.activeUsers}
                  </div>
                </GlassPanel>

                <GlassPanel className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
                      <Activity className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white/80">Active Sessions</h3>
                      <p className="text-xs text-white/50">Current sessions</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {analyticsData.realTime.activeSessions}
                  </div>
                </GlassPanel>

                <GlassPanel className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                      <BarChart3 className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white/80">Requests/Hour</h3>
                      <p className="text-xs text-white/50">API requests</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {analyticsData.systemPerformance.requestsPerHour.toLocaleString()}
                  </div>
                </GlassPanel>

                <GlassPanel className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                      <Server className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white/80">System Load</h3>
                      <p className="text-xs text-white/50">Current load</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {(analyticsData.realTime.systemLoad * 100).toFixed(1)}%
                  </div>
                </GlassPanel>
              </div>

              {/* User Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassPanel className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">User Activity</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Total Users</span>
                      <span className="text-white font-medium">
                        {analyticsData.userActivity.totalUsers}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Active (24h)</span>
                      <span className="text-white font-medium">
                        {analyticsData.userActivity.activeUsers24h}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Active (7d)</span>
                      <span className="text-white font-medium">
                        {analyticsData.userActivity.activeUsers7d}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Total Logins</span>
                      <span className="text-white font-medium">
                        {analyticsData.userActivity.totalLogins}
                      </span>
                    </div>
                  </div>
                </GlassPanel>

                <GlassPanel className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">System Performance</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Avg Response Time</span>
                      <span className="text-white font-medium">
                        {analyticsData.systemPerformance.averageResponseTime}ms
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Error Rate</span>
                      <span className={`font-medium ${
                        analyticsData.systemPerformance.errorRate > 0.05 ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {(analyticsData.systemPerformance.errorRate * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Uptime</span>
                      <span className="text-green-400 font-medium">
                        {analyticsData.systemPerformance.uptime}%
                      </span>
                    </div>
                  </div>
                </GlassPanel>
              </div>

              {/* ORION-CORE Nodes */}
              <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">ORION-CORE Nodes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analyticsData.orionCore.nodes.map((node) => (
                    <div
                      key={node.name}
                      className="p-4 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-white">{node.name}</h4>
                        <div className={`w-2 h-2 rounded-full ${
                          node.status === 'online' ? 'bg-green-400' :
                          node.status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
                        }`} />
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/60">CPU</span>
                          <span className="text-white">{node.cpuUsage.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Memory</span>
                          <span className="text-white">{node.memoryUsage.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Requests</span>
                          <span className="text-white">{node.requestCount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassPanel>

              {/* Vector Operations */}
              <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Vector Operations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-1">
                      {analyticsData.orionCore.vectorOperations.searches24h.toLocaleString()}
                    </div>
                    <div className="text-sm text-white/60">Searches (24h)</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400 mb-1">
                      {analyticsData.orionCore.vectorOperations.storageOperations24h}
                    </div>
                    <div className="text-sm text-white/60">Storage Ops (24h)</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400 mb-1">
                      {analyticsData.orionCore.vectorOperations.averageSearchTime.toFixed(3)}s
                    </div>
                    <div className="text-sm text-white/60">Avg Search Time</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400 mb-1">
                      {analyticsData.orionCore.vectorOperations.totalVectors.toLocaleString()}
                    </div>
                    <div className="text-sm text-white/60">Total Vectors</div>
                  </div>
                </div>
              </GlassPanel>
            </div>
          ) : (
            <GlassPanel className="p-12 text-center">
              <TrendingUp className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No Analytics Data
              </h3>
              <p className="text-white/60">
                Unable to load analytics data. Please try again.
              </p>
            </GlassPanel>
          )}
        </div>
      </div>
    </NebulaBackground>
  );
}
