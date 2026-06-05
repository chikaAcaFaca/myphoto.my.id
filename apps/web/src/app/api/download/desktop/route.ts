import { NextResponse } from 'next/server';
import { getObject } from '@/lib/s3';

export const dynamic = 'force-dynamic';

const ZIP_KEY = 'public/myphoto-desktop-latest.zip';

// GET /api/download/desktop — public Windows desktop app download.
// Streams the latest desktop build from S3 as a zip (extract → run
// "MyPhoto Sync.exe"). We ship a zip rather than a one-click NSIS installer
// because building the signed installer needs Windows symlink privilege
// (Developer Mode/admin) on the build machine; the zip is the portable build.
export async function GET() {
  try {
    const obj = await getObject(ZIP_KEY);
    return new NextResponse(obj.body as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="MyPhoto-Desktop.zip"',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (e: any) {
    console.error('Desktop download error:', e?.message || e);
    return NextResponse.json(
      { error: 'Desktop build still being prepared. Please try again in a few minutes.' },
      { status: 404 }
    );
  }
}
