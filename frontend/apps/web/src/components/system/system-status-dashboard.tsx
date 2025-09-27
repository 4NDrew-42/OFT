/**
 * System Status Dashboard Component
 * Replicates ORION-CORE's real-time system monitoring
 * Features: Node status, service health, performance metrics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Server, Cpu, HardDrive, Network, Zap, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { GlassPanel, GlassButton, GlassCard, StatusIndicator } from '@/components/ui/glass-components';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

// Types
interface OrionNode {
  name: 'ORION-MEM' | 'ORION-ORACLE' | 'ORION-PC' | 'ORIONLPC' | 'LEVIATHAN';
  status: 'online' | 'warning' | 'error';
  uptime: number;
  services: NodeService[];
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

interface NodeService {
  name: string;
  port: number;
  status: 'running' | 'stopped' | 'error';
  latency?: number;
}

interface SystemMetrics {
  activeNodes: number;
  runningServices: number;
  totalUptime: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
  aiMetrics: {
    ragMemories: number;
    fabricPatterns: number;
    activeChats: number;
  };
}

// Main System Status Dashboard Component
export const SystemStatusDashboard: React.FC = () => {
  const { data: session } = useSession();
  const userEmail = session?.user?.email;

  const [nodes, setNodes] = useState<OrionNode[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  // Load real system status from ORION-CORE
  useEffect(() => {
    if (userEmail) {
      loadSystemStatus();

      // Auto-refresh every 30 seconds
      const interval = setInterval(loadSystemStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [userEmail]);

  const loadSystemStatus = async () => {
    if (!userEmail) return;

    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch(`/api/proxy/system-metrics?sub=${encodeURIComponent(userEmail)}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      setNodes(data.nodes || []);
      setSystemMetrics(data.systemMetrics || null);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load system status:', error);
      setError(error instanceof Error ? error.message : 'Failed to load system status');

      // Fallback to empty state on error
      setNodes([]);
      setSystemMetrics(null);
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshStatus = () => {
    if (!isRefreshing) {
      loadSystemStatus();
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getSystemHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  // Show authentication required message
  if (!userEmail) {
    return (
      <div className="space-y-6">
        <GlassPanel variant="nav" className="p-4">
          <div className="flex items-center gap-2">
            <Server className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold text-white">ORION-CORE System Status</h1>
            <StatusIndicator status="warning" label="AUTH REQUIRED" />
          </div>
        </GlassPanel>

        <GlassCard variant="elevated" className="text-center p-8">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Authentication Required</h2>
          <p className="text-white/60">Please sign in to view ORION-CORE system status and metrics.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <GlassCard variant="elevated" className="border-red-500/30 bg-red-500/10">
          <div className="flex items-center gap-2 text-red-400">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">System Status Error</span>
          </div>
          <p className="text-red-300 text-sm mt-2">{error}</p>
          <GlassButton
            onClick={loadSystemStatus}
            disabled={isRefreshing}
            size="sm"
            variant="secondary"
            className="mt-3"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
            Retry
          </GlassButton>
        </GlassCard>
      )}
      {/* Header */}
      <GlassPanel variant="nav" className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Server className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold text-white">ORION-CORE System Status</h1>
            {systemMetrics && (
              <StatusIndicator
                status={systemMetrics.systemHealth === 'healthy' ? 'online' :
                       systemMetrics.systemHealth === 'degraded' ? 'warning' : 'error'}
                label={systemMetrics.systemHealth.toUpperCase()}
              />
            )}
            {error && (
              <StatusIndicator
                status="error"
                label="API ERROR"
              />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/60">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={refreshStatus}
              disabled={isRefreshing}
              title="Refresh status"
            >
              <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
              Refresh
            </GlassButton>
          </div>
        </div>
      </GlassPanel>

      {/* System Overview */}
      {systemMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <GlassCard variant="elevated" className="text-center">
            <div className={cn('text-3xl font-bold mb-2', getSystemHealthColor(systemMetrics.systemHealth))}>
              {systemMetrics.activeNodes}
            </div>
            <div className="text-white/60 text-sm">Active Nodes</div>
            <div className="text-white/40 text-xs">of {nodes.length} total</div>
          </GlassCard>
          
          <GlassCard variant="elevated" className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {systemMetrics.runningServices}
            </div>
            <div className="text-white/60 text-sm">Services</div>
            <div className="text-white/40 text-xs">Running</div>
          </GlassCard>
          
          <GlassCard variant="elevated" className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {formatUptime(systemMetrics.totalUptime)}
            </div>
            <div className="text-white/60 text-sm">Uptime</div>
            <div className="text-white/40 text-xs">System Average</div>
          </GlassCard>
          
          <GlassCard variant="elevated" className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {systemMetrics.aiMetrics.ragMemories}
            </div>
            <div className="text-white/60 text-sm">RAG Memories</div>
            <div className="text-white/40 text-xs">20 Categories</div>
          </GlassCard>
        </div>
      )}

      {/* Node Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {nodes.map((node) => (
          <NodeStatusCard key={node.name} node={node} />
        ))}
      </div>

      {/* AI Metrics */}
      {systemMetrics && (
        <GlassCard variant="elevated">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            AI System Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1">
                {systemMetrics.aiMetrics.ragMemories}
              </div>
              <div className="text-white/60 text-sm">RAG Memories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {systemMetrics.aiMetrics.fabricPatterns}
              </div>
              <div className="text-white/60 text-sm">Fabric Patterns</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">
                {systemMetrics.aiMetrics.activeChats}
              </div>
              <div className="text-white/60 text-sm">Active Chats</div>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

// Node Status Card Component
interface NodeStatusCardProps {
  node: OrionNode;
}

const NodeStatusCard: React.FC<NodeStatusCardProps> = ({ node }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-400" />;
      default: return <Server className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return `${Math.floor(seconds / 60)}m`;
  };

  return (
    <GlassCard variant="interactive">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon(node.status)}
          <h3 className="font-semibold text-white">{node.name}</h3>
        </div>
        <StatusIndicator status={node.status === 'online' ? 'online' : node.status === 'warning' ? 'warning' : 'error'} />
      </div>

      {/* Hardware Info */}
      {node.hardware && (
        <div className="mb-3 text-sm text-white/60">
          <div className="flex items-center gap-1 mb-1">
            <Cpu className="w-3 h-3" />
            {node.hardware.cpu}
          </div>
          <div className="flex items-center gap-1 mb-1">
            <HardDrive className="w-3 h-3" />
            {node.hardware.memory}
          </div>
          {node.hardware.gpu && (
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {node.hardware.gpu}
            </div>
          )}
        </div>
      )}

      {/* Metrics */}
      {node.metrics && (
        <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="text-white font-medium">{node.metrics.cpuUsage}%</div>
            <div className="text-white/50">CPU</div>
          </div>
          <div className="text-center">
            <div className="text-white font-medium">{node.metrics.memoryUsage}%</div>
            <div className="text-white/50">Memory</div>
          </div>
          <div className="text-center">
            <div className="text-white font-medium">{node.metrics.networkLatency}ms</div>
            <div className="text-white/50">Latency</div>
          </div>
        </div>
      )}

      {/* Services */}
      <div className="space-y-1">
        <div className="text-xs text-white/60 mb-2">Services ({node.services.length})</div>
        {node.services.slice(0, 3).map((service) => (
          <div key={service.name} className="flex items-center justify-between text-xs">
            <span className="text-white/70">{service.name}:{service.port}</span>
            <div className="flex items-center gap-1">
              {service.latency && (
                <span className="text-white/50">{service.latency}ms</span>
              )}
              <StatusIndicator 
                status={service.status === 'running' ? 'online' : 'error'} 
                showPulse={false}
              />
            </div>
          </div>
        ))}
        {node.services.length > 3 && (
          <div className="text-xs text-white/50">
            +{node.services.length - 3} more services
          </div>
        )}
      </div>

      {/* Uptime */}
      <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/60">
        Uptime: {formatUptime(node.uptime)}
      </div>
    </GlassCard>
  );
};

// Real-time system status now powered by ORION-CORE APIs

export default SystemStatusDashboard;
