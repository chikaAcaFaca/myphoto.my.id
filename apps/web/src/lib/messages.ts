import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { sendPush } from '@/lib/inbox';

// 1:1 messages. Server-only: clients go through /api/messages.
//
// conversations/{a_b} (uids sorted) holds both participants, the last
// message, per-user unread counts and the status:
//   'active'  — both sides can write freely
//   'request' — started by someone the recipient doesn't follow; the
//               sender may send a few messages until the recipient accepts
// Messages live in conversations/{id}/messages.

export const MAX_TEXT = 2000;
const MAX_REQUEST_MESSAGES = 3;
const MAX_NEW_REQUESTS_PER_DAY = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

export type ConversationStatus = 'active' | 'request';

export class MessageError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

export function conversationId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

export function conversationRef(id: string) {
  return db.collection('conversations').doc(id);
}

async function isBlocked(a: string, b: string): Promise<boolean> {
  const [ab, ba] = await Promise.all([
    db.collection('users').doc(a).collection('blocked').doc(b).get(),
    db.collection('users').doc(b).collection('blocked').doc(a).get(),
  ]);
  return ab.exists || ba.exists;
}

async function follows(follower: string, target: string): Promise<boolean> {
  return (await db.collection('users').doc(follower).collection('following').doc(target).get()).exists;
}

async function displayName(uid: string): Promise<string> {
  return (await db.collection('users').doc(uid).get()).data()?.displayName || '';
}

export interface SendInput {
  text?: string;
  memeId?: string;
}

/**
 * Send a message from `senderId` to `recipientId`, creating the conversation
 * if needed. Throws MessageError with a stable code the app can show.
 */
export async function sendMessage(senderId: string, recipientId: string, input: SendInput) {
  const text = (input.text || '').trim().slice(0, MAX_TEXT);
  const memeId = input.memeId && /^[A-Za-z0-9_-]{1,64}$/.test(input.memeId) ? input.memeId : undefined;
  if (!text && !memeId) throw new MessageError('EMPTY', 400);
  if (senderId === recipientId) throw new MessageError('SELF', 400);

  const recipientSnap = await db.collection('users').doc(recipientId).get();
  if (!recipientSnap.exists) throw new MessageError('NOT_FOUND', 404);
  if (await isBlocked(senderId, recipientId)) throw new MessageError('BLOCKED', 403);

  if (memeId) {
    const meme = await db.collection('memes').doc(memeId).get();
    if (!meme.exists) throw new MessageError('MEME_NOT_FOUND', 404);
  }

  const id = conversationId(senderId, recipientId);
  const ref = conversationRef(id);
  const existing = await ref.get();
  const recipientFollowsSender = await follows(recipientId, senderId);

  // A brand-new conversation with someone who doesn't follow you is a request.
  // Cap how many of those one account can open per day.
  if (!existing.exists && !recipientFollowsSender) {
    // Single-field query + in-memory date filter: no composite index needed.
    const since = Date.now() - DAY_MS;
    const recent = await db
      .collection('conversations')
      .where('requestedBy', '==', senderId)
      .limit(500)
      .get();
    const today = recent.docs.filter((d) => (d.data().createdAt?.toMillis?.() ?? 0) > since).length;
    if (today >= MAX_NEW_REQUESTS_PER_DAY) throw new MessageError('DAILY_LIMIT', 429);
  }

  const senderName = await displayName(senderId);
  const recipientName = recipientSnap.data()?.displayName || '';
  const now = new Date();
  const messageRef = ref.collection('messages').doc();

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const conv = snap.exists ? snap.data()! : null;

    let status: ConversationStatus = conv?.status || (recipientFollowsSender ? 'active' : 'request');
    // The recipient of a request answering it accepts it.
    if (status === 'request' && conv?.requestedBy && conv.requestedBy !== senderId) status = 'active';
    // A follow that happened later also opens the conversation.
    if (status === 'request' && recipientFollowsSender) status = 'active';

    if (status === 'request' && conv && conv.requestedBy === senderId && (conv.requestCount || 0) >= MAX_REQUEST_MESSAGES) {
      throw new MessageError('REQUEST_PENDING', 429);
    }

    const lastMessage = { text: text || '', memeId: memeId || null, senderId, at: now };
    const base = {
      participants: [senderId, recipientId].sort(),
      names: { [senderId]: senderName, [recipientId]: recipientName },
      status,
      lastMessage,
      updatedAt: now,
      [`unread.${recipientId}`]: FieldValue.increment(1),
      [`unread.${senderId}`]: 0,
      // A hidden conversation shows up again when a new message arrives.
      [`hidden.${recipientId}`]: false,
      [`hidden.${senderId}`]: false,
    };

    if (!conv) {
      tx.set(ref, {
        participants: base.participants,
        names: base.names,
        status,
        lastMessage,
        updatedAt: now,
        createdAt: now,
        requestedBy: status === 'request' ? senderId : null,
        requestCount: status === 'request' ? 1 : 0,
        unread: { [recipientId]: 1, [senderId]: 0 },
        hidden: { [recipientId]: false, [senderId]: false },
      });
    } else {
      tx.update(ref, {
        ...base,
        ...(status === 'request' ? { requestCount: FieldValue.increment(1) } : {}),
      });
    }

    tx.set(messageRef, { senderId, text: text || '', memeId: memeId || null, createdAt: now });
    return { status, isNew: !conv };
  });

  // Push to the recipient; a request is announced once, not per message.
  if (result.status === 'active' || result.isNew) {
    const body = text ? text.slice(0, 140) : 'Poslao ti je mim';
    await sendPush(
      recipientId,
      result.status === 'request'
        ? { title: 'Novi zahtev za poruku', body: `${senderName || 'Neko'}: ${body}` }
        : { title: senderName || 'Nova poruka', body },
      { type: 'message', conversationId: id }
    ).catch((e) => console.error('message push failed:', e));
  }

  return {
    conversationId: id,
    status: result.status,
    message: { id: messageRef.id, senderId, text: text || '', memeId: memeId || null, createdAt: now.toISOString() },
  };
}

/** Load a conversation the user is part of, or throw. */
export async function getConversationFor(userId: string, id: string) {
  const snap = await conversationRef(id).get();
  const data = snap.data();
  if (!snap.exists || !data?.participants?.includes(userId)) throw new MessageError('NOT_FOUND', 404);
  return { ref: snap.ref, data };
}

/** Total unread messages across the user's visible, accepted conversations
 *  plus the number of pending requests addressed to them. */
export async function getUnreadMessageCount(userId: string): Promise<number> {
  const snap = await db.collection('conversations').where('participants', 'array-contains', userId).limit(300).get();
  let total = 0;
  for (const doc of snap.docs) {
    const c = doc.data();
    if (c.hidden?.[userId]) continue;
    const n = c.unread?.[userId] || 0;
    if (c.status === 'request' && c.requestedBy !== userId) total += n > 0 ? 1 : 0;
    else total += n;
  }
  return total;
}

export async function setBlocked(userId: string, targetId: string, blocked: boolean) {
  const ref = db.collection('users').doc(userId).collection('blocked').doc(targetId);
  if (blocked) await ref.set({ createdAt: new Date() });
  else await ref.delete();
}

/** Remove every conversation the user is in (account deletion). */
export async function deleteConversationsOf(userId: string) {
  const snap = await db.collection('conversations').where('participants', 'array-contains', userId).get();
  for (const doc of snap.docs) {
    await db.recursiveDelete(doc.ref);
  }
}
