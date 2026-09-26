/**
 * Firebase Auth Custom Claim: role=centerAdmin + campusIds
 *
 *   cd scripts && npx ts-node setCenterAdminClaim.ts <UID> <campusId> [campusId2 ...]
 *
 * 예: npx ts-node setCenterAdminClaim.ts abc123 campus-ds26
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

const uid = process.argv[2];
const campusIds = process.argv.slice(3).filter(Boolean);

if (!uid || campusIds.length === 0) {
  console.error('Usage: npx ts-node setCenterAdminClaim.ts <UID> <campusId> [campusId2 ...]');
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
  await admin.auth().setCustomUserClaims(uid, { role: 'centerAdmin', campusIds });
  console.log(`✅ ${uid} → role: centerAdmin, campusIds: ${campusIds.join(', ')}`);
  console.log('   (클라이언트에 반영되려면 재로그인 또는 getIdToken(true) 필요)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
