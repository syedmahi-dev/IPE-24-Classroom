import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth';
import { exchangeCodeForTokens } from '@/lib/google-drive';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await auth() as any;
  if (!session?.user || session.user.role !== 'super_admin') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/admin/drives?error=access_denied', req.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL('/admin/drives?error=missing_code', req.url));
  }

  try {
    const { refreshToken, email, name } = await exchangeCodeForTokens(code);

    if (!refreshToken) {
      // Sometimes Google doesn't send a refresh token if they've authorized before.
      // Usually prompt='consent' forces it, but we handle it just in case.
      return NextResponse.redirect(new URL('/admin/drives?error=no_refresh_token', req.url));
    }

    if (!email) {
      return NextResponse.redirect(new URL('/admin/drives?error=no_email', req.url));
    }

    await prisma.connectedDrive.create({
      data: {
        label: name || email,
        email: email,
        refreshToken: refreshToken,
      }
    });

    return NextResponse.redirect(new URL('/admin/drives?success=1', req.url));
  } catch (err) {
    console.error('Drive Auth Callback Error:', err);
    return NextResponse.redirect(new URL('/admin/drives?error=server_error', req.url));
  }
}
