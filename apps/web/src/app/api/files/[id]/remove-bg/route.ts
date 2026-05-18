import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

// POST /api/files/[id]/remove-bg — server-side background removal.
// Currently a stub: returns 501 with a structured payload so the mobile
// editor can show a "u radu" notice instead of a cryptic error. The full
// implementation needs a remove-bg model (rembg / remove.bg API / ONNX
// inference) and is intentionally not bundled here.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;

  const doc = await db.collection('files').doc(params.id).get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
  if (doc.data()?.userId !== auth.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(
    {
      error: 'not_implemented',
      message: 'Uklanjanje pozadine je u izradi — biće dostupno uskoro.',
    },
    { status: 501 }
  );
}
