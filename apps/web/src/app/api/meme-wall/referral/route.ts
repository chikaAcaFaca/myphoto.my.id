import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const MEME_REFERRAL_BONUS = 1 * 1024 * 1024 * 1024; // 1GB per qualified referral
const MAX_MEME_REFERRAL_BONUS = 10 * 1024 * 1024 * 1024; // Max 10GB from meme referrals
const QUALIFICATION_UPLOAD_BYTES = 500 * 1024 * 1024; // Referee must upload 500MB
const QUALIFICATION_REFERRALS = 5; // Referee must refer 5 friends

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
    const { userId } = authResult;

    // Check if this user has pending meme referrals where they are the referee
    const pendingRefs = await db.collection('memeReferrals')
      .where('refereeId', '==', userId)
      .where('qualified', '==', false)
      .get();

    if (pendingRefs.empty) {
      return NextResponse.json({ qualified: 0 });
    }

    // Check qualification: uploaded 500MB + referred 5 friends
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const totalUploaded = userData.totalUploadedBytes || userData.storageUsed || 0;
    const referralCount = userData.referralCount || 0;

    if (totalUploaded < QUALIFICATION_UPLOAD_BYTES || referralCount < QUALIFICATION_REFERRALS) {
      return NextResponse.json({
        qualified: 0,
        progress: {
          uploaded: totalUploaded,
          requiredUpload: QUALIFICATION_UPLOAD_BYTES,
          referrals: referralCount,
          requiredReferrals: QUALIFICATION_REFERRALS,
        },
      });
    }

    // User qualifies — grant bonuses to all meme creators
    let granted = 0;
    for (const ref of pendingRefs.docs) {
      const refData = ref.data();
      if (refData.bonusGranted) continue;

      const creatorId = refData.creatorId;

      // Check creator hasn't exceeded max bonus
      const creatorDoc = await db.collection('users').doc(creatorId).get();
      if (!creatorDoc.exists) continue;

      const creatorBonus = creatorDoc.data()?.memeReferralBonus || 0;
      if (creatorBonus >= MAX_MEME_REFERRAL_BONUS) continue;

      // Grant bonus
      await db.collection('users').doc(creatorId).update({
        storageLimit: FieldValue.increment(MEME_REFERRAL_BONUS),
        memeReferralBonus: FieldValue.increment(MEME_REFERRAL_BONUS),
      });

      await ref.ref.update({
        qualified: true,
        bonusGranted: true,
        qualifiedAt: new Date(),
      });

      granted++;
    }

    return NextResponse.json({ qualified: granted });
  } catch (error) {
    console.error('Meme referral qualification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
