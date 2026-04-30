import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

// GET /api/devices — list user's registered devices
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const snapshot = await db.collection('devices')
      .where('userId', '==', userId)
      .orderBy('lastSeen', 'desc')
      .get();

    const devices = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastSeen: doc.data().lastSeen?.toDate?.()?.toISOString() || null,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({ devices });
  } catch (error) {
    console.error('Devices GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/devices — register or update a device
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const body = await request.json();
    const { deviceId, deviceName, platform, appVersion } = body;

    if (!deviceId || !platform) {
      return NextResponse.json({ error: 'deviceId and platform required' }, { status: 400 });
    }

    const now = new Date();

    // Check if device already registered
    const existing = await db.collection('devices')
      .where('userId', '==', userId)
      .where('deviceId', '==', deviceId)
      .limit(1)
      .get();

    if (!existing.empty) {
      // Update existing device
      const docRef = existing.docs[0].ref;
      await docRef.update({
        deviceName: deviceName || existing.docs[0].data().deviceName,
        platform,
        appVersion: appVersion || null,
        lastSeen: now,
      });
      return NextResponse.json({ id: existing.docs[0].id, updated: true });
    }

    // Register new device
    const docRef = await db.collection('devices').add({
      userId,
      deviceId,
      deviceName: deviceName || `${platform} device`,
      platform, // 'android', 'ios', 'web', 'desktop'
      appVersion: appVersion || null,
      autoSync: true,
      lastSeen: now,
      createdAt: now,
    });

    return NextResponse.json({ id: docRef.id, created: true });
  } catch (error) {
    console.error('Devices POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/devices?deviceId=xxx — remove a device
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const url = new URL(request.url);
    const deviceId = url.searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId required' }, { status: 400 });
    }

    const snapshot = await db.collection('devices')
      .where('userId', '==', userId)
      .where('deviceId', '==', deviceId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    await snapshot.docs[0].ref.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Devices DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
