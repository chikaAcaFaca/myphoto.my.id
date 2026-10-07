import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

// GET /api/files/resolve?assetId=<deviceAssetId>
// Returns the cloud file id for one of the caller's photos given its device
// MediaLibrary asset id (stored on upload). Lets the app turn a device photo
// into a shareable cloud file. 404 if this asset was never backed up, or was
// uploaded before deviceAssetId tracking existed.
export async function GET(request: NextRequest) {
  const authResult = await verifyAuthWithRateLimit(request, 'api');
  if (!authResult.success) return authResult.response;
  const { userId } = authResult;

  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get('assetId');
  const name = searchParams.get('name');
  if (!assetId && !name) {
    return NextResponse.json({ error: 'assetId or name required' }, { status: 400 });
  }

  // Single-field indexes are auto-created; filter by owner in memory to avoid
  // needing composite indexes.
  let mine: FirebaseFirestore.QueryDocumentSnapshot | undefined;

  if (assetId) {
    const snap = await db.collection('files').where('deviceAssetId', '==', assetId).limit(5).get();
    mine = snap.docs.find((d) => d.data().userId === userId && !d.data().isTrashed);
  }

  // Fallback for photos backed up before deviceAssetId tracking: match by name.
  if (!mine && name) {
    const snap = await db.collection('files').where('name', '==', name).limit(10).get();
    mine = snap.docs.find((d) => d.data().userId === userId && !d.data().isTrashed);
  }

  if (!mine) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json({ fileId: mine.id });
}
