import type { DocumentReference } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import {
  OVER_QUOTA_GRACE_DAYS,
  OVER_QUOTA_NOTICE_DAYS,
  OVER_QUOTA_MIN_NOTICE_DAYS,
  formatBytes,
} from '@myphoto/shared';
import { db } from '@/lib/firebase-admin';
import { deleteObject } from '@/lib/s3';
import { applyDeltaToSharedAncestors } from '@/lib/shared-folder-quota';
import { renderEmail, sendEmail } from '@/lib/email';

/**
 * Over-quota lifecycle — what happens when a subscription ends (or an archive
 * expires) and the user's files exceed their free allowance.
 *
 *   day 0   users.overQuotaSince/overQuotaDeleteAt set; account is read-only
 *           (uploads already fail the quota check; new share links blocked)
 *   0–89    warning emails on OVER_QUOTA_NOTICE_DAYS, pointing at /keep-files
 *           (upgrade, buy an archive, download everything, or delete files)
 *   day 90  the newest files are deleted until usage fits the allowance —
 *           only if a warning went out at least OVER_QUOTA_MIN_NOTICE_DAYS
 *           earlier, so a broken email setup can never delete silently
 *
 * Getting back under the limit at any point (upgrade, archive, deleting
 * files) clears the clock.
 */

const DAY_MS = 86_400_000;

const toDate = (v: any): Date | null => (v?.toDate ? v.toDate() : v instanceof Date ? v : null);

/** 403 response if the user is in the read-only over-quota period, else null. */
export async function overQuotaBlock(userId: string): Promise<Response | null> {
  const u = (await db.collection('users').doc(userId).get()).data();
  if (!u?.overQuotaSince) return null;
  return Response.json(
    { error: 'Your storage is over the limit — new share links are paused.', code: 'OVER_QUOTA' },
    { status: 403 }
  );
}

/** Start or clear the over-quota clock from the user's current usage/limit. */
export async function syncOverQuotaState(userId: string, data?: Record<string, any>): Promise<void> {
  const ref = db.collection('users').doc(userId);
  const u = data ?? (await ref.get()).data();
  if (!u || u.role === 'admin') return;

  const over = (u.storageUsed || 0) > (u.storageLimit || 0);
  if (over && !u.overQuotaSince) {
    const now = Date.now();
    await ref.update({
      overQuotaSince: new Date(now),
      overQuotaDeleteAt: new Date(now + OVER_QUOTA_GRACE_DAYS * DAY_MS),
      overQuotaNotices: [],
      overQuotaFirstNoticeAt: null,
    });
  } else if (!over && u.overQuotaSince) {
    await ref.update({
      overQuotaSince: null,
      overQuotaDeleteAt: null,
      overQuotaNotices: [],
      overQuotaFirstNoticeAt: null,
    });
  }
}

interface StoredItem {
  s3Key: string;
  size: number;
  /** When it was uploaded — deletion goes newest first. */
  uploadedAt: number;
  trashed: boolean;
  fileRef?: DocumentReference;
  diskRef?: DocumentReference;
  folderId?: string;
  thumbKeys: string[];
}

/**
 * Everything that counts against the user's quota, de-duplicated by S3 key
 * (a photo backed up through MySpace has both a `files` and a `diskFiles`
 * doc pointing at one object). Also returns meme bytes, which count but are
 * never auto-deleted.
 */
async function loadStoredItems(userId: string): Promise<{ items: StoredItem[]; memeBytes: number }> {
  const byKey = new Map<string, StoredItem>();
  const time = (v: any) => toDate(v)?.getTime() ?? 0;

  const [filesSnap, diskSnap, memesSnap] = await Promise.all([
    db.collection('files').where('userId', '==', userId).get(),
    db.collection('diskFiles').where('userId', '==', userId).where('isTrashed', '==', false).get(),
    db.collection('memes').where('authorId', '==', userId).get(),
  ]);

  for (const doc of filesSnap.docs) {
    const f = doc.data();
    if (!f.s3Key) continue;
    byKey.set(f.s3Key, {
      s3Key: f.s3Key,
      size: f.size || 0,
      // Plain uploads: createdAt is the upload time. Linked MySpace backups
      // carry the capture date there, so the diskFiles pass below overrides.
      uploadedAt: time(f.createdAt),
      trashed: !!f.isTrashed,
      fileRef: doc.ref,
      thumbKeys: [f.thumbnailKey, f.smallThumbKey, f.largeThumbKey].filter(Boolean),
    });
  }
  for (const doc of diskSnap.docs) {
    const d = doc.data();
    if (!d.s3Key) continue;
    const existing = byKey.get(d.s3Key);
    const uploadedAt = time(d.updatedAt) || time(d.createdAt);
    if (existing) {
      existing.diskRef = doc.ref;
      existing.folderId = d.folderId;
      existing.uploadedAt = uploadedAt || existing.uploadedAt;
      // A live MySpace copy means the object is in use, even if the gallery
      // entry was trashed.
      existing.trashed = false;
    } else {
      byKey.set(d.s3Key, {
        s3Key: d.s3Key,
        size: d.size || 0,
        uploadedAt,
        trashed: false,
        diskRef: doc.ref,
        folderId: d.folderId,
        thumbKeys: [],
      });
    }
  }

  let memeBytes = 0;
  for (const doc of memesSnap.docs) memeBytes += doc.data().size || 0;
  return { items: [...byKey.values()], memeBytes };
}

/** Bounded per run so one huge account cannot time out the cron. */
const MAX_DELETIONS_PER_RUN = 2000;

/**
 * Delete trashed files first, then the newest files, until usage fits the
 * user's limit. Recomputes usage from the files themselves rather than
 * trusting the `storageUsed` counter (which has drifted before), and writes
 * the corrected counter back.
 */
export async function deleteOverQuotaFiles(userId: string): Promise<{ deleted: number; freedBytes: number }> {
  const userRef = db.collection('users').doc(userId);
  const u = (await userRef.get()).data();
  if (!u) return { deleted: 0, freedBytes: 0 };
  const limit = u.storageLimit || 0;

  const { items, memeBytes } = await loadStoredItems(userId);
  let used = memeBytes + items.reduce((sum, i) => sum + i.size, 0);

  items.sort((a, b) => (a.trashed !== b.trashed ? (a.trashed ? -1 : 1) : b.uploadedAt - a.uploadedAt));

  let deleted = 0;
  let freedBytes = 0;
  for (const item of items) {
    if (used <= limit || deleted >= MAX_DELETIONS_PER_RUN) break;
    await Promise.all(
      [item.s3Key, ...item.thumbKeys].map((key) =>
        deleteObject(key).catch((err) => console.error(`over-quota: S3 delete failed ${key}`, err))
      )
    );
    await Promise.all([item.fileRef?.delete(), item.diskRef?.delete()]);
    if (item.diskRef && item.folderId) {
      await applyDeltaToSharedAncestors(item.folderId, userId, -item.size);
    }
    used -= item.size;
    freedBytes += item.size;
    deleted++;
  }

  await userRef.update({ storageUsed: Math.max(0, used) });
  await db.collection('quotaDeletions').add({
    userId,
    deleted,
    freedBytes,
    limit,
    remainingUsed: used,
    at: FieldValue.serverTimestamp(),
  });
  await syncOverQuotaState(userId);
  return { deleted, freedBytes };
}

function noticeEmail(u: Record<string, any>, daysLeft: number) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://myphotomy.space';
  const over = formatBytes(Math.max(0, (u.storageUsed || 0) - (u.storageLimit || 0)));
  const deleteAt = toDate(u.overQuotaDeleteAt) ?? new Date(Date.now() + daysLeft * DAY_MS);
  const dateEn = deleteAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const dateSr = deleteAt.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'long', year: 'numeric' });

  const first = daysLeft >= OVER_QUOTA_GRACE_DAYS - 1;
  const subject = first
    ? 'Your MyPhoto files are over the free limit · Vaši fajlovi su preko besplatnog limita'
    : `${daysLeft} days left to keep your MyPhoto files · Još ${daysLeft} dana da sačuvate fajlove`;

  return {
    subject,
    ...renderEmail({
      paragraphs: [
        `Your files use ${over} more than your free MyPhoto storage. Your account is read-only: everything is still there and you can view and download it, but new uploads and backups are paused.`,
        `On ${dateEn} (${daysLeft} days from now) we will delete your most recent files until you are back within the free limit. To keep everything, upgrade your plan, buy an archive, or download your files before that date.`,
        `Vaši fajlovi zauzimaju ${over} više od besplatnog MyPhoto prostora. Nalog je u režimu samo za čitanje: sve je i dalje tu i možete da pregledate i preuzmete fajlove, ali su nova otpremanja i backup pauzirani.`,
        `Dana ${dateSr} (za ${daysLeft} dana) obrisaćemo vaše najnovije fajlove dok ne budete u okviru besplatnog limita. Da sačuvate sve, nadogradite paket, kupite arhivu ili preuzmite fajlove pre tog datuma.`,
      ],
      ctaLabel: 'Keep my files · Sačuvaj fajlove',
      ctaUrl: `${origin}/keep-files`,
    }),
  };
}

/**
 * Daily step for one over-quota user: send the latest due warning, and once
 * the grace period is over (and a warning went out long enough ago), delete.
 */
export async function processOverQuotaUser(
  userId: string
): Promise<'cleared' | 'waiting' | 'noticed' | 'deleted' | 'blocked-no-notice'> {
  const userRef = db.collection('users').doc(userId);
  let u = (await userRef.get()).data();
  if (!u) return 'cleared';

  // The storageUsed counter has drifted upward before (e.g. linked photo +
  // MySpace docs counted twice), so measure the real usage before warning
  // anyone that their files will be deleted.
  const { items, memeBytes } = await loadStoredItems(userId);
  const actualUsed = memeBytes + items.reduce((sum, i) => sum + i.size, 0);
  if (actualUsed !== (u.storageUsed || 0)) {
    await userRef.update({ storageUsed: actualUsed });
    u = { ...u, storageUsed: actualUsed };
  }

  await syncOverQuotaState(userId, u);
  u = (await userRef.get()).data()!;
  if (!u.overQuotaSince) return 'cleared';

  const now = Date.now();
  const since = toDate(u.overQuotaSince)!.getTime();
  const deleteAt = toDate(u.overQuotaDeleteAt)?.getTime() ?? since + OVER_QUOTA_GRACE_DAYS * DAY_MS;
  const daysOver = Math.floor((now - since) / DAY_MS);
  const sent: number[] = u.overQuotaNotices || [];

  const firstNoticeAt = toDate(u.overQuotaFirstNoticeAt)?.getTime() ?? null;
  if (now >= deleteAt) {
    if (firstNoticeAt && now - firstNoticeAt >= OVER_QUOTA_MIN_NOTICE_DAYS * DAY_MS) {
      await deleteOverQuotaFiles(userId);
      return 'deleted';
    }
    // No warning has reached the user yet — fall through and try to send one.
  }

  const due = OVER_QUOTA_NOTICE_DAYS.filter((d) => d <= daysOver && !sent.includes(d));
  if (due.length === 0 && !(now >= deleteAt && !firstNoticeAt)) return 'waiting';
  if (!u.email) return now >= deleteAt ? 'blocked-no-notice' : 'waiting';

  const daysLeft = Math.max(1, Math.ceil((deleteAt - now) / DAY_MS));
  const mail = noticeEmail(u, daysLeft);
  const ok = await sendEmail({ to: u.email, subject: mail.subject, html: mail.html, text: mail.text });
  if (!ok) return now >= deleteAt ? 'blocked-no-notice' : 'waiting';

  await userRef.update({
    overQuotaNotices: FieldValue.arrayUnion(...(due.length ? due : [daysOver])),
    ...(firstNoticeAt ? {} : { overQuotaFirstNoticeAt: new Date(now) }),
    ...(now >= deleteAt && !firstNoticeAt
      ? // First warning only now (email was broken): give the full minimum notice.
        { overQuotaDeleteAt: new Date(now + OVER_QUOTA_MIN_NOTICE_DAYS * DAY_MS) }
      : {}),
  });
  return 'noticed';
}
