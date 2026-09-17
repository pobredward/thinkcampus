# 씽크캠퍼스 학부모 앱 — Web 버전 (결정 기록 & 현황)

최종 갱신: 2026-09-17 (수강 예정 화면)

## 결정

| 항목 | 결정 |
|---|---|
| 방식 | **Next.js 별도 앱** (`web/`) — Expo Web 안 대신 채택. UI 는 새로 작성, 백엔드(Firestore·규칙·Cloud Functions·전화 OTP)는 모바일과 공유 |
| 인증 | 클라이언트 전용 (Firebase JS SDK + invisible reCAPTCHA). SSR 세션 쿠키는 필요한 페이지가 생길 때 추가 |
| 데이터 | 실데이터 미확정 → 모바일과 같은 더미 데이터 사본(`web/src/data`)으로 먼저 구현 |
| 배포 | **Vercel** (Root Directory = `web`, 리전 `icn1`) |
| URL | 모바일 expo-router 경로를 1:1 미러링 (`/onboarding`, `/main`, `/main/program/[programId]/report` …). 예외: 회차 화면 `/main/program/[programId]/session/[sessionId]` (모바일 회차 상세는 여기의 "내용" 탭) |

(초기 안이었던 "Expo Web(react-native-web)으로 같은 코드베이스" 방식은 공수가 훨씬 적지만, 웹을 Next.js 로 자연스럽게 만들기로 해서 채택하지 않음.)

## 현황 — 1차 구현 완료

- 모바일 18개 화면 + 레이아웃 전부 포팅 (`web/src/app/**`), `tsc` · `eslint` · `next build` 통과
- 실제 Cloud Functions 를 Firebase 에뮬레이터로 돌려 **브라우저 E2E 34개 시나리오 통과** (`web/e2e`)
  - 등록코드(정상/없음/사용됨/만료) → 생년월일(불일치 포함) → SMS OTP → 커스텀토큰 로그인 → 홈
  - 프로그램 출결/수업/회차/리포트, 공유(클립보드 폴백), 인쇄, 알림, 내 정보, 보호자 초대, FAQ 챗봇
  - 로그아웃, 미로그인 딥링크 → 로그인 → 원래 화면 복귀, 잘못된 OTP, 미등록 번호, 초대받은 보호자 로그인
  - 데스크톱 480px 폰 프레임
- 사용법·배포 절차·Firebase 콘솔 체크리스트: **`web/README.md`**
- 새 화면 옮기는 규칙: `web/docs/PORTING_GUIDE.md`

## 작업 중 발견·수정한 것

| 구분 | 내용 | 조치 |
|---|---|---|
| 웹 | 두 번째 OTP 발송(재발송/번호 변경)이 멈춤 — reCAPTCHA 재사용 문제 | 발송마다 새 verifier 생성 |
| 웹 | 로그아웃 시 인증 가드와 이동 경합 | 의도적 로그아웃 플래그 |
| 웹·모바일 | 초대받은 보호자가 "전화번호로 로그인"하면 자동 연결이 안 되고 로그아웃됨 | 웹·모바일 모두 수정 |
| 모바일 | 홈 이전 수강 카드 타입 누락, 로그인 `cred` null 가능성 (strict 타입 오류 2건) | 웹·모바일 모두 수정 — 이제 모바일 `tsc` 통과 |
| Functions | `admin.firestore.FieldValue` 가 에뮬레이터에서 undefined → INTERNAL 500 | 모듈형 import 로 변경 (운영 동작 동일, 배포 전 빌드 확인) |
| 보안 | `scripts/` 의 Firebase Admin 서비스 계정 키가 `.gitignore` 에 없음 (아직 커밋되지는 않음) | `.gitignore` 추가 |
| Functions | `linkGuardianByPhone` 이 학생 문서에 없는 `campusId` 를 읽어 `unknown` 저장 | 미수정 — 스키마 확정 시 반영 |

## 화면 변경 (웹·모바일 모두 반영)

| 항목 | 내용 |
|---|---|
| 자녀 전환 | 자녀 2명 이상이면 홈 오른쪽 위 버튼 → 선택 시트. 선택 기억: 웹은 기기에 저장, 모바일은 앱이 켜져 있는 동안만 (앱 재시작 후에도 유지하려면 `@react-native-async-storage/async-storage` 추가 + dev client 재빌드) |
| 홈 수강 카드 | 상태 · 프로그램명 · 요일/시간 · 진도 · 다음 수업 한 줄로 간소화 |
| 프로그램 상세 | 탭(출결/수업/리포트) → 달력 → 수업 일지를 거쳐 **회차 목록 + 회차 화면**으로 확정. 프로그램 화면은 진행 한 줄과 회차 목록만(다음 수업 강조). 회차를 누르면 탭 **출결 / 일정 / 내용 / Q&A / 리포트(끝난 회차만)**, 이전/다음 회차 넘기기(보던 탭 유지). 종합 리포트는 모든 회차가 끝난 뒤 목록 아래에서 열림 |
| 글자 크기 | 학부모용 기준: 최소 14 · 본문 16 이상 · 제목 18~24, 옅은 글자색 진하게, 한글 어절 단위 줄바꿈(모바일은 iOS 만 — Android 는 RN 에 해당 옵션 없음). 웹 E2E 가 모든 화면에서 14px 미만 글자를 검사 |
| 홈 | "학습 리포트 미리보기"(샘플) 카드 제거. **수강 예정** 섹션 추가 |
| 수강 예정 | 더미 `dummyUpcomingProgram.ts`(겨울방학 STEAM 특강 · 매주 토 · 2026.12.05–2027.01.16 · 6회 · 1/2 휴강). `Program` 에 `status/overview/features/commonMaterials/notices/breaks/enrolledAt` 선택 필드 추가, `getDummyProgram(programId)` 로 조회. 처음엔 한 화면에 모두 펼쳤다가 회의 결과로 아래 ①처럼 바꿈 |
| 회원 탈퇴 | 내 정보 맨 아래 → `/main/profile/withdraw` (안내 → 확인 체크 → 재확인) → Cloud Function `deleteAccount` → `/goodbye`. 내 연결 정보·공유 링크·Auth 계정 삭제, 학생 기록은 유지, 재가입은 새 등록코드/초대로. **배포 필요**: `firebase deploy --only functions:deleteAccount,firestore:rules` |
| 더미 데이터 | **6회차**(격주 토요일 09.05 ~ 11.14, 18차시)로 축소, 회차별 Q&A 추가, 출결 3회 완료 + 3회 예정 (웹·모바일 같은 데이터) |

### 회의 반영 (2026-09-17) — 40~50대 학부모: 첫 화면은 단순하게, 자세한 건 버튼 뒤로

| # | 항목 | 내용 |
|---|---|---|
| ① | 수강 예정 | 첫 화면 = **요약**(수강 예정·첫 수업 D-day / 기간 / 매주 토 10:00–12:00 · 휴강 / 장소) + **안내 버튼 6개**(프로그램 목적 · 회차별 내용 · 공지사항 · 수업 규정·지침 · 자주 묻는 질문 · 문의하기) — 스크롤 없이 보임. 버튼 → 독립된 안내 페이지 `/main/program/[id]/guide/{purpose,sessions,notices,rules,qna}` (페이지 사이 탭 없음 — 안내가 늘어도 `programGuide.ts` 한 줄 + 페이지 파일 하나만 추가). 회차별 내용: 시간은 위에 한 번, 회차마다 날짜·주제·강사 → 누르면 회차 화면(일정·내용·Q&A, 출결 없음) |
| ② | 홈 | 수강 중 카드 위에 빨간 **"프로그램 이수 규정·지침 — 반드시 지켜 주세요"** 버튼(수강 중 프로그램의 규정 화면, ← 홈). **이전 수강 이력은 맨 아래 작은 버튼** → `/main/history` 목록 화면 |
| ③ | 수강 중 | 순서 **수업 안내(규정·공지·Q&A·목적) → 회차별 수업 → 종합 리포트**. 회차는 **버튼 모양 한 줄에 3개**("N회차 · 날짜"), 출석/지각/결석은 눌러서 회차 화면에서만. 끝난 회차는 회색 + "✓ 완료", 다음 회차는 파란색 + "다음 수업", 남은 회차는 흰 바탕 — 별도 다음 수업 카드 없음. 요일·시간·기간은 헤더에 한 번. 회차 화면 탭은 아이콘 + 큰 글자 (2차 피드백 반영) |
| 데이터 | `Program` 에 `host`(주최·운영) · `purpose`(도입 취지) · `rules`(규정) · `faq`(프로그램 Q&A) 추가. 기본 규정(지각 2회 이상 수강 취소 · 80% 출석 수료 등)과 기본 Q&A(준비물 · 지각·결석 · 모임·픽업 · 간식·음료 · 점심)는 `data/programGuide.ts` — 지자체·프로그램마다 `rules`/`faq` 로 교체. 이전 이력 더미는 `data/dummyHistory.ts` |
| 모바일 구조 | 상세 화면을 숨은 탭에서 **탭 위 Stack** 으로 옮김(`app/main/_layout.tsx` = Stack, 탭은 `app/main/(tabs)/`). 숨은 탭은 안쪽 스택을 기억해서, 수강 중 → 홈 → 수강 예정 → "← 홈" 이 예전 프로그램 화면으로 가던 문제 수정. 주소(`/main`, `/main/profile` …)는 그대로. 상세 화면에서는 하단 탭바가 보이지 않음(웹은 계속 보임) |
| 남은 것 | ④ 리포트(항목별 점수·최종 점수·코멘트, Before/After 레벨 테스트 막대그래프) ⑤ 알림(푸시 + 문자) — 학교·방과후 업체가 학부모와 어떻게 소통하는지 확인 후 진행 |

E2E 55개 시나리오 통과 (`web/e2e`). 모바일은 `tsc`, iOS Metro 번들, react-native-web 렌더(가짜 Firebase)로 화면·뒤로가기 흐름 확인.

### 모바일 구조 (변경 후)

| 경로 | 내용 |
|---|---|
| `app/main/_layout.tsx` | **Stack** — 탭 위에 상세 화면(프로그램·안내·이력·FAQ)을 쌓음 |
| `app/main/(tabs)/_layout.tsx` | 하단 탭 홈 / 알림 / 내 정보 (탭 글자 14) |
| `app/main/(tabs)/index.tsx` | 홈 — 자녀 전환(`components/ChildSwitcher`), 규정·지침 버튼, 간소화 카드, 맨 아래 이전 수강 이력 버튼 |
| `app/main/history.tsx` | 이전 수강 이력 |
| `app/main/program/[programId]/index.tsx` | 수강 중: 수업 안내 → 회차 버튼 3열 → 종합 리포트 / 수강 예정: `components/program/UpcomingProgram` (예전 `sess-…` 주소는 회차 화면 내용 탭으로) |
| `app/main/program/[programId]/guide/{purpose,sessions,notices,rules,qna}.tsx` | 안내 페이지(각각 독립) — 공통 틀 `components/program/GuideScreen`(`openGuide()`로 열기), 버튼 묶음 `components/program/GuideMenu` |
| `app/main/program/[programId]/session/[sessionId].tsx` | 회차 화면 — 탭 패널은 `components/program/session/*` |
| `app/main/program/[programId]/{attendance,sessions}.tsx` | 예전 탭 → 회차 목록 리디렉션 (`[sessionId].tsx` 는 경로 충돌로 삭제) |
| `app/main/(tabs)/profile/{index,withdraw}.tsx` · `app/goodbye.tsx` | 내 정보 · 회원 탈퇴 · 탈퇴 완료 |
| `hooks/`, `lib/`, `data/programView.ts`, `data/programGuide.ts` | 자녀 조회·선택, 날짜·에러 메시지·연락처, 회차 화면 뷰 모델, 안내 항목·기본 규정·Q&A (웹과 같은 로직) |

## 다음 단계

1. Firebase 콘솔에서 웹 앱 등록 → `web/.env.local` / Vercel 환경변수 입력
2. Vercel 프로젝트 생성(Root = `web`) → 배포 도메인을 Firebase *승인된 도메인*에 추가
3. 실기기(iOS Safari, 카카오톡 인앱 브라우저, 안드로이드 크롬)에서 테스트 번호로 로그인 확인
4. 모바일: 위 변경 모두 반영 완료(2026-09-17). 실기기에서 확인 필요 — 새 네이티브 모듈은 추가하지 않아 **기존 dev client 로 `npx expo start` 만 하면 됨**. 회원 탈퇴(App Store 필수)는 모바일 내 정보 → 회원 탈퇴, Google Play 계정 삭제 URL 은 웹 `/main/profile/withdraw`
5. 실데이터 스키마 확정 후 `packages/shared` 로 타입·조회 로직 공유 (모바일·웹 동시 전환)
