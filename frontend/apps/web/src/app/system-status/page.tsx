"use client";

import { SystemStatusDashboard } from '@/components/system/system-status-dashboard';
import { NebulaBackground } from '@/components/ui/glass-components';

export default function SystemStatusPage() {
  return (
    <NebulaBackground variant="dashboard" className="p-4">
      <SystemStatusDashboard />
    </NebulaBackground>
  );
}
