import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

// GET /api/disk-share/my-shares — list disk shares accessible to the current user
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    // Get all shares this user has accessed
    const accessSnap = await db.collection('diskShareAccess')
      .where('viewerUserId', '==', userId)
      .get();

    if (accessSnap.empty) {
      return NextResponse.json({ shares: [] });
    }

    // For each access record, verify the share is still active and get owner info
    const shares = [];

    for (const accessDoc of accessSnap.docs) {
      const access = accessDoc.data();
      const shareDoc = await db.collection('diskShares').doc(access.shareToken).get();

      if (!shareDoc.exists) continue;
      const shareData = shareDoc.data()!;
      if (!shareData.isActive) continue;

      // Get owner display name
      const ownerDoc = await db.collection('users').doc(access.ownerUserId).get();
      const ownerName = ownerDoc.data()?.displayName || ownerDoc.data()?.name || ownerDoc.data()?.email || 'Nepoznat';

      shares.push({
        shareToken: access.shareToken,
        type: shareData.type,
        itemName: shareData.itemName,
        permission: shareData.permission,
        ownerUserId: access.ownerUserId,
        ownerName,
        folderId: shareData.folderId || null,
        diskFileId: shareData.diskFileId || null,
        accessedAt: access.accessedAt?.toDate?.()?.toISOString() || null,
        lastAccessedAt: access.lastAccessedAt?.toDate?.()?.toISOString() || access.accessedAt?.toDate?.()?.toISOString() || null,
      });
    }

    // Sort by most recently accessed
    shares.sort((a, b) => {
      const dateA = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
      const dateB = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({ shares });
  } catch (error) {
    console.error('My shares GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
