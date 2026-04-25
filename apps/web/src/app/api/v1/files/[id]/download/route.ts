export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  
  if (!session?.user) {
    return new NextResponse('Unauthorized access - please log in first', { status: 401 });
  }

  const fileRecord = await prisma.fileUpload.findUnique({
    where: { id: params.id },
  });

  if (!fileRecord) {
    return new NextResponse('File not found', { status: 404 });
  }

  // Redirect to the Google Drive URL
  return NextResponse.redirect(fileRecord.driveUrl);
}
