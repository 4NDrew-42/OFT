import Link from 'next/link';
import { Suspense } from 'react';

import { DynamicContentFeed } from '@/components/feed/DynamicContentFeed';
import { OrionVectorSearch } from '@/components/search/OrionVectorSearch';
import { API_BASE_URL, WS_BASE_URL, ORION_VECTOR_URL, VERCEL_ENV } from '@/lib/env';
import { getFullVersionInfo, getBuildInfo } from '@/lib/version';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <p className="text-sm uppercase tracking-widest text-muted-foreground">ORION-CORE Connected</p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-300">
                  {getFullVersionInfo()}
                </span>
                <span className="text-xs text-muted-foreground">
                  {getBuildInfo()}
                </span>
              </div>
            </div>
            <h1 className="text-3xl font-semibold md:text-4xl">
              AI Marketplace Experience Shell
            </h1>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">
              The frontend is served from Vercel while every interactive block streams live data from your
              self-hosted ORION-CORE stack over secure tunnels.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Backend Endpoints</span>
            <code className="rounded-md bg-muted/40 px-3 py-1.5">API: {API_BASE_URL}</code>
            <code className="rounded-md bg-muted/40 px-3 py-1.5">WebSocket: {WS_BASE_URL}</code>
            <code className="rounded-md bg-muted/40 px-3 py-1.5">ORION Vector: {ORION_VECTOR_URL}</code>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12">
        <section className="rounded-2xl border border-border bg-card/60 p-6 shadow-lg">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Explore the Catalog</h2>
              <p className="text-sm text-muted-foreground">
                Search or drop an image to drive ORION vector lookups through your tunnelled backend services.
              </p>
            </div>
            <Link
              href="https://vercel.com/docs"
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
            >
              Deployment Docs
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-background/80 p-4">
            <Suspense fallback={<p className="text-sm text-muted-foreground">Loading enhanced search…</p>}>
              <OrionVectorSearch />
            </Suspense>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card/60 p-6 shadow-lg">
          <div className="mb-6 flex flex-col gap-2">
            <h2 className="text-2xl font-semibold">Dynamic Feed</h2>
            <p className="text-sm text-muted-foreground">
              Personalized and trending modules stream directly from ORION-CORE with real-time analytics hooks.
            </p>
          </div>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Preparing your curated feed…</p>}>
            <DynamicContentFeed userId="demo-user" enablePersonalization enableRealTimeUpdates />
          </Suspense>
        </section>
      </main>

      <footer className="border-t border-border bg-card/40 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-6 text-xs text-muted-foreground md:flex-row md:justify-between">
          <span>© {new Date().getFullYear()} AI Marketplace • ORION-CORE Integrated ({VERCEL_ENV})</span>
          <div className="flex items-center gap-4">
            <Link href="/site.webmanifest" className="hover:text-foreground">
              Manifest
            </Link>
            <Link href="/robots.txt" className="hover:text-foreground">
              Robots.txt
            </Link>
            <Link href="https://github.com/" target="_blank" rel="noreferrer" className="hover:text-foreground">
              GitHub
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
