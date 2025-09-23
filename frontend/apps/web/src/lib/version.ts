/**
 * Version information for the AI Marketplace
 * This file is automatically updated on deployment
 */

export const VERSION_INFO = {
  version: '1.2.2',
  buildDate: new Date().toISOString(),
  gitCommit: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'local',
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID || 'local-dev'
};

export function getVersionString(): string {
  return `v${VERSION_INFO.version}-${VERSION_INFO.gitCommit}`;
}

export function getFullVersionInfo(): string {
  return `${getVersionString()} (${VERSION_INFO.environment})`;
}

export function getBuildInfo(): string {
  const buildDate = new Date(VERSION_INFO.buildDate);
  const now = new Date();
  const diffMs = now.getTime() - buildDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours > 0) {
    return `Built ${diffHours}h ${diffMinutes}m ago`;
  } else {
    return `Built ${diffMinutes}m ago`;
  }
}
