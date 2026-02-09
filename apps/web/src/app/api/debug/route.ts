import { NextRequest, NextResponse } from 'next/server';
import { initAdmin, db, auth } from '@/lib/firebase-admin';
import { s3Client, BUCKET_NAME, getBucketCors } from '@/lib/s3';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const results: Record<string, any> = {};

  // 1. Check env vars (presence only, not values)
  results.envVars = {
    WASABI_ACCESS_KEY_ID: !!process.env.WASABI_ACCESS_KEY_ID,
    WASABI_ACCESS_KEY_ID_length: process.env.WASABI_ACCESS_KEY_ID?.length || 0,
    WASABI_ACCESS_KEY_ID_trimmed_length: process.env.WASABI_ACCESS_KEY_ID?.trim().length || 0,
    WASABI_SECRET_ACCESS_KEY: !!process.env.WASABI_SECRET_ACCESS_KEY,
    WASABI_BUCKET: process.env.WASABI_BUCKET || 'NOT SET',
    WASABI_REGION: process.env.WASABI_REGION || 'NOT SET',
    FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
    UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
  };

  // 2. Test Firebase Admin
  try {
    initAdmin();
    results.firebaseAdmin = { status: 'ok', message: 'Initialized' };
  } catch (err: any) {
    results.firebaseAdmin = { status: 'error', message: err.message };
  }

  // 3. Test Firestore read
  try {
    const snapshot = await db.collection('users').limit(1).get();
    results.firestore = {
      status: 'ok',
      message: `Read ${snapshot.size} docs from users collection`,
    };
  } catch (err: any) {
    results.firestore = { status: 'error', message: err.message };
  }

  // 4. Test Firebase Auth
  try {
    const authInstance = auth();
    results.firebaseAuth = { status: 'ok', message: 'Auth instance created' };
  } catch (err: any) {
    results.firebaseAuth = { status: 'error', message: err.message };
  }

  // 5. Test S3 connection
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      MaxKeys: 1,
    });
    const response = await s3Client.send(command);
    results.s3 = {
      status: 'ok',
      message: `Connected to bucket ${BUCKET_NAME}`,
      objectCount: response.KeyCount || 0,
    };
  } catch (err: any) {
    results.s3 = { status: 'error', message: err.message, code: err.Code || err.name };
  }

  // 6. Test S3 CORS
  try {
    const cors = await getBucketCors();
    results.s3Cors = {
      status: cors?.CORSRules ? 'ok' : 'not_configured',
      rules: cors?.CORSRules || null,
    };
  } catch (err: any) {
    results.s3Cors = { status: 'error', message: err.message };
  }

  // 7. Test Upstash Redis
  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    await redis.ping();
    results.redis = { status: 'ok', message: 'PONG' };
  } catch (err: any) {
    results.redis = { status: 'error', message: err.message };
  }

  return NextResponse.json(results, { status: 200 });
}
