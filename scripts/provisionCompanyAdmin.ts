/**
 * 회사 관리자 — Auth Custom Claim + Firestore staff/{uid}
 *
 *   cd scripts && npx ts-node provisionCompanyAdmin.ts <UID> <email>
 *
 * service-account.json 또는 gcloud application-default credentials (thinkcampus IAM) 필요.
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

const uid = process.argv[2];
const email = process.argv[3]?.trim().toLowerCase();

if (!uid || !email) {
  console.error('Usage: npx ts-node provisionCompanyAdmin.ts <UID> <email>');
  process.exit(1);
}

const USE_EMULATOR = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? './service-account.json';
const credFull = path.resolve(__dirname, credPath);

if (USE_EMULATOR) {
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-thinkcampus' });
} else {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    if (fs.existsSync(credFull)) {
      admin.initializeApp({
        credential: admin.credential.cert(credFull),
        projectId: 'thinkcampus',
      });
    } else {
      admin.initializeApp({ projectId: 'thinkcampus' });
    }
  } catch {
    admin.initializeApp({ projectId: 'thinkcampus' });
  }
}

const db = admin.firestore();

async function main() {
  const user = await admin.auth().getUser(uid);
  if (user.email?.toLowerCase() !== email) {
    console.warn(`⚠️  Auth 이메일(${user.email ?? '없음'})과 입력(${email})이 다릅니다. 이메일을 맞춥니다.`);
    await admin.auth().updateUser(uid, { email, emailVerified: true });
  }

  await admin.auth().setCustomUserClaims(uid, { role: 'companyAdmin' });

  await db.collection('staff').doc(uid).set(
    {
      uid,
      email,
      role: 'companyAdmin',
      campusIds: [],
      status: 'active',
      displayName: user.displayName ?? null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  console.log(`✅ companyAdmin claim + staff/${uid}`);
  console.log(`   email: ${email}`);
  console.log('   앱: /admin/login 에서 재로그인하면 권한이 반영됩니다.');
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
