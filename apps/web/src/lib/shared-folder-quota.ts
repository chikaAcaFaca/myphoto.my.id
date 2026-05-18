/**
 * Helpers that keep shared-folder accounting in sync with viewer storage
 * quotas. The model (per business plan section 2.3):
 *
 *   When a user accepts a shared folder/file, the size of the shared content
 *   gets added to their storageUsed quota. If the owner later adds or
 *   removes content inside that folder, the delta fans out to every viewer
 *   who has already been charged for it ("live" sizing).
 *
 * Concretely we maintain `diskShareAccess.chargedBytes` per (share, viewer)
 * pair, and bump it (and the viewer's users/{uid}.storageUsed) in lockstep.
 * Shares are recorded with `type: 'folder'` for folder shares and
 * `type: 'file'` for single-file shares — both paths are handled here.
 *
 * Designed to be safe to call from fire-and-forget upload/delete hooks:
 * functions never throw, they log and return.
 */
import { db } from './firebase-admin';

// Cap on folder-tree traversal — prevents runaway recursion on a hostile
// or corrupted parent chain (a folder loop), and bounds latency on legit
// deep nesting. Real MySpace folder depth is in single digits.
const MAX_FOLDER_DEPTH = 20;

/**
 * Sum bytes of every non-trashed diskFile inside a folder subtree.
 * For folderId === 'root' this is "every file in the user's MySpace at
 * top-level + every descendant of those folders"; the share endpoint
 * already supports sharing the root, so we have to too.
 */
export async function calculateFolderTotalSize(
  folderId: string,
  ownerUserId: string
): Promise<number> {
  let total = 0;
  // Breadth-first traversal so we don't blow the stack on deep nesting and
  // can short-circuit at MAX_FOLDER_DEPTH levels.
  const queue: { id: string; depth: number }[] = [{ id: folderId, depth: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    if (depth > MAX_FOLDER_DEPTH) continue;

    // Files at this level
    const filesSnap = await db
      .collection('diskFiles')
      .where('userId', '==', ownerUserId)
      .where('folderId', '==', id)
      .get();
    for (const fileDoc of filesSnap.docs) {
      const d = fileDoc.data();
      if (d.isTrashed) continue;
      total += typeof d.size === 'number' ? d.size : 0;
    }

    // Subfolders at this level (skip if we're already at the bottom)
    if (depth < MAX_FOLDER_DEPTH) {
      const subsSnap = await db
        .collection('folders')
        .where('userId', '==', ownerUserId)
        .where('parentId', '==', id)
        .get();
      for (const subDoc of subsSnap.docs) {
        if (subDoc.data()?.isTrashed) continue;
        queue.push({ id: subDoc.id, depth: depth + 1 });
      }
    }
  }

  return total;
}

/**
 * Walk up from `startFolderId` to root and return every active diskShares
 * doc that covers it (i.e. shares where folderId equals this folder or any
 * of its ancestors). Used by the upload/delete fan-out to find which
 * viewers' quotas need adjusting.
 */
export async function findSharedAncestorShares(
  startFolderId: string,
  ownerUserId: string
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const shares: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  let currentFolderId = startFolderId;

  for (let depth = 0; depth < MAX_FOLDER_DEPTH; depth++) {
    const sharesSnap = await db
      .collection('diskShares')
      .where('folderId', '==', currentFolderId)
      .where('userId', '==', ownerUserId)
      .where('isActive', '==', true)
      .get();
    for (const s of sharesSnap.docs) shares.push(s);

    if (currentFolderId === 'root') break;

    const folderDoc = await db.collection('folders').doc(currentFolderId).get();
    if (!folderDoc.exists || folderDoc.data()?.userId !== ownerUserId) break;
    currentFolderId = folderDoc.data()?.parentId || 'root';
  }

  return shares;
}

/**
 * Apply a +/- byte delta to every viewer that has already been charged for
 * this share. Updates two places per viewer atomically: the viewer's
 * users/{uid}.storageUsed and the diskShareAccess.chargedBytes. We never
 * decrement past zero (defensive — storageUsed should never go negative
 * even if data is mid-migration).
 *
 * No-op if the share has no viewers yet — that's the common case for a
 * share that nobody has opened.
 */
export async function fanoutSizeDelta(
  shareToken: string,
  deltaBytes: number
): Promise<void> {
  if (!deltaBytes) return;

  const accessSnap = await db
    .collection('diskShareAccess')
    .where('shareToken', '==', shareToken)
    .get();

  if (accessSnap.empty) return;

  // One transaction per viewer keeps the per-viewer storageUsed + chargedBytes
  // pair consistent. Using a single batch across viewers would be cheaper
  // but Firestore transactions cap at 500 ops, and we want the safety of
  // read-modify-write per user doc anyway.
  for (const accessDoc of accessSnap.docs) {
    const accessData = accessDoc.data();
    if (accessData.isActive === false) continue; // already revoked
    const viewerUserId: string | undefined = accessData.viewerUserId;
    if (!viewerUserId) continue;

    try {
      await db.runTransaction(async (tx) => {
        const userRef = db.collection('users').doc(viewerUserId);
        const userDoc = await tx.get(userRef);
        if (!userDoc.exists) return;
        const used = userDoc.data()?.storageUsed || 0;
        const charged = accessData.chargedBytes || 0;
        const newUsed = Math.max(0, used + deltaBytes);
        const newCharged = Math.max(0, charged + deltaBytes);
        tx.update(userRef, { storageUsed: newUsed });
        tx.update(accessDoc.ref, { chargedBytes: newCharged });
      });
    } catch (e) {
      console.error('fanoutSizeDelta tx failed', { shareToken, viewerUserId, e });
    }
  }
}

/**
 * Refund every viewer of a share — used when the owner revokes the link.
 * Idempotent: only refunds viewers whose access doc isn't already marked
 * inactive, then marks it inactive so a second call (or a retry) is a
 * no-op.
 */
export async function refundAllViewersOnRevoke(shareToken: string): Promise<void> {
  const accessSnap = await db
    .collection('diskShareAccess')
    .where('shareToken', '==', shareToken)
    .get();
  if (accessSnap.empty) return;

  for (const accessDoc of accessSnap.docs) {
    const accessData = accessDoc.data();
    if (accessData.isActive === false) continue;
    const viewerUserId: string | undefined = accessData.viewerUserId;
    const charged: number = accessData.chargedBytes || 0;
    if (!viewerUserId || !charged) {
      await accessDoc.ref.update({ isActive: false, revokedAt: new Date() });
      continue;
    }

    try {
      await db.runTransaction(async (tx) => {
        const userRef = db.collection('users').doc(viewerUserId);
        const userDoc = await tx.get(userRef);
        if (!userDoc.exists) {
          tx.update(accessDoc.ref, { isActive: false, revokedAt: new Date() });
          return;
        }
        const used = userDoc.data()?.storageUsed || 0;
        tx.update(userRef, { storageUsed: Math.max(0, used - charged) });
        tx.update(accessDoc.ref, { isActive: false, revokedAt: new Date(), chargedBytes: 0 });
      });
    } catch (e) {
      console.error('refundAllViewersOnRevoke tx failed', { shareToken, viewerUserId, e });
    }
  }
}

/**
 * Convenience wrapper: given a single file's folderId, push a +/- delta
 * to every share that covers the file's path. Used by upload-confirm and
 * permanent-delete hooks.
 */
export async function applyDeltaToSharedAncestors(
  folderId: string,
  ownerUserId: string,
  deltaBytes: number
): Promise<void> {
  if (!deltaBytes) return;
  try {
    const shares = await findSharedAncestorShares(folderId, ownerUserId);
    for (const share of shares) {
      await fanoutSizeDelta(share.id, deltaBytes);
    }
  } catch (e) {
    console.error('applyDeltaToSharedAncestors failed', { folderId, ownerUserId, e });
  }
}

// ── Upsell lock support (plan section 2.4) ─────────────────────────────
// A viewer who's accepted a 5 GB share but only has 2 GB of headroom sees
// the first 2 GB worth of files; the rest are blurred behind an upgrade
// CTA. The set of file IDs to lock is computed deterministically (newest
// files first, so the viewer always sees the most recent content) on
// every browse — we do not cache it because the owner's edits would
// invalidate the cache anyway.

export interface ShareTreeFile {
  id: string;
  size: number;
  createdAtMs: number; // epoch ms for stable sort; 0 if unknown
  folderId: string;
}

/**
 * Recursively collect every non-trashed file under a folder. Returns a
 * flat list with the metadata needed for lock ordering; the caller decides
 * how to sort/partition. Bounded by MAX_FOLDER_DEPTH like the other
 * traversals here.
 */
export async function listShareTreeFiles(
  folderId: string,
  ownerUserId: string
): Promise<ShareTreeFile[]> {
  const out: ShareTreeFile[] = [];
  const queue: { id: string; depth: number }[] = [{ id: folderId, depth: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    if (depth > MAX_FOLDER_DEPTH) continue;

    const filesSnap = await db
      .collection('diskFiles')
      .where('userId', '==', ownerUserId)
      .where('folderId', '==', id)
      .get();
    for (const fileDoc of filesSnap.docs) {
      const d = fileDoc.data();
      if (d.isTrashed) continue;
      const createdAtMs =
        d.createdAt?.toDate?.()?.getTime?.() ??
        (typeof d.createdAt === 'number' ? d.createdAt : 0);
      out.push({
        id: fileDoc.id,
        size: typeof d.size === 'number' ? d.size : 0,
        createdAtMs,
        folderId: id,
      });
    }

    if (depth < MAX_FOLDER_DEPTH) {
      const subsSnap = await db
        .collection('folders')
        .where('userId', '==', ownerUserId)
        .where('parentId', '==', id)
        .get();
      for (const subDoc of subsSnap.docs) {
        if (subDoc.data()?.isTrashed) continue;
        queue.push({ id: subDoc.id, depth: depth + 1 });
      }
    }
  }

  return out;
}

/**
 * Pure helper: sort newest-first (tie-break by id for determinism) and
 * mark every file as locked once cumulative bytes exceed `freeBytes`. A
 * file that *exactly* fits stays visible — the boundary file flips to
 * locked only when adding it would overflow.
 */
export function computeLockedFileIds(
  files: ShareTreeFile[],
  freeBytes: number
): Set<string> {
  const locked = new Set<string>();
  if (freeBytes <= 0) {
    for (const f of files) locked.add(f.id);
    return locked;
  }
  const sorted = files.slice().sort((a, b) => {
    if (b.createdAtMs !== a.createdAtMs) return b.createdAtMs - a.createdAtMs;
    return a.id.localeCompare(b.id);
  });
  let cumulative = 0;
  for (const f of sorted) {
    if (cumulative + f.size > freeBytes) {
      locked.add(f.id);
    } else {
      cumulative += f.size;
    }
  }
  return locked;
}

export interface ViewerShareQuota {
  viewerLimit: number;
  viewerUsed: number;
  shareCharged: number;
  /** Bytes still available to this viewer if we exclude this share's charge. */
  freeForShare: number;
  /** True if the viewer doesn't have room for the whole share. */
  overQuota: boolean;
}

/**
 * Look up the viewer's current quota and how much of it has already been
 * pre-paid by *this* share, so we can compute how much of the share is
 * still affordable. Returns null if the viewer is the owner or no access
 * record exists (i.e. they haven't been charged yet, which is the case
 * for the very first request before recordShareAccess writes the doc).
 */
export async function computeViewerQuotaForShare(
  shareToken: string,
  shareTotalBytes: number,
  viewerUserId: string
): Promise<ViewerShareQuota | null> {
  const accessId = `${shareToken}_${viewerUserId}`;
  const [accessDoc, userDoc] = await Promise.all([
    db.collection('diskShareAccess').doc(accessId).get(),
    db.collection('users').doc(viewerUserId).get(),
  ]);

  if (!userDoc.exists) return null;
  const userData = userDoc.data() || {};
  const viewerLimit: number = userData.storageLimit || 0;
  const viewerUsed: number = userData.storageUsed || 0;

  // If the viewer hasn't been charged yet (rare race: browse before
  // recordShareAccess finishes), pretend the share would cost
  // shareTotalBytes so we still gate correctly.
  const shareCharged: number = accessDoc.exists
    ? accessDoc.data()?.chargedBytes || 0
    : shareTotalBytes;

  const usedExcludingThisShare = Math.max(0, viewerUsed - shareCharged);
  const freeForShare = Math.max(0, viewerLimit - usedExcludingThisShare);
  const overQuota = freeForShare < shareCharged;

  return { viewerLimit, viewerUsed, shareCharged, freeForShare, overQuota };
}
