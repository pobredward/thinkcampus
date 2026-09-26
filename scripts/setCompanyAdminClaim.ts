/**
 * Firebase Auth Custom Claim: role=companyAdmin
 *
 *   cd scripts && npx ts-node setCompanyAdminClaim.ts <UID>
 *
 * importRoster Callable 호출 전 회사 직원 UID에 부여하거나,
 * Functions .env 에 ROSTER_IMPORT_UIDS=uid 로 임시 허용.
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: npx ts-node setCompanyAdminClaim.ts <UID>');
  process.exit(1);
}

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
  await admin.auth().setCustomUserClaims(uid, { role: 'companyAdmin' });
  console.log(`✅ ${uid} → role: companyAdmin`);
  console.log('   앱에서 로그아웃 후 다시 로그인하거나, 브라우저에서 세션을 새로고침해 claim이 반영되도록 하세요.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
