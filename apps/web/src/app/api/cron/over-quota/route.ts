import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { processOverQuotaUser } from '@/lib/over-quota';
import { recalculateStorageLimit } from '@/lib/storage-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Daily over-quota job (scheduled in apps/web/vercel.json).
 *
 * 1. Archives that ran out → recalculate the limit, which restarts the
 *    90-day clock if the user is still over their free allowance.
 * 2. Every user in the over-quota period → send the due warning email, or
 *    delete the newest files over the limit once the grace period is over.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is
 * set on the project; without it the route refuses to run.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set' }, { status: 500 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const summary: Record<string, number> = { archivesExpired: 0, errors: 0 };

  const expired = await db.collection('users').where('archiveUntil', '<=', new Date()).get();
  for (const doc of expired.docs) {
    try {
      await doc.ref.update({ archiveUntil: null, archiveBytes: 0 });
      await recalculateStorageLimit(doc.id);
      summary.archivesExpired++;
    } catch (e) {
      console.error('over-quota cron: archive expiry failed', doc.id, e);
      summary.errors++;
    }
  }

  const over = await db.collection('users').where('overQuotaSince', '!=', null).get();
  for (const doc of over.docs) {
    try {
      const outcome = await processOverQuotaUser(doc.id);
      summary[outcome] = (summary[outcome] || 0) + 1;
      if (outcome === 'blocked-no-notice') {
        console.warn('over-quota cron: deletion due but no warning could be sent', doc.id);
      }
    } catch (e) {
      console.error('over-quota cron: user failed', doc.id, e);
      summary.errors++;
    }
  }

  console.log('over-quota cron', summary);
  return NextResponse.json(summary);
}
