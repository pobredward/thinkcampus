# E2E — 에뮬레이터 + 헤드리스 브라우저

실제 SMS·실데이터 없이, **실제 Cloud Functions 코드**(`../functions`)를 Firebase 에뮬레이터에서 돌리고 웹 앱 전체 흐름을 검증한다.

## 준비 (최초 1회)

```bash
npm i -g firebase-tools                      # Java 11+ 필요 (Firestore 에뮬레이터)
cd functions && npm install && npm run build && cd ..
cd scripts   && npm install && cd ..
cd web       && npm install && npx playwright install chromium && cd ..
```

`functions/.env` 와 `scripts/.env` 에 같은 `HASH_SALT` 가 들어 있어야 한다 (루트 README 2-2).

## 실행 (터미널 3개)

```bash
# ① 저장소 루트 — 에뮬레이터 (demo- 로 시작하는 프로젝트 id 는 실제 프로젝트에 절대 접속하지 않음)
firebase emulators:start --only auth,firestore,functions --project demo-thinkcampus

# ② 저장소 루트 — 시드 (등록코드 DS26-A3F7K 등). 다시 돌릴 때마다 --clean
cd scripts && FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-thinkcampus npx ts-node seed.ts --clean
curl -X DELETE "http://127.0.0.1:9099/emulator/v1/projects/demo-thinkcampus/accounts"   # Auth 사용자 초기화

# ③ web — 에뮬레이터용 빌드(.next-emu) + 서버(3100) 후 테스트
cd web && npm run build:emu && npm run start:emu
cd web && npm run e2e           # 창을 보면서: E2E_HEADED=1 npm run e2e
```

결과: 콘솔에 `50/50 passed`, 스크린샷은 `e2e/shots/`, 상세는 `e2e/results.json`.
등록코드 `DS26-A3F7K` 는 한 번 쓰면 "사용됨"이 되므로 다시 돌릴 때는 ②를 반복한다.

수동으로 확인하고 싶으면 ③ 대신 `npm run dev:emu` → http://127.0.0.1:3100 . OTP 는 에뮬레이터 UI(http://127.0.0.1:4000/auth) 또는
`curl http://127.0.0.1:9099/emulator/v1/projects/demo-thinkcampus/verificationCodes` 에서 확인.

## 검증 시나리오 (50)

온보딩: 루트 리다이렉트 · 코드 자동 포맷 · 없는/사용된/만료 코드 안내 · 정상 코드 미리보기(캠퍼스·마스킹 이름) · 생년월일 불일치(시도 횟수) · 생년월일 포맷 · redeemCode → OTP(전화번호 URL 비노출) · OTP → 커스텀토큰 로그인 → 홈

메인: 자녀 1명일 때 전환 버튼 숨김 · 간소화된 홈 카드(3/6회) → 회차 목록 · 진행 3/6 · 회차 6개 출결 배지 · 4회차 다음 수업 강조 · 종합 리포트는 종료 후 · 3회차(지각) 출결 탭(입실·늦은 시간, 탭 5개) · 일정 탭(`?tab=schedule`) · 내용 탭 · Q&A 펼치기·전화 링크 · 리포트 탭(선생님 한마디·참여·평가) · 새로고침 후 탭 유지 · 다음 회차(예정) → 리포트 탭 없음·일정 탭부터·출결 "수업 전" · 이전/다음 회차 이동 시 탭 유지 → ← 회차 목록 한 번에 복귀 · Q&A → 챗봇 탭 → ← 회차로 → ← 회차 목록 → ← 홈 · 홈에 샘플 리포트 카드 없음 · 종합 리포트(주소로 열기) 공유(클립보드·토스트) · 기록 없는 ← 뒤로 → 회차 목록 · 예전 주소 리디렉션(/attendance, /main/program/session/sess-02 → 내용 탭·수업 자료) · 알림 모두 읽음 · 내 정보 · 보호자 초대(addGuardianPhone) · FAQ/리포트/출결/리포트 상세/프로그램 목록 렌더 · 챗봇 응답 · 딥링크(회차 화면) 새로고침 시 세션 유지 + ← 회차 목록 폴백 · 인쇄 호출

인증: 로그아웃 → 온보딩 · 미로그인 딥링크 → 로그인(?next) · 로그인 후 원래 화면 복귀 · 기존 계정에 두 번째 자녀 연결(DS26-ABC12) → 홈 자녀 전환 버튼·시트·새로고침 후 유지 · 전환한 자녀의 출결이 회차 목록·회차 화면에 반영(2회차 결석 → 리포트 탭에 평가 없음) · 잘못된 OTP · 미등록 번호 안내 · **초대받은 보호자 로그인 → 자동 연결** · **회원 탈퇴**(안내에 자녀·번호, 확인 체크 전 버튼 비활성, 취소/탈퇴 → /goodbye) · 탈퇴 후 서버 정리(Auth 계정·enrollment 삭제, 학생 보호자/초대 목록에서 제거, 원래 보호자 유지, 탈퇴 기록에 개인정보 없음 — 에뮬레이터 REST 로 확인) · 같은 번호로 재로그인해도 자동 연결 안 됨 · 로그인 상태로 /goodbye → 홈 · 데스크톱 480px 프레임

공통: **모든 스크린샷 시점에 화면에 보이는 글자를 전부 검사해 14px 미만이 하나라도 있으면 실패** (마지막 시나리오 "모든 화면 글자 크기 14px 이상").

탈퇴 확인에 쓰는 에뮬레이터 관리자 조회(`Authorization: Bearer owner`)는 에뮬레이터에서만 동작한다.

콘솔에 보이는 `404/409/504/401/400` 은 일부러 넣은 오류 케이스의 응답이고, `501 recaptchaConfig` 는 에뮬레이터가 reCAPTCHA Enterprise 설정 API 를 구현하지 않아서 나오는 것(무해)이다.
