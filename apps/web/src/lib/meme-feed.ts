import { db } from '@/lib/firebase-admin';

// "Za tebe" (For you) ordering of the Meme Wall.
//
// A pool of recent public memes is ranked by engagement rate and freshness,
// with a per-session random jitter (same `seed` = same order, so paging is
// stable) and a boost for brand-new memes so new authors get seen. Memes the
// viewer saw before this session go to the end, and the same author is never
// shown twice in a row when it can be avoided.
//
// Seen memes are kept per user in memeSeen/{uid}: { seen: { [memeId]: ms } },
// written in batches by POST /api/meme-wall/seen (server-only collection).

type Doc = FirebaseFirestore.QueryDocumentSnapshot;

const POOL_SIZE = 400;
const POOL_TTL_MS = 60_000;
const HALF_LIFE_H = 72;
const FRESH_H = 12;
const MAX_SEEN = 1000;

let pool: { at: number; docs: Doc[] } | null = null;

async function getPool(): Promise<Doc[]> {
  if (pool && Date.now() - pool.at < POOL_TTL_MS) return pool.docs;
  let docs: Doc[];
  try {
    docs = (await db.collection('memes')
      .where('isPublic', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(POOL_SIZE)
      .get()).docs;
  } catch {
    // Missing composite index: same fallback as the chronological wall.
    docs = (await db.collection('memes').where('isPublic', '==', true).limit(500).get()).docs
      .sort((a, b) => (b.data().createdAt?.toMillis?.() ?? 0) - (a.data().createdAt?.toMillis?.() ?? 0))
      .slice(0, POOL_SIZE);
  }
  pool = { at: Date.now(), docs };
  return docs;
}

/** Deterministic 0..1 from a string (FNV-1a), so a seed gives a stable order. */
function rand(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xffffffff;
}

function score(d: FirebaseFirestore.DocumentData, now: number): number {
  const ageH = Math.max(0, (now - (d.createdAt?.toMillis?.() ?? now)) / 3_600_000);
  const engagement = Math.max(0,
    (d.likes || 0) * 3 + (d.commentCount || 0) * 4 + (d.shares || 0) * 5 +
    (d.reposts || 0) * 4 + (d.favorites || 0) * 3 - (d.dislikes || 0) * 2);
  const rate = (engagement + 2) / ((d.views || 0) + 20);
  let s = (Math.log2(engagement + 2) + 4 * rate) * Math.pow(0.5, ageH / HALF_LIFE_H);
  if (ageH < FRESH_H && (d.views || 0) < 50) s *= 1.8;
  return s;
}

/** Avoid the same author twice in a row (looks a few places ahead). */
function spreadAuthors(docs: Doc[]): Doc[] {
  const rest = [...docs];
  const out: Doc[] = [];
  while (rest.length) {
    const prev = out[out.length - 1]?.data().authorId;
    let i = rest.findIndex((d, k) => k < 6 && d.data().authorId !== prev);
    if (i < 0) i = 0;
    out.push(rest.splice(i, 1)[0]);
  }
  return out;
}

async function getSeen(userId: string): Promise<Record<string, number>> {
  const snap = await db.collection('memeSeen').doc(userId).get();
  return (snap.data()?.seen as Record<string, number>) || {};
}

export async function rankedFeed(opts: { seed: string; viewerId: string | null; since: number }): Promise<Doc[]> {
  const [docs, seen] = await Promise.all([
    getPool(),
    opts.viewerId ? getSeen(opts.viewerId) : Promise.resolve({} as Record<string, number>),
  ]);
  const now = Date.now();
  const ranked = docs
    .map((doc) => {
      const d = doc.data();
      let s = score(d, now) * (0.3 + 1.4 * rand(opts.seed + doc.id));
      if (opts.viewerId && d.authorId === opts.viewerId) s *= 0.3;
      return { doc, s };
    })
    .sort((a, b) => b.s - a.s)
    .map((x) => x.doc);

  // Seen before this session → after everything new (the feed never runs dry).
  const seenBefore = (id: string) => seen[id] !== undefined && seen[id] < opts.since;
  const fresh = ranked.filter((d) => !seenBefore(d.id));
  const old = ranked.filter((d) => seenBefore(d.id));
  return [...spreadAuthors(fresh), ...spreadAuthors(old)];
}

/** Remember memes the user has scrolled past (kept to the newest MAX_SEEN). */
export async function markSeen(userId: string, ids: string[]): Promise<void> {
  const ref = db.collection('memeSeen').doc(userId);
  await db.runTransaction(async (tx) => {
    const seen: Record<string, number> = { ...((await tx.get(ref)).data()?.seen || {}) };
    const now = Date.now();
    for (const id of ids) seen[id] = seen[id] ?? now;
    const entries = Object.entries(seen);
    const trimmed = entries.length > MAX_SEEN
      ? Object.fromEntries(entries.sort((a, b) => b[1] - a[1]).slice(0, MAX_SEEN))
      : seen;
    tx.set(ref, { seen: trimmed, updatedAt: new Date() });
  });
}
