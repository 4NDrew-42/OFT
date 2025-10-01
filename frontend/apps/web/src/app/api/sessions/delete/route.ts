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
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const redis = await getRedisClient();
    
    // Get session to find userId
    const sessionData = await redis.get(`session:${sessionId}`);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      
      // Remove from user's session set
      await redis.sRem(`user:${session.userId}:sessions`, sessionId);
    }

    // Get all message IDs
    const messageIds = await redis.lRange(`session:${sessionId}:messages`, 0, -1);

    // Delete all messages
    await Promise.all(messageIds.map((messageId) => redis.del(`message:${messageId}`)));

    // Delete message list
    await redis.del(`session:${sessionId}:messages`);

    // Delete session
    await redis.del(`session:${sessionId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}

