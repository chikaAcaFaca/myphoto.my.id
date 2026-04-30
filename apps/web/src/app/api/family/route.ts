import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { generateDownloadUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';

// GET /api/family — get family info, members, and shared files
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    // Get user's familyId
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const familyId = userData.familyId;

    if (!familyId) {
      return NextResponse.json({ family: null, members: [], sharedFiles: [] });
    }

    // Get family doc
    const familyDoc = await db.collection('families').doc(familyId).get();
    if (!familyDoc.exists) {
      return NextResponse.json({ family: null, members: [], sharedFiles: [] });
    }

    const familyData = familyDoc.data()!;

    // Get all members
    const memberIds: string[] = familyData.memberIds || [];
    const members = [];
    for (const memberId of memberIds) {
      const memberDoc = await db.collection('users').doc(memberId).get();
      if (memberDoc.exists) {
        const data = memberDoc.data()!;
        members.push({
          id: memberId,
          displayName: data.displayName || data.email,
          email: data.email,
          role: memberId === familyData.adminId ? 'admin' : 'member',
          storageUsed: data.storageUsed || 0,
        });
      }
    }

    // Get shared files (files with familyId set)
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '60', 10), 200);

    const filesSnap = await db.collection('files')
      .where('familyId', '==', familyId)
      .where('isTrashed', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(pageSize + 1)
      .offset((page - 1) * pageSize)
      .get();

    const hasMore = filesSnap.docs.length > pageSize;
    const sharedFiles = await Promise.all(
      filesSnap.docs.slice(0, pageSize).map(async (doc) => {
        const data = doc.data();
        const file: Record<string, any> = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        };
        if (data.smallThumbKey) {
          try { file.smallThumbUrl = await generateDownloadUrl(data.smallThumbKey); } catch {}
        }
        if (data.thumbnailKey) {
          try { file.thumbnailUrl = await generateDownloadUrl(data.thumbnailKey); } catch {}
        }
        return file;
      })
    );

    return NextResponse.json({
      family: {
        id: familyDoc.id,
        name: familyData.name,
        adminId: familyData.adminId,
        memberCount: memberIds.length,
        sharedStorageUsed: familyData.sharedStorageUsed || 0,
        createdAt: familyData.createdAt?.toDate?.()?.toISOString() || null,
      },
      members,
      sharedFiles,
      hasMore,
    });
  } catch (error) {
    console.error('Family GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/family — create family or manage members
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const body = await request.json();
    const { action } = body;

    // Create a new family
    if (action === 'create') {
      const { name } = body;

      // Check if user already has a family
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.data()?.familyId) {
        return NextResponse.json({ error: 'Already in a family' }, { status: 400 });
      }

      const now = new Date();
      const familyRef = await db.collection('families').add({
        name: name || 'My Family',
        adminId: userId,
        memberIds: [userId],
        sharedStorageUsed: 0,
        createdAt: now,
        updatedAt: now,
      });

      // Update user
      await db.collection('users').doc(userId).update({
        familyId: familyRef.id,
        role: 'family_admin',
      });

      return NextResponse.json({ familyId: familyRef.id, created: true });
    }

    // Invite member by email
    if (action === 'invite') {
      const { email } = body;
      if (!email) {
        return NextResponse.json({ error: 'Email required' }, { status: 400 });
      }

      // Verify user is family admin
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data()!;
      if (!userData.familyId) {
        return NextResponse.json({ error: 'Not in a family' }, { status: 400 });
      }

      const familyDoc = await db.collection('families').doc(userData.familyId).get();
      if (!familyDoc.exists || familyDoc.data()?.adminId !== userId) {
        return NextResponse.json({ error: 'Only admin can invite' }, { status: 403 });
      }

      // Find user by email
      const usersSnap = await db.collection('users')
        .where('email', '==', email.toLowerCase().trim())
        .limit(1)
        .get();

      if (usersSnap.empty) {
        return NextResponse.json({ error: 'User not found with this email' }, { status: 404 });
      }

      const inviteeDoc = usersSnap.docs[0];
      const inviteeData = inviteeDoc.data();

      if (inviteeData.familyId) {
        return NextResponse.json({ error: 'User already belongs to a family' }, { status: 400 });
      }

      // Add to family
      const memberIds: string[] = familyDoc.data()!.memberIds || [];
      if (memberIds.includes(inviteeDoc.id)) {
        return NextResponse.json({ error: 'Already a member' }, { status: 400 });
      }

      memberIds.push(inviteeDoc.id);
      await db.collection('families').doc(userData.familyId).update({
        memberIds,
        updatedAt: new Date(),
      });

      await db.collection('users').doc(inviteeDoc.id).update({
        familyId: userData.familyId,
        role: 'user',
      });

      return NextResponse.json({
        success: true,
        memberId: inviteeDoc.id,
        memberName: inviteeData.displayName || inviteeData.email,
      });
    }

    // Remove member
    if (action === 'remove') {
      const { memberId } = body;
      if (!memberId) {
        return NextResponse.json({ error: 'memberId required' }, { status: 400 });
      }

      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data()!;
      if (!userData.familyId) {
        return NextResponse.json({ error: 'Not in a family' }, { status: 400 });
      }

      const familyDoc = await db.collection('families').doc(userData.familyId).get();
      if (!familyDoc.exists) {
        return NextResponse.json({ error: 'Family not found' }, { status: 404 });
      }

      const familyData = familyDoc.data()!;

      // Only admin can remove, or member can remove themselves
      if (familyData.adminId !== userId && memberId !== userId) {
        return NextResponse.json({ error: 'Only admin can remove members' }, { status: 403 });
      }

      // Can't remove admin
      if (memberId === familyData.adminId && familyData.memberIds.length > 1) {
        return NextResponse.json({ error: 'Transfer admin role first' }, { status: 400 });
      }

      const memberIds = (familyData.memberIds || []).filter((id: string) => id !== memberId);

      if (memberIds.length === 0) {
        // Last member — delete family
        await db.collection('families').doc(userData.familyId).delete();
      } else {
        await db.collection('families').doc(userData.familyId).update({
          memberIds,
          updatedAt: new Date(),
        });
      }

      // Remove familyId from user
      await db.collection('users').doc(memberId).update({
        familyId: null,
        role: 'user',
      });

      return NextResponse.json({ success: true });
    }

    // Share file with family
    if (action === 'share') {
      const { fileIds } = body;
      if (!fileIds?.length) {
        return NextResponse.json({ error: 'fileIds required' }, { status: 400 });
      }

      const userDoc = await db.collection('users').doc(userId).get();
      const familyId = userDoc.data()?.familyId;
      if (!familyId) {
        return NextResponse.json({ error: 'Not in a family' }, { status: 400 });
      }

      const batch = db.batch();
      for (const fileId of fileIds) {
        const fileRef = db.collection('files').doc(fileId);
        const fileDoc = await fileRef.get();
        if (fileDoc.exists && fileDoc.data()?.userId === userId) {
          batch.update(fileRef, { familyId });
        }
      }
      await batch.commit();

      return NextResponse.json({ success: true, shared: fileIds.length });
    }

    // Unshare file
    if (action === 'unshare') {
      const { fileIds } = body;
      if (!fileIds?.length) {
        return NextResponse.json({ error: 'fileIds required' }, { status: 400 });
      }

      const batch = db.batch();
      for (const fileId of fileIds) {
        const fileRef = db.collection('files').doc(fileId);
        const fileDoc = await fileRef.get();
        if (fileDoc.exists && fileDoc.data()?.userId === userId) {
          batch.update(fileRef, { familyId: null });
        }
      }
      await batch.commit();

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Family POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
