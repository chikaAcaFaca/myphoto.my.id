import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit, getClientIp } from '@/lib/auth-utils';
import { getObjectMetadata } from '@/lib/s3';
import {
  getFileType,
  REFERRAL_QUALIFICATION_BYTES,
  REFERRAL_BONUS,
  MAX_REFERRALS,
} from '@myphoto/shared';
import { processImageAI } from '@/lib/ai-processing';
import { recalculateStorageLimit } from '@/lib/storage-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Auto-rename duplicate filenames: photo.jpg -> photo (1).jpg -> photo (2).jpg
async function getUniquePhotoName(userId: string, filename: string): Promise<string> {
  const existing = await db.collection('files')
    .where('userId', '==', userId)
    .where('isTrashed', '==', false)
    .where('name', '>=', filename.split('.')[0])
    .where('name', '<=', filename.split('.')[0] + '\uf8ff')
    .get();

  const names = new Set(existing.docs.map((d) => d.data().name));
  if (!names.has(filename)) return filename;

  const dotIndex = filename.lastIndexOf('.');
  const baseName = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
  const ext = dotIndex > 0 ? filename.slice(dotIndex) : '';

  let counter = 1;
  let candidate = `${baseName} (${counter})${ext}`;
  while (names.has(candidate)) {
    counter++;
    candidate = `${baseName} (${counter})${ext}`;
  }
  return candidate;
}

/**
 * Grant the referrer their one-time bonus once this referee crosses the upload
 * threshold (monotonic totalUploadedBytes). Idempotent + transactional, gated on
 * a verified referee email, with same-IP dedupe to blunt Sybil farming rings.
 * Best-effort: callers must not block the upload on this.
 */
async function maybeQualifyReferral(userId: string, emailVerified: boolean, ip: string) {
  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();
  const u = userSnap.data();

  // Cheap guards — skip the expensive path for the vast majority of uploads.
  if (!u || !u.referredBy || u.referralQualified) return;
  if ((u.totalUploadedBytes || 0) < REFERRAL_QUALIFICATION_BYTES) return;
  // Unverified referee email never qualifies a referral.
  if (!emailVerified) return;

  // Find this referee's pending referral.
  const refQuery = await db
    .collection('referrals')
    .where('refereeUserId', '==', userId)
    .where('qualified', '==', false)
    .limit(1)
    .get();
  if (refQuery.empty) {
    await userRef.update({ referralQualified: true }); // nothing pending — stop re-checking
    return;
  }
  const refRef = refQuery.docs[0].ref;
  const referrerId = refQuery.docs[0].data().referrerUserId as string;

  // Same-IP dedupe: if this IP already qualified a referral toward the same
  // referrer, flag suspect and don't grant (bounds account-farming rings).
  const sameIp = await db
    .collection('referrals')
    .where('referrerUserId', '==', referrerId)
    .where('qualified', '==', true)
    .where('refereeIp', '==', ip)
    .limit(1)
    .get();
  const suspect = !sameIp.empty;

  await db.runTransaction(async (tx) => {
    // All reads first (Firestore requires reads before writes).
    const freshRef = await tx.get(refRef);
    if (freshRef.data()?.qualified) return; // already granted by a concurrent call
    const referrerRef = db.collection('users').doc(referrerId);
    const referrerSnap = await tx.get(referrerRef);
    const underCap = (referrerSnap.data()?.referralCount || 0) < MAX_REFERRALS;
    // Writes.
    tx.update(refRef, {
      qualified: true,
      qualifiedAt: FieldValue.serverTimestamp(),
      refereeIp: ip,
      suspect,
    });
    tx.update(userRef, { referralQualified: true });
    if (!suspect && underCap) {
      // The referrer earns REFERRAL_BONUS per qualified friend, up to
      // MAX_REFERRALS; recalculateStorageLimit applies the 2.5GB free cap.
      tx.update(referrerRef, {
        referralCount: FieldValue.increment(1),
        referralBonusBytes: FieldValue.increment(REFERRAL_BONUS),
      });
    }
  });

  if (!suspect) {
    await recalculateStorageLimit(referrerId);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify auth and check rate limit
    const authResult = await verifyAuthWithRateLimit(request, 'upload');
    if (!authResult.success) {
      return authResult.response;
    }
    const { userId, emailVerified } = authResult;

    // Parse request body
    const body = await request.json();
    const { fileId, s3Key, name, size, mimeType, thumbnailKey } = body;

    // Validate
    if (!fileId || !s3Key || !name || !size || !mimeType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Everything below comes from the client, so pin it to what upload-url
    // issued for THIS user: the id must be a plain id, the key must live under
    // the caller's own prefix and carry that id, and the thumbnail key must be
    // the caller's too. Without this a user could register someone else's
    // object as their own file and then read or delete it through /api/files.
    if (typeof fileId !== 'string' || !/^[a-z0-9-]{6,64}$/i.test(fileId)) {
      return NextResponse.json({ error: 'Invalid fileId' }, { status: 400 });
    }
    const ownPrefix = `users/${userId}/`;
    if (
      typeof s3Key !== 'string' ||
      !s3Key.startsWith(`${ownPrefix}originals/`) ||
      !s3Key.includes(`/${fileId}.`) ||
      s3Key.includes('..')
    ) {
      return NextResponse.json({ error: 'Invalid s3Key' }, { status: 400 });
    }
    if (
      thumbnailKey !== undefined &&
      thumbnailKey !== null &&
      (typeof thumbnailKey !== 'string' || !thumbnailKey.startsWith(`${ownPrefix}thumbnails/${fileId}`))
    ) {
      return NextResponse.json({ error: 'Invalid thumbnailKey' }, { status: 400 });
    }

    // Verify the object exists and take its size from storage, not the body —
    // a client-supplied (e.g. negative) size would skew the quota.
    const meta = await getObjectMetadata(s3Key);
    if (!meta) {
      return NextResponse.json(
        { error: 'File not found in storage' },
        { status: 404 }
      );
    }
    const actualSize = meta.contentLength;

    // Never overwrite an existing record. A retry of the same confirm by the
    // same user is answered idempotently.
    const existing = await db.collection('files').doc(fileId).get();
    if (existing.exists) {
      if (existing.data()?.userId === userId && existing.data()?.s3Key === s3Key) {
        return NextResponse.json({ id: fileId, ...existing.data(), duplicateConfirm: true });
      }
      return NextResponse.json({ error: 'File id already in use' }, { status: 409 });
    }

    // Auto-rename if duplicate name exists
    const uniqueName = await getUniquePhotoName(userId, name);

    // Create file document
    const fileData: Record<string, any> = {
      userId,
      type: getFileType(mimeType),
      name: uniqueName,
      size: actualSize,
      mimeType,
      s3Key,
      albumIds: [],
      isFavorite: false,
      isArchived: false,
      isTrashed: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // If client sent a video thumbnail, store it
    if (thumbnailKey && typeof thumbnailKey === 'string') {
      fileData.thumbnailKey = thumbnailKey;
    }

    await db.collection('files').doc(fileId).create(fileData);

    // Update user storage. storageUsed tracks live usage (drops on delete);
    // totalUploadedBytes is a monotonic lifetime counter used for referral
    // qualification so deleting + re-uploading can't farm bonuses.
    await db.collection('users').doc(userId).update({
      storageUsed: FieldValue.increment(actualSize),
      totalUploadedBytes: FieldValue.increment(actualSize),
    });

    // Referral qualification: once the referee crosses the upload threshold,
    // grant the referrer their one-time bonus. Best-effort — never block upload.
    maybeQualifyReferral(userId, emailVerified, getClientIp(request)).catch((err) => {
      console.error('Referral qualification error:', err);
    });

    // Trigger AI processing — await it so the serverless function stays alive
    // Thumbnails are saved first inside processImageAI, so even partial failure is OK
    if (mimeType.startsWith('image/')) {
      // Don't await — but use waitUntil pattern via global EdgeRuntime or just fire-and-forget
      // Since thumbnails are now saved first in processImageAI, this is safe
      processImageAI(fileId, s3Key).catch((err) => {
        console.error('AI processing error:', err);
      });
    }

    return NextResponse.json({
      id: fileId,
      ...fileData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error confirming upload:', error instanceof Error ? error.message : error);
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
