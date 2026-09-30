# Firestore 데이터 모델 (카탈로그 · 운영 건 · 수강)

최종 갱신: 2026-09-26  
대상: 학부모 앱(`web/`, Expo) · 관리자(`web/admin`) · Cloud Functions · `scripts/seed.ts`

## 개념 3층

| 레이어 | 컬렉션 | 설명 |
|--------|--------|------|
| 카탈로그 | `programTemplates`, `sessionTemplates` | 회차 주제·기본 설명·샘플 자료(Storage URL). 강사 정보 없음. |
| 운영 건 | `programRuns`, `runSessions` | 지자체·캠퍼스·기간·로고·회차 배치(순서/생략/삽입)·오버라이드·Canva·담당 강사. |
| 수강·운영 | `studentProgramEnrollments`, `sessionAttendance`, `sessionReports`, `notifications` | 학생별 수강·분 단위 출결·리포트 워크플로·알림. |

**기존 컬렉션 (의미 유지)**

| 컬렉션 | 의미 |
|--------|------|
| `guardianLinks` | 보호자(uid) ↔ 학생 ↔ 캠퍼스 **연결** (앱 “내 자녀”). 수업 배정 아님. (구 `enrollments`) |
| `enrollmentCodes` | 학생당 1코드, 첫 보호자 등록용. 형제는 코드 각각. |
| `students` | `householdId` 로 형제 묶음 (import 시 우리가 생성). |
| `staffCodes` | 강사·센터 직원 등록용 (전화 로그인, Custom Claims). |
| `staff` | **로그인하는 직원** 프로필 (`uid` = Auth uid). 회사·센터·강사(예정) 모두 여기 — `role`·`campusIds`. **학부모는 이 컬렉션에 없음** (Auth + `guardianLinks`). 권한은 Custom Claims와 동기. |

**운영 건 대외 코드** `contractCode`: admin **자유 입력**, 전역 **중복 불가** (지자체·담당자가 부르는 이름).

---

## 1. programTemplates

```ts
{
  id: string,
  slug: string,              // 개발자용 안정 키 e.g. "sat-creative-fusion-6"
  title: string,
  subtitle?: string,
  category?: string,
  defaultSessionCount: number,
  defaultSessionHours: number, // 회차당 교시 수 (2 또는 3)
  defaultFrequency: 'weekly' | 'biweekly',
  defaultFixedDay: 0|1|2|3|4|5|6, // JS getDay (0=일 … 6=토)
  defaultStartTime: string,  // "10:00"
  defaultEndTime: string,
  status: 'draft' | 'published',
  createdAt, updatedAt
}
```

## 2. sessionTemplates

`programTemplateId` 기준 하위 문서 또는 `sessionTemplates/{id}` + `programTemplateId` 필드.

```ts
{
  id: string,
  programTemplateId: string,
  order: number,             // 카탈로그 기본 순서
  topic: string,
  description: string,
  defaultLessonCount: number, // 이 회차 교시 수 (2|3)
  sampleAssets?: {            // Storage — 전 운영 건 공유
    slidesPdfUrl?: string,
    thumbUrl?: string,
  },
  defaultCurriculum?: string[],
  defaultMaterials?: string[],
  defaultObjectives?: string[],
  // 강사 필드 없음
}
```

## 3. programRuns (운영 건)

문서 ID: 자동. 앱 URL은 `programRunId` 사용 (기존 `programId` 자리에 매핑 예정).

```ts
{
  contractCode: string,      // unique, admin 자유 입력
  programTemplateId: string,
  campusId: string,
  municipalityName: string,  // 지자체 표시명
  logoUrl?: string,          // Storage
  host?: string,
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled',

  startDate: string,         // "YYYY-MM-DD"
  endDate?: string,
  frequency: 'weekly' | 'biweekly',
  fixedDay: number,
  startTime: string,
  endTime: string,
  location: string,
  mapQuery?: string,

  // 회차 배치: 카탈로그 회차 id 순서, 생략·삽입·순서 변경
  sessionPlan: Array<{
    sessionTemplateId: string,
    lessonCount?: number,    // 없으면 template 기본
  }>,

  overrides?: {
    purpose?: string,
    overview?: string,
    notices?: string[],
    rules?: ProgramRule[],
    faq?: ProgramQnA[],
    directions?: ProgramDirection[],
  },

  reportPolicy: {
    requireCompanyApproval: boolean, // false면 센터 검수 후 발행
  },

  createdAt, updatedAt, createdByUid
}
```

## 4. runSessions

**루트 컬렉션** `runSessions/{sessionId}` + `programRunId` (서브컬렉션은 사용하지 않음).

```ts
{
  programRunId: string,
  sessionNumber: number,     // 1..N 운영 건 내 순서
  sessionTemplateId: string,
  scheduledDate: string,     // "YYYY-MM-DD"
  startTime: string,
  endTime: string,
  lessonCount: number,

  instructorId?: string,
  location?: string,
  status: 'scheduled' | 'cancelled' | 'completed',

  cancelReason?: string,
  makeUpDate?: string,

  // 운영 건 기본과 다를 때만
  overrides?: {
    topic?: string,
    description?: string,
    canvaSlideUrl?: string,
    canvaActivityUrl?: string,
    planUrl?: string,
  },

  source: 'generated' | 'manual', // 일정 자동 생성 vs 센터 수동
  createdAt, updatedAt
}
```

일정 생성: `shared/lib/generateRunSessions.ts` (격주/매주 + `excludedDates`).

---

## 5. studentProgramEnrollments

학생이 **어떤 운영 건**을 듣는지 (토 1시 + 토 3시 = 2문서).

```ts
{
  studentId: string,
  programRunId: string,
  campusId: string,
  status: 'upcoming' | 'active' | 'completed' | 'withdrawn',
  // import 시 denorm (센터 명단·카드용, run 변경 시 Functions로 갱신 예정)
  studentName?: string,
  contractCode?: string,
  programTitle?: string,
  enrolledAt?: Timestamp,
  externalRef?: string,      // 지자체 명단 행 id (optional)
  sectionId?: string,       // 운영 건 내 반(로테이션 그룹). 10~20명 단위
  createdAt
}
```

`programRuns.sections` (선택): `{ id, label, sortOrder }[]` — 회사·센터가 반 이름을 정의. import 시 `sectionId`/`sectionLabel` CSV로 배정 가능(후순위).

`runSessions.sectionId`: 같은 `scheduledDate`+`startTime`에 여러 문서 = **동시 로테이션**(최대 8반 등). 출결·입력률은 **해당 반 수강생만** 집계.

학부모 앱 프로그램 목록: Callable **`listStudentProgramBundles`** (서버에서 run + sessions 조립). 클라이언트 N+1 조인 없음.

---

## 6. 가구 연동 (형제)

**householdId**: import 시 `resolveHouseholdIds` 로 부여 (키·전화번호 규칙은 §8). 같은 가구 학생에 동일 값.

`students`:

```ts
{
  ...,
  householdId?: string,
  photoUrl?: string,   // Storage — 출결·명단 카드용 (센터/ import)
}
```

`enrollmentCodes` (optional denorm):

```ts
{ ..., householdId?: string }
```

**linkHouseholdSiblings** (Functions, redeem 직후 또는 별도 Callable):

1. 사용한 코드의 `studentId` → `householdId`
2. 같은 `householdId`, `guardianUids` 없는 다른 학생 목록
3. 앱 UX (**즉시 모달 + 미완료 시 홈 배너**):
   - 등록 성공 직후: "○○(둘째)도 연결할까요?" → **생년월일만** 확인
   - 건너뛴 경우: 홈에 "아직 연결 안 된 자녀가 있습니다" 배너
4. 성공 시 → `guardianLinks` + `guardianUids` + 형제 코드 `used` + `usedVia: 'householdLink'`

---

## 7. 출결 · 리포트 · 알림 (요약)

**sessionAttendance** (`runSessionId` + `studentId`):

```ts
{
  status: 'present' | 'late' | 'absent',
  checkinAt?: Timestamp,
  lateMinutes?: number,
  participationScore?: number,
  homeworkDone?: boolean | null,
  feedback?: string,
  highlights?: string[],
  improvements?: string[],
  recordedByUid, updatedAt
}
```

**sessionReports** (`runSessionId__studentId`, `functions/src/sessionReports.ts`):

```ts
{
  runSessionId, programRunId, campusId, studentId,
  instructorId: string | null,
  status: 'draft' | 'submitted' | 'reviewed' | 'published',
  //  작성 중(강사) → 검수 대기(센터) → 승인 대기(회사, reportPolicy.requireCompanyApproval 일 때만) → 학부모 공개
  //  반려(return)는 어느 단계에서든 draft 로 + returnNote
  participationScore: number | null, homeworkDone: boolean | null,
  feedback: string, highlights: string[], improvements: string[],
  returnNote?: string,
  submittedAt?, reviewedAt?, reviewedByUid?, publishedAt?, publishedByUid?, createdAt, updatedAt
}
```

출결(`recordSessionAttendance`)을 넣으면 draft 문서가 자동으로 생기고, 공개(`published`)될 때 `sessionAttendance` 문서에 `participationScore · homeworkDone · feedback · highlights · improvements` 를 같이 적는다 → 학부모 앱은 `sessionAttendance` 만 읽어도 된다.

**reports** (종합 리포트 — 프로그램이 끝난 뒤 학생마다 한 문서, `data/dummyReport.ts` 의 `StudentReport` 와 같은 모양 + 서버 필드):

```ts
{
  studentId, programRunId, guardianUids: string[],       // 서버 필드 (읽기 권한 · 공유 링크 발급 권한)
  studentName, campusName, programTitle, campPeriod: '2026.03.07 – 2026.05.16', issueDate, issuedBy,
  totalScore, totalGrade: 'S'|'A'|'B'|'C', personalityType, personalityDesc, strengthAreas[], growthAreas[], overallComment,
  attendanceSummary: { total, present, late, absent, homeworkDone, homeworkTotal },
  programs: [{ programId, sessionNumber, date, programName, instructorName, instructorTitle?, attendance,
               overallScore, preScore, postScore, growthIndex, grade, competencies: [{ label, score, benchmark, description }],
               instructorComment, highlights[], nextSteps[] }],      // 회차(과목)마다 하나
  sessionNotes: [{ sessionNumber, date, topic, instructorName, status: 'present'|'late'|'absent', note }],
  nextProgram?: { title, period, note }, closingMessage,
  createdAt, updatedAt
}
```

- 학부모 앱: `reports` 를 `studentId + programRunId` 로 읽는다(규칙: `guardianUids` 에 내 uid). 없으면 "준비 중" + 샘플 미리보기(`web/src/lib/reportSample.ts`).
- 빠진 필드가 있어도 화면·PDF 가 죽지 않게 `web/src/lib/reportNormalize.ts` 가 기본값을 채운다 (출석 요약이 없으면 `sessionNotes` 에서 센다).
- 공유: `createShareToken` → `shareTokens/{token}` `{ reportId, createdByUid, expiresAt(7일), createdAt }` → 웹 주소 `${WEB_ORIGIN}/r/<token>`. 링크를 연 사람은 `getSharedReport`(로그인 없음) 로 문서를 받고(서버 필드 제외) PDF 로 저장할 수 있다. 예전 `viewReport?t=` 주소는 이 페이지로 302.
- PDF 는 브라우저에서 만든다 (`web/src/lib/reportPdf.tsx`, @react-pdf/renderer + `public/fonts/Pretendard-*.subset.ttf`). 서버 작업 없음.
- 작성 화면(센터·회사)은 아직 없다 — 당분간 스크립트/콘솔로 문서를 넣는다. 다음 단계.

**notifications**: 출결·공지·리포트 공개 시 Functions 가 생성 (`type: 'attendance' | 'notice' | 'report' | 'schedule'`, `programRunId`, `campusId`, 공지는 `sectionId?` · `recipients`, 개인 알림은 `studentId`). 학부모는 `listGuardianNotifications` 로 자기 자녀 것만 본다. 읽음은 `notificationReads/{uid}_{notificationId}`. FCM 은 이후.

**staff**: `role: 'companyAdmin' | 'centerAdmin' | 'instructor'`, `campusIds`, `displayName`, `email`, `phone?`, 강사는 `title?`(소속) · `bio?` · `specialties: string[]` · `photoUrl?` (학부모 앱 강사 카드 · 센터 강사 목록). `scripts/createStaffUser.ts` 가 Claims 와 함께 만든다.

**runSessions.sectionId / instructorId**: 회차 = (날짜, 반) 한 문서. `createProgramRun` 이 `sections` 개수만큼 만든다. 강사 배정은 `assignInstructorToSession` (같은 시간 겹침 검사). `programRuns.title?` 은 화면 이름(없으면 "지자체 계약코드").

**rosterImports**: `importRoster` 실행 기록 (회사 홈의 "마지막 명단 등록").

---

## 8. 지자체 roster CSV (1차안)

| 컬럼 | 필수 | 설명 |
|------|------|------|
| `studentName` | ✅ | |
| `birthDate` | ✅ | `YYYYMMDD` |
| `contractCode` | ✅ | 운영 건 매칭 (`programRuns.contractCode`) |
| `campusId` | ✅ | 또는 `campusName` → 내부 매핑 |
| `householdKey` | ⬜ | 있으면 **동일 키 = 동일 가구** (형제는 같은 값) |
| `guardianPhone` 또는 `parentPhone` | ⬜ | **선택**. 지자체 CSV에 없는 경우 많음. 있으면 동일 번호 = 동일 가구 (보호자 여부는 import 시 검증하지 않음) |
| `externalStudentId` | ⬜ | 지자체 원본 id |
| `sectionLabel` (`반`) | ⬜ | 운영 건 `sections[].label` 과 같은 반 이름. 없으면 첫 반 |

**가구 ID 부여 규칙** (`shared/lib/resolveHouseholdIds.ts`):

1. `householdKey` 있음 → 같은 키 → 같은 `householdId` (`hh_key_*`, 재import 시 동일)  
2. 키 없고 `guardianPhone` 있음 → 같은 번호 → 같은 `householdId` (`hh_phone_*`)  
3. 둘 다 없음 → **학생마다 새 가구** (`hh_solo_*`)

import 결과: `students` upsert, `studentProgramEnrollments`, `enrollmentCodes` 1개/학생, `householdId` 설정.

**Callable `importRoster`** (`functions/src/importRoster.ts`):

- 요청: `{ rows: RosterImportRow[], dryRun?: boolean }`
- 권한: Auth Custom Claim `role: companyAdmin` 또는 `ROSTER_IMPORT_UIDS` 환경변수
- `contractCode` → `programRuns` 조회 (없으면 오류)
- 미사용 등록코드가 있으면 재발급하지 않고 `householdId`·만료일만 갱신
- 시드 테스트: `contractCode` = `SEED-ROSTER-001` (`scripts/seed.ts`)

---

## 9. 권한 (Custom Claims)

| role | scope |
|------|--------|
| `companyAdmin` | 전체 |
| `centerAdmin` | `campusIds[]` |
| `instructor` | 배정된 `runSessions`만 |
| `officer` | 발주처 담당자(지자체 공무원) — `officers/{uid}.programRunIds` 의 운영 건만 (문서가 기준, Claim 은 역할 표시만) |

모든 쓰기: **Callable Functions** + Rules는 읽기 최소 허용.

---

## 10. 구현 순서 (참고)

1. ✅ 이 문서 + `shared/schema` + `generateRunSessions`
2. Functions: `programRuns` CRUD, 일정 생성, `contractCode` unique
3. Roster import + `householdId` + redeem 후 형제 연동
4. 학부모 앱: `programView` → Firestore 조회
5. 센터: 휴강·보강·출결·리포트 워크플로
6. `web/admin` UI

체험 모드(`DEMO_MODE`)는 더미 유지.

---

## 11. Firestore 인덱스 (`firestore.indexes.json`)

- `studentProgramEnrollments`: `studentId` + `programRunId` · `studentId` + `status`
- `runSessions`: `programRunId` + `sessionNumber` · `programRunId` + `scheduledDate`
- `programRuns`: `contractCode` (단일 필드) · `campusId` + `status`
- `sessionAttendance`: `studentId` + `programRunId`
- `students`: `householdId` (단일 필드 equality)

기존 데이터 denorm 백필: `scripts/migrateFirestorePhase1.ts`

---

## 12. 학부모 채팅 · 민원 · 만족도 · 발주처 담당자 (2026-09-30)

설계 배경: `docs/OFFICER_PORTAL_PLAN.md`. 쓰기는 모두 Functions(`functions/src/chat.ts` · `inquiries.ts` · `survey.ts` · `officers.ts` · `partnerApi.ts`), 규칙은 방 문서 읽기만 연다.

**chatRooms/{programRunId}__{studentId}** — 자녀 × 운영 건마다 방 하나 (학부모 ↔ 캠퍼스 담당)

```ts
{
  programRunId, campusId, studentId, guardianUids: string[],   // guardianUids 는 학생 문서에서 복사 (규칙 · 쿼리용)
  lastMessage: { text, fromRole: 'guardian'|'staff'|'system', at },
  unreadBy: { [guardianUid]: number },     // 학부모 앱 탭 배지 — 클라이언트가 직접 읽는다
  staffUnread: number,                     // 센터가 안 읽은 학부모 메시지
  waitingSince: Timestamp | null,          // 학부모 메시지에 답이 없으면 그 시각 ("감사합니다" 같은 짧은 인사 · 빠른 질문은 빼고)
  lastReadAt: { [guardianUid]: Timestamp, staff: Timestamp },   // 읽음 표시
  openInquiryCount: number,
  stats: { questionTurns, answeredTurns, replyMinutesSum, openQuestionAt, lastNonSystem },  // 발주처 "문의 · 첫 답변 시간"
  createdAt, updatedAt
}
chatRooms/{id}/messages/{mid} { fromUid, fromRole, text, photoIds: string[], kind: 'text'|'quick'|'inquiry'|'system', inquiryId?, createdAt }
chatPhotos/{id} { roomId, programRunId, dataUrl, bytes, createdByUid, createdAt }   // 브라우저에서 줄인 JPEG (≤ 900KB, 메시지당 3장)
```

- 방은 첫 메시지 때 생긴다. 학부모 목록은 수강 등록(탈퇴 제외)마다 방을 보여 준다 — 운영 중 · 예정은 `open`, 끝난 지 30일 안은 `readonly`, 그 뒤는 숨김
- 빠른 질문: `materials`(다음 회차 준비물 · 시간 · 장소 — `sessionTemplates.materials` + `programRuns.overrides.commonMaterials`) · `place`(`overrides.directions` 의 주차 · 도착하면)는 시스템이 바로 답한다. `absence` 는 글 틀만 채운다
- 사진은 Storage 대신 `chatPhotos` 문서 (지금 규모에서 Storage 버킷 · 규칙을 새로 만들지 않기 위해). 사진이 많아지면 Storage + 서명 URL 로 옮긴다

**inquiries/{id}** — 민원 · 문의 장부 (학부모 채팅 접수 · 센터가 채팅 메시지를 등록 · 전화/현장 기록)

```ts
{
  programRunId, campusId, studentId?, guardianUid?,
  kind: 'complaint' | 'question', category: 'lesson'|'instructor'|'facility'|'safety'|'operation'|'etc',
  channel: 'chat' | 'phone' | 'onsite', chatRoomId?, messageId?,
  title, body, photoIds: string[],
  status: 'received' | 'inProgress' | 'resolved',
  resolution?, resolvedAt?, resolvedByUid?,             // 처리 내용 — 학부모 방 · 발주처 화면 · 보고서에 보인다
  officerNote?, officerNoteByUid?, officerNoteAt?,       // 발주처 담당자 의견
  history: [{ at, status, note?, byUid }], createdByUid, createdAt, updatedAt
}
```

- 채팅 속 단순 질문은 장부에 적지 않는다 — 방의 `stats` 로 "문의 n건 · 답변 n건 · 평균 첫 답변 n분"을 센다
- 처리 완료 + 학부모에게 알림이면 방에 "처리 완료: …" 안내 메시지

**surveys/{programRunId}** `{ title, intro, items: [{id, label, question}], allowReview, consentLabel, opensAt, closesAt }` — 기본 5문항(전반 · 수업 내용 · 강사 · 운영·안내 · 재참여), 통합 관리자가 `upsertProgramRunSurvey` 로 연다
**surveyResponses/{programRunId}_{studentId}** `{ programRunId, studentId, guardianUid, scores: {itemId: 1..5}, review, consentPublic, submittedAt }` — 마감 전까지 고칠 수 있다. 대상 = 보호자가 연결된 수강생. 발주처 · 보고서에는 **공개 동의한 후기만, 이름 가림**

**officers/{uid}** `{ displayName, email, organization, title?, phone?, programRunIds, mustChangePassword, disabled, createdByUid, createdAt, lastLoginAt }` + Claim `{ role: 'officer' }`

- `inviteOfficer`: 새 이메일 → Auth 계정 + 임시 비밀번호(`Tc-xxxx0000`, 한 번만 보여 줌) · 이미 담당자 → 운영 건만 추가 · 직원/학부모 이메일은 거절
- 첫 로그인은 `/partner/login` 에서 새 비밀번호 → `completeOfficerPasswordChange`
- `revokeOfficer`: 운영 건에서 빼고, 남은 게 없으면 Auth 사용 중지 + 토큰 폐기

**programRuns.partnerNameMasking** (boolean) — 발주처 화면 · 보고서의 학생 이름을 "김○준"으로

규칙: `chatRooms` 문서 읽기 = `guardianUids` 에 내 uid · 센터(`token.campusIds` 에 `campusId`) · 통합 관리자. 메시지 · 사진 · 민원 · 조사 · 담당자 문서는 클라이언트 접근 없음. 새 복합 색인 없음 (같음 조건만 겹친 쿼리).

