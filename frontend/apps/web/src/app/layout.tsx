import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import SystemStatusChip from '@/components/SystemStatusChip';
import AppProviders from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'ORION Personal Portal',
  description: 'Mobile-first personal assistant portal to ORION-CORE',
  icons: { icon: '/favicon.svg' },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen bg-background text-foreground`}>
        <AppProviders>
          <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto flex max-w-screen-sm items-center justify-between px-6 py-3">
              <Link href="/" className="font-medium opacity-90 hover:opacity-100">ORION</Link>
              {/* System status chip */}
              <div>
                <SystemStatusChip />
              </div>
            </div>
          </header>

          <div className="min-h-screen pb-16 pt-2">
            {children}
          </div>

          {/* Bottom nav */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="mx-auto flex max-w-screen-sm items-center justify-between px-4 py-3 text-xs">
              <Link href="/assistant" className="opacity-90 hover:opacity-100">Assistant</Link>
              <Link href="/notes" className="opacity-90 hover:opacity-100">Notes</Link>
              <Link href="/calendar" className="opacity-90 hover:opacity-100">Calendar</Link>
              <Link href="/expenses" className="opacity-90 hover:opacity-100">Expenses</Link>
              <Link href="/system-status" className="opacity-90 hover:opacity-100">Status</Link>
            </div>
          </nav>
        </AppProviders>
      </body>
    </html>
  );
}
