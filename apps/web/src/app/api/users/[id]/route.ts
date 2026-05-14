import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getOptionalUserId } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

// GET /api/users/[id] — public profile: display name, follower/following
// counts, meme count. When the caller is authenticated we also return whether
// they follow this user.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const data = userDoc.data()!;

    let memeCount = 0;
    try {
      const countSnap = await db.collection('memes')
        .where('authorId', '==', id)
        .where('isPublic', '==', true)
        .count()
        .get();
      memeCount = countSnap.data().count;
    } catch {}

    const viewerId = await getOptionalUserId(request);
    let isFollowing = false;
    let isSelf = false;
    if (viewerId) {
      isSelf = viewerId === id;
      if (!isSelf) {
        try {
          const followDoc = await db.collection('users').doc(viewerId)
            .collection('following').doc(id).get();
          isFollowing = followDoc.exists;
        } catch {}
      }
    }

    return NextResponse.json({
      id,
      displayName: data.displayName || 'Anonymous',
      followerCount: data.followerCount || 0,
      followingCount: data.followingCount || 0,
      memeCount,
      isFollowing,
      isSelf,
    });
  } catch (error) {
    console.error('User profile GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
