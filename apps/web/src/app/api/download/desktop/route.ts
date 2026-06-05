import { NextResponse } from 'next/server';
import { getObject } from '@/lib/s3';

export const dynamic = 'force-dynamic';

const EXE_KEY = 'public/myphoto-desktop-latest.exe';

// GET /api/download/desktop — public Windows installer download.
// Streams the latest desktop NSIS installer from S3 as MyPhoto-Setup.exe
// (one-click install). Built with electron-builder; unsigned, so Windows
// SmartScreen shows a "More info → Run anyway" prompt on first run.
export async function GET() {
  try {
    const obj = await getObject(EXE_KEY);
    return new NextResponse(obj.body as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.microsoft.portable-executable',
        'Content-Disposition': 'attachment; filename="MyPhoto-Setup.exe"',
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
