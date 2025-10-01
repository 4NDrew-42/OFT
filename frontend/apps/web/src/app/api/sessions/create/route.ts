import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://192.168.50.79:6379';

// Create Redis client
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
    const { userId, firstMessage } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const now = new Date().toISOString();

    const session = {
      sessionId,
      userId,
      title: firstMessage ? firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '') : 'New Conversation',
      firstMessage: firstMessage || '',
      lastMessage: firstMessage || '',
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
      metadata: {},
    };

    // Store in Redis
    const redis = await getRedisClient();
    await redis.set(`session:${sessionId}`, JSON.stringify(session), { EX: 60 * 60 * 24 * 30 }); // 30 days TTL
    await redis.sAdd(`user:${userId}:sessions`, sessionId);

    return NextResponse.json(session);
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

