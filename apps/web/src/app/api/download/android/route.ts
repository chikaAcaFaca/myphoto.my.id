import { NextResponse } from 'next/server';
import { getObject } from '@/lib/s3';

export const dynamic = 'force-dynamic';

const APK_KEY = 'public/myphoto-android-latest.apk';

// GET /api/download/android — public APK download.
// Streams the latest Android build from S3 with a friendly filename so
// browsers (esp. Android Chrome) save it as MyPhoto-Android.apk.
export async function GET() {
  try {
    const obj = await getObject(APK_KEY);
    return new NextResponse(obj.body as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="MyPhoto-Android.apk"',
        // Lets Vercel cache the response on its edge so we don't re-stream
        // the 200 MB blob on every download. The APK is replaced rarely,
        // and clients see a fresh one within an hour of upload.
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (e: any) {
    console.error('Android APK download error:', e?.message || e);
    return NextResponse.json(
      { error: 'APK still being prepared. Please try again in a few minutes.' },
      { status: 404 }
    );
  }
}
