import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit, getOptionalUserId } from '@/lib/auth-utils';
import { generateUploadUrl, generateDownloadUrl } from '@/lib/s3';
import { FieldValue } from 'firebase-admin/firestore';
import { rankedFeed } from '@/lib/meme-feed';
import { memeMediaUrls, scheduleOptimization } from '@/lib/meme-video';
import {
  generateFileId,
  formatBytes,
  MAX_FREE_STORAGE,
  MAX_MEME_UPLOAD_SIZE,
} from '@myphoto/shared';

export const dynamic = 'force-dynamic';
// Room for the background video conversion scheduled after a response.
export const maxDuration = 300;

// GET /api/meme-wall — public listing of memes, newest first (LIFO).
// Auth is optional: when a valid token is supplied we also return the
// caller's like/dislike state for each meme.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '30', 10), 100);
    const offset = (page - 1) * pageSize;
    // Optional auth — the caller's reaction state, and "seen" for the feed.
    const viewerId = await getOptionalUserId(request);

    // ?feed=foryou&seed=…&since=ms — ranked "Za tebe" order (lib/meme-feed).
    if (searchParams.get('feed') === 'foryou') {
      const seed = (searchParams.get('seed') || 'x').slice(0, 64);
      const since = Number(searchParams.get('since')) || Date.now();
      const ranked = await rankedFeed({ seed, viewerId, since });
      const slice = ranked.slice(offset, offset + pageSize);
      return withGuestCache(NextResponse.json({
        memes: await toMemes(slice, viewerId),
        hasMore: ranked.length > offset + pageSize,
        page,
      }), viewerId);
    }

    let docs: FirebaseFirestore.QueryDocumentSnapshot[];
    try {
      const snapshot = await db.collection('memes')
        .where('isPublic', '==', true)
        .orderBy('createdAt', 'desc')
        .offset(offset)
        .limit(pageSize + 1)
        .get();
      docs = snapshot.docs;
    } catch (e: any) {
      console.error('MemeWall query failed, using unordered fallback:', e.code, e.message);
      // Fallback when the composite index is missing: pull a wider slice and
      // sort/paginate in memory so the wall is still newest-first (LIFO).
      try {
        const snapshot = await db.collection('memes')
          .where('isPublic', '==', true)
          .limit(500)
          .get();
        const sorted = snapshot.docs.sort((a, b) => {
          const ta = a.data().createdAt?.toMillis?.() ?? 0;
          const tb = b.data().createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        docs = sorted.slice(offset, offset + pageSize + 1);
      } catch (e2: any) {
        console.error('MemeWall fallback query failed:', e2.message);
        return NextResponse.json({ memes: [], hasMore: false, page });
      }
    }

    const hasMore = docs.length > pageSize;
    const pageDocs = docs.slice(0, pageSize);
    const memes = await toMemes(pageDocs, viewerId);

    return withGuestCache(NextResponse.json({ memes, hasMore, page }), viewerId);
  } catch (error) {
    console.error('MemeWall GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Public meme JSON, with the viewer's reaction/favorite/repost state. */
/**
 * Guests all get the same pages, so let the CDN serve them for a short while:
 * a burst of visitors from a shared link costs one function run and one
 * Firestore query instead of one per visitor. Signed-in responses carry the
 * viewer's own like state and are never cached.
 */
function withGuestCache(res: NextResponse, viewerId: string | null) {
  if (!viewerId) res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
  else res.headers.set('Cache-Control', 'private, no-store');
  return res;
}

type ViewerState = { reaction: 'like' | 'dislike' | null; favorited: boolean; reposted: boolean };

/** Memes for a page; the viewer's state for all of them in one batched read. */
async function toMemes(docs: FirebaseFirestore.QueryDocumentSnapshot[], viewerId: string | null) {
  const states = new Map<string, ViewerState>();
  if (viewerId && docs.length) {
    try {
      const refs = docs.flatMap((d) => [
        d.ref.collection('reactions').doc(viewerId),
        d.ref.collection('favorites').doc(viewerId),
        d.ref.collection('reposts').doc(viewerId),
      ]);
      const snaps = await db.getAll(...refs);
      docs.forEach((d, i) => {
        const [r, f, p] = snaps.slice(i * 3, i * 3 + 3);
        states.set(d.id, { reaction: r.exists ? r.data()!.type : null, favorited: f.exists, reposted: p.exists });
      });
    } catch {}
  }
  scheduleOptimization(docs);
  return Promise.all(docs.map((doc) => toMeme(doc, states.get(doc.id))));
}

async function toMeme(doc: FirebaseFirestore.QueryDocumentSnapshot, state?: ViewerState) {
  const data = doc.data();
  const { imageUrl, posterUrl } = await memeMediaUrls(data);

  const userReaction = state?.reaction ?? null;
  const userFavorited = state?.favorited ?? false;
  const userReposted = state?.reposted ?? false;

  return {
    id: doc.id,
    caption: data.caption || '',
    topText: data.topText || '',
    bottomText: data.bottomText || '',
    imageUrl,
    posterUrl,
    mediaType: data.mediaType || 'image',
    authorName: data.authorName || 'Anonymous',
    authorId: data.authorId,
    likes: data.likes || 0,
    dislikes: data.dislikes || 0,
    shares: data.shares || 0,
    favorites: data.favorites || 0,
    reposts: data.reposts || 0,
    views: data.views || 0,
    commentCount: data.commentCount || 0,
    template: data.template || 'classic',
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    userReaction,
    userFavorited,
    userReposted,
    // Remix lineage — present when this meme was derived from another
    // (user "stripped" the original caption and added their own). The
    // wall surfaces this so the original author still gets credit.
    remixOf: data.remixOf || null,
  };
}

// POST /api/meme-wall — publish a meme (auth required).
// The meme image (with top/bottom text already baked in) is rendered on the
// client — web via <canvas>, mobile via react-native-view-shot — and PUT to
// the returned uploadUrl. The server never renders the image.
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const body = await request.json();
    const { caption, topText, bottomText, template, fontSize, mediaType, fileId, imageData, remixOfId, size } = body;

    if (!caption && !topText && !bottomText) {
      return NextResponse.json({ error: 'Meme must have text' }, { status: 400 });
    }

    // Get user info and check meme limits
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const authorName = userData?.displayName || 'Anonymous';
    const storageLimit = userData?.storageLimit || 0;
    const storageUsed = userData?.storageUsed || 0;
    const isFreeUser = storageLimit <= MAX_FREE_STORAGE;

    // Memes live in the author's own storage: the upload is size-pinned and
    // charged against storageLimit exactly like a photo.
    const uploadSize = Number(size);
    if (imageData) {
      if (!Number.isInteger(uploadSize) || uploadSize <= 0) {
        return NextResponse.json(
          { error: 'Ažurirajte aplikaciju da biste objavljivali memove.' },
          { status: 426 }
        );
      }
      if (uploadSize > MAX_MEME_UPLOAD_SIZE) {
        return NextResponse.json(
          { error: `Fajl je prevelik (maksimum ${formatBytes(MAX_MEME_UPLOAD_SIZE, 0)}).` },
          { status: 413 }
        );
      }
      if (storageUsed + uploadSize > storageLimit) {
        return NextResponse.json(
          {
            error: 'Nemate dovoljno prostora. Pozovite prijatelje (+250 MB po preporuci) ili nadogradite plan.',
            code: 'STORAGE_FULL',
          },
          { status: 403 }
        );
      }
    }

    // Free users: max 20 memes per month
    if (isFreeUser) {
      try {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const monthlyMemes = await db.collection('memes')
          .where('authorId', '==', userId)
          .where('createdAt', '>=', monthStart)
          .count()
          .get();

        const count = monthlyMemes.data().count;
        if (count >= 20) {
          return NextResponse.json({
            error: 'Dostigli ste mesečni limit od 20 besplatnih memova. Nadogradite plan za neograničeno memova!',
          }, { status: 403 });
        }
      } catch (e: any) {
        // Index might not be ready yet — allow the request through
        console.warn('Meme count query failed (allowing):', e.message);
      }
    }

    const now = new Date();
    const memeId = generateFileId();

    const memeData: Record<string, any> = {
      authorId: userId,
      authorName,
      caption: caption || [topText, bottomText].filter(Boolean).join(' '),
      topText: topText || '',
      bottomText: bottomText || '',
      template: template || 'classic',
      fontSize: fontSize || 32,
      mediaType: mediaType || 'image',
      isPublic: true,
      likes: 0,
      dislikes: 0,
      shares: 0,
      views: 0,
      commentCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Keep a link back to the source MyPhoto file for attribution, if any.
    if (fileId) {
      const fileDoc = await db.collection('files').doc(fileId).get();
      if (fileDoc.exists && fileDoc.data()?.userId === userId) {
        memeData.sourceFileId = fileId;
      }
    }

    // Remix lineage: when this meme is derived from another, snapshot the
    // original author so the wall can credit them ("Remix od @X") even if
    // the original is later deleted. Snapshot rather than join-on-render so
    // GETs stay one-Firestore-read-per-meme.
    if (remixOfId) {
      try {
        const origDoc = await db.collection('memes').doc(remixOfId).get();
        if (origDoc.exists) {
          const orig = origDoc.data()!;
          memeData.remixOf = {
            id: remixOfId,
            authorId: orig.authorId,
            authorName: orig.authorName || 'Anonymous',
          };
        }
      } catch (e: any) {
        // Bad remixOfId is non-fatal — the meme still publishes, just
        // without the attribution badge.
        console.warn('Remix lineage lookup failed:', e.message);
      }
    }

    // The client uploads the rendered media here. Image memes are baked to JPG;
    // video/gif memes upload the original media (text is overlaid at display
    // time since we can't composite it into a video on-device).
    let uploadUrl: string | null = null;
    if (imageData) {
      const ext = mediaType === 'video' ? 'mp4' : mediaType === 'gif' ? 'gif' : 'jpg';
      const contentType =
        mediaType === 'video' ? 'video/mp4' : mediaType === 'gif' ? 'image/gif' : 'image/jpeg';
      const memeKey = `memes/${userId}/${memeId}.${ext}`;
      const { url } = await generateUploadUrl(memeKey, contentType, uploadSize);
      memeData.s3Key = memeKey;
      memeData.size = uploadSize;
      uploadUrl = url;
    }

    const batch = db.batch();
    batch.set(db.collection('memes').doc(memeId), memeData);
    if (memeData.size) {
      batch.update(db.collection('users').doc(userId), {
        storageUsed: FieldValue.increment(memeData.size),
      });
    }
    await batch.commit();

    return NextResponse.json({
      id: memeId,
      shareUrl: `/meme/${memeId}`,
      uploadUrl,
    });
  } catch (error) {
    console.error('MemeWall POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
