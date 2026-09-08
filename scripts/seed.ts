/**
 * seed.ts – 씽크캠퍼스 테스트 데이터 시드 스크립트
 *
 * 실행 전 준비:
 *   1. scripts/.env.example → scripts/.env 복사 후 HASH_SALT 입력
 *      (functions/.env 의 HASH_SALT 와 동일한 값이어야 함)
 *   2. Firebase 서비스 계정 키를 scripts/service-account.json 에 배치
 *      (GOOGLE_APPLICATION_CREDENTIALS 경로와 일치해야 함)
 *
 * 실행:
 *   cd scripts && npm install && npm run seed
 *
 * 정리(기존 데이터 삭제 후 재삽입):
 *   npm run seed:clean
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

// .env 로드
dotenv.config({ path: path.resolve(__dirname, '.env') });

const HASH_SALT = process.env.HASH_SALT;
if (!HASH_SALT) {
  console.error('❌ HASH_SALT 환경변수가 설정되지 않았습니다. scripts/.env 파일을 확인하세요.');
  process.exit(1);
}

// Firebase Admin 초기화
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? './service-account.json';
admin.initializeApp({
  credential: admin.credential.cert(path.resolve(__dirname, credPath)),
  projectId: 'thinkcampus',
});

const db = admin.firestore();
const CLEAN = process.argv.includes('--clean');

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value + HASH_SALT).digest('hex');
}

// ────────────────────────────────────────────
// 시드 데이터 정의
// ────────────────────────────────────────────

const NOW = new Date();
const FUTURE = new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000);   // 30일 후
const PAST   = new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000);    // 어제 (만료)
const LOCKED_UNTIL = new Date(NOW.getTime() - 1000);                   // 이미 해제

const CAMPUS_ID = 'campus-ds26';
const STUDENTS = [
  { id: 'student-001', name: '김민준', birthDate: '20100315', guardianPhone: '01011112222' },
  { id: 'student-002', name: '이서연', birthDate: '20110720', guardianPhone: '01033334444' },
  { id: 'student-003', name: '박지호', birthDate: '20090502', guardianPhone: '01055556666' },
];

// 등록코드 3개: 정상 / 사용됨 / 만료됨
const CODES = [
  {
    id: 'DS26-A3F7K',
    studentIndex: 0,
    used: false,
    expiresAt: FUTURE,
    lockedUntil: null,
    attemptCount: 0,
    description: '✅ 정상 코드 (테스트 성공 케이스)',
  },
  {
    id: 'DS26-B8M2Q',
    studentIndex: 1,
    used: true,
    expiresAt: FUTURE,
    lockedUntil: null,
    attemptCount: 1,
    usedByUid: 'test-uid-already-used',
    description: '🚫 사용됨 코드 (중복 등록 테스트)',
  },
  {
    id: 'DS26-C4N9P',
    studentIndex: 2,
    used: false,
    expiresAt: PAST,   // 이미 만료
    lockedUntil: null,
    attemptCount: 0,
    description: '⏰ 만료된 코드 (만료 테스트)',
  },
];

// ────────────────────────────────────────────
// 삭제 헬퍼
// ────────────────────────────────────────────
async function deleteCollection(collectionPath: string) {
  const snap = await db.collection(collectionPath).get();
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  console.log(`  🗑  ${collectionPath} 기존 데이터 삭제 완료 (${snap.size}건)`);
}

// ────────────────────────────────────────────
// 메인
// ────────────────────────────────────────────
async function main() {
  console.log('\n🌱 씽크캠퍼스 시드 스크립트 시작\n');

  if (CLEAN) {
    console.log('⚠️  --clean 모드: 기존 데이터를 삭제합니다...');
    await deleteCollection('campuses');
    await deleteCollection('students');
    await deleteCollection('enrollmentCodes');
    await deleteCollection('enrollments');
    console.log();
  }

  // ── 캠퍼스 ──────────────────────────────────
  console.log('1️⃣  캠퍼스 생성...');
  await db.collection('campuses').doc(CAMPUS_ID).set({
    name: '달성캠퍼스',
    region: 'daegu',
    startAt: admin.firestore.Timestamp.fromDate(new Date('2026-03-01')),
    endAt:   admin.firestore.Timestamp.fromDate(new Date('2026-08-31')),
    status: 'active',
  });
  console.log(`  ✅ campuses/${CAMPUS_ID} – 달성캠퍼스`);

  // ── 학생 ────────────────────────────────────
  console.log('\n2️⃣  학생 생성...');
  for (const s of STUDENTS) {
    await db.collection('students').doc(s.id).set({
      name: s.name,
      birthDate: s.birthDate,
      guardianUids: [],
      primaryGuardianUid: null,
    });
    console.log(`  ✅ students/${s.id} – ${s.name} (생년월일: ${s.birthDate})`);
  }

  // ── 등록코드 ─────────────────────────────────
  console.log('\n3️⃣  등록코드 생성...');
  for (const c of CODES) {
    const student = STUDENTS[c.studentIndex];
    const docData: Record<string, unknown> = {
      campusId: CAMPUS_ID,
      studentId: student.id,
      birthDateHash:     sha256(student.birthDate),
      guardianPhoneHash: sha256('+82' + student.guardianPhone.slice(1)), // E.164 변환 후 해시
      used: c.used,
      usedByUid: (c as any).usedByUid ?? null,
      usedAt: c.used ? admin.firestore.Timestamp.fromDate(new Date('2026-08-01')) : null,
      attemptCount: c.attemptCount,
      lockedUntil: c.lockedUntil ? admin.firestore.Timestamp.fromDate(c.lockedUntil) : null,
      expiresAt: admin.firestore.Timestamp.fromDate(c.expiresAt),
    };

    await db.collection('enrollmentCodes').doc(c.id).set(docData);
    console.log(`  ✅ enrollmentCodes/${c.id}  ${c.description}`);
    console.log(`     학생: ${student.name}, 생년월일: ${student.birthDate}, 전화: ${student.guardianPhone}`);
  }

  // ── 요약 ────────────────────────────────────
  console.log('\n────────────────────────────────────────');
  console.log('✅ 시드 완료\n');
  console.log('📋 테스트 시나리오:');
  for (const c of CODES) {
    const student = STUDENTS[c.studentIndex];
    console.log(`\n  코드: ${c.id}`);
    console.log(`  ${c.description}`);
    console.log(`  생년월일: ${student.birthDate}  전화: ${student.guardianPhone}`);
  }
  console.log('\n⚠️  전화번호 입력 시 앞 0을 포함하여 입력하세요 (예: 01011112222)');
  console.log('────────────────────────────────────────\n');

  process.exit(0);
}

main().catch((e) => {
  console.error('❌ 시드 실패:', e);
  process.exit(1);
});
