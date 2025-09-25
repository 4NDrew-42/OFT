import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { OCR_URL } from '@/lib/env';

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

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const sub = (req.query.sub as string) || '';
  if (!sub) return res.status(400).send('missing sub');

  const iss = process.env.ORION_SHARED_JWT_ISS || 'https://www.sidekickportal.com';
  const aud = process.env.ORION_SHARED_JWT_AUD || 'orion-core';
  const secret = process.env.ORION_SHARED_JWT_SECRET;
  if (!secret) return res.status(500).send('server_not_configured');

  // Parse multipart form using Web API via Request/Response bridge
  const reqUrl = new URL(req.url || '', 'http://localhost');
  const upstreamReq = new Request(reqUrl.toString(), { method: 'POST', headers: req.headers as any, body: req as any });
  const form = await upstreamReq.formData();
  const file = form.get('file') as File | null;
  if (!file) return res.status(400).json({ error: 'missing file' });
  const max = 5 * 1024 * 1024;
  if (file.size > max) return res.status(413).setHeader('Retry-After', '10').json({ error: 'file_too_large', limit_bytes: max });

  const upstreamForm = new FormData();
  for (const [k, v] of form.entries()) upstreamForm.append(k, v as any);

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 5;
  const token = signHS256({ iss, aud, sub, iat: now, exp }, secret);
  const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID();

  const upstream = await fetch(OCR_URL, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'X-Request-Id': reqId }, body: upstreamForm });
  const buf = Buffer.from(await upstream.arrayBuffer());
  res.status(upstream.status).setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json').setHeader('Cache-Control', 'no-store').send(buf);
}

