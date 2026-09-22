# ThinkCampus 학부모 웹 (Next.js)

모바일 앱(`../app`, Expo)과 **같은 화면·같은 흐름·같은 Firebase 백엔드**를 쓰는 웹 버전.
Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Firebase JS SDK v12 · Vercel 배포.

```
web/
├── src/app/                  # 라우트 — 모바일 expo-router 경로를 1:1 로 미러링
│   ├── page.tsx              #   /            → 인증 상태 보고 /onboarding 또는 /main
│   ├── onboarding/           #   /onboarding (등록코드) → /verify → /otp,  /onboarding/login
│   ├── goodbye/              #   회원 탈퇴 완료 안내
│   └── main/                 #   /main (인증 가드 + 하단 탭바)
│       ├── page.tsx          #     홈
│       ├── notification/     #     알림
│       ├── profile/          #     내 정보 (보호자 초대 / 로그아웃) · withdraw/ 회원 탈퇴
│       ├── attendance/       #     출결·피드백
│       ├── report/           #     학습 리포트 (공유 / PDF)
│       ├── report_detail/[reportId]/
│       ├── faq/              #     FAQ + 챗봇
│       ├── history/          #     이전 수강 이력 (홈 맨 아래 버튼)
│       └── program/
│           ├── page.tsx                      # 프로그램 목록
│           ├── [programId]/page.tsx          # 수강 중 — 수업 안내 버튼 → 회차 버튼(한 줄에 3개, 출결은 눌러서) → 종합 리포트
│           │                                 #   (수강 예정이면 요약 + 안내 버튼 6개 — components/program/UpcomingProgram)
│           ├── [programId]/guide/{purpose,sessions,notices,rules,qna}/  # 안내 페이지 (각각 독립, 공통 틀은 components/program/GuidePage)
│           ├── [programId]/session/[sessionId]/  # 회차 화면 — 탭: 출결 · 일정 · 내용 · Q&A · 리포트(끝난 회차만), 이전/다음 회차 (수강 예정은 일정·내용·Q&A)
│           ├── [programId]/report/           # 종합 학습 리포트
│           ├── [programId]/{attendance,sessions}/  # (예전 탭 주소 → 회차 목록으로 리디렉션)
│           └── session/[sessionId]/          # (예전 회차 상세 → 회차 화면 "내용" 탭으로 리디렉션)
├── src/components/           # ChildSwitcher(자녀 전환) · program/(ProgramHeader · GuideMenu 안내 버튼 · GuidePage 안내 페이지 틀 · UpcomingProgram · session/ 회차 탭 패널) · ui/ (Spinner, Button, TextField, OtpInput, TabBar, Collapse, ProgressBar, BottomSheet …)
├── src/providers/            # AuthProvider(로그인 상태) · DialogProvider(Alert.alert 대체) · ToastProvider
├── src/hooks/                # useChildren(자녀 조회) · useSelectedChild(선택 자녀 기억) · useShare · useBack · useCountdown · usePageTitle
├── src/lib/                  # firebase(초기화 + 전화 OTP/reCAPTCHA) · dates · phone · errors · share · print · navHistory
├── src/data/                 # 더미 데이터(모바일 ../data 와 같은 내용) · programView(회차 목록·회차 화면용 조합 함수, 탭 정의, 공통 Q&A) · programGuide(안내 항목·기본 규정·기본 Q&A) · dummyHistory
├── docs/PORTING_GUIDE.md     # RN 화면 → Next.js 페이지 옮기는 규칙 (새 화면 추가할 때 참고)
└── e2e/                      # 에뮬레이터 대상 브라우저 E2E (59개 시나리오)
```

---

## 0. 지금은 체험 모드 (임시 공개 페이지)

- 주소를 열면 **등록코드·전화 인증 없이 바로 메인 화면**. 보이는 계정은 **010-7656-7933** (보호자 **신선웅** · 달성캠퍼스, 자녀 **신민준 · 신서연** — 운영 DB 연결 정보를 2026-09-17 에 옮겨 두고 이름만 체험용으로 바꾼 고정값, `src/lib/demo.ts`. 알림 문구의 학생 이름도 체험용으로 바뀜, 이름 수정은 막고 안내만)
- **Firebase 에 접속하지 않는다** — 로그인·자녀 조회는 고정값, **로그아웃 · 보호자 초대 · 회원 탈퇴는 막고 "체험용 화면이에요" 안내**만, 리포트 공유는 서버 호출 없이 미리보기 링크 복사. `/onboarding` 으로 들어와도 메인으로 보낸다
- 켜기/끄기: `NEXT_PUBLIC_DEMO_MODE` — 값이 없으면 **켜짐**(에뮬레이터 빌드는 꺼짐). **실제 서비스로 바꿀 때 Vercel 환경변수에 `NEXT_PUBLIC_DEMO_MODE=0` 을 넣고 다시 배포**
- 체험 모드만 따로 확인: `npm run build:demo && npm run start:demo` (포트 3200) → `npm run e2e:demo` (8개 시나리오)
- 홈의 "🗓 수강 예정 프로그램" 섹션은 잠시 숨김 (`data/programView.ts` 의 `SHOW_UPCOMING_ON_HOME`, 모바일도 같음). 화면은 `/main/program/prog-002` 로 열린다

## 1. 로컬 실행

```bash
cd web
npm install
cp env.example .env.local            # 값 채우기 (아래 2번)
npm run dev                          # http://localhost:3000
```

Node 20.9 이상 필요. 검사 한 번에: `npm run check` (타입체크 + 린트 + 프로덕션 빌드).

> ⚠️ 실제 Firebase 프로젝트에 붙이면 **실제 SMS 가 발송**된다. 개발 중에는 Firebase 콘솔의 *테스트용 전화번호*를 쓰거나, 에뮬레이터 모드(`npm run dev:emu`, 4번)를 쓴다.

## 2. 환경변수

Firebase 콘솔 → 프로젝트 설정 → 일반 → **내 앱 → 웹 앱(</>)** 의 `firebaseConfig` 값. 모두 공개값(브라우저에 노출되는 값)이라 비밀이 아니다. 보안은 Firestore 규칙 + Cloud Functions 검증이 담당한다.

| 변수 | 예 |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIza…` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `thinkcampus.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `thinkcampus` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `thinkcampus.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | 숫자 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:…:web:…` |
| `NEXT_PUBLIC_USE_EMULATORS` | `0` (로컬 에뮬레이터면 `1`) |
| `NEXT_PUBLIC_DEMO_MODE` | 비우면 체험 모드(0번). 실서비스는 `0` |

값이 비어 있으면 앱이 죽지 않고 "서비스 설정이 완료되지 않았습니다" 화면을 띄운다. (체험 모드에서는 Firebase 값이 없어도 동작)

## 3. Vercel 배포

1. Vercel → **Add New… → Project** → 이 Git 저장소 선택
2. **Root Directory = `web`** (가장 중요 — 저장소 루트는 Expo 앱)
3. Framework 는 Next.js 자동 인식. Build/Install 명령 기본값 그대로
4. **Environment Variables** 에 2번 표의 값 입력 (Production / Preview 모두). `NEXT_PUBLIC_USE_EMULATORS` 는 넣지 않거나 `0`
5. Deploy → 도메인 확인 (예: `thinkcampus-web.vercel.app`)
6. `vercel.json` 이 함수 리전을 서울(`icn1`)로 고정한다 — Cloud Functions(asia-northeast3)와 같은 지역

### Firebase 콘솔 체크리스트 (배포 전 1회)

- [ ] **웹 앱 등록**: 프로젝트 설정 → 일반 → 앱 추가 → 웹 → config 복사 (2번)
- [ ] **승인된 도메인**: Authentication → 설정 → 승인된 도메인 → Vercel 도메인 추가 (`*.vercel.app` 프리뷰 URL 은 와일드카드가 안 되므로 쓸 도메인을 각각 추가, 커스텀 도메인 연결 시 그것도 추가)
- [ ] **전화 로그인 사용 설정**: 이미 켜져 있음 (모바일과 공유)
- [ ] **테스트용 전화번호**: Authentication → 로그인 방법 → 전화 → 테스트 번호 (개발용, SMS 비용 없음)
- [ ] **API 키 제한(권장)**: Google Cloud 콘솔 → API 및 서비스 → 사용자 인증 정보 → *Browser key* → HTTP 리퍼러에 배포 도메인 + `localhost:3000` 등록
- [ ] Cloud Functions 는 `onCall` 이라 CORS 가 자동 허용 — 추가 설정 없음
- [ ] **회원 탈퇴 함수·규칙 배포**: 저장소 루트에서 `cd functions && npm run build && cd .. && firebase deploy --only functions:deleteAccount,firestore:rules` (배포 전에는 웹의 탈퇴 버튼이 "탈퇴하지 못했어요" 오류)
- [ ] **스토어 정책**: Google Play 의 "계정 삭제 URL" 에 `https://<배포 도메인>/main/profile/withdraw` 를 적을 수 있음 (로그인 후 바로 탈퇴 화면). App Store 용 앱 안 탈퇴는 모바일 내 정보 → 회원 탈퇴(`app/main/profile/withdraw.tsx`)로 제공

## 4. 에뮬레이터로 전체 흐름 테스트 (SMS 없이)

`e2e/README.md` 참고. 실제 Cloud Functions 코드를 로컬 에뮬레이터에서 돌리고, 헤드리스 브라우저로 **등록코드 → 생년월일 → OTP → 홈 → 프로그램/리포트/공유/인쇄 → 알림 → 내정보(보호자 초대) → 로그아웃 → 딥링크 가드 → 재로그인(바꾼 보호자 이름 유지) → 자녀 2명 전환 → 프로그램 화면(일시 및 장소 · 수업 안내 · 회차별 수업) · 회차 화면(출결·일정·내용·Q&A·리포트 탭, 이전/다음 회차) → 수강 예정 화면(같은 구성, 홈에서는 숨김) · 안내 페이지 → 홈 상단 경로·인사말(보호자 이름) 한 줄·이전 수강 이력 → 가입 때 보호자 이름 입력 · 내 정보 이름 수정 → 초대받은 보호자 로그인(이름 묻는 카드 [나중에]/저장) → 회원 탈퇴(서버 정리 확인·재로그인 시 자동 연결 안 됨)** 까지 59개 시나리오를 검증한다. 주요 화면에 이모지가 없는지도 검사한다.

---

## 5. 모바일과의 대응 / 차이

| 모바일 (RN) | 웹 |
|---|---|
| `@react-native-firebase/*` | `firebase` JS SDK (`src/lib/firebase.ts`) — API 모양이 같아 화면 로직은 그대로 |
| 네이티브 SMS OTP | **invisible reCAPTCHA** 가 붙은 Firebase Phone Auth (발송마다 새 reCAPTCHA 생성) |
| `Alert.alert(title, msg, buttons)` | `useDialog().alert(title, msg, buttons)` — 시그니처 동일 |
| `Share.share` | Web Share API → 안 되면 클립보드 복사 + 토스트 → 그것도 막히면 링크 표시 다이얼로그 (`useShare`) |
| `expo-print` / `expo-sharing` (PDF) | 브라우저 인쇄 다이얼로그 → "PDF로 저장" (`src/lib/print.ts`) |
| `router.back()` | `useBack(fallback)` — 링크로 바로 들어온 화면이면 fallback 경로로 |
| route params (`studentName`, `programTitle`) | 쿼리스트링 (`?studentName=…&programTitle=…`) |
| 온보딩 단계 간 `phone`, `customToken` params | `sessionStorage` (URL·방문기록에 전화번호/토큰이 남지 않게) |
| `RefreshControl` (당겨서 새로고침) | 없음 (브라우저 새로고침) |
| `LayoutAnimation` | CSS 트랜지션 (`Collapse`) |
| 회차 상세 `/main/program/[sessionId]` | 회차 화면 `/main/program/[programId]/session/[sessionId]?tab=content` (예전 웹 주소 `/main/program/session/[sessionId]` 는 리디렉션) |
| (없음) | `/main/**` 인증 가드 — 미로그인 딥링크는 로그인 후 원래 화면으로 복귀 (`?next=`) |
| (없음) | 데스크톱에서는 가운데 480px 폰 프레임, PWA manifest(홈 화면에 추가) |
| 홈 인사말에 자녀 이름을 ` · ` 로 나열, 첫 자녀 카드만 표시 | **자녀 2명 이상이면 홈 오른쪽 위 자녀 전환 버튼** → 선택 시트. 선택한 자녀의 인사말·프로그램 카드 표시, 기기별로 선택 기억 (`ChildSwitcher`, `useSelectedChild`) — **모바일도 반영** |
| 홈 수강 중 카드: 학생명·부제·칩·진도·다음 수업(날짜·시간·주제·장소)·CTA | **간소화**: 상태 · 프로그램명 · 요일/시간 · 진도 · 다음 수업 한 줄(2주 이내면 D-day) — **모바일도 반영** |
| 프로그램 상세: 파란 헤더 + 출결 / 수업 / 리포트 탭 3개 (회차 목록 중복) | **회차 목록만 있는 단순한 화면**: 진행 한 줄(진행 3/6 · 출석/지각/결석) → 회차 카드(날짜 · 주제 · 출결 배지, 다음 수업은 파란 테두리 + D-day). 회차를 누르면 **회차 화면**: 헤더(회차 · 주제 · 상태 · 날짜) 아래 고정 탭 **출결 / 일정 / 내용 / Q&A / 리포트**(리포트는 끝난 회차만). 선택한 탭은 `?tab=` 로 유지, 아래 버튼·좌우 스와이프로 이전/다음 회차(보던 탭 유지). Q&A 는 회차별 질문 + 공통 질문 아코디언과 챗봇(`/main/faq?tab=chatbot`) 버튼 하나(전화번호는 챗봇이 해결하지 못할 때만 안내). 종합 리포트는 모든 회차가 끝나면 목록 아래에서 열림 — **모바일도 반영** |
| 글자 크기 9~26px 혼용 | **학부모용 글자 크기**: 최소 14px · 본문 16px 이상 · 제목 18~24px, 옅은 회색/하늘색 글자는 한 단계 진하게, 한글은 어절 단위 줄바꿈(`word-break: keep-all`). E2E 가 모든 화면에서 14px 미만 글자를 검사 — **모바일도 반영** |
| 홈: 수강 중 · 수강 이력 | **수강 예정** 섹션 추가 — 카드(개강일·D-day·요일/시간·총 회차) → `/main/program/prog-002` (더미 `data/dummyUpcomingProgram.ts`). **지금은 홈에서 숨김**(`SHOW_UPCOMING_ON_HOME = false`) — **모바일도 반영** |
| (회의 반영 ①) 수강 예정: 한 화면에 모든 내용 | **첫 화면은 요약 + 안내 버튼**: 수강 예정·첫 수업 D-day / 기간 / 일시(휴강) / 장소, 그 아래 버튼 6개 — 프로그램 목적 · 회차별 내용 · 공지사항 · 수업 규정·지침 · 자주 묻는 질문 · 문의하기 (스크롤 없이 한 화면). 버튼 → 독립된 안내 페이지 `/main/program/[id]/guide/{purpose,sessions,notices,rules,qna}` (페이지 사이 탭 없음 — 새 안내는 `programGuide.ts` 한 줄 + 페이지 파일 하나). 회차별 내용 → 회차를 누르면 회차 화면(일정·내용·Q&A, 출결 탭 없음). 규정·Q&A 는 기본 예시(`data/programGuide.ts`)를 두고 프로그램마다 `program.rules` / `program.faq` 로 교체 — **모바일도 반영** |
| (회의 반영 ②) 홈: 수강 중 · 예정 · 이전 이력 목록 | **이전 수강 이력은 맨 아래 작은 버튼** → `/main/history`. (규정·지침 버튼은 ④에서 홈에서 빼고 수업 안내 안의 "필독"으로 옮김) — **모바일도 반영** |
| (회의 반영 ③) 수강 중: 회차 카드 세로 목록 | 순서 **수업 안내(규정·공지·Q&A·목적) → 회차별 수업 → 종합 리포트**. 회차는 **버튼 모양(테두리·그림자) 한 줄에 3개** — "N회차 · 날짜"만, 출석/지각/결석은 눌러서 회차 화면에서 확인. 끝난 회차는 회색 바탕 + "✓ 완료", 다음 회차는 파란색 + "다음 수업", 남은 회차는 흰 바탕(별도 다음 수업 카드 없음). 운영 요일·시간·기간은 헤더에 한 번만. (④에서 더 단순하게 바뀜) — **모바일도 반영** |
| (회의 반영 ④) 파란 단색 · 이모지 · 부제가 많은 화면 | **프리미엄 개편**. 처음엔 잉크(차콜) + 딥 골드로 갔다가, 시안 5개 중 대표가 고른 **⑤ 미드나잇**으로 확정. 토큰은 웹 `globals.css` `@theme` / 모바일 `lib/theme.ts` 에 같은 값. 이모지·⚠️ 제거(탭 바는 선 아이콘). **홈**: 인사말 한 줄 "환영합니다, OO 학부모님" + 연결된 자녀 안내, 규정 버튼 없음. **프로그램 화면**: 헤더(학생·프로그램명) → **[프로그램 일시 및 장소]** 버튼 하나(`guide/schedule`) → **수업 안내**(골드 선 제목) 한 줄에 하나·제목만: 프로그램 목적 및 내용 · 공지사항 · 수업 규정·지침 **필독** · 자주 묻는 질문 (⑥에서 순서 바뀜) → **회차별 수업** "총 6회 · 진행 3회", 버튼에는 **N회차만**(끝난 회차 회색 ✓ · 다음 수업 잉크 · 남은 회차 흰색), 390×844 첫 화면에 6개 모두 → 종합 리포트(6회 끝나면 열림). 수강 예정도 같은 구성(진행·리포트 없음). `guide/sessions`(회차별 내용) 삭제. 회차 화면 탭은 글자만 + 골드 밑줄 (뒤로 버튼은 ⑥에서 상단 경로로 바뀜). Q&A·자주 묻는 질문은 **챗봇 버튼만**(전화는 챗봇이 못 풀 때 "상담 전화 …" 로 안내) — **모바일도 반영** |
| (회의 반영 ⑤) 시안 5개(보르도 · 에디토리얼 · 소프트 미니멀 · 포레스트 · 미드나잇) 중 선택 | **미드나잇 — 완전 다크 바탕(`#0c0e13`) + 골드(`#d4b06a`) 가는 선**. 바탕 → 카드(`#161a22`) → 카드 안 면(`#1e232d`) 순으로 조금씩 밝아지고, 카드는 그림자 대신 1px 선(`#262b36`). 헤더는 바탕과 같은 색(색 헤더 없음). 골드 = 주요 버튼(잉크 글자) · 다음 수업 · 활성 탭·선 · 필독/수강 중 배지; 빨강(`#f27d78`) = 결석·필수·탈퇴, 주황(`#f2a65a`) = 지각. 글자 `#f2f2f0`/보조 `#9aa0ab`/가장 옅은 `#7c8390`(14px 에서 4.5:1 이상). `color-scheme: dark`, 포커스 링 골드, 입력은 포커스 시 골드 테두리. 시안 캔버스: claude.ai 아티팩트 "씽크캠퍼스 디자인 시안" — **모바일도 반영**(상태바 밝게, 네비게이션 다크 테마, `app.json` `userInterfaceStyle: dark`) |
| (회의 반영 ⑥) 버튼을 눌러 들어가다 보면 지금 어디인지 헷갈림 · "← 회차 목록/← 프로그램/← 홈" 뒤로 버튼이 화면마다 다름 | **상단 경로(Breadcrumbs)** 로 통일 — 예: `홈 › 토요 창의융합 › 3회차`, `홈 › 이전 수강 이력 › 여름학기`, 회차 Q&A 에서 챗봇으로 가면 `홈 › 토요 창의융합 › 4회차 › 고객 지원`, `내 정보 › 회원 탈퇴`. 지금 화면은 골드·굵게(누를 수 없음), 앞 단계는 누르면 그 화면으로(높이 44px · 15px). 웹은 방문 기록에 그 화면이 있으면 그만큼 **뒤로**(기록이 쌓이지 않음, 새로고침 후에도 — `lib/navHistory.ts` 가 칸마다 순번을 붙이고 sessionStorage 에 표를 둔다), 없으면(주소로 바로 연 경우) 이동. 모바일은 `router.dismissTo`(쌓인 화면 중 그 화면까지 닫고, 없으면 지금 화면을 바꿈). 화면 구조는 `lib/crumbs.ts` 한곳에서. **[수업 규정·지침 · 필독]** 을 헤더 바로 아래 골드 테두리 카드로 올리고, 수업 안내 4줄은 **프로그램 일시 및 장소 → 목적 및 내용 → 공지사항 → 자주 묻는 질문**. 일시 및 장소 페이지는 **회차별 날짜를 빼고** 일시(요일·시간·기간·휴강·대상) + **장소 · 오시는 길**(지도에서 길찾기 — 네이버 지도, 주차 · 도착하면 · 데려갈 때; `program.directions` / `program.mapQuery`, 지금은 예시 문구) — **모바일도 반영** |
| (회의 반영 ⑦) 홈만 상단 경로가 없어 다른 화면과 따로 놂 · 인사말 "환영합니다, 김민준 학부모님" 에 자녀 이름 | **홈 맨 위에도 상단 경로 한 줄(🏠 홈 — 지금 화면, 골드)**, 자녀 2명 이상이면 같은 줄 오른쪽에 자녀 전환(예전 THINKCAMPUS 글자 줄 자리). **인사말은 보호자(학부모) 이름** — "환영합니다, 신선웅 학부모님"(자녀 이름은 전환 버튼·카드에 이미 있음). 이름은 **가입 화면(자녀 정보 확인)에 [보호자 이름] 칸**(관계 아래·전화번호 위, 2자 이상·숫자/기호 불가)으로 받아 OTP 로그인 직후 **계정 표시 이름(Firebase Auth displayName)** 에 저장 — 서버 함수 변경·배포 없음. 이름이 없는 계정(예전 가입 · 초대받아 로그인한 보호자)은 "환영합니다, 학부모님" + 홈에서 **이름 묻는 카드 한 번**([나중에] = 이 기기에서 다시 묻지 않음 / [저장] = 인사말 바로 바뀜). **내 정보**에 이름 표시 + [이름 수정] 시트. 규칙은 `lib/guardianName.ts`(웹·모바일 같은 내용), 웹은 `AuthProvider` 의 `guardianName`·`saveGuardianName`, 모바일은 `hooks/useGuardianName` — **모바일도 반영** |
| 홈 "학습 리포트 미리보기"(샘플) 카드 | **제거** — 종합 리포트는 프로그램 회차 목록(모든 회차 종료 후)에서만 진입 — **모바일도 반영** |
| 내 정보: 로그아웃만 | **회원 탈퇴** (`/main/profile/withdraw`): 무엇이 사라지는지 안내(연결 자녀 이름·전화번호) → 확인 체크 → 한 번 더 확인 → Cloud Function `deleteAccount` → `/goodbye` — **모바일도 반영** |
| 서버 연결 실패 시 SDK 영문 메시지 | "서버에 연결할 수 없습니다" 안내 (에뮬레이터 모드에서는 실행 명령까지 표시), 메시지 끝의 HTTP 상태 `[401]` 제거 |

### 웹에서 먼저 고친 것 (모바일에도 반영 완료)

1. **초대받은 보호자 로그인 불가** — 내 정보 → 보호자 초대 후, 초대받은 번호로 *전화번호로 로그인* 하면 `linkGuardianByPhone` 이 호출되지 않아 "등록된 자녀가 없습니다" 로 로그아웃됐다 (초대 안내 문구는 "로그인하면 자동으로 연결"). 웹 `onboarding/login` · 모바일 `app/onboarding/login.tsx` 모두 enrollment 가 없으면 `linkGuardianByPhone` 을 먼저 호출한다.
2. **홈 이전 수강 카드 타입 오류** — `past` 카드에 `totalHours`, `nextSession*`, `fixedDay`, `frequency` 가 빠져 있었음 (strict 타입체크 실패).
3. **더미 수업 날짜의 요일 불일치** — 회차 날짜가 모두 `(토)` 로 적혀 있지만 2026년 달력에서는 전부 **일요일**이었다(2025년 기준 토요일). 웹 사본(`src/data/*`, 알림 문구)은 하루씩 당겨 실제 토요일로 보정했고, 이후 **6회차로 축소**: 09.05 · 09.19 · 10.03 · 10.17 · 10.31 · 11.14 (기간 2026.09.05–2026.11.14, 총 18차시, 회차별 Q&A `qna` 필드 추가, 출결은 3회 완료 + 3회 예정, 리포트 6개 과목). 모바일 `data/*`, `app/main/notification.tsx` 도 같은 내용으로 맞춤.

### 백엔드 참고

- `linkGuardianByPhone` 은 enrollment 의 `campusId` 를 학생 문서에서 읽는데, 시드의 학생 문서에는 `campusId` 가 없어 `'unknown'` 으로 들어간다 → 초대받은 보호자 화면에서 캠퍼스 이름이 `unknown` 으로 보일 수 있음.
- 더미 리포트 id(`report-2026-001`)는 `guardianUids` 가 비어 있어 `createShareToken` 이 권한 오류 → 화면은 원본과 동일하게 임시 URL 로 대체한다.

### web/ 밖에서 바꾼 것 (이번 작업)

| 파일 | 변경 | 이유 |
|---|---|---|
| `functions/src/index.ts` | `admin.firestore.FieldValue/Timestamp` → `import { FieldValue, Timestamp } from 'firebase-admin/firestore'` | Functions 에뮬레이터에서 네임스페이스 접근이 `undefined` 가 되어 `previewCode` 등이 INTERNAL 500. 모듈형 import 는 운영 환경에서도 동일하게 동작(공식 권장 방식). **배포 전 `npm run build` 로 확인** |
| `functions/src/index.ts` | **`deleteAccount` 추가** (회원 탈퇴). 로그인한 본인만 호출, `{ confirm: true }` 필수. 내 enrollment 삭제 · 학생 `guardianUids`/초대 번호(`allowedGuardianPhoneHashes`·관계)에서 제거 · 리포트 `guardianUids` 에서 제거 · 내가 만든 공유 토큰 삭제 · 등록코드의 `usedByUid` 제거(코드는 '사용됨' 유지) → 마지막에 Auth 계정 삭제. 학생·출결·리포트 원본은 캠퍼스 자료라 유지. `accountDeletions` 에 시각·학생 id·남은 보호자 수만 기록(개인정보 없음). 모든 단계가 멱등이라 실패 시 재시도 가능 | 회원 탈퇴 기능, 스토어 계정 삭제 정책 |
| `firestore.rules` | `accountDeletions` 클라이언트 접근 차단 블록 추가 | 탈퇴 기록은 Functions 만 기록 |
| `scripts/seed.ts` | `FIRESTORE_EMULATOR_HOST` 가 있으면 서비스 계정 없이 에뮬레이터에 시드 | E2E |
| `.gitignore` | 서비스 계정 키(`scripts/*firebase-adminsdk*.json` 등), `web/.next*`, 에뮬레이터 로그 제외 | `scripts/` 의 Admin 키 파일이 무시되지 않아 `git add .` 시 커밋될 상태였음 |
| `tsconfig.json` | `exclude: ["node_modules", "web"]` | Expo 타입체크가 web/ 을 읽지 않도록 |
| `metro.config.js` (신규) | Expo 기본 설정 + `web/` 차단 | Metro 가 web/node_modules·.next 를 감시하지 않도록 |

## 6. 앞으로

- **실데이터 전환**: `src/data/*` 와 `../data/*` 는 같은 파일의 사본(모바일 `programView.ts` 만 import 경로가 상대경로). 스키마가 확정되면 Firestore 조회로 바꾸면서 모바일/웹이 함께 쓰는 `packages/shared`(타입·조회 함수·포맷 유틸)로 옮기는 것을 권장.
- **새 화면 추가**: 모바일에서 만든 뒤 `docs/PORTING_GUIDE.md` 규칙대로 옮기고, `e2e/flow.e2e.mjs` 에 시나리오 추가.
- **리포트 공유 페이지**: 현재는 Cloud Function `viewReport` 가 HTML 을 서빙. 카카오톡 미리보기(OG 태그)·인쇄 품질을 높이려면 웹의 서버 렌더링 라우트(`/r/[token]`)로 옮기는 것을 검토.
