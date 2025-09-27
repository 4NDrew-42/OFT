"use client";

import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Shield } from 'lucide-react';
import { GlassPanel, GlassButton, NebulaBackground } from '@/components/ui/glass-components';
import Link from 'next/link';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          message: 'Your email address is not authorized to access this application.',
          description: 'Only approved users can sign in to the Sidekick Portal. If you believe this is an error, please contact the administrator.',
          icon: Shield
        };
      case 'Configuration':
        return {
          title: 'Configuration Error',
          message: 'There was a problem with the authentication configuration.',
          description: 'Please try again later or contact support if the problem persists.',
          icon: AlertTriangle
        };
      case 'Verification':
        return {
          title: 'Verification Error',
          message: 'The verification link was invalid or has expired.',
          description: 'Please try signing in again to receive a new verification link.',
          icon: AlertTriangle
        };
      default:
        return {
          title: 'Authentication Error',
          message: 'An unexpected error occurred during sign in.',
          description: 'Please try again or contact support if the problem persists.',
          icon: AlertTriangle
        };
    }
  };

  const errorInfo = getErrorMessage(error);
  const IconComponent = errorInfo.icon;

  return (
    <NebulaBackground variant="default" className="min-h-screen flex items-center justify-center p-4">
      <GlassPanel variant="card" className="w-full max-w-md">
        <div className="text-center space-y-6">
          {/* Error Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <IconComponent className="w-8 h-8 text-red-400" />
            </div>
          </div>

          {/* Error Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">
              {errorInfo.title}
            </h1>
            <p className="text-red-300 font-medium">
              {errorInfo.message}
            </p>
          </div>

          {/* Error Description */}
          <p className="text-white/60 text-sm leading-relaxed">
            {errorInfo.description}
          </p>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Link href="/">
              <GlassButton 
                variant="primary" 
                size="lg" 
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Home
              </GlassButton>
            </Link>
            
            <Link href="/">
              <GlassButton 
                variant="secondary" 
                size="md" 
                className="w-full"
              >
                Try Different Account
              </GlassButton>
            </Link>
          </div>

          {/* Additional Info for Access Denied */}
          {error === 'AccessDenied' && (
            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <h3 className="text-amber-300 font-medium text-sm mb-1">
                    Restricted Access
                  </h3>
                  <p className="text-amber-200/80 text-xs leading-relaxed">
                    This application is currently in private beta and access is limited to authorized users only. 
                    The system has logged this access attempt for security purposes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </GlassPanel>
    </NebulaBackground>
  );
}
