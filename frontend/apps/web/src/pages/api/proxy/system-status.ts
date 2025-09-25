import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { STATUS_URL } from '@/lib/env';

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
  const sub = (req.query.sub as string) || '';
  if (!sub) return res.status(400).send('missing sub');

  const iss = process.env.ORION_SHARED_JWT_ISS || 'https://www.sidekickportal.com';
  const aud = process.env.ORION_SHARED_JWT_AUD || 'orion-core';
  const secret = process.env.ORION_SHARED_JWT_SECRET;
  if (!secret) return res.status(500).send('server_not_configured');

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 5;
  const token = signHS256({ iss, aud, sub, iat: now, exp }, secret);
  const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID();

  const upstream = await fetch(STATUS_URL, {
    method: 'GET',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'X-Request-Id': reqId },
    cache: 'no-store',
  });
  const text = await upstream.text();
  res.status(upstream.status).setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json').setHeader('Cache-Control', 'no-store').send(text);
}

