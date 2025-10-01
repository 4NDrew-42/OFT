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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const redis = await getRedisClient();
    const messageIds = await redis.lRange(`session:${sessionId}:messages`, 0, -1);

    const messages = await Promise.all(
      messageIds.map(async (messageId) => {
        const messageData = await redis.get(`message:${messageId}`);
        return messageData ? JSON.parse(messageData) : null;
      })
    );

    return NextResponse.json({ messages: messages.filter((m) => m !== null) });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Failed to get messages' }, { status: 500 });
  }
}

