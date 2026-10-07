import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { generateDiskShareApiKey } from '@/lib/disk-share-api-key';

export const dynamic = 'force-dynamic';

// Load a share the caller owns, or return a NextResponse error.
async function loadOwnedShare(token: string, userId: string) {
  const shareDoc = await db.collection('diskShares').doc(token).get();
  if (!shareDoc.exists || shareDoc.data()?.userId !== userId) {
    return { error: NextResponse.json({ error: 'Share not found' }, { status: 404 }) };
  }
  const data = shareDoc.data()!;
  if (data.type !== 'folder') {
    return {
      error: NextResponse.json(
        { error: 'API keys are only supported for folder shares' },
        { status: 400 }
      ),
    };
  }
  return { share: data };
}

// POST /api/disk-share/api-key — generate (or rotate) an API key for a folder
// share. Returns the raw key ONCE; only its hash is stored.
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const body = await request.json();
    const { token, permission = 'readwrite' } = body;

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }
    if (!['read', 'readwrite'].includes(permission)) {
      return NextResponse.json(
        { error: 'Invalid permission. Use "read" or "readwrite"' },
        { status: 400 }
      );
    }

    const { share, error } = await loadOwnedShare(token, userId);
    if (error) return error;

    const { rawKey, hash, last4 } = generateDiskShareApiKey(token);

    await db.collection('diskShareKeys').doc(token).set({
      shareToken: token,
      ownerId: userId,
      folderId: share!.folderId,
      type: share!.type,
      apiKeyHash: hash,
      apiKeyPermission: permission,
      last4,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      apiKey: rawKey, // shown once — caller must store it now
      permission,
      last4,
      shareToken: token,
    });
  } catch (error) {
    console.error('Disk share api-key POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/disk-share/api-key?token=X — status of the share's API key.
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const token = new URL(request.url).searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const { error } = await loadOwnedShare(token, userId);
    if (error) return error;

    const keyDoc = await db.collection('diskShareKeys').doc(token).get();
    if (!keyDoc.exists || !keyDoc.data()?.isActive) {
      return NextResponse.json({ exists: false });
    }
    const data = keyDoc.data()!;
    return NextResponse.json({
      exists: true,
      permission: data.apiKeyPermission,
      last4: data.last4,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    });
  } catch (error) {
    console.error('Disk share api-key GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/disk-share/api-key — revoke the share's API key.
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const body = await request.json();
    const { token } = body;
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const { error } = await loadOwnedShare(token, userId);
    if (error) return error;

    const keyDoc = await db.collection('diskShareKeys').doc(token).get();
    if (keyDoc.exists) {
      await keyDoc.ref.update({ isActive: false, revokedAt: FieldValue.serverTimestamp() });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disk share api-key DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
