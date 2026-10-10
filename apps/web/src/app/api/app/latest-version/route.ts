/**
 * GET /api/app/latest-version
 *
 * Tells the native app which build is the latest published APK so it can offer
 * an in-app update. The app compares this `build` to its own embedded build id
 * (app.json → extra.appBuild); if they differ it prompts the user to download
 * the new APK from `url`. The website can't read the installed app's version,
 * so this server-told-vs-app-known comparison is the reliable place for it.
 *
 * RELEASE NOTE: bump LATEST_BUILD to the new build id on every APK release, and
 * set the same value in apps/mobile app.json → extra.appBuild for that build,
 * so the freshly shipped build matches and never prompts itself.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Matches the appBuild embedded in the currently published APK
// (apps/mobile app.json → extra.appBuild). Keep them equal or the app
// nags itself to "update" to the very build it's already running.
const LATEST_BUILD = '2026-10-10.2';

export async function GET() {
  return NextResponse.json({
    build: LATEST_BUILD,
    url: '/api/download/android',
    notes: 'Novi izgled, Inbox sa porukama i obaveštenjima, Pozovi prijatelje.',
  });
}
