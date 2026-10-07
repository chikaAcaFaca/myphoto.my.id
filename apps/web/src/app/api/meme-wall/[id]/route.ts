import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { generateDownloadUrl, deleteObject } from '@/lib/s3';
import { getOptionalUserId, verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// GET /api/meme-wall/[id] — single meme (public). Increments the view count.
// When the caller is authenticated, also returns their like/dislike state.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await db.collection('memes').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
    }

    const data = doc.data()!;
    let imageUrl = data.imageUrl || '';
    if (data.s3Key && !imageUrl) {
      try { imageUrl = await generateDownloadUrl(data.s3Key); } catch {}
    }

    const viewerId = await getOptionalUserId(request);
    let userReaction: 'like' | 'dislike' | null = null;
    if (viewerId) {
      try {
        const r = await doc.ref.collection('reactions').doc(viewerId).get();
        if (r.exists) userReaction = r.data()!.type;
      } catch {}
    }

    // Increment view count (best-effort).
    try { await doc.ref.update({ views: FieldValue.increment(1) }); } catch {}

    return NextResponse.json({
      id: doc.id,
      caption: data.caption || '',
      topText: data.topText || '',
      bottomText: data.bottomText || '',
      imageUrl,
      mediaType: data.mediaType || 'image',
      authorName: data.authorName || 'Anonymous',
      authorId: data.authorId,
      likes: data.likes || 0,
      dislikes: data.dislikes || 0,
      shares: data.shares || 0,
      views: (data.views || 0) + 1,
      commentCount: data.commentCount || 0,
      template: data.template || 'classic',
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      userReaction,
    });
  } catch (error) {
    console.error('Meme GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/meme-wall/[id] — register a share (increments the share counter).
// Like/dislike now live at /api/meme-wall/[id]/react.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await db.collection('memes').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
    }
    await doc.ref.update({ shares: FieldValue.increment(1) });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Meme share error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Only the meme's own text fields are editable. The author is `authorId`.
const EDITABLE_TEXT_FIELDS = ['caption', 'topText', 'bottomText'] as const;
const MAX_TEXT_LEN = 500;

// PATCH /api/meme-wall/[id] — owner-only edit of the meme's text.
// Body: { caption?, topText?, bottomText? }. For video/gif memes the text is
// overlaid at display time, so an edit takes effect immediately; for image
// memes the text is baked into the uploaded picture, so this only updates the
// stored caption/description, not the rendered image.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const { id } = await params;
    const ref = db.collection('memes').doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
    }
    if (doc.data()!.authorId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = {};
    for (const field of EDITABLE_TEXT_FIELDS) {
      if (typeof body?.[field] === 'string') {
        updates[field] = body[field].slice(0, MAX_TEXT_LEN);
      }
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }
    updates.updatedAt = FieldValue.serverTimestamp();

    await ref.update(updates);
    return NextResponse.json({ success: true, ...updates, updatedAt: undefined });
  } catch (error) {
    console.error('Meme PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/meme-wall/[id] — owner-only delete. Removes the S3 media, then
// recursively deletes the meme doc and its sub-collections (reactions,
// favorites, reposts, comments).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const { id } = await params;
    const ref = db.collection('memes').doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
    }
    const data = doc.data()!;
    if (data.authorId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Best-effort: drop the media object first so we don't orphan storage.
    if (data.s3Key) {
      try { await deleteObject(data.s3Key); } catch (e) { console.error('Meme media delete failed:', e); }
    }

    // NOTE: do NOT use db.recursiveDelete — `db` is a Proxy (firebase-admin.ts)
    // and recursiveDelete's internals (BulkWriter / instanceof Firestore) don't
    // survive it, which 500'd the delete. Clear the known subcollections by
    // hand (each holds at most one doc per user action), then drop the meme.
    for (const sub of ['reactions', 'favorites', 'reposts', 'comments']) {
      try {
        const snap = await ref.collection(sub).get();
        await Promise.all(snap.docs.map((d) => d.ref.delete()));
      } catch (e) {
        console.error(`Meme ${sub} cleanup failed:`, e);
      }
    }
    await ref.delete();

    // Give the bytes back to the author's quota (charged at publish time).
    if (typeof data.size === 'number' && data.size > 0) {
      await db.collection('users').doc(userId).update({
        storageUsed: FieldValue.increment(-data.size),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Meme DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
