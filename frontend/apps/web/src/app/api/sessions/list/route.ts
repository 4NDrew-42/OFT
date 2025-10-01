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
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const redis = await getRedisClient();
    const sessionIds = await redis.sMembers(`user:${userId}:sessions`);

    const sessions = await Promise.all(
      sessionIds.map(async (sessionId) => {
        const sessionData = await redis.get(`session:${sessionId}`);
        return sessionData ? JSON.parse(sessionData) : null;
      })
    );

    // Filter out null sessions and sort by updatedAt (most recent first)
    const validSessions = sessions
      .filter((s) => s !== null)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json({ sessions: validSessions });
  } catch (error) {
    console.error('List sessions error:', error);
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 });
  }
}

