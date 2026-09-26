/**
 * Phase 1 마이그레이션 — studentProgramEnrollments denorm 백필
 *
 *   cd scripts
 *   GOOGLE_APPLICATION_CREDENTIALS=./thinkcampus-firebase-adminsdk-....json \
 *     npx ts-node migrateFirestorePhase1.ts
 *
 * 에뮬레이터:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-thinkcampus npx ts-node migrateFirestorePhase1.ts
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

const USE_EMULATOR = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? './service-account.json';

admin.initializeApp(
  USE_EMULATOR
    ? { projectId: process.env.GCLOUD_PROJECT ?? 'demo-thinkcampus' }
    : {
        credential: admin.credential.cert(path.resolve(__dirname, credPath)),
        projectId: 'thinkcampus',
      },
);

const db = admin.firestore();

function programTitle(municipalityName: string, contractCode: string): string {
  const m = municipalityName?.trim() ?? '';
  const c = contractCode?.trim() ?? '';
  if (m && c) return `${m} ${c}`;
  return m || c || '프로그램';
}

async function main() {
  const snap = await db.collection('studentProgramEnrollments').get();
  console.log(`📦 studentProgramEnrollments ${snap.size}건 검사…`);

  let updated = 0;
  let skipped = 0;
  const batchSize = 400;
  let batch = db.batch();
  let ops = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.studentName && data.programTitle && data.contractCode) {
      skipped++;
      continue;
    }

    const studentId = data.studentId as string;
    const programRunId = data.programRunId as string;
    if (!studentId || !programRunId) {
      skipped++;
      continue;
    }

    const [stSnap, runSnap] = await Promise.all([
      db.collection('students').doc(studentId).get(),
      db.collection('programRuns').doc(programRunId).get(),
    ]);

    const studentName = (stSnap.data()?.name as string) ?? studentId;
    const run = runSnap.data();
    const contractCode = (run?.contractCode as string) ?? (data.contractCode as string) ?? '';
    const municipalityName = (run?.municipalityName as string) ?? '';
    const programTitleStr = programTitle(municipalityName, contractCode);

    batch.update(doc.ref, {
      studentName,
      contractCode,
      programTitle: programTitleStr,
    });
    ops++;
    updated++;

    if (ops >= batchSize) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) await batch.commit();

  console.log(`✅ 완료 — 갱신 ${updated}건, 스킵 ${skipped}건`);
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
