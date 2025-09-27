"use client";

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { 
  Shield, 
  Users, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Server,
  Database,
  Zap
} from 'lucide-react';
import { GlassPanel, NebulaBackground } from '@/components/ui/glass-components';
import { AdminNavigation } from '@/components/admin/admin-navigation';
import { AdminStatsGrid } from '@/components/admin/admin-stats-grid';
import { AdminRecentActivity } from '@/components/admin/admin-recent-activity';
import { AdminQuickActions } from '@/components/admin/admin-quick-actions';

interface AdminDashboardData {
  stats: {
    totalUsers: number;
    pendingRequests: number;
    activeUsers: number;
    systemHealth: number;
  };
  recentActivity: {
    id: string;
    type: 'login' | 'request' | 'approval' | 'system';
    message: string;
    timestamp: string;
    severity: 'info' | 'warning' | 'error' | 'success';
  }[];
  systemStatus: {
    orionNodes: number;
    onlineNodes: number;
    avgResponseTime: number;
    errorRate: number;
  };
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      loadDashboardData();

      // Set up real-time updates every 30 seconds
      const interval = setInterval(loadDashboardData, 30000);
      return () => clearInterval(interval);
    }

    // Return empty cleanup function when not authenticated
    return () => {};
  }, [status]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load analytics data
      const analyticsResponse = await fetch('/api/admin/analytics?realtime=true');
      const analyticsData = await analyticsResponse.json();
      
      // Load access requests
      const requestsResponse = await fetch('/api/admin/access-requests');
      const requestsData = await requestsResponse.json();
      
      // Load recent audit logs
      const auditResponse = await fetch('/api/admin/audit-log?limit=10');
      const auditData = await auditResponse.json();

      if (analyticsData.success && requestsData.success && auditData.success) {
        const analytics = analyticsData.data;
        
        setDashboardData({
          stats: {
            totalUsers: analytics.userActivity.totalUsers,
            pendingRequests: requestsData.pending,
            activeUsers: analytics.realTime.activeUsers,
            systemHealth: Math.round(analytics.systemPerformance.uptime)
          },
          recentActivity: [
            ...auditData.data.slice(0, 5).map((log: any) => ({
              id: log.id,
              type: 'system' as const,
              message: `${log.adminEmail} performed ${log.action}`,
              timestamp: log.timestamp,
              severity: log.action.includes('FAILED') ? 'error' : 'info' as const
            })),
            ...requestsData.data.slice(0, 3).map((req: any) => ({
              id: req.id,
              type: 'request' as const,
              message: `Access request from ${req.email}`,
              timestamp: req.timestamp,
              severity: req.status === 'pending' ? 'warning' : 'info' as const
            }))
          ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8),
          systemStatus: {
            orionNodes: analytics.orionCore.nodes.length,
            onlineNodes: analytics.orionCore.nodes.filter((n: any) => n.status === 'online').length,
            avgResponseTime: analytics.systemPerformance.averageResponseTime,
            errorRate: analytics.systemPerformance.errorRate
          }
        });
      } else {
        throw new Error('Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <NebulaBackground variant="dashboard" className="min-h-screen flex items-center justify-center">
        <GlassPanel variant="card" className="p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
            <span className="text-white">Loading admin dashboard...</span>
          </div>
        </GlassPanel>
      </NebulaBackground>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <NebulaBackground variant="dashboard" className="min-h-screen flex items-center justify-center">
        <GlassPanel variant="card" className="p-8 text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Authentication Required</h1>
          <p className="text-white/60">Please sign in to access the admin dashboard.</p>
        </GlassPanel>
      </NebulaBackground>
    );
  }

  return (
    <NebulaBackground variant="dashboard" className="min-h-screen">
      <div className="flex">
        {/* Admin Navigation Sidebar */}
        <AdminNavigation />
        
        {/* Main Content */}
        <div className="flex-1 p-6 ml-64">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Admin Dashboard
                </h1>
                <p className="text-white/60">
                  Welcome back, {session?.user?.name || session?.user?.email}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Clock className="w-4 h-4" />
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
                
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  dashboardData?.systemStatus.onlineNodes === dashboardData?.systemStatus.orionNodes
                    ? 'bg-green-500/20 text-green-300'
                    : 'bg-yellow-500/20 text-yellow-300'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    dashboardData?.systemStatus.onlineNodes === dashboardData?.systemStatus.orionNodes
                      ? 'bg-green-400'
                      : 'bg-yellow-400'
                  }`} />
                  System {dashboardData?.systemStatus.onlineNodes === dashboardData?.systemStatus.orionNodes ? 'Healthy' : 'Degraded'}
                </div>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <GlassPanel variant="error" className="mb-6 p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <div>
                  <h3 className="font-medium text-red-300">Error Loading Dashboard</h3>
                  <p className="text-red-200/80 text-sm">{error}</p>
                </div>
              </div>
            </GlassPanel>
          )}

          {/* Loading State */}
          {loading && !dashboardData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <GlassPanel key={i} className="p-6 animate-pulse">
                  <div className="h-4 bg-white/10 rounded mb-2"></div>
                  <div className="h-8 bg-white/10 rounded"></div>
                </GlassPanel>
              ))}
            </div>
          )}

          {/* Dashboard Content */}
          {dashboardData && (
            <>
              {/* Stats Grid */}
              <AdminStatsGrid stats={dashboardData.stats} />
              
              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                {/* Recent Activity */}
                <div className="lg:col-span-2">
                  <AdminRecentActivity activities={dashboardData.recentActivity} />
                </div>
                
                {/* Quick Actions */}
                <div>
                  <AdminQuickActions 
                    pendingRequests={dashboardData.stats.pendingRequests}
                    systemStatus={dashboardData.systemStatus}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </NebulaBackground>
  );
}
