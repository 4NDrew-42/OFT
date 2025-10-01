import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://192.168.50.79:6379';

let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    await redisClient.connect();
  }
  return redisClient;
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, role, content, metadata } = await request.json();

    if (!sessionId || !role || !content) {
      return NextResponse.json({ error: 'sessionId, role, and content are required' }, { status: 400 });
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const now = new Date().toISOString();

    const message = {
      id: messageId,
      sessionId,
      role,
      content,
      timestamp: now,
      metadata: metadata || {},
    };

    const redis = await getRedisClient();
    
    // Store message
    await redis.set(`message:${messageId}`, JSON.stringify(message), { EX: 60 * 60 * 24 * 30 }); // 30 days TTL
    
    // Add to session's message list
    await redis.rPush(`session:${sessionId}:messages`, messageId);

    // Update session metadata
    const sessionData = await redis.get(`session:${sessionId}`);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      session.lastMessage = content.substring(0, 100);
      session.messageCount = (session.messageCount || 0) + 1;
      session.updatedAt = now;
      await redis.set(`session:${sessionId}`, JSON.stringify(session), { EX: 60 * 60 * 24 * 30 });
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error('Save message error:', error);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}

