import { createHash } from 'crypto';
import { FieldValue, type DocumentReference, type Query } from 'firebase-admin/firestore';
import { db, auth } from '@/lib/firebase-admin';
import { deleteObject, deletePrefix } from '@/lib/s3';
import { cancelCreemSubscription } from '@/lib/creem';

/**
 * Permanent account deletion (GDPR art. 17 + Google Play account-deletion
 * policy). Removes, in order:
 *   1. every stored object (originals, thumbnails, MySpace disk, memes),
 *   2. every Firestore record that belongs to the user,
 *   3. the Firebase Auth identity.
 *
 * Storage goes first on purpose: the Firestore records are what tell us which
 * keys exist outside the per-user prefixes, and once the auth user is gone
 * nobody can retry the request. Each step is best-effort and reported — a
 * partial failure is logged to `accountDeletions` so it can be finished by
 * hand instead of silently leaving data behind.
 *
 * Active Creem subscriptions are cancelled immediately at the provider. Any
 * other still-active subscription (legacy providers, or a failed cancel) is
 * listed in `activeSubscriptionIds` on the audit record for manual follow-up.
 */

/** Per-user S3 prefixes. Keep in sync with every key template in the app. */
function userPrefixes(userId: string): string[] {
  return [`users/${userId}/`, `disk/${userId}/`, `memes/${userId}/`];
}

/** Top-level collections whose documents are owned via a `userId` field. */
const USER_ID_COLLECTIONS = [
  'files',
  'folders',
  'diskFiles',
  'albums',
  'diskShares',
  'shared',
  'devices',
  'people',
  'favorites',
];

/** Other ownership links: [collection, field]. */
const OTHER_OWNED: Array<[string, string]> = [
  ['memes', 'authorId'],
  ['diskShareAccess', 'ownerUserId'],
  ['diskShareAccess', 'viewerUserId'],
  ['referrals', 'refereeUserId'],
  ['memeReferrals', 'refereeId'],
];

const KEY_FIELDS = ['s3Key', 'thumbnailKey', 'previewKey', 'posterKey'];

export interface DeletionReport {
  objectsDeleted: number;
  docsDeleted: number;
  errors: string[];
}

async function forEachDoc(query: Query, fn: (ref: DocumentReference, data: any) => Promise<void>) {
  // Paginate by re-querying after each batch is deleted; ordering is not
  // needed because processed docs disappear from the result set.
  for (;;) {
    const snap = await query.limit(300).get();
    if (snap.empty) return;
    for (const doc of snap.docs) await fn(doc.ref, doc.data());
    if (snap.size < 300) return;
  }
}

export async function deleteUserAccount(userId: string): Promise<DeletionReport> {
  const report: DeletionReport = { objectsDeleted: 0, docsDeleted: 0, errors: [] };
  const note = (step: string, err: unknown) =>
    report.errors.push(`${step}: ${err instanceof Error ? err.message : String(err)}`);

  const userRef = db.collection('users').doc(userId);
  // `db` is a lazy Proxy; recursiveDelete relies on internal state, so call it
  // on the real Firestore instance rather than through the proxy.
  const firestore = userRef.firestore;
  const userSnap = await userRef.get();
  const userData = userSnap.data() || {};

  // Remember which subscriptions still need cancelling at the provider.
  const activeSubscriptionIds: string[] = [];
  try {
    const subs = await db.collection('subscriptions').where('userId', '==', userId).get();
    for (const s of subs.docs) {
      const d = s.data();
      if (d.status !== 'active') continue;
      // Stop future charges. Creem subscriptions are cancelled right here;
      // anything else is recorded for manual cancellation.
      if (d.provider === 'creem' && d.creemSubscriptionId) {
        try {
          await cancelCreemSubscription(d.creemSubscriptionId);
          continue;
        } catch (e) {
          note(`cancel creem ${d.creemSubscriptionId}`, e);
        }
      }
      activeSubscriptionIds.push(s.id);
    }
  } catch (e) {
    note('subscriptions lookup', e);
  }

  // 1. Storage — prefixes, then any keys stored on records outside them
  //    (e.g. files shared into someone else's disk folder).
  for (const prefix of userPrefixes(userId)) {
    try {
      report.objectsDeleted += await deletePrefix(prefix);
    } catch (e) {
      note(`s3 ${prefix}`, e);
    }
  }
  const strayKeys = new Set<string>();
  const collectKeys = (data: any) => {
    for (const f of KEY_FIELDS) {
      const k = data?.[f];
      if (typeof k === 'string' && k && !userPrefixes(userId).some((p) => k.startsWith(p))) {
        strayKeys.add(k);
      }
    }
  };

  // 2. Firestore.
  const deleteOwned = async (collection: string, field: string) => {
    try {
      await forEachDoc(db.collection(collection).where(field, '==', userId), async (ref, data) => {
        collectKeys(data);
        // recursiveDelete also removes subcollections (meme comments,
        // reactions, favorites, reposts…).
        await firestore.recursiveDelete(ref);
        report.docsDeleted++;
      });
    } catch (e) {
      note(`${collection}.${field}`, e);
    }
  };

  for (const c of USER_ID_COLLECTIONS) await deleteOwned(c, 'userId');
  for (const [c, f] of OTHER_OWNED) await deleteOwned(c, f);

  // Subscriptions: strip personal linkage but keep the id for cancellation.
  try {
    await forEachDoc(db.collection('subscriptions').where('userId', '==', userId), async (ref) => {
      await ref.update({ userId: 'deleted', deletedAt: new Date() });
    });
  } catch (e) {
    note('subscriptions', e);
  }

  // Comments this user left on other people's memes (collection-group query
  // needs a single-field index exemption; failure is reported, not fatal).
  try {
    await forEachDoc(
      db.collectionGroup('comments').where('authorId', '==', userId),
      async (ref) => {
        const memeRef = ref.parent.parent;
        await ref.delete();
        if (memeRef) await memeRef.update({ commentCount: FieldValue.increment(-1) }).catch(() => {});
        report.docsDeleted++;
      }
    );
  } catch (e) {
    note('comments (collection group)', e);
  }

  // Family: an admin's family dissolves; a member simply leaves.
  if (userData.familyId) {
    try {
      const famRef = db.collection('families').doc(userData.familyId);
      const fam = (await famRef.get()).data();
      if (fam?.adminId === userId) {
        for (const memberId of (fam.memberIds || []) as string[]) {
          if (memberId === userId) continue;
          await db
            .collection('users')
            .doc(memberId)
            .update({ familyId: FieldValue.delete(), role: 'user' })
            .catch(() => {});
        }
        await famRef.delete();
      } else if (fam) {
        await famRef.update({ memberIds: FieldValue.arrayRemove(userId), updatedAt: new Date() });
      }
    } catch (e) {
      note('family', e);
    }
  }

  for (const key of strayKeys) {
    try {
      await deleteObject(key);
      report.objectsDeleted++;
    } catch (e) {
      note(`s3 ${key}`, e);
    }
  }

  // The user document last (with its reposts/savedMemes/following/followers).
  try {
    await firestore.recursiveDelete(userRef);
    report.docsDeleted++;
  } catch (e) {
    note('user doc', e);
  }

  // 3. Auth identity.
  try {
    await auth().deleteUser(userId);
  } catch (e: any) {
    if (e?.code !== 'auth/user-not-found') note('auth', e);
  }

  // Audit trail without personal data: hashed uid only.
  await db
    .collection('accountDeletions')
    .add({
      uidHash: createHash('sha256').update(userId).digest('hex'),
      at: new Date(),
      objectsDeleted: report.objectsDeleted,
      docsDeleted: report.docsDeleted,
      errors: report.errors,
      activeSubscriptionIds,
    })
    .catch(() => {});

  return report;
}
