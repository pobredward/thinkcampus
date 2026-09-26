/**
 * enrollments → guardianLinks 컬렉션 마이그레이션 (문서 id 유지)
 *
 *   cd scripts
 *   GOOGLE_APPLICATION_CREDENTIALS=./thinkcampus-firebase-adminsdk-....json \
 *     npx ts-node migrateEnrollmentsToGuardianLinks.ts
 *
 *   --delete-source  원본 enrollments 문서 삭제
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const DELETE_SOURCE = process.argv.includes('--delete-source');

const USE_EMULATOR = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? './service-account.json';
const credFull = path.resolve(__dirname, credPath);

if (USE_EMULATOR) {
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-thinkcampus' });
} else if (fs.existsSync(credFull)) {
  admin.initializeApp({
    credential: admin.credential.cert(credFull),
    projectId: 'thinkcampus',
  });
} else {
  admin.initializeApp({ projectId: 'thinkcampus' });
}

const db = admin.firestore();

async function main() {
  const src = await db.collection('enrollments').get();
  console.log(`📦 enrollments ${src.size}건 → guardianLinks`);

  if (src.empty) {
    console.log('✅ 복사할 문서 없음');
    return;
  }

  let batch = db.batch();
  let ops = 0;
  let copied = 0;

  for (const doc of src.docs) {
    batch.set(db.collection('guardianLinks').doc(doc.id), doc.data(), { merge: true });
    ops++;
    copied++;
    if (DELETE_SOURCE) {
      batch.delete(doc.ref);
      ops++;
    }
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();

  console.log(`✅ guardianLinks ${copied}건 반영${DELETE_SOURCE ? ', enrollments 삭제 완료' : ''}`);
  if (!DELETE_SOURCE) {
    console.log('   원본 삭제: 동일 명령에 --delete-source 추가 후 재실행 (검증 후)');
  }
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
