# 체험판 · 데이터 계층 구조

네 역할(학부모 · 강사 · 센터 관리자 · 회사 관리자)의 화면은 **실서비스 주소 그대로**(`/main`, `/instructor`, `/admin/center`, `/admin`) 쓰고,
어느 데이터를 보여 줄지만 `services/` 계층이 정한다. 화면 코드에는 "체험이면 …" 분기가 없다.

```
src/services/
├── types.ts            화면 ↔ 데이터 계약 (DTO). Functions 응답과 이름·필드가 같다
├── api.ts              인터페이스 — StaffApi · GuardianApi · CenterApi · InstructorApi · CompanyApi
├── index.ts            useApi(): 체험이면 demo, 아니면 live
├── hooks.ts            useQuery / useMutation (저장하면 화면의 모든 조회가 다시 읽는다)
├── demo/
│   ├── world.ts        DemoWorld — Firestore 와 같은 컬렉션 모양의 예시 데이터 한 벌 (오늘 기준으로 생성, sessionStorage 에 저장)
│   ├── select.ts       세계 → DTO 공통 조회 (Program 조립, 회차 집계 …)
│   ├── reports.ts      회차 리포트 목록·검수 상태 전환 (센터·회사 공용)
│   ├── guardianApi.ts · centerApi.ts · instructorApi.ts · companyApi.ts · index.ts
└── live/
    ├── call.ts         httpsCallable 래퍼
    ├── guardianApi.ts  Firestore 직접 조회 + Callable (서버에 데이터가 없는 계정은 dummyFallback)
    ├── staffApi.ts     센터·강사·회사 — 전부 Callable (functions/src/*)
    └── dummyFallback.ts 실서비스 초기 단계의 예시 프로그램 (모바일 앱과 같은 규칙)
```

## 체험 진입 (쿠키)

| 주소 | 하는 일 |
|---|---|
| `/demo` | 역할 선택 허브. Firebase 없이 뜬다 |
| `/demo/<role>` | 쿠키 `tc_demo=<role>` 을 심고 그 역할의 첫 화면으로 302 (`?next=` 로 그 역할 영역 안의 주소로 바로) |
| `/demo/exit` | 쿠키를 지우고 허브로 |

- 루트 layout(서버)이 쿠키를 읽어 `<DemoProvider role>` 에 넘긴다 → 서버·클라이언트가 첫 렌더부터 같은 값 (예전 `/demo/*` rewrite 방식의 하이드레이션 오류 없음)
- `AuthProvider` 는 체험이면 역할별 체험 계정으로 "로그인된 상태"를 만든다 (학부모 신선웅 · 강사 박지훈 · 센터 이정민 · 회사 김도현). 로그아웃 = 체험 종료
- 배너(`components/demo/DemoBanner.tsx`): 역할 · **초기화**(세계를 처음으로) · 역할 바꾸기 · 체험 종료
- 다른 역할의 주소로 가면(`학부모 체험 중 /admin`) `StaffGuard` 가 "○○ 체험으로 바꾸기" 안내
- `/onboarding` · `/admin/login` 은 체험 중이면 역할 홈으로 (`components/demo/DemoRedirect.tsx`)

## 체험 세계 (DemoWorld)

`services/demo/world.ts` 의 `buildDemoWorld(today)` 가 **오늘 날짜 기준**으로 만든다. 날이 바뀌면 다시 만든다.

- 달성캠퍼스 `2026 ThinkCampus 토요 창의융합` (`run-ds26-creative`): 격주 · 6회 · **4회차 = 오늘** (1~3회차 지난 회차, 5~6회차 예정) · 6개 반 × 12명 = 72명 · 1~3반 10:00, 4~6반 13:00
  - 강사 박지훈(1·4반) · 이수민(2·5반) · 최현우(3·6반), 5회차 6반은 미배정(배정 화면 체험용)
  - 오늘 오전 반은 출결 입력 완료·리포트 작성 중, 오후 반은 출결 전
  - 3회차 리포트: 1·3·6반 공개, 2·5반 검수 대기, 4반 작성 중
  - 보호자 연결 약 85%, 형제 가구 8곳, 신선웅 보호자의 자녀 신민준(1반) · 신서연(4반)
- 겨울방학 STEAM 특강 (`run-ds26-winter`): 9주 뒤 시작, 수강 예정
- 구미 STEAM 탐구 (`run-gumi-steam`): 회사 화면용, 회사 승인 정책, 승인 대기 리포트
- 지난 프로그램 2개(여름학기 · 영어 스피킹) + 종합 리포트
- 수업 내용(교수 방안 · 자료 · Q&A)은 `data/dummyProgram.ts` 등 모바일과 공유하는 파일을 템플릿으로 쓴다 (`data/*` 는 손대지 않음)

저장: `mutateDemoWorld()` 로 바꾸면 즉시 `sessionStorage`(`tc.demo.world.v1`) 에 남고 `useQuery` 구독자가 다시 읽는다.
→ 새로고침·화면 이동에도 유지, 탭을 닫으면 사라진다. 한 탭에서 역할을 바꾸면 **같은 세계**를 본다 (강사가 출결을 넣으면 센터 대시보드·학부모 알림에 바로 반영).

## 실서비스로 바꾸려면

화면은 그대로 두고 데이터만 바뀐다.

1. Cloud Functions 배포 (`functions/src` — 아래 표). 응답 타입은 `services/types.ts` 와 같다
2. `programTemplates` · `sessionTemplates` 에 수업 내용(주제 · 설명 · 목표 · 흐름 · 준비물 · `lessonPlans[{lessonNumber, topic, slideUrl, activityUrl}]` · `planUrl`), `programRuns.sections` 에 반, `staff` 에 강사 프로필(`role: 'instructor'`, `campusIds`, `title`, `bio`, `specialties`)
3. 직원 계정: `scripts/createStaffUser.ts <email> <pw> company|center|instructor [campusId…]` (Custom Claims + `staff/{uid}`)
4. 명단: 회사 앱 명단 등록 (`반` 열이 있으면 그 반으로, 없으면 첫 반)

| 화면 | Callable |
|---|---|
| 직원 권한 | `checkStaffAccess` (instructor · displayName 포함) |
| 센터 홈·수업 | `listCenterRuns` · `getCenterRunSummary` · `listCenterSchedule` |
| 센터 출결 | `getProgramRunAttendanceSheet` · `recordSessionAttendance`(`records[]`) |
| 센터 학생 | `listCenterRoster` (형제 · 미사용 등록코드 · 보호자 연락처 · 출결 합계) |
| 센터 강사 | `listCenterInstructors` · `getCenterInstructor` · `assignInstructorToSession` (시간 겹침 검사) |
| 리포트 검수 | `listSessionReports` · `reviewSessionReports` (publish / approve / return) |
| 공지 | `createCenterNotice`(반 대상 · 수신 보호자 수) · `listCenterNotifications` |
| 강사 | `getInstructorHome` · `listInstructorSessions` · `getInstructorSessionWorkspace` · `saveSessionReportDrafts` · `submitSessionReports` |
| 회사 | `getCompanyHome` · `listProgramRuns` · `getProgramRun` · `listProgramTemplates` · `listCampuses` · `createProgramRun`(반 · 이름) · `updateProgramRunPolicy` · `importRoster`(반) · `listStaff` |
| 학부모 | `listStudentProgramBundles`(반별 회차 · 수업 내용 · 강사) · `listGuardianNotifications` · `markNotificationRead` + 기존 함수 |

`services/live/dummyFallback.ts`: 서버에 수강 정보가 아직 없는 학부모 계정은 예시 프로그램(`data/dummy*`)으로 화면을 채운다 (모바일 앱과 같은 규칙, 에뮬레이터 E2E 도 이 규칙을 검증). 실데이터가 들어오면 자동으로 실데이터만.

## 리포트 상태

`draft`(작성 중) → `submitted`(검수 대기) → `reviewed`(승인 대기, `reportPolicy.requireCompanyApproval` 인 운영 건만) → `published`(학부모 공개).
`return` 은 어느 단계에서든 `draft` 로 되돌리고 `returnNote` 를 남긴다. 공개될 때 `sessionAttendance` 문서에 피드백을 같이 적어 학부모 앱(출결 조회)이 그대로 본다.

## 확인

- `npm run typecheck && npm run lint && npm run build`
- 체험판 E2E: `npm run build && npm run start` 후 `npm run e2e:demo` (25개 — 네 역할 · 역할 사이 저장 반영 · 초기화 · 종료 · 글자 14px 이상 · Firebase 요청 0건)
- 에뮬레이터 E2E(학부모 실서비스 흐름): `e2e/README.md`
