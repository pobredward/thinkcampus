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

**sessionReports** / **programReports**: `draft` → `centerReviewed` → `published` (+ `reportPolicy`).

**notifications**: 출결·휴강·공지·리포트 발행 시 Functions가 생성 + FCM.

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
