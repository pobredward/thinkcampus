/**
 * 회사·센터 직원 · 강사 이메일/비밀번호 계정 생성 + Custom Claim + staff 프로필 문서
 *
 * Firebase Console에서 Authentication → Email/Password 제공업체를 켜야 합니다.
 *
 *   cd scripts && npm install
 *
 * 에뮬레이터 (Auth 에뮬레이터 실행 중):
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCLOUD_PROJECT=demo-thinkcampus \
 *     npx ts-node createStaffUser.ts company@thinkcampus.local 'Passw0rd!' company
 *
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCLOUD_PROJECT=demo-thinkcampus \
 *     npx ts-node createStaffUser.ts center@thinkcampus.local 'Passw0rd!' center campus-ds26
 *
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-thinkcampus \
 *     STAFF_NAME=박지훈 npx ts-node createStaffUser.ts teacher@thinkcampus.local 'Passw0rd!' instructor campus-ds26
 *
 * 이름은 STAFF_NAME 환경변수 (없으면 이메일 앞부분). staff/{uid} 문서에 displayName · email · role · campusIds 를 남긴다.
 *
 * 운영 (service-account.json):
 *   npx ts-node createStaffUser.ts admin@company.com 'secure-password' company
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

const email = process.argv[2];
const password = process.argv[3];
const roleArg = process.argv[4];
const campusIds = process.argv.slice(5);

if (!email || !password || !roleArg) {
  console.error(
    'Usage: STAFF_NAME=이름 npx ts-node createStaffUser.ts <email> <password> company|center|instructor [campusId ...]',
  );
  process.exit(1);
}

const role =
  roleArg === 'center' ? 'centerAdmin' : roleArg === 'company' ? 'companyAdmin' : roleArg === 'instructor' ? 'instructor' : null;
if (!role) {
  console.error('role은 company · center · instructor 중 하나여야 합니다.');
  process.exit(1);
}
if ((role === 'centerAdmin' || role === 'instructor') && campusIds.length === 0) {
  console.error(`${roleArg} 역할에는 campusId가 하나 이상 필요합니다.`);
  process.exit(1);
}
const displayName = process.env.STAFF_NAME?.trim() || email.split('@')[0];

const USE_EMULATOR = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? './service-account.json';
admin.initializeApp(
  USE_EMULATOR
    ? { projectId: process.env.GCLOUD_PROJECT ?? 'demo-thinkcampus' }
    : {
        credential: admin.credential.cert(path.resolve(__dirname, credPath)),
        projectId: 'thinkcampus',
      },
);
if (USE_EMULATOR) {
  console.log(`🧪 Auth 에뮬레이터: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
}

async function main() {
  let user: admin.auth.UserRecord;
  try {
    user = await admin.auth().createUser({ email, password, emailVerified: true });
    console.log(`✅ Auth 사용자 생성: ${user.uid}`);
  } catch (e: unknown) {
    const code = (e as { code?: string }).code;
    if (code === 'auth/email-already-exists') {
      user = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(user.uid, { password });
      console.log(`ℹ️  기존 사용자 비밀번호 갱신: ${user.uid}`);
    } else {
      throw e;
    }
  }

  const claims = role === 'companyAdmin' ? { role: 'companyAdmin' } : { role, campusIds };

  await admin.auth().setCustomUserClaims(user.uid, claims);
  await admin.auth().updateUser(user.uid, { displayName });
  console.log(`✅ Custom claim: ${JSON.stringify(claims)}`);

  // staff 프로필 (직원 앱 헤더 · 강사 목록 · 학부모 앱 강사 카드)
  await admin.firestore().collection('staff').doc(user.uid).set(
    {
      displayName,
      email,
      role,
      campusIds: role === 'companyAdmin' ? [] : campusIds,
      specialties: [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  console.log(`✅ staff/${user.uid} 프로필: ${displayName} (${role})`);
  console.log(`\n웹 로그인: http://127.0.0.1:3100/admin/login (에뮬 웹)`);
  console.log(`  email: ${email}`);
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
