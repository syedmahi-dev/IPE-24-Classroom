export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { downloadFileStream } from '@/lib/google-drive';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  
  // Enforce security requirement: no public access outside the website
  if (!session?.user) {
    return new NextResponse('Unauthorized access - please log in first', { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const forceDownload = url.searchParams.get('download') === 'true';

    const fileRecord = await prisma.fileUpload.findUnique({
      where: { id: params.id },
      include: { connectedDrive: true }
    });

    if (!fileRecord) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Sanitize filename for Content-Disposition header
    const safeFileName = fileRecord.name.replace(/["\\]/g, '_');

    // 300MB logic
    const THRESHOLD = 300 * 1024 * 1024;
    
    // If over 300MB, it bypasses the proxy
    if (fileRecord.sizeBytes > THRESHOLD && fileRecord.driveUrl) {
      return NextResponse.redirect(fileRecord.driveUrl);
    }

    // Perform proxy download for secure, private files
    const { stream, mimeType, size } = await downloadFileStream(
      fileRecord.driveId, 
      fileRecord.connectedDrive?.refreshToken
    );

    // Convert Node.js readable stream to Web API ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
        stream.on('end', () => controller.close());
        stream.on('error', (err: Error) => controller.error(err));
      }
    });

    // ?download=true → force browser download; otherwise inline (viewable in browser)
    const disposition = forceDownload
      ? `attachment; filename="${safeFileName}"`
      : `inline; filename="${safeFileName}"`;

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': mimeType || fileRecord.mimeType || 'application/octet-stream',
        'Content-Length': size || String(fileRecord.sizeBytes),
        'Content-Disposition': disposition,
      }
    });

  } catch (err: any) {
    console.error('File Download Proxy Error:', err);
    return new NextResponse('Error securely fetching file payload. Note: Service Accounts cannot download private OAuth files.', { status: 500 });
  }
}
