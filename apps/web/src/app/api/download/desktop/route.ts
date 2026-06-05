import { NextResponse } from 'next/server';
import { getObject } from '@/lib/s3';

export const dynamic = 'force-dynamic';

const EXE_KEY = 'public/myphoto-desktop-latest.exe';

// GET /api/download/desktop — public Windows installer download.
// Streams the latest desktop (Electron NSIS) build from S3 with a friendly
// filename so the browser saves it as MyPhoto-Setup.exe.
export async function GET() {
  try {
    const obj = await getObject(EXE_KEY);
    return new NextResponse(obj.body as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="MyPhoto-Setup.exe"',
        // Edge-cache the blob so we don't re-stream the installer every time;
        // it's replaced rarely and clients see a fresh one within the hour.
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (e: any) {
    console.error('Desktop installer download error:', e?.message || e);
    return NextResponse.json(
      { error: 'Installer still being prepared. Please try again in a few minutes.' },
      { status: 404 }
    );
  }
}
