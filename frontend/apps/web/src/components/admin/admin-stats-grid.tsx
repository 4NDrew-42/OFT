"use client";

import {
  Users,
  UserCheck,
  Activity,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  type LucideIcon
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-components';

interface StatsGridProps {
  stats: {
    totalUsers: number;
    pendingRequests: number;
    activeUsers: number;
    systemHealth: number;
  };
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period: string;
  };
  icon: LucideIcon;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  description?: string;
}

function StatCard({ title, value, change, icon: Icon, color, description }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/20 border-blue-500/30 text-blue-300',
    green: 'bg-green-500/20 border-green-500/30 text-green-300',
    yellow: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300',
    red: 'bg-red-500/20 border-red-500/30 text-red-300',
    purple: 'bg-purple-500/20 border-purple-500/30 text-purple-300'
  };

  const iconColorClasses = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    purple: 'text-purple-400'
  };

  const getChangeIcon = () => {
    if (!change) return null;
    
    switch (change.type) {
      case 'increase':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'decrease':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <Minus className="w-4 h-4 text-white/60" />;
    }
  };

  const getChangeColor = () => {
    if (!change) return '';
    
    switch (change.type) {
      case 'increase':
        return 'text-green-400';
      case 'decrease':
        return 'text-red-400';
      default:
        return 'text-white/60';
    }
  };

  return (
    <GlassPanel className="p-6 hover:bg-white/5 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg border ${colorClasses[color]}`}>
              <Icon className={`w-5 h-5 ${iconColorClasses[color]}`} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white/80">{title}</h3>
              {description && (
                <p className="text-xs text-white/50">{description}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-2xl font-bold text-white">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            
            {change && (
              <div className="flex items-center gap-2">
                {getChangeIcon()}
                <span className={`text-sm font-medium ${getChangeColor()}`}>
                  {change.value > 0 ? '+' : ''}{change.value}%
                </span>
                <span className="text-xs text-white/50">
                  vs {change.period}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

export function AdminStatsGrid({ stats }: StatsGridProps) {
  const statCards: StatCardProps[] = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      change: {
        value: 12,
        type: 'increase',
        period: 'last month'
      },
      icon: Users,
      color: 'blue',
      description: 'Authorized users'
    },
    {
      title: 'Pending Requests',
      value: stats.pendingRequests,
      change: stats.pendingRequests > 0 ? {
        value: 25,
        type: 'increase',
        period: 'last week'
      } : undefined,
      icon: UserCheck,
      color: stats.pendingRequests > 0 ? 'yellow' : 'green',
      description: 'Awaiting approval'
    },
    {
      title: 'Active Users',
      value: stats.activeUsers,
      change: {
        value: 8,
        type: 'increase',
        period: 'last hour'
      },
      icon: Activity,
      color: 'green',
      description: 'Currently online'
    },
    {
      title: 'System Health',
      value: `${stats.systemHealth}%`,
      change: {
        value: stats.systemHealth >= 95 ? 2 : -5,
        type: stats.systemHealth >= 95 ? 'increase' : 'decrease',
        period: 'last 24h'
      },
      icon: Shield,
      color: stats.systemHealth >= 95 ? 'green' : stats.systemHealth >= 80 ? 'yellow' : 'red',
      description: 'Overall uptime'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}
