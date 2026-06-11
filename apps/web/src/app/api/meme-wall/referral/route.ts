import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';
import {
  MEME_REFERRAL_BONUS,
  MAX_MEME_REFERRAL_BONUS,
  MEME_QUALIFICATION_UPLOAD_BYTES,
  MEME_QUALIFICATION_REFERRALS,
} from '@myphoto/shared';
import { recalculateStorageLimit } from '@/lib/storage-limit';

export const dynamic = 'force-dynamic';

// POST /api/meme-wall/referral — register meme referral (bonus granted later when qualified)
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const body = await request.json();
    const { memeId } = body;

    if (!memeId) {
      return NextResponse.json({ error: 'memeId required' }, { status: 400 });
    }

    const memeDoc = await db.collection('memes').doc(memeId).get();
    if (!memeDoc.exists) {
      return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
    }

    const memeData = memeDoc.data()!;
    const creatorId = memeData.authorId;

    if (creatorId === userId) {
      return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 });
    }

    // Check if already registered
    const existingRef = await db.collection('memeReferrals')
      .where('memeId', '==', memeId)
      .where('refereeId', '==', userId)
      .limit(1)
      .get();

    if (!existingRef.empty) {
      return NextResponse.json({ error: 'Already claimed' }, { status: 400 });
    }

    // Record the referral — NOT yet qualified, bonus pending
    await db.collection('memeReferrals').add({
      memeId,
      creatorId,
      refereeId: userId,
      bonusBytes: MEME_REFERRAL_BONUS,
      qualified: false, // Becomes true when referee meets criteria
      bonusGranted: false,
      createdAt: new Date(),
    });

    // Track on meme
    await memeDoc.ref.update({
      referralCount: FieldValue.increment(1),
    });

    return NextResponse.json({
      success: true,
      message: 'Referral registrovan. Kreator mema ce dobiti +1GB kada vi uploadujete 500MB i preporucite 5 prijatelja.',
    });
  } catch (error) {
    console.error('Meme referral error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/meme-wall/referral — check and qualify pending referrals (called by system)
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId, emailVerified } = authResult;

    // Unverified referee email can never qualify a referral (anti-Sybil).
    if (!emailVerified) {
      return NextResponse.json({ qualified: 0, reason: 'email_not_verified' });
    }

    // Check if this user has pending meme referrals where they are the referee
    const pendingRefs = await db.collection('memeReferrals')
      .where('refereeId', '==', userId)
      .where('qualified', '==', false)
      .get();

    if (pendingRefs.empty) {
      return NextResponse.json({ qualified: 0 });
    }

    // Check qualification: uploaded 500MB (monotonic — NOT storageUsed, which
    // drops on delete and would let a referee farm via delete+re-upload) and
    // referred 5 friends.
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const totalUploaded = userData.totalUploadedBytes || 0;
    const referralCount = userData.referralCount || 0;

    if (totalUploaded < MEME_QUALIFICATION_UPLOAD_BYTES || referralCount < MEME_QUALIFICATION_REFERRALS) {
      return NextResponse.json({
        qualified: 0,
        progress: {
          uploaded: totalUploaded,
          requiredUpload: MEME_QUALIFICATION_UPLOAD_BYTES,
          referrals: referralCount,
          requiredReferrals: MEME_QUALIFICATION_REFERRALS,
        },
      });
    }

    // User qualifies — grant bonuses to all meme creators. Each grant runs in a
    // transaction (idempotent: re-checks bonusGranted) and clamps so the creator
    // never exceeds MAX_MEME_REFERRAL_BONUS. Two concurrent PUTs can no longer
    // double-grant.
    const creatorsGranted = new Set<string>();
    for (const ref of pendingRefs.docs) {
      const creatorId = ref.data().creatorId as string;
      const creatorRef = db.collection('users').doc(creatorId);

      const didGrant = await db.runTransaction(async (tx) => {
        const freshRef = await tx.get(ref.ref);
        if (freshRef.data()?.bonusGranted) return false;

        const creatorSnap = await tx.get(creatorRef);
        if (!creatorSnap.exists) return false;

        const creatorBonus = creatorSnap.data()?.memeReferralBonus || 0;
        const grant = Math.min(MEME_REFERRAL_BONUS, MAX_MEME_REFERRAL_BONUS - creatorBonus);

        // Always mark processed so we stop re-checking this referral.
        tx.update(ref.ref, {
          qualified: true,
          bonusGranted: true,
          qualifiedAt: FieldValue.serverTimestamp(),
        });

        if (grant <= 0) return false; // creator already at cap — no bonus
        tx.update(creatorRef, {
          memeReferralBonus: FieldValue.increment(grant),
        });
        return true;
      });

      if (didGrant) creatorsGranted.add(creatorId);
    }

    // Recompute storageLimit once per affected creator (single source of truth).
    for (const creatorId of creatorsGranted) {
      await recalculateStorageLimit(creatorId);
    }

    return NextResponse.json({ qualified: creatorsGranted.size });
  } catch (error) {
    console.error('Meme referral qualification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
