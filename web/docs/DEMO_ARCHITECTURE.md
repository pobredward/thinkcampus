# 체험판 · 데이터 계층 구조

다섯 역할(학부모 · 강사 · 프로그램 매니저 · 통합 관리자 · 발주처 담당자)의 화면은 **실서비스 주소 그대로**(`/main`, `/instructor`, `/admin/center`, `/admin`, `/partner`) 쓰고,
어느 데이터를 보여 줄지만 `services/` 계층이 정한다. 화면 코드에는 "체험이면 …" 분기가 없다.

```
src/services/
├── types.ts            화면 ↔ 데이터 계약 (DTO). Functions 응답과 이름·필드가 같다
├── api.ts              인터페이스 — StaffApi · GuardianApi · CenterApi · InstructorApi · CompanyApi · PartnerApi
├── index.ts            useApi(): 체험이면 demo, 아니면 live
├── hooks.ts            useQuery / useMutation (저장하면 화면의 모든 조회가 다시 읽는다)
├── demo/
│   ├── world.ts        DemoWorld — Firestore 와 같은 컬렉션 모양의 예시 데이터 한 벌 (오늘 기준으로 생성, sessionStorage 에 저장)
│   ├── select.ts       세계 → DTO 공통 조회 (Program 조립, 회차 집계 …)
│   ├── reports.ts      회차 리포트 목록·검수 상태 전환 (센터·회사 공용)
│   ├── seedEngagement.ts 채팅방 · 민원 · 만족도 · 발주처 담당자 시드
│   ├── chat.ts         채팅 · 민원 규칙 (답변 대기 · 빠른 질문 자동 안내 · 민원 접수/처리 · 문의 집계) — functions/src/chat.ts · inquiries.ts 와 같다
│   ├── survey.ts       만족도 조사 (대상 · 응답 · 결과 — 발주처는 공개 동의 후기만)
│   ├── partnerApi.ts   발주처 담당자 화면 · 보고서 자료 (functions/src/partnerApi.ts 와 같은 계산)
│   ├── guardianApi.ts · centerApi.ts · instructorApi.ts · companyApi.ts · index.ts
└── live/
    ├── call.ts         httpsCallable 래퍼
    ├── guardianApi.ts  Firestore 직접 조회 + Callable (서버에 데이터가 없는 계정은 dummyFallback)
    ├── staffApi.ts     센터·강사·회사·발주처 — 전부 Callable (functions/src/*)
    ├── chatWatch.ts    채팅 실시간 — chatRooms 문서 onSnapshot (새 메시지 · 읽음 → 화면이 Callable 로 다시 읽는다)
    └── dummyFallback.ts 실서비스 초기 단계의 예시 프로그램 (모바일 앱과 같은 규칙)
```

## 체험 진입 (쿠키)

| 주소 | 하는 일 |
|---|---|
| `/demo` | 역할 선택 허브 — 세 묶음(내부 운영: 통합 관리자 · 프로그램 매니저 · 강사 / 발주처: 담당자 / 학부모). Firebase 없이 뜬다 |
| `/demo/<role>` | 쿠키 `tc_demo=<role>` 을 심고 그 역할의 첫 화면으로 302 (`?next=` 로 그 역할 영역 안의 주소로 바로) |
| `/demo/exit` | 쿠키를 지우고 허브로 |

- 루트 layout(서버)이 쿠키를 읽어 `<DemoProvider role>` 에 넘긴다 → 서버·클라이언트가 첫 렌더부터 같은 값 (예전 `/demo/*` rewrite 방식의 하이드레이션 오류 없음)
- `AuthProvider` 는 체험이면 역할별 체험 계정으로 "로그인된 상태"를 만든다 (학부모 신선웅 · 강사 박지훈 · 프로그램 매니저 이정민 · 통합 관리자 김도현 · 발주처 한지원 주무관). 로그아웃 = 체험 종료
- 배너(`components/demo/DemoBanner.tsx`): 역할 · **초기화**(세계를 처음으로) · 역할 바꾸기 · 체험 종료
- 다른 역할의 주소로 가면(`학부모 체험 중 /admin`) `StaffGuard` 가 "○○ 체험으로 바꾸기" 안내
- `/onboarding` · `/admin/login` · `/partner/login` 은 체험 중이면 역할 홈으로 (`components/demo/DemoRedirect.tsx`). `/partner` 는 `PartnerGuard` 가 같은 안내

## 체험 세계 (DemoWorld)

`services/demo/world.ts` 의 `buildDemoWorld(today)` 가 **오늘 날짜 기준**으로 만든다. 날이 바뀌면 다시 만든다.

- 달성캠퍼스 `2026 ThinkCampus 토요 창의융합` (`run-ds26-creative`): 격주 · 6회 · **4회차 = 오늘** (1~3회차 지난 회차, 5~6회차 예정) · 6개 반 × 12명 = 72명 · 1~3반 10:00, 4~6반 13:00
  - 강사 박지훈(1·4반) · 이수민(2·5반) · 최현우(3·6반), 5회차 6반은 미배정(배정 화면 체험용)
  - 오늘 오전 반은 출결 입력 완료·리포트 작성 중, 오후 반은 출결 전
  - 3회차 리포트: 1·3·6반 공개, 2·5반 검수 대기, 4반 작성 중
  - 보호자 연결 약 85%, 형제 가구 8곳, 신선웅 보호자의 자녀 신민준(1반) · 신서연(4반)
- 겨울방학 STEAM 특강 (`run-ds26-winter`): 9주 뒤 시작, 수강 예정
- 구미 STEAM 탐구 (`run-gumi-steam`): 회사 화면용, 회사 승인 정책, 승인 대기 리포트
- 지난 프로그램 2개(봄학기 창의융합 · 영어 스피킹). 봄학기는 지금 프로그램과 같은 6과목이라 종합 리포트가 발급돼 있다 (신민준 · 신서연, `lib/reportSample.ts` 가 예시 문장을 이 아이·이 회차에 맞춰 만든다)
- 채팅 · 민원 · 만족도 (`seedEngagement.ts`): 신민준 방(준비물 · 픽업 문의, 마지막 답장은 안 읽음 → 채팅 탭 배지 1) · 신서연 방(냉방 민원 → 처리 완료) · 다른 학부모 8명(오늘 아침 질문 1건이 답변 대기, 활동지 난이도 민원 처리 중, 주차 안내 민원 처리 완료) · 전화 접수 민원(강사 지각) · 전화 문의 기록 1건. 중간 만족도 조사가 열려 있고 약 70% 응답(신민준 · 신서연은 체험에서 직접 응답)
- 발주처 담당자: 달성군청 교육지원과 한지원 주무관(토요 창의융합 · 겨울 특강 · 봄학기), 구미시청 담당자(구미 STEAM, 이름 가림 설정 · 첫 로그인 전)
- 시각은 모두 한국 시간 표기(`…+09:00`)로 저장한다 (`nowIso()` — 문자열로 정렬 · 비교하므로 `Z` 와 섞지 않는다). `DEMO_WORLD_VERSION` 이 바뀌면 저장된 세계를 버리고 새로 만든다
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
| 채팅 | `listGuardianChatRooms` · `listCenterChatRooms` · `getChatRoom` · `sendChatMessage`(사진 · 빠른 질문 · 민원 접수) · `markChatRead` + `chatRooms` 문서 실시간 |
| 민원 · 문의 | `listInquiries`(센터: 캠퍼스 · 회사: 전체) · `getInquiry` · `fileInquiry`(채팅 메시지 → 민원 · 전화/현장) · `updateInquiry`(상태 · 메모 · 처리 내용 · 학부모 알림) |
| 만족도 | `listPendingSurveys` · `getSurvey` · `submitSurvey` · `getSurveyResults` · `upsertProgramRunSurvey`(회사) |
| 발주처 담당자 | 회사: `listOfficers` · `inviteOfficer` · `revokeOfficer` · `updateProgramRunPartnerSettings` / 담당자: `getPartnerAccess` · `completeOfficerPasswordChange` · `listPartnerRuns` · `getPartnerHome` · `listPartnerLessons` · `listPartnerInquiries` · `setOfficerNote` · `getPartnerParticipation` · `getPartnerSurveyResults` · `listPartnerInstructors` · `getPartnerReportData` |
| 종합 리포트 공유 | `createShareToken`(웹 주소 `/r/<token>` 반환, `WEB_ORIGIN`) · `getSharedReport`(로그인 없음 · 7일 만료) · `viewReport`(예전 링크 → `/r/` 302) |

`services/live/dummyFallback.ts`: 서버에 수강 정보가 아직 없는 학부모 계정은 예시 프로그램(`data/dummy*`)으로 화면을 채운다 (모바일 앱과 같은 규칙, 에뮬레이터 E2E 도 이 규칙을 검증). 실데이터가 들어오면 자동으로 실데이터만.

## 종합 리포트 (학부모)

- 화면 `/main/program/[id]/report` — 본문 `components/report/FinalReportView`, 버튼 `components/report/ReportActions` (공유 링크 시트 · PDF)
- 프로그램이 끝나기 전에는 `?sample=1` 로 **샘플 미리보기** — 이 아이 이름·이 프로그램으로 만든 예시 (`lib/reportSample.ts`). PDF 는 되고 공유 링크는 실제 발급 뒤에
- 공유 링크 `/r/<token>` (`app/r/[token]`) — 로그인·쿠키 없이 열리고 PDF 버튼만 있다. 체험판 링크는 `demo-<reportId>` 로 받는 사람 브라우저가 같은 시드에서 리포트를 다시 만든다. `sample` 은 예시 리포트(서버에 리포트가 없는 실서비스 계정의 폴백)
- PDF `lib/reportPdf.tsx` — @react-pdf/renderer, 버튼을 누를 때만 불러온다(약 1MB). 한글 폰트는 `public/fonts/Pretendard-*.subset.ttf` (WOFF 는 fontkit 이 푸는 데 15초 넘게 걸려 TTF · gzip 전송 0.9MB). 파일 이름 `{학생}_{프로그램}_종합리포트.pdf`, 휴대폰에서는 저장 / 카카오톡·문자로 보내기 선택
- 실데이터 문서 모양은 `docs/DATA_MODEL.md` §7 `reports`

## 채팅 · 민원 · 만족도 · 발주처

- 학부모 하단 탭: 홈 · **채팅** · 알림 · 내 정보. `/main/chat` 방 목록 → `/main/chat/[roomId]`(탭바 숨김) — 빠른 질문 칩(다음 수업 준비물 · 결석·지각 알려요 · 장소·주차 · 기타 문의), **불편·요청 사항으로 접수** 스위치(분류 고르기 → 민원), 사진 3장(브라우저에서 1280px JPEG 로 줄임), 접수한 요청의 처리 상태. 내 정보 "문의하기"도 채팅으로
- 홈: 최신 공지 한 줄(→ 알림) · 응답할 만족도 조사 카드 → `/main/program/[id]/survey` (5문항 × 1~5점 큰 버튼 · 후기 · 공개 동의). 프로그램 화면에도 "만족도 조사" 한 줄
- 프로그램 매니저 하단 탭: 홈 · 수업 · **채팅**(답변 대기 배지) · 리포트 · 더보기(학생 명단 · 강사 · 공지 · 민원·문의 · 만족도 결과). `/admin/center/chat` · `/chat/[roomId]`(자주 쓰는 답변 · 민원으로 등록 · 처리하기) · `/inquiries`(전화·현장 접수 기록) · `/inquiries/[id]` · `/survey`. 홈에 "답을 기다리는 대화 · 미처리 민원"
- 통합 관리자: 운영 건 상세에 발주처 담당자(초대 · 임시 비밀번호 · 권한 해제 · 학생 이름 가리기) · 만족도 조사(열기 · 기간) · 민원 보기, 홈 "미처리 민원" → `/admin/inquiries`(모든 캠퍼스, 열람)
- 발주처 담당자 `/partner` (컴퓨터 화면 우선, 위 탭): 현황 · 수업 · 민원·문의(원문 + 처리 내용 · 의견 남기기) · 참여(반별 · 학생×회차) · 강사진 · 만족도 · **보고서**. 로그인 `/partner/login` (첫 로그인 비밀번호 변경)
- 보고서 `lib/partnerReport/`: 자료(`getPartnerReportData`) → 문서 모델(`model.ts`, 장 10개 · 번호 1. 가. 1)) → **HWPX**(`hwpx.ts`, JSZip · 정의표 `public/hwpx/header.xml` — python-hwpx 로 만들고 `hwpx-validate` 로 검증) · **DOCX**(`docx.ts`) · **PDF**(`pdf.tsx`) · **XLSX**(`xlsx.ts`, 시트별 자료). [양식 만들기] 장 고르기 · 학생별 출결표, [개요 정리하기] 장마다 핵심 숫자 → 복사. 모두 브라우저에서 만들고 서버에 파일을 남기지 않는다. 담당자 한글 양식에 채워 넣기는 다음 단계

## 리포트 상태

`draft`(작성 중) → `submitted`(검수 대기) → `reviewed`(승인 대기, `reportPolicy.requireCompanyApproval` 인 운영 건만) → `published`(학부모 공개).
`return` 은 어느 단계에서든 `draft` 로 되돌리고 `returnNote` 를 남긴다. 공개될 때 `sessionAttendance` 문서에 피드백을 같이 적어 학부모 앱(출결 조회)이 그대로 본다.

## 확인

- `npm run typecheck && npm run lint && npm run build`
- 체험판 E2E: `npm run build && npm run start` 후 `npm run e2e:demo` (41개 — 다섯 역할 · 역할 사이 저장 반영 · 종합 리포트 샘플/공유/PDF · 채팅 · 민원 · 만족도 · 발주처 화면 · 보고서 4형식 · 담당자 초대 · 초기화 · 종료 · 글자 14px 이상 · Firebase 요청 0건). 리눅스에서는 `LC_ALL=C.UTF-8` 로 (한글 파일 이름)
- 에뮬레이터 통합(실제 Functions · 규칙): `e2e/engage.e2e.mjs` 25개 — `e2e/README.md`
- 에뮬레이터 E2E(학부모 실서비스 흐름): `e2e/README.md`
