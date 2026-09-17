# 씽크캠퍼스 인증 스파이크

React Native + Expo 기반 인증 검증용 스파이크 앱.
**Expo Go 사용 불가** — `expo-dev-client` 기반 Development Build 전용.

---

## 0. 디렉토리 구조

```
thinkcampus/
├── app/
│   ├── _layout.tsx              # 루트 레이아웃
│   ├── index.tsx                # 로그인 여부 확인 → /onboarding 또는 /main
│   ├── goodbye.tsx              # 회원 탈퇴 완료 안내
│   ├── onboarding/              # 등록코드 → 생년월일·관계·전화번호 → OTP, 전화번호 로그인
│   └── main/                    # Stack: 하단 탭 위에 상세 화면을 쌓는다 (뒤로가기가 항상 들어온 순서대로)
│       ├── (tabs)/              # 하단 탭: 홈 / 알림 / 내 정보
│       │   ├── index.tsx        # 홈 (규정·지침 버튼 · 수강 중 · 수강 예정 · FAQ · 맨 아래 이전 수강 이력 버튼)
│       │   ├── notification.tsx
│       │   └── profile/         # 내 정보 · withdraw(회원 탈퇴)
│       ├── history.tsx          # 이전 수강 이력
│       ├── faq/                 # FAQ + 챗봇 (tab=chatbot 으로 챗봇부터)
│       └── program/
│           ├── index.tsx                        # 프로그램 전체 회차 일정
│           └── [programId]/
│               ├── index.tsx                    # 수강 중: 수업 안내 버튼 → 회차 버튼(한 줄에 3개, 출결은 눌러서) → 종합 리포트
│               │                                #   (수강 예정이면 요약 + 안내 버튼 6개 — components/program/UpcomingProgram)
│               ├── guide/{purpose,sessions,notices,rules,qna}.tsx  # 안내 페이지 (각각 독립, 공통 틀은 components/program/GuideScreen)
│               ├── session/[sessionId].tsx      # 회차 화면: 출결 · 일정 · 내용 · Q&A · 리포트 (수강 예정은 일정·내용·Q&A)
│               └── report.tsx                   # 종합 리포트 (모든 회차가 끝난 뒤)
├── components/              # ChildSwitcher · program/(헤더 · GuideMenu 안내 버튼 · GuideScreen 안내 페이지 틀 · UpcomingProgram · 회차 탭 패널) · ui/(BottomSheet · ProgressBar)
├── hooks/                   # useAuthUser · useChildren · useSelectedChild
├── lib/                     # dates · errors · contact
├── data/                    # 더미 데이터(웹 web/src/data 와 같은 내용) · programView · programGuide(안내 항목·기본 규정·기본 Q&A)
├── web/                     # Next.js 웹 버전 (web/README.md)
├── firebase.ts              # @react-native-firebase 인스턴스 export
├── functions/               # Cloud Functions (TypeScript) — deleteAccount(회원 탈퇴) 포함
├── scripts/                 # 시드 스크립트
├── firestore.rules          # Firestore 보안 규칙
├── app.json                 # Expo config (config plugin 포함)
├── eas.json                 # EAS Build 설정
└── firebase.json            # Firebase 프로젝트 설정
```

화면 기준(학부모용): 글자 최소 14 · 본문 16 이상 · 제목 18~24.

---

## 1. Firebase 콘솔 사전 설정

### 1-1. 프로젝트 확인

Firebase 콘솔 → 프로젝트 **thinkcampus** 접속
(이미 생성되어 있음: `projectId: thinkcampus`)

### 1-2. Android 앱 등록 및 SHA 지문 등록

Phone Auth는 SHA-1 / SHA-256 지문이 등록된 앱만 동작함.

```bash
# 디버그 키스토어 SHA-1 확인 (로컬 테스트용)
keytool -list -v \
  -keystore ~/.android/debug.keystore \
  -alias androiddebugkey \
  -storepass android \
  -keypass android

# EAS Development Build용 SHA-1 확인
eas credentials --platform android
```

Firebase 콘솔 → 프로젝트 설정 → 일반 → Android 앱 → `com.thinkcampus.spike`
→ **SHA 인증서 지문 추가** → 위에서 확인한 SHA-1 + SHA-256 모두 등록

### 1-3. google-services.json 다운로드

Firebase 콘솔 → 프로젝트 설정 → 일반 → Android 앱 → `google-services.json` 다운로드
→ **프로젝트 루트** (`/thinkcampus/google-services.json`) 에 저장

> ⚠️ `.gitignore`에 등록되어 있으므로 커밋되지 않음(공개 레포). 팀원과 별도 채널로 공유.
>
> **EAS Build** 는 git 에 없는 파일을 올리지 않으므로, 두 설정 파일을 EAS 파일 환경변수로 한 번 등록한다.
> `app.config.js` 가 빌드 때 이 경로를 사용한다.
>
> ```bash
> eas env:set --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret \
>   --environment development --environment preview --environment production
> eas env:set --name GOOGLE_SERVICE_INFO_PLIST --type file --value ./GoogleService-Info.plist --visibility secret \
>   --environment development --environment preview --environment production
> ```

### 1-4. (iOS) GoogleService-Info.plist 다운로드

Firebase 콘솔 → 프로젝트 설정 → 일반 → iOS 앱 추가 (`com.thinkcampus.spike`)
→ `GoogleService-Info.plist` 다운로드 → **프로젝트 루트**에 저장

### 1-5. Authentication → 전화번호 로그인 활성화

Firebase 콘솔 → Authentication → Sign-in method → 전화 → **사용 설정**

### 1-6. Firestore 데이터베이스 생성

Firebase 콘솔 → Firestore Database → 데이터베이스 만들기
→ 위치: `asia-northeast3 (Seoul)` → **프로덕션 모드**로 시작
(보안 규칙은 이후 배포 단계에서 적용됨)

---

## 2. 로컬 실행 순서

### 2-1. 의존성 설치

```bash
# 앱 의존성
npm install

# Functions 의존성
cd functions && npm install && cd ..

# 시드 스크립트 의존성
cd scripts && npm install && cd ..
```

### 2-2. 환경변수 설정

```bash
# Functions용 salt
cp functions/.env.example functions/.env
# functions/.env 열어서 HASH_SALT 값 입력 (32자 이상 랜덤 문자열)
# openssl rand -hex 32

# 시드 스크립트용 (동일한 HASH_SALT 사용)
cp scripts/.env.example scripts/.env
# scripts/.env 열어서 HASH_SALT 를 functions/.env 와 동일하게 입력
```

### 2-3. Firebase 에뮬레이터 (선택, 로컬 테스트)

```bash
# Functions 빌드 후 에뮬레이터 시작
cd functions && npm run build && cd ..
firebase emulators:start
# 에뮬레이터 UI: http://localhost:4000
```

### 2-4. Cloud Functions 배포 (실 기기 테스트 시 필요)

```bash
cd functions && npm run deploy
```

### 2-5. Firestore 보안 규칙 배포

```bash
firebase deploy --only firestore:rules
```

---

## 3. Dev Build 만드는 명령어

### 3-1. EAS CLI 설치 및 로그인

```bash
npm install -g eas-cli
eas login
```

### 3-2. Android Dev Build (APK) — 먼저 실행

```bash
eas build --platform android --profile development
```

- `developmentClient: true` 설정으로 `expo-dev-client`가 포함된 APK 생성
- 빌드 완료 후 EAS 대시보드에서 APK 다운로드 → 기기에 설치

### 3-3. iOS Dev Build (선택)

```bash
eas build --platform ios --profile development
```

- Apple Developer Program 계정 필요
- `simulator: false` 설정이므로 실기기용 빌드

### 3-4. Dev Build 실행 후 앱 시작

```bash
# Dev Build APK 설치 후
npx expo start --dev-client
```

앱에서 표시되는 QR 코드 스캔 또는 URL 입력으로 번들 로드.

---

## 4. 시드 스크립트 실행

```bash
# Firebase 서비스 계정 키 배치 (최초 1회)
# Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성
# → scripts/service-account.json 으로 저장

# 시드 실행
cd scripts && npm run seed

# 기존 데이터 삭제 후 재삽입
cd scripts && npm run seed:clean
```

### 생성되는 데이터

| 코드 | 학생 | 생년월일 | 보호자 전화 | 상태 |
|------|------|----------|------------|------|
| `DS26-A3F7K` | 김민준 | 20100315 | 01011112222 | ✅ 정상 |
| `DS26-B8M2Q` | 이서연 | 20110720 | 01033334444 | 🚫 사용됨 |
| `DS26-C4N9P` | 박지호 | 20090502 | 01055556666 | ⏰ 만료 |

---

## 5. 테스트 시나리오 및 기대 결과

### Scenario 1 — 정상 등록 (코드 DS26-A3F7K)

| 단계 | 입력 | 기대 결과 |
|------|------|----------|
| previewCode | `DS26-A3F7K` | `campusName: "달성캠퍼스"`, `maskedStudentName: "김○○"` |
| redeemCode | 생년월일: `20100315`, 전화: `01011112222` | `customToken` 수신 (신규) 또는 `existingUser: true` |

### Scenario 2 — 이미 사용된 코드 (DS26-B8M2Q)

| 단계 | 기대 결과 |
|------|----------|
| previewCode | `already-exists: 이미 사용된 등록코드입니다.` |

### Scenario 3 — 만료된 코드 (DS26-C4N9P)

| 단계 | 기대 결과 |
|------|----------|
| previewCode | `deadline-exceeded: 만료된 등록코드입니다.` |

### Scenario 4 — 생년월일 불일치

| 단계 | 입력 | 기대 결과 |
|------|------|----------|
| redeemCode | 생년월일: `19990101` (틀린 값) | `unauthenticated: 생년월일이 일치하지 않습니다. (시도 1/5)` |
| 5회 반복 후 | — | `lockedUntil` 이 10분 뒤로 설정됨 |

### Scenario 5 — 전화번호 불일치

| 단계 | 입력 | 기대 결과 |
|------|------|----------|
| redeemCode | 전화: `01099999999` (틀린 값) | `unauthenticated: 전화번호가 일치하지 않습니다. (시도 N/5)` |

### Scenario 6 — Firebase Phone Auth SMS 수신 검증 (Tab B)

| 단계 | 확인 항목 |
|------|----------|
| 전화번호 입력 → 인증번호 받기 | 발송 요청 시각 기록됨 |
| SMS 수신 | 수신 시각에서 발송 시각 빼면 체감 대기시간 계산 |
| 6자리 입력 → 확인 | `uid` 와 `phoneNumber (E.164)` 표시 |
| 에러 케이스 | 잘못된 번호: `auth/invalid-phone-number` / 요청 초과: `auth/too-many-requests` |

### Scenario 7 — 잘못된 코드 형식

| 입력 | 기대 결과 |
|------|----------|
| `AAAA` (4자리) | "코드는 9자리여야 합니다" (클라이언트 검증) |
| `XXXXXXXX1` (존재 안 함) | `not-found: 존재하지 않는 등록코드입니다.` |

---

## 6. 주요 설계 결정 사항

### 왜 @react-native-firebase/auth 인가?

- Firebase JS SDK의 `signInWithPhoneNumber`는 웹 환경을 전제하므로 reCAPTCHA를 요구함
- `expo-firebase-recaptcha`는 공식 deprecated 상태
- `@react-native-firebase/auth`는 네이티브 SMS OTP를 직접 처리하므로 reCAPTCHA 불필요

### 왜 Expo Go 사용 불가인가?

- `@react-native-firebase`는 네이티브 코드(Java/Kotlin, Obj-C/Swift)를 포함함
- Expo Go는 네이티브 커스텀 코드를 지원하지 않으므로 `expo-dev-client` 기반 Development Build 필요

### 보안: 왜 클라이언트에서 enrollmentCodes를 직접 읽지 않는가?

- Firestore 보안 규칙으로 `enrollmentCodes` 컬렉션 클라이언트 접근 완전 차단
- 코드 검증 로직(해시 비교, 잠금 등)은 모두 Cloud Functions에서 실행
- 전체 학생 이름은 서버에서 마스킹 후 반환

### HASH_SALT

- `functions/.env` 와 `scripts/.env` 에 동일한 `HASH_SALT` 값 사용
- EAS Build 시 `functions/.env`는 배포 환경에 적용됨
- salt를 변경하면 기존 시드 데이터의 해시가 무효화되므로 재시드 필요
