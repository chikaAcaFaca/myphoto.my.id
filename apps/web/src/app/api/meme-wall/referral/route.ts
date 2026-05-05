import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const MEME_REFERRAL_BONUS = 1 * 1024 * 1024 * 1024; // 1GB per referral
const MAX_MEME_REFERRAL_BONUS = 10 * 1024 * 1024 * 1024; // Max 10GB from meme referrals

// POST /api/meme-wall/referral — claim meme referral bonus after registration
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

    // Get the meme to find the creator
    const memeDoc = await db.collection('memes').doc(memeId).get();
    if (!memeDoc.exists) {
      return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
    }

    const memeData = memeDoc.data()!;
    const creatorId = memeData.authorId;

    // Don't reward yourself
    if (creatorId === userId) {
      return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 });
    }

    // Check if this referral was already claimed
    const existingRef = await db.collection('memeReferrals')
      .where('memeId', '==', memeId)
      .where('refereeId', '==', userId)
      .limit(1)
      .get();

    if (!existingRef.empty) {
      return NextResponse.json({ error: 'Already claimed' }, { status: 400 });
    }

    // Check creator's total meme referral bonus
    const creatorDoc = await db.collection('users').doc(creatorId).get();
    if (!creatorDoc.exists) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const creatorData = creatorDoc.data()!;
    const currentMemeBonus = creatorData.memeReferralBonus || 0;

    if (currentMemeBonus >= MAX_MEME_REFERRAL_BONUS) {
      return NextResponse.json({ message: 'Creator reached max bonus' });
    }

    // Record the referral
    await db.collection('memeReferrals').add({
      memeId,
      creatorId,
      refereeId: userId,
      bonusBytes: MEME_REFERRAL_BONUS,
      createdAt: new Date(),
    });

    // Give creator 1GB bonus
    await db.collection('users').doc(creatorId).update({
      storageLimit: FieldValue.increment(MEME_REFERRAL_BONUS),
      memeReferralBonus: FieldValue.increment(MEME_REFERRAL_BONUS),
    });

    // Track on meme
    await memeDoc.ref.update({
      referralCount: FieldValue.increment(1),
    });

    return NextResponse.json({
      success: true,
      creatorBonus: '1 GB',
      message: `Kreator mema je dobio +1GB storage zahvaljujuci vama!`,
    });
  } catch (error) {
    console.error('Meme referral error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
