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
// FIRESTORE_EMULATOR_HOST 가 있으면 로컬 에뮬레이터 — 서비스 계정 없이 초기화 (web/e2e 참고)
const USE_EMULATOR = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
admin.initializeApp(
  USE_EMULATOR
    ? { projectId: process.env.GCLOUD_PROJECT ?? 'demo-thinkcampus' }
    : {
        credential: admin.credential.cert(path.resolve(__dirname, credPath)),
        projectId: 'thinkcampus',
      },
);
if (USE_EMULATOR) {
  console.log(`🧪 에뮬레이터 모드: ${process.env.FIRESTORE_EMULATOR_HOST} (project: ${process.env.GCLOUD_PROJECT ?? 'demo-thinkcampus'})`);
}

// Firestore 데이터베이스 ID: REST API 확인 결과 "default" (괄호 없음)
const db = admin.firestore();
// (default) DB 사용 — Admin SDK 기본값과 일치
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
  { id: 'student-001', name: '김민준', birthDate: '20100315' },
  { id: 'student-002', name: '이서연', birthDate: '20110720' },
  { id: 'student-003', name: '박지호', birthDate: '20090502' },
  { id: 'student-004', name: '최민철', birthDate: '20120301' },
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
  {
    id: 'DS26-ABC12',
    studentIndex: 3,
    used: false,
    expiresAt: FUTURE,
    lockedUntil: null,
    attemptCount: 0,
    description: '✅ 정상 코드 – 최민철 (기존 계정에 두 번째 자녀 연결 테스트)',
  },
];

// ────────────────────────────────────────────
// 리포트 더미 데이터 (앱의 dummyReport.ts와 동일)
// ────────────────────────────────────────────

const PROGRAMS_MINJUN = [
  {
    programId: 'prog-eng', programName: '글로벌 영어 커뮤니케이션', programIcon: '🌍',
    instructorName: '김지수', attendance: 100,
    overallScore: 74, preScore: 60, postScore: 74, growthIndex: 14, grade: 'B',
    competencies: [
      { label: '어휘·표현력',   score: 78, benchmark: 70, description: '핵심 표현 습득 및 활용 능력' },
      { label: '청취 이해력',   score: 80, benchmark: 68, description: '원어민 발화 이해 및 요점 파악' },
      { label: '말하기 유창성', score: 65, benchmark: 65, description: '자연스러운 영어 발화 속도와 흐름' },
      { label: '토론 참여도',   score: 70, benchmark: 67, description: '영어 토론 참여 적극성 및 논리성' },
      { label: '발표 자신감',   score: 72, benchmark: 64, description: '영어 발표 시 자신감과 태도' },
    ],
    instructorComment: '어휘력과 청취 능력은 또래보다 우수합니다. 말하기에서 다소 머뭇거리는 모습이 있었으나, 수업 후반부로 갈수록 발화량이 눈에 띄게 늘었습니다. 꾸준한 영어 노출 환경 조성을 권장합니다.',
    nextSteps: ['원어민 화상 영어 주 2회 이상 진행 권장', 'TEDx 영어 강연 청취로 발표 표현 습득', '영어 일기 쓰기로 작문 능력 보완'],
    highlights: ['소그룹 토론에서 팀원의 의견을 적극 경청하고 정리하는 모습이 인상적', '어려운 단어도 문맥을 통해 유추하는 능력 탁월'],
  },
  {
    programId: 'prog-world', programName: '세계사 인문학', programIcon: '🌐',
    instructorName: '박민준', attendance: 100,
    overallScore: 85, preScore: 65, postScore: 85, growthIndex: 20, grade: 'A',
    competencies: [
      { label: '역사적 사고력', score: 90, benchmark: 72, description: '사건의 인과관계와 흐름을 파악하는 능력' },
      { label: '비교·분석력',   score: 88, benchmark: 69, description: '다양한 문명·시대를 비교 분석하는 능력' },
      { label: '비판적 사고',   score: 82, benchmark: 67, description: '역사적 관점에서 현대 문제를 바라보는 능력' },
      { label: '핵심 개념 이해', score: 80, benchmark: 70, description: '주요 역사 개념 및 용어 습득 수준' },
    ],
    instructorComment: '역사적 사고력이 뛰어나며, 수업 중 질문의 깊이가 타 학생들에 비해 매우 심화된 수준이었습니다.',
    nextSteps: ['세계사 관련 다큐멘터리 시청 (EBS 문명 시리즈 등)', '관심 시대의 역사 소설 읽기', '역사 관련 독서 후 독후감 작성 습관화'],
    highlights: ['산업혁명 단원에서 현대 AI와의 연결 고리를 스스로 발표', '매 수업 예습 완료로 질문 수준이 월등히 높았음'],
  },
  {
    programId: 'prog-korean', programName: '한국사 인문학', programIcon: '🏯',
    instructorName: '이서연', attendance: 100,
    overallScore: 79, preScore: 68, postScore: 79, growthIndex: 11, grade: 'B',
    competencies: [
      { label: '시대적 맥락 이해', score: 82, benchmark: 73, description: '각 시대의 정치·사회·문화적 배경 파악' },
      { label: '사료 해석 능력',   score: 75, benchmark: 64, description: '역사 자료를 읽고 해석하는 능력' },
      { label: '역사 인물 분석',   score: 80, benchmark: 68, description: '주요 역사 인물의 행동과 영향력 분석' },
      { label: '근현대사 이해',    score: 76, benchmark: 70, description: '근현대사 핵심 사건 및 배경 이해 수준' },
    ],
    instructorComment: '시대적 맥락을 잘 파악하고, 역사 인물 카드게임에서 적극적으로 참여했습니다.',
    nextSteps: ['한국사능력검정시험 3급 목표 학습 권장', '박물관·전시회 방문으로 역사 실체 체험', '역사 드라마·다큐 비판적으로 시청하기'],
    highlights: ['조선 시대 정치 구조 발표에서 도식화를 활용한 명쾌한 설명', '역사 인물 카드게임 우승'],
  },
  {
    programId: 'prog-debate', programName: '사고·창의력 디베이트', programIcon: '🎙️',
    instructorName: '최현우', attendance: 100,
    overallScore: 76, preScore: 55, postScore: 76, growthIndex: 21, grade: 'B',
    competencies: [
      { label: '논리적 구성력', score: 80, benchmark: 66, description: '주장-근거-반박 구조로 논점을 전개하는 능력' },
      { label: '설득력',       score: 72, benchmark: 64, description: '상대방을 논리적으로 설득하는 능력' },
      { label: '반박·재구성',  score: 75, benchmark: 62, description: '상대 논점에 즉각적으로 대응하는 능력' },
      { label: '경청·공감',    score: 85, benchmark: 70, description: '상대방 의견을 정확히 이해하고 반영하는 능력' },
      { label: '발표 자신감',  score: 68, benchmark: 65, description: '발표 시 목소리·시선·자세 등 표현력' },
    ],
    instructorComment: '초반에는 발언 횟수가 적었으나, 4회차부터 급격한 성장세를 보였습니다. 경청 능력이 매우 뛰어납니다.',
    nextSteps: ['학교 토론 동아리 또는 모의 UN 참가 권장', '매일 뉴스 1건 읽고 찬반 정리하는 습관', 'TED 강연 보며 발표 기법 학습'],
    highlights: ['마지막 회차 팀 디베이트에서 팀 발표를 직접 이끔', '경청 역량 부문 전체 1위'],
  },
  {
    programId: 'prog-steam', programName: '창의 융합 과학 STEAM', programIcon: '🔬',
    instructorName: '정다은', attendance: 100,
    overallScore: 88, preScore: 70, postScore: 88, growthIndex: 18, grade: 'A',
    competencies: [
      { label: '과학적 탐구력', score: 90, benchmark: 68, description: '가설 설정 및 실험 설계 능력' },
      { label: '공학적 사고',   score: 88, benchmark: 65, description: '문제를 구조적으로 분석하고 해결책을 설계하는 능력' },
      { label: '창의적 발상',   score: 92, benchmark: 70, description: '기존 방식을 벗어난 독창적 아이디어 제안 능력' },
      { label: '협업 능력',     score: 85, benchmark: 72, description: '모둠 활동에서의 협력과 역할 분담 능력' },
      { label: '결과 발표력',   score: 82, benchmark: 66, description: '실험 결과를 논리적으로 설명하는 능력' },
    ],
    instructorComment: '브릿지 설계 챌린지에서 가장 창의적인 구조를 제안했으며, 팀원들과 협력하여 실제로 구현해냈습니다.',
    nextSteps: ['과학 올림피아드 또는 발명 경진대회 참가', '아두이노·라즈베리파이 입문 과정 체험', '관심 분야 STEAM 서적 읽기'],
    highlights: ['브릿지 챌린지 팀 최우수상', '발명 아이디어로 팀원들의 박수를 받음'],
  },
  {
    programId: 'prog-ai', programName: 'AI/SW 바이브 코딩', programIcon: '💻',
    instructorName: '한지훈', attendance: 100,
    overallScore: 95, preScore: 72, postScore: 95, growthIndex: 23, grade: 'S',
    competencies: [
      { label: 'AI 개념 이해',      score: 96, benchmark: 68, description: 'AI의 원리와 생활 적용 사례 이해 수준' },
      { label: '코딩 구현력',       score: 95, benchmark: 64, description: '주어진 문제를 코드로 구현하는 능력' },
      { label: '논리·알고리즘 사고', score: 94, benchmark: 62, description: '문제를 단계적으로 분해하고 해결하는 사고력' },
      { label: '창의적 응용',       score: 97, benchmark: 65, description: '배운 내용을 새로운 상황에 창의적으로 적용' },
      { label: '자기주도 학습',     score: 98, benchmark: 67, description: '스스로 탐구하고 학습을 확장하는 능력' },
    ],
    instructorComment: '수업 범위를 넘어 스스로 심화 코드를 작성해 오고, AI 이미지 생성 실습에서 직접 새로운 프롬프트 패턴을 발견했습니다.',
    nextSteps: ['파이썬 기초 → 중급 과정 온라인 강의 수강', '앱 개발 공모전 또는 해커톤 참가', '깃허브 계정 개설 후 프로젝트 관리 시작'],
    highlights: ['수업 중 AI 프롬프트 신기법 발견으로 전체 공유', '미니 앱 기획 발표 최우수 선정', '자기주도 학습 역량 전체 1위'],
  },
  {
    programId: 'prog-career', programName: '진로·진학 발굴', programIcon: '🎯',
    instructorName: '오수진', attendance: 100,
    overallScore: 71, preScore: 58, postScore: 71, growthIndex: 13, grade: 'B',
    competencies: [
      { label: '자기 이해도',     score: 76, benchmark: 68, description: '자신의 강점·약점·흥미를 파악하는 수준' },
      { label: '직업 세계 이해',  score: 74, benchmark: 66, description: '미래 유망 직업과 역량 요구 사항 이해' },
      { label: '목표 설정력',     score: 68, benchmark: 64, description: '단기·중기·장기 목표를 구체적으로 설정하는 능력' },
      { label: '실행 계획 수립',  score: 65, benchmark: 62, description: '목표 달성을 위한 구체적 계획 수립 능력' },
    ],
    instructorComment: 'AI/SW 분야에 대한 강한 흥미와 적성을 보이나, 진로를 좀 더 구체화하는 과정이 필요합니다.',
    nextSteps: ['AI 관련 직업군 세분화 탐색 (유튜브·책)', '관련 대학·학과 입시 정보 미리 파악', '진로 멘토링 프로그램 참가 권장'],
    highlights: ['적성 검사 결과와 희망 진로가 일치하여 자신감 상승', '10년 후 계획서 발표에서 구체적인 로드맵 제시'],
  },
  {
    programId: 'prog-psych', programName: '유소년 심리학', programIcon: '🧠',
    instructorName: '윤채린', attendance: 100,
    overallScore: 83, preScore: 65, postScore: 83, growthIndex: 18, grade: 'A',
    competencies: [
      { label: '자기 감정 인식', score: 88, benchmark: 70, description: '자신의 감정을 정확히 인식하고 표현하는 능력' },
      { label: '타인 공감 능력', score: 90, benchmark: 68, description: '타인의 감정을 이해하고 공감하는 능력' },
      { label: '스트레스 대처',  score: 78, benchmark: 65, description: '어려운 상황에서 감정을 건강하게 조절하는 능력' },
      { label: '대인 관계 기술', score: 80, benchmark: 67, description: '또래 및 어른과의 원활한 소통 능력' },
      { label: '자기 효능감',   score: 80, benchmark: 66, description: '스스로 할 수 있다는 믿음과 자신감' },
    ],
    instructorComment: '공감 능력이 또래 대비 매우 뛰어나며, 감정 어휘 카드게임에서 가장 다양한 감정어를 표현했습니다.',
    nextSteps: ['감사 일기 쓰기로 긍정적 사고 습관 강화', '학교 또래 상담 동아리 참여 고려', '〈감정 어휘〉 관련 도서 추가 읽기 권장'],
    highlights: ['감정 어휘 카드게임 최다 표현 달성', '모든 수업에서 팀원들을 배려하는 리더십 발휘'],
  },
];

// 서연이 프로그램 (민준 데이터 기반으로 약간 변형)
const PROGRAMS_SEOYEON = PROGRAMS_MINJUN.map((p, i) => ({
  ...p,
  overallScore: Math.max(55, p.overallScore - 8 + (i % 3 === 0 ? 10 : 0)),
  preScore: p.preScore - 5,
  postScore: p.postScore - 8,
  growthIndex: p.growthIndex - 3,
  grade: (p.overallScore - 8 >= 90 ? 'S' : p.overallScore - 8 >= 75 ? 'A' : 'B') as 'S' | 'A' | 'B' | 'C',
  competencies: p.competencies.map((c) => ({
    ...c,
    score: Math.max(50, c.score - 6 + (i % 2 === 0 ? 5 : 0)),
  })),
}));

const REPORTS = [
  {
    id: 'report-2026-001',
    studentId: 'student-001',
    campusId: CAMPUS_ID,
    campusName: 'ThinkCampus 강남점',
    campPeriod: '2026.09.15 – 2026.10.01',
    issueDate: '2026.10.07',
    totalScore: 82,
    totalGrade: 'A',
    personalityType: '탐구형 창의인재 (EXPLORER)',
    personalityDesc: '새로운 지식에 대한 호기심이 강하고, 다양한 분야를 연결하여 사고하는 융합적 사고력이 뛰어납니다.',
    overallComment: '민준이는 8주 캠프를 통해 눈에 띄는 성장을 보여주었습니다. 특히 AI/SW 코딩 분야에서 타의 추종을 불허하는 집중력을 발휘했으며, 디베이트 수업에서는 초반의 소극적인 자세를 극복하고 마지막 회차에서 팀 발표를 이끄는 리더십을 보여주었습니다.',
    strengthAreas: ['AI/SW 코딩', '창의 융합 과학', '세계사 인문학'],
    growthAreas: ['발표·표현력', '진로 구체화'],
    guardianUids: [] as string[], // 시드 후 보호자 UID 업데이트 필요
    programs: PROGRAMS_MINJUN,
  },
  {
    id: 'report-2026-002',
    studentId: 'student-002',
    campusId: CAMPUS_ID,
    campusName: 'ThinkCampus 강남점',
    campPeriod: '2026.09.15 – 2026.10.01',
    issueDate: '2026.10.07',
    totalScore: 76,
    totalGrade: 'B',
    personalityType: '소통형 협력인재 (CONNECTOR)',
    personalityDesc: '타인과의 소통을 즐기고, 모둠 활동에서 뛰어난 리더십을 발휘합니다.',
    overallComment: '서연이는 협력과 소통 능력이 매우 뛰어나며, 특히 디베이트와 심리학 수업에서 두각을 나타냈습니다.',
    strengthAreas: ['디베이트', '유소년 심리학', '한국사 인문학'],
    growthAreas: ['AI/SW 코딩', '수학적 사고'],
    guardianUids: [] as string[],
    programs: PROGRAMS_SEOYEON,
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
    await deleteCollection('reports');
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
      allowedGuardianPhoneHashes: [], // 기존 보호자가 addGuardianPhone으로 추가
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
      birthDateHash: sha256(student.birthDate), // 생년월일만 검증 — 전화번호 불필요
      used: c.used,
      usedByUid: (c as any).usedByUid ?? null,
      usedAt: c.used ? admin.firestore.Timestamp.fromDate(new Date('2026-08-01')) : null,
      attemptCount: c.attemptCount,
      lockedUntil: c.lockedUntil ? admin.firestore.Timestamp.fromDate(c.lockedUntil) : null,
      expiresAt: admin.firestore.Timestamp.fromDate(c.expiresAt),
    };

    await db.collection('enrollmentCodes').doc(c.id).set(docData);
    console.log(`  ✅ enrollmentCodes/${c.id}  ${c.description}`);
    console.log(`     학생: ${student.name}, 생년월일: ${student.birthDate}`);
  }

  // ── 리포트 ──────────────────────────────────
  console.log('\n4️⃣  리포트 생성...');
  for (const r of REPORTS) {
    const { id, ...data } = r;
    await db.collection('reports').doc(id).set({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // 학생 문서에 reportIds 배열 갱신
    await db.collection('students').doc(data.studentId).update({
      reportIds: admin.firestore.FieldValue.arrayUnion(id),
    });
    console.log(`  ✅ reports/${id} – 학생 ${data.studentId} (${data.totalGrade} / ${data.totalScore}점)`);
  }
  console.log('');
  console.log('  ℹ️  guardianUids 는 보호자가 앱에서 등록코드를 사용하면 자동으로 채워집니다.');
  console.log('  ℹ️  또는 아래 명령으로 특정 UID를 수동으로 추가할 수 있습니다:');
  console.log('     firebase firestore:update reports/report-2026-001 --data \'{"guardianUids":["YOUR_UID"]}\'');

  // ── 요약 ────────────────────────────────────
  console.log('\n────────────────────────────────────────');
  console.log('✅ 시드 완료\n');
  console.log('📋 테스트 시나리오:');
  for (const c of CODES) {
    const student = STUDENTS[c.studentIndex];
    console.log(`\n  코드: ${c.id}`);
    console.log(`  ${c.description}`);
    console.log(`  생년월일: ${student.birthDate}`);
  }
  console.log('\n⚠️  전화번호 입력 시 앞 0을 포함하여 입력하세요 (예: 01011112222)');
  console.log('────────────────────────────────────────\n');

  process.exit(0);
}

main().catch((e) => {
  console.error('❌ 시드 실패:', e);
  process.exit(1);
});
