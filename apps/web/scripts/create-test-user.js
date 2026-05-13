// One-off: create a test user via Firebase Admin SDK.
// Reads FIREBASE_* env vars from apps/web/.env.
// Usage: node apps/web/scripts/create-test-user.js <email> <password> [displayName]
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const [, , email, password, displayName] = process.argv;
if (!email || !password) {
  console.error('Usage: node create-test-user.js <email> <password> [displayName]');
  process.exit(1);
}

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  console.error('Missing FIREBASE_* env vars in apps/web/.env');
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

getAuth()
  .createUser({ email, password, displayName, emailVerified: true })
  .then((user) => {
    console.log('CREATED uid=' + user.uid + ' email=' + user.email);
    process.exit(0);
  })
  .catch((err) => {
    if (err.code === 'auth/email-already-exists') {
      console.log('User already exists; updating password...');
      return getAuth().getUserByEmail(email).then((u) =>
        getAuth().updateUser(u.uid, { password }).then(() => {
          console.log('PASSWORD UPDATED uid=' + u.uid + ' email=' + u.email);
          process.exit(0);
        })
      );
    }
    console.error('FAILED:', err.code || '', err.message);
    process.exit(2);
  });
