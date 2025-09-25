import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { CHAT_STREAM_URL } from '@/lib/env';

function base64url(input: Buffer | string) {
  const b = (typeof input === 'string' ? Buffer.from(input) : input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return b;
}
function signHS256(payload: Record<string, any>, secret: string) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest();
  const encodedSig = base64url(sig);
  return `${data}.${encodedSig}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  const { q = '', sub = '' } = req.query as Record<string, string>;
  if (!q || !sub) return res.status(400).send('missing q or sub');

  const iss = process.env.ORION_SHARED_JWT_ISS || 'https://www.sidekickportal.com';
  const aud = process.env.ORION_SHARED_JWT_AUD || 'orion-core';
  const secret = process.env.ORION_SHARED_JWT_SECRET;
  if (!secret) return res.status(500).send('server_not_configured');

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 5;
  const token = signHS256({ iss, aud, sub, iat: now, exp }, secret);
  const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID();

  const upstreamUrl = new URL(CHAT_STREAM_URL);
  upstreamUrl.searchParams.set('q', q);

  const upstream = await fetch(upstreamUrl.toString(), { method: 'GET', headers: { Accept: 'text/event-stream', Authorization: `Bearer ${token}`, 'X-Request-Id': reqId } });
  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    return res.status(upstream.status).send(text || 'upstream_error');
  }

  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
  const reader = upstream.body.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) res.write(Buffer.from(value));
  }
  res.end();
}

