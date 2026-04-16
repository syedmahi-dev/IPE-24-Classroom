import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAuthUrl } from '@/lib/google-drive';

export async function GET(req: Request) {
  const session = await auth() as any;
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  if (session.user.role !== 'super_admin') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const url = getAuthUrl();
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Failed to generate Auth URL:', error);
    return new NextResponse('Configuration Error (Missing Google Client ID/Secret)', { status: 500 });
  }
}
