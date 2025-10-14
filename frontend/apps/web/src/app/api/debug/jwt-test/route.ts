import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildOrionJWT } from '@/lib/auth-token';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get environment variables
    const secret = process.env.ORION_SHARED_JWT_SECRET;
    const iss = process.env.ORION_SHARED_JWT_ISS;
    const aud = process.env.ORION_SHARED_JWT_AUD;

    // Generate a test JWT
    let jwt = '';
    try {
      jwt = buildOrionJWT(session.user.email);
    } catch (e: any) {
      return NextResponse.json({
        error: 'JWT generation failed',
        message: e.message,
        env_check: {
          secret_exists: !!secret,
          secret_length: secret?.length || 0,
          secret_first_8: secret?.substring(0, 8) || 'missing',
          iss,
          aud,
        }
      }, { status: 500 });
    }

    return NextResponse.json({
      status: 'success',
      user: session.user.email,
      env_check: {
        secret_exists: !!secret,
        secret_length: secret?.length || 0,
        secret_first_8: secret?.substring(0, 8) || 'missing',
        secret_last_8: secret?.substring(secret.length - 8) || 'missing',
        iss,
        aud,
      },
      jwt: {
        generated: true,
        length: jwt.length,
        first_20: jwt.substring(0, 20),
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Debug endpoint error',
      message: error.message,
    }, { status: 500 });
  }
}
