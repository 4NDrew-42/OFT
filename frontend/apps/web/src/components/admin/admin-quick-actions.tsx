"use client";

import Link from 'next/link';
import { 
  UserCheck, 
  Users, 
  Activity, 
  Download, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Server
} from 'lucide-react';
import { GlassPanel, GlassButton } from '@/components/ui/glass-components';

interface QuickActionsProps {
  pendingRequests: number;
  systemStatus: {
    orionNodes: number;
    onlineNodes: number;
    avgResponseTime: number;
    errorRate: number;
  };
}

export function AdminQuickActions({ pendingRequests, systemStatus }: QuickActionsProps) {
  const handleExportData = async () => {
    try {
      const response = await fetch('/api/admin/analytics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'json', timeRange: '24h' })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleRefreshSystem = async () => {
    try {
      // Trigger system refresh
      window.location.reload();
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        
        <div className="space-y-3">
          <Link href="/admin/access-requests">
            <GlassButton 
              variant={pendingRequests > 0 ? "primary" : "secondary"} 
              size="md" 
              className="w-full justify-start"
            >
              <UserCheck className="w-4 h-4 mr-3" />
              Review Access Requests
              {pendingRequests > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {pendingRequests}
                </span>
              )}
            </GlassButton>
          </Link>

          <Link href="/admin/users">
            <GlassButton variant="secondary" size="md" className="w-full justify-start">
              <Users className="w-4 h-4 mr-3" />
              Manage Users
            </GlassButton>
          </Link>

          <Link href="/admin/analytics">
            <GlassButton variant="secondary" size="md" className="w-full justify-start">
              <Activity className="w-4 h-4 mr-3" />
              View Analytics
            </GlassButton>
          </Link>

          <button 
            onClick={handleExportData}
            className="w-full flex items-center justify-start gap-3 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>

          <button 
            onClick={handleRefreshSystem}
            className="w-full flex items-center justify-start gap-3 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Dashboard
          </button>
        </div>
      </GlassPanel>

      {/* System Status */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
        
        <div className="space-y-4">
          {/* ORION Nodes */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-white/80">ORION Nodes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                {systemStatus.onlineNodes}/{systemStatus.orionNodes}
              </span>
              {systemStatus.onlineNodes === systemStatus.orionNodes ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
              )}
            </div>
          </div>

          {/* Response Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-sm text-white/80">Avg Response</span>
            </div>
            <span className="text-sm font-medium text-white">
              {systemStatus.avgResponseTime}ms
            </span>
          </div>

          {/* Error Rate */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`w-4 h-4 ${
                systemStatus.errorRate > 0.05 ? 'text-red-400' : 'text-green-400'
              }`} />
              <span className="text-sm text-white/80">Error Rate</span>
            </div>
            <span className={`text-sm font-medium ${
              systemStatus.errorRate > 0.05 ? 'text-red-400' : 'text-green-400'
            }`}>
              {(systemStatus.errorRate * 100).toFixed(2)}%
            </span>
          </div>

          {/* Status Indicator */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className={`flex items-center gap-2 text-sm ${
              systemStatus.onlineNodes === systemStatus.orionNodes && systemStatus.errorRate < 0.05
                ? 'text-green-400'
                : 'text-yellow-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                systemStatus.onlineNodes === systemStatus.orionNodes && systemStatus.errorRate < 0.05
                  ? 'bg-green-400'
                  : 'bg-yellow-400'
              }`} />
              {systemStatus.onlineNodes === systemStatus.orionNodes && systemStatus.errorRate < 0.05
                ? 'All systems operational'
                : 'System degraded'
              }
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Recent Alerts */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Alerts</h3>
        
        <div className="space-y-3">
          {systemStatus.errorRate > 0.05 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-300">High Error Rate</p>
                <p className="text-xs text-red-200/80">
                  Error rate is above normal threshold
                </p>
              </div>
            </div>
          )}

          {systemStatus.onlineNodes < systemStatus.orionNodes && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <Server className="w-4 h-4 text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-300">Node Offline</p>
                <p className="text-xs text-yellow-200/80">
                  {systemStatus.orionNodes - systemStatus.onlineNodes} ORION node(s) offline
                </p>
              </div>
            </div>
          )}

          {pendingRequests > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <UserCheck className="w-4 h-4 text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-300">Pending Requests</p>
                <p className="text-xs text-blue-200/80">
                  {pendingRequests} access request(s) awaiting review
                </p>
              </div>
            </div>
          )}

          {systemStatus.onlineNodes === systemStatus.orionNodes && 
           systemStatus.errorRate <= 0.05 && 
           pendingRequests === 0 && (
            <div className="text-center py-4">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-green-300">No active alerts</p>
              <p className="text-xs text-green-200/80">All systems running smoothly</p>
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}
