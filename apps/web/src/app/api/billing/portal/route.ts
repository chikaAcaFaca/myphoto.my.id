import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { createCreemBillingPortal } from '@/lib/creem';

export const dynamic = 'force-dynamic';

/** POST /api/billing/portal → { url } — Creem's hosted page for invoices,
 *  payment method and cancellation. */
export async function POST(request: NextRequest) {
  const authResult = await verifyAuthWithRateLimit(request, 'api');
  if (!authResult.success) return authResult.response;

  const user = await db.collection('users').doc(authResult.userId).get();
  const customerId = user.data()?.creemCustomerId;
  if (!customerId) {
    return NextResponse.json({ error: 'No billing account yet' }, { status: 404 });
  }
  try {
    return NextResponse.json({ url: await createCreemBillingPortal(customerId) });
  } catch (error) {
    console.error('Creem billing portal error:', error);
    return NextResponse.json({ error: 'Could not open billing portal' }, { status: 502 });
  }
}
