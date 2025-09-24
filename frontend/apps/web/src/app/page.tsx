'use client';

import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';

export default function LandingLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn('credentials', {
      redirect: false,
      username,
      password,
      callbackUrl: '/assistant',
    });
    setLoading(false);
    if (res?.error) {
      setError('Invalid username or password');
      return;
    }
    // res?.ok means NextAuth will redirect if url provided
    if (res?.ok) window.location.href = '/assistant';
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-screen-sm flex-col items-center justify-center gap-6 px-6 py-8">
      <div className="w-full rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold">Welcome</h1>
        <p className="mb-6 text-sm text-muted-foreground">Sign in to your ORION Personal Portal</p>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm">Email</label>
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Your password"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in with Email'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px w-full bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px w-full bg-border" />
        </div>

        <button
          onClick={() => signIn('google', { callbackUrl: '/assistant' })}
          className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Continue with Google
        </button>
      </div>
    </main>
  );
}
