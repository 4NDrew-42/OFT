"use client";

import { 
  User, 
  UserCheck, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Clock
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-components';

interface ActivityItem {
  id: string;
  type: 'login' | 'request' | 'approval' | 'system';
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

function ActivityIcon({ type, severity }: { type: ActivityItem['type']; severity: ActivityItem['severity'] }) {
  const getIcon = () => {
    switch (type) {
      case 'login':
        return User;
      case 'request':
        return UserCheck;
      case 'approval':
        return CheckCircle;
      case 'system':
        return Activity;
      default:
        return Info;
    }
  };

  const Icon = getIcon();
  
  const getColorClass = () => {
    switch (severity) {
      case 'success':
        return 'text-green-400 bg-green-500/20';
      case 'warning':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'error':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-blue-400 bg-blue-500/20';
    }
  };

  return (
    <div className={`p-2 rounded-lg ${getColorClass()}`}>
      <Icon className="w-4 h-4" />
    </div>
  );
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
}

export function AdminRecentActivity({ activities }: RecentActivityProps) {
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          <p className="text-sm text-white/60">Latest system events and user actions</p>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Clock className="w-4 h-4" />
          Live updates
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-white/60">No recent activity</p>
          <p className="text-sm text-white/40">Activity will appear here as it happens</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ActivityIcon type={activity.type} severity={activity.severity} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium leading-relaxed">
                      {activity.message}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-white/50">
                        {formatRelativeTime(activity.timestamp)}
                      </span>
                      
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        activity.severity === 'success' ? 'bg-green-500/20 text-green-300' :
                        activity.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                        activity.severity === 'error' ? 'bg-red-500/20 text-red-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {activity.type}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-white/40 whitespace-nowrap">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activities.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/10">
          <button className="w-full text-sm text-blue-400 hover:text-blue-300 transition-colors">
            View all activity →
          </button>
        </div>
      )}
    </GlassPanel>
  );
}
