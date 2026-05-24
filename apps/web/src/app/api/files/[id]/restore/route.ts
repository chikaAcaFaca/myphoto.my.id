import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

// POST /api/files/[id]/restore — pull a single file out of trash. The
// equivalent of PATCH {isTrashed: false} but as a dedicated route so
// mobile can route a restore button to a stable URL.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;

  const { id } = await params;
  const ref = db.collection('files').doc(id);
  const doc = await ref.get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
  if (doc.data()?.userId !== auth.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await ref.update({
    isTrashed: false,
    trashedAt: null,
    updatedAt: new Date(),
  });
  return NextResponse.json({ success: true, id });
}
