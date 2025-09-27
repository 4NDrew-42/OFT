"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Activity,
  Settings,
  FileText,
  Shield,
  Database,
  TrendingUp,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  type LucideIcon
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-components';
import { signOut } from 'next-auth/react';

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'Overview and system status'
  },
  {
    name: 'Access Requests',
    href: '/admin/access-requests',
    icon: UserCheck,
    description: 'Approve or deny user access'
  },
  {
    name: 'User Management',
    href: '/admin/users',
    icon: Users,
    description: 'Manage authorized users'
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: TrendingUp,
    description: 'Usage and performance metrics'
  },
  {
    name: 'System Monitor',
    href: '/admin/system',
    icon: Activity,
    description: 'ORION-CORE node status'
  },
  {
    name: 'Audit Logs',
    href: '/admin/audit',
    icon: FileText,
    description: 'Admin action history'
  },
  {
    name: 'Security',
    href: '/admin/security',
    icon: Shield,
    description: 'Security settings and alerts'
  },
  {
    name: 'Database',
    href: '/admin/database',
    icon: Database,
    description: 'Data management and backups'
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'System configuration'
  }
];

export function AdminNavigation() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState(3); // Mock notification count

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <div className={`fixed left-0 top-0 h-full z-40 transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <GlassPanel className="h-full rounded-none border-r border-white/10">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              {!collapsed && (
                <div>
                  <h2 className="text-lg font-bold text-white">Admin Panel</h2>
                  <p className="text-xs text-white/60">Sidekick Portal</p>
                </div>
              )}
              
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                {collapsed ? (
                  <ChevronRight className="w-4 h-4 text-white/60" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-white/60" />
                )}
              </button>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${
                    isActive ? 'text-blue-300' : 'text-white/60 group-hover:text-white/80'
                  }`} />
                  
                  {!collapsed && (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{item.name}</span>
                          {item.badge && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/50 truncate">{item.description}</p>
                      </div>
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Notifications */}
          {!collapsed && (
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Bell className="w-5 h-5 text-amber-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-300">
                    {notifications} Notifications
                  </p>
                  <p className="text-xs text-amber-200/80">
                    New access requests pending
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleSignOut}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-red-500/10 transition-colors ${
                collapsed ? 'justify-center' : ''
              }`}
              title={collapsed ? 'Sign Out' : undefined}
            >
              <LogOut className="w-5 h-5" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
