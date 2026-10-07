import { NextResponse } from 'next/server';
import { generateDownloadUrl, objectExists } from '@/lib/s3';

export const dynamic = 'force-dynamic';

const APK_KEY = 'public/myphoto-android-latest.apk';
const LINK_TTL = 60 * 60; // presigned link lifetime, seconds

// GET /api/download/android — public APK download.
// Redirects to a short-lived presigned Wasabi URL so the ~200 MB APK is
// served straight from Wasabi (free egress) instead of being streamed through
// a Vercel function, which billed every byte as Vercel bandwidth. The stable
// /api/download/android link (website, banners, in-app update check) is kept.
export async function GET() {
  try {
    if (!(await objectExists(APK_KEY))) throw new Error('APK missing');
    const url = await generateDownloadUrl(APK_KEY, {
      expiresIn: LINK_TTL,
      filename: 'MyPhoto-Android.apk',
      contentType: 'application/vnd.android.package-archive',
    });
    return NextResponse.redirect(url, {
      status: 302,
      headers: {
        // Cache the redirect well inside the link's lifetime so a cached
        // response never hands out an expired URL.
        'Cache-Control': 'public, max-age=300, s-maxage=600',
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
