/**
 * 채팅 · 민원 · 만족도 · 발주처 E2E 준비 (에뮬레이터 전용)
 *   seed.ts --clean · createStaffUser.ts(company · center · teacher) 뒤에 실행.
 *   보호자 2명(이메일 로그인) · 반 2개 · 수강 등록 · 강사 배정 · 다른 운영 건 · 다른 캠퍼스 센터
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-thinkcampus npx ts-node engageSetup.ts
 *   (projectId 가 demo- 로 고정돼 있어 실제 프로젝트에는 접속하지 않는다)
 */
import * as admin from 'firebase-admin';
admin.initializeApp({ projectId: 'demo-thinkcampus' });
const db = admin.firestore();
const RUN = 'run-seed-sat-001';
const CAMPUS = 'campus-ds26';

async function user(email: string, password: string, displayName: string, claims?: Record<string, unknown>) {
  let u: admin.auth.UserRecord;
  try {
    u = await admin.auth().getUserByEmail(email);
  } catch {
    u = await admin.auth().createUser({ email, password, displayName });
  }
  if (claims) await admin.auth().setCustomUserClaims(u.uid, claims);
  return u.uid;
}

(async () => {
  // 반 두 개 + 회차에 반 지정 (partnerNameMasking 끔)
  await db.collection('programRuns').doc(RUN).update({
    title: '시드 토요 창의융합',
    sections: [
      { id: 'sec-1', label: '1반', sortOrder: 0 },
      { id: 'sec-2', label: '2반', sortOrder: 1 },
    ],
    partnerNameMasking: false,
    overrides: { commonMaterials: ['필기도구'], directions: [{ label: '주차', text: '본관 뒤 주차장 (무료)' }] },
  });
  const rs = await db.collection('runSessions').where('programRunId', '==', RUN).get();
  for (const d of rs.docs) await d.ref.update({ sectionId: 'sec-1' });
  await db.collection('campuses').doc(CAMPUS).set({ phone: '053-000-0000', chatHours: '평일 09:00–18:00' }, { merge: true });

  const g1 = await user('guardian1@test.local', 'Passw0rd!', '박지영');
  const g2 = await user('guardian2@test.local', 'Passw0rd!', '최은주');
  const plan: Array<[string, string, string]> = [
    ['student-001', g1, 'sec-1'],
    ['student-002', g1, 'sec-2'],
    ['student-003', g2, 'sec-1'],
    ['student-004', '', 'sec-2'],
  ];
  for (const [sid, g, sec] of plan) {
    await db.collection('studentProgramEnrollments').doc(`${RUN}_${sid}`).set({ programRunId: RUN, studentId: sid, campusId: CAMPUS, sectionId: sec, status: 'active', createdAt: admin.firestore.FieldValue.serverTimestamp() });
    if (g) {
      await db.collection('students').doc(sid).update({ guardianUids: [g], campusId: CAMPUS });
      await db.collection('guardianLinks').doc(`${g}_${sid}`).set({ guardianUid: g, studentId: sid, campusId: CAMPUS, guardianRelation: '모', status: 'active' });
    }
  }
  // 다른 운영 건 (담당자 접근 막힘 확인용)
  await db.collection('programRuns').doc('run-other-001').set({ contractCode: 'OTHER-001', title: '다른 운영 건', campusId: CAMPUS, municipalityName: '다른 지자체', status: 'active', startDate: '2026-09-01', endDate: '2026-12-01', frequency: 'weekly', fixedDay: 6, startTime: '10:00', endTime: '12:00', location: '본관', programTemplateId: 'tpl-sat-creative-6' });
  // 다른 캠퍼스 센터 (방 접근 막힘 확인용)
  const c2 = await user('center2@test.local', 'Passw0rd!', '타캠퍼스', { role: 'centerAdmin', campusIds: ['campus-other'] });
  await db.collection('staff').doc(c2).set({ displayName: '타캠퍼스', role: 'centerAdmin', campusIds: ['campus-other'] });
  // 강사 박지훈(createStaffUser 로 만든 teacher@) — 1~4회차 담당 · 프로필 (발주처 강사진 화면)
  try {
    const t = await admin.auth().getUserByEmail('teacher@thinkcampus.local');
    for (const id of ['rs-seed-01', 'rs-seed-02', 'rs-seed-03', 'rs-seed-04']) await db.collection('runSessions').doc(id).update({ instructorId: t.uid });
    await db.collection('staff').doc(t.uid).set({ title: '서울대학교 교육학과', specialties: ['영어', '토론'], bio: '토론 수업 5년' }, { merge: true });
  } catch {
    console.warn('teacher@thinkcampus.local 이 없어 강사 배정을 건너뜀');
  }
  console.log(JSON.stringify({ g1, g2, c2 }));
  process.exit(0);
})();
