import { FieldValue, type DocumentReference } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { db, initAdmin } from '@/lib/firebase-admin';

// Inbox activity lives in users/{uid}/inbox (server-only; clients read it
// through /api/inbox). Likes and comments on the same meme collapse into one
// row while it is unread, so a viral meme is one line with a count, not 500.

export type InboxType = 'like' | 'comment' | 'referral_joined' | 'referral_bonus' | 'system';

interface InboxItemInput {
  type: InboxType;
  actorId?: string;
  actorName?: string;
  memeId?: string;
  text?: string;
}

// Push only on these like counts, so likes never turn into notification spam.
const LIKE_PUSH_AT = new Set([1, 10, 50, 100, 500, 1000]);

function inboxCol(userId: string) {
  return db.collection('users').doc(userId).collection('inbox');
}

export async function getUnreadCount(userId: string): Promise<number> {
  const snap = await inboxCol(userId).where('read', '==', false).count().get();
  return snap.data().count;
}

/**
 * Record an activity item and push it to the user's phones. Never throws:
 * a failed notification must not fail the like/comment/signup that caused it.
 */
export async function notify(userId: string, item: InboxItemInput): Promise<void> {
  if (!userId || (item.actorId && item.actorId === userId)) return;
  try {
    const aggregate = (item.type === 'like' || item.type === 'comment') && item.memeId;
    const now = new Date();
    let count = 1;

    if (aggregate) {
      const ref = inboxCol(userId).doc(`${item.type}_${item.memeId}`);
      count = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const prev = snap.exists ? snap.data()! : null;
        // A read row starts counting again from 1.
        const next = prev && prev.read === false ? (prev.count || 1) + 1 : 1;
        tx.set(ref, {
          ...item,
          count: next,
          read: false,
          createdAt: prev && prev.read === false ? prev.createdAt : now,
          updatedAt: now,
        });
        return next;
      });
    } else {
      await inboxCol(userId).add({ ...item, count: 1, read: false, createdAt: now, updatedAt: now });
    }

    if (item.type === 'like' && !LIKE_PUSH_AT.has(count)) return;
    await sendPush(userId, pushText(item, count), {
      type: item.type,
      ...(item.memeId ? { memeId: item.memeId } : {}),
    });
  } catch (error) {
    console.error('notify failed:', error);
  }
}

// Push copy is Serbian for now (most users); the Inbox list itself is
// rendered from the raw fields in the app's language.
function pushText(item: InboxItemInput, count: number): { title: string; body: string } {
  const who = item.actorName || 'Neko';
  switch (item.type) {
    case 'like':
      return count > 1
        ? { title: 'Tvoj mim je na vatri', body: `${count} novih lajkova` }
        : { title: 'Novi lajk', body: `${who} lajkuje tvoj mim` };
    case 'comment':
      return { title: `${who} komentariše`, body: item.text?.slice(0, 120) || 'Novi komentar na tvom mimu' };
    case 'referral_joined':
      return { title: 'Novi član preko tvog linka', body: who };
    case 'referral_bonus':
      return { title: 'Više prostora za tebe', body: item.text || '+250 MB za preporuku' };
    default:
      return { title: 'MyPhoto', body: item.text || '' };
  }
}

/** Send to every FCM token registered for the user; drop dead tokens. */
export async function sendPush(
  userId: string,
  { title, body }: { title: string; body: string },
  data: Record<string, string> = {}
): Promise<void> {
  const userRef = db.collection('users').doc(userId);
  const tokens: string[] = (await userRef.get()).data()?.pushTokens || [];
  if (tokens.length === 0) return;

  initAdmin();
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data,
    android: { priority: 'high', notification: { channelId: 'default' } },
  });

  const dead = tokens.filter((_, i) => {
    const code = res.responses[i]?.error?.code;
    return code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token';
  });
  if (dead.length) {
    await userRef.update({ pushTokens: FieldValue.arrayRemove(...dead) });
  }
}

export async function markRead(userId: string, ids?: string[]): Promise<void> {
  const refs: DocumentReference[] = ids?.length
    ? ids.slice(0, 200).map((id) => inboxCol(userId).doc(id))
    : (await inboxCol(userId).where('read', '==', false).limit(400).get()).docs.map((d) => d.ref);
  if (refs.length === 0) return;
  const batch = db.batch();
  for (const ref of refs) batch.set(ref, { read: true }, { merge: true });
  await batch.commit();
}
