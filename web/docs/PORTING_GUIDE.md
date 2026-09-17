# RN(Expo) 화면 → Next.js 페이지 포팅 가이드

모바일 앱(`../app/**`)의 화면을 웹(`src/app/**`)으로 옮길 때의 규칙. **UI/문구/동작을 1:1 로 재현**하는 것이 목표다.

## 0. 파일 규칙

- 모든 페이지 파일은 첫 줄에 `"use client";`
- 파일 상단 주석(한국어 설명)은 원본을 그대로 옮기고 `(모바일 app/main/xxx.tsx)` 를 덧붙인다.
- 한국어 문구, 이모지, 더미 데이터, 컴포넌트 분리(서브 컴포넌트) 구조는 원본 그대로.
- 원본의 `styles.xxx` 이름을 Tailwind 클래스로 치환한다. 값(px, hex)을 바꾸지 않는다.
- `tsc --noEmit` 와 `eslint` 를 통과해야 한다. `any` 금지 → `unknown` + `errMessage(e)`.
- 페이지 함수 첫 줄에서 `usePageTitle("알림")` 처럼 브라우저 탭 제목을 지정한다.

## 1. 라우트 매핑

| 모바일 (expo-router) | 웹 (Next.js App Router) |
|---|---|
| `app/main/index.tsx` | `src/app/main/page.tsx` |
| `app/main/notification.tsx` | `src/app/main/notification/page.tsx` |
| `app/main/profile.tsx` | `src/app/main/profile/page.tsx` (+ 웹 전용 `profile/withdraw` 회원 탈퇴, `/goodbye` 완료 안내) |
| `app/main/attendance.tsx` | `src/app/main/attendance/page.tsx` |
| `app/main/report.tsx` | `src/app/main/report/page.tsx` |
| `app/main/faq/index.tsx` | `src/app/main/faq/page.tsx` |
| `app/main/report_detail/[reportId].tsx` | `src/app/main/report_detail/[reportId]/page.tsx` |
| `app/main/program/index.tsx` | `src/app/main/program/page.tsx` |
| `app/main/program/[programId]/attendance.tsx` · `sessions.tsx` | `src/app/main/program/[programId]/page.tsx` ← **웹은 회차 목록 한 화면으로 통합** (예전 경로는 리디렉션만) |
| (없음) | `src/app/main/program/[programId]/session/[sessionId]/page.tsx` ← **회차 화면** (탭: 출결 · 일정 · 내용 · Q&A · 리포트, 패널은 `components/program/session/`) |
| `app/main/program/[programId]/report.tsx` | `src/app/main/program/[programId]/report/page.tsx` (종합 리포트 — 모든 회차가 끝나면 회차 목록 아래에서 진입, 홈 샘플 카드) |
| `app/main/program/[sessionId].tsx` | 회차 화면의 **내용** 탭(`components/program/session/ContentPanel`) ← 웹 예전 주소 `src/app/main/program/session/[sessionId]` 는 리디렉션만 |

레이아웃 `main/layout.tsx`(인증가드 + 하단탭바)는 이미 있다. 프로그램 화면의 파란 헤더는 `components/program/ProgramHeader` 를 페이지에서 직접 쓴다. 홈 자녀 전환, 프로그램 회차 목록·회차 화면, 회원 탈퇴는 웹에서 먼저 만든 뒤 모바일에 같은 구조로 옮겼다(웹 → 모바일 방향) — README 5장 참고.

## 2. 네비게이션 / 파라미터

```ts
import { useRouter, useParams, useSearchParams } from "next/navigation";
const router = useRouter();
router.push("/main/faq");                       // router.push('/main/faq')
router.replace("/main");                        // router.replace('/main')
router.back();                                  // router.back()  ※ 화면의 "← 이전" 버튼은 useBack(fallback) 사용
const { programId } = useParams<{ programId: string }>();          // useLocalSearchParams 의 동적 세그먼트
const sp = useSearchParams(); const studentName = sp.get("studentName") ?? "";  // 그 외 params
```

- 모바일에서 `params: { studentName, programTitle }` 로 넘기던 값은 **쿼리스트링**으로 넘긴다:
  `router.push(`/main/program/${id}?${new URLSearchParams({ studentName, programTitle })}`)`
- 회차 화면으로: `router.push(`/main/program/${programId}/session/${session.id}?${qs}`)` — 특정 탭은 `&tab=attendance|schedule|content|qna|report` (탭 전환·회차 이동은 `router.replace`)
- 종합 리포트: `/main/program/${programId}/report?${qs}` (홈의 샘플 리포트 카드는 웹에서 제거)
- 로그아웃은 `signOut()`, 회원 탈퇴 직후는 `signOut("withdrawn")` — `/main` 인증 가드가 각각 `/onboarding`, `/goodbye` 로 보낸다

## 3. 컴포넌트 치환표

| RN | 웹 |
|---|---|
| `<View>` | `<div>` (row 는 `flex items-center`, column 은 `flex flex-col`) |
| `<Text>` | 블록이면 `<p>`, 한 줄 안의 조각이면 `<span>`, 제목은 `<h1>/<h2>` |
| `<ScrollView style contentContainerStyle>` | 페이지 루트 `<div className="flex flex-1 flex-col bg-[#f8fafc] pb-8">` — 문서 스크롤 사용. 내부 스크롤 만들지 않음 |
| `<RefreshControl>` | 제거 (웹은 당겨서 새로고침 없음). `onRefresh` 함수도 제거 |
| `<TouchableOpacity onPress>` / `<Pressable>` | `<button type="button" className="tap ...">` — 내용이 좌측 정렬이면 `text-left` 추가 |
| `<TextInput>` | `<input>` 또는 `@/components/ui/TextField` (`onChangeText` → `onChange={(e)=>...e.target.value}`) |
| `<ActivityIndicator color size>` | `<Spinner color size />` (`@/components/ui/Spinner`) |
| `<Modal>` (하단 시트) | `<BottomSheet open onClose title>` (`@/components/ui/BottomSheet`) |
| `<FlatList data renderItem>` | `data.map(...)` |
| `KeyboardAvoidingView`, `SafeAreaProvider`, `useSafeAreaInsets` | 제거 |
| `LayoutAnimation.configureNext(...)` | 제거. 아코디언 펼침은 `<Collapse open={...}>` (`@/components/ui/Collapse`) |
| `numberOfLines={1}` / `{2}` | `truncate` / `line-clamp-2` |
| `Dimensions` | 제거 (CSS `%`, `w-full`) |
| 진도 바 (`progressBg` + `progressFill`) | `<ProgressBar value={0~1} />` (`@/components/ui/ProgressBar`) 또는 원본 그대로 div 두 개 |

## 4. 네이티브 API 치환표

```ts
import { useDialog } from "@/providers/DialogProvider";   // Alert.alert → dialog.alert(title, message?, buttons?)  (시그니처 동일, onPress 동작)
import { useToast } from "@/providers/ToastProvider";     // 짧은 피드백: toast.show("링크가 복사되었습니다")
import { useShare } from "@/hooks/useShare";             // Share.share({title,message,url}) → const share = useShare(); await share({...})  (클립보드 폴백·토스트·차단 시 링크 다이얼로그까지 처리)
import { copyToClipboard } from "@/lib/share";            // Clipboard.setString
import { printHtml } from "@/lib/print";                  // expo-print → await printHtml(buildPdfHtml(report))  (인쇄 다이얼로그에서 "PDF로 저장")
import { useAuth } from "@/providers/AuthProvider";       // onAuthStateChanged → const { user } = useAuth();  로그아웃은 const { signOut } = useAuth() (이동은 가드가 처리)
import { useBack } from "@/hooks/useBack";               // router.back() → const goBack = useBack("/main"); (링크로 바로 들어온 경우 fallback 경로로)
import { useChildren } from "@/hooks/useChildren";         // enrollments→students/campuses 조회 (홈: activeOnly:true, 내정보: 기본)
import { getDb, getFns, getFirebaseAuth } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";        // httpsCallable(getFns(), "createShareToken")
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore"; // RNFB 와 동일 API. 단 snap.exists → snap.exists()
import { errCode, errMessage } from "@/lib/errors";        // e.code / e.message 대신 (e 는 unknown)
import { e164ToLocal, formatPhone } from "@/lib/phone";
```

- `Linking.openURL(url)` → `window.open(url, "_blank", "noopener,noreferrer")`
- `tel:` 링크 → `window.location.href = "tel:01067117933"`
- `Clipboard.setString(x)` → `await copyToClipboard(x); toast.show("복사되었습니다")`
- `Share.share` 의 `'User did not share'` 분기 → `useShare` 가 취소를 조용히 처리하므로 제거
- expo-print 의 "앱 업데이트 후 이용 가능" 안내 분기는 웹에서 필요 없음 (항상 인쇄 가능). 버튼 문구는 원본 유지("PDF 저장·공유", "인쇄").
- `Platform.OS !== 'web'` 조건으로 숨긴 UI 는 웹이므로 **숨긴다**(렌더하지 않음). 단 인쇄 버튼은 웹에서 동작하므로 원본 의도를 살려 **보여준다**.

## 5. 스타일 치환

- 색: 모바일이 Tailwind 팔레트 hex 를 그대로 썼으므로 클래스로 치환한다.
  `#111827` gray-900 · `#374151` gray-700 · `#6b7280` gray-500 · `#9ca3af` gray-400 · `#d1d5db` gray-300 · `#e5e7eb` gray-200 · `#f3f4f6` gray-100 · `#f9fafb` gray-50 · `#f8fafc` slate-50 (`bg-[#f8fafc]` 로 써도 됨) ·
  `#1d4ed8` **brand** (`bg-brand`, `text-brand`, `border-brand`) · `#1e3a8a` blue-900 · `#3b82f6` blue-500 · `#60a5fa` blue-400 · `#93c5fd` blue-300 · `#bfdbfe` blue-200 · `#dbeafe` blue-100 · `#eff6ff` blue-50 (= `brand-light`) ·
  `#16a34a` green-600 · `#22c55e` green-500 · `#4ade80` green-400 · `#bbf7d0` green-200 · `#f0fdf4` green-50 ·
  `#dc2626` red-600 · `#d97706` amber-600 · `#fffbeb` amber-50 · `#7c3aed` violet-600 · `#f5f3ff` violet-50 · `#059669` emerald-600 · `#ecfdf5` emerald-50 · `#0369a1` sky-700 · `rgba(255,255,255,0.2)` → `bg-white/20`
  그 외 hex 는 `bg-[#hex]` / `text-[#hex]`. 데이터로 결정되는 색(getStatusColor 등)은 `style={{ color }}` 인라인.
- **글자 크기 (학부모용, 필수)**: 모바일 값을 그대로 쓰지 않고 한 단계 키운다. **14px 미만 금지** (E2E 가 검사).
  | 모바일 fontSize | 9–12 | 13 | 14 | 15 | 16 | 17 | 18 | 19–20 | 22 | 24 | 26 |
  |---|---|---|---|---|---|---|---|---|---|---|---|
  | 웹 | 14 | 15 | 16 | 16 | 17 | 18 | 20 | 22 | 24 | 26 | 28 |
  글자가 커져서 고정 크기 상자(원형 배지·아바타 등)에서 넘치면 상자를 키운다. 흰 배경 위 `text-gray-400`·`text-blue-400` 은 쓰지 않는다(각각 gray-500·blue-600 이상), 파란 배경 위 보조 글자는 `text-blue-100`.
- 글자: `fontSize: 14` → 위 표의 값으로 `text-[16px]`, `fontWeight: '600'` → `font-semibold` (500 medium / 700 bold / 800 extrabold), `lineHeight: 22` → `leading-[22px]`, `letterSpacing: 0.5` → `tracking-[0.5px]`, `textTransform: 'uppercase'` → `uppercase`, `textAlign: 'center'` → `text-center`.
- 간격: px 그대로. `padding: 16` → `p-4`, `paddingHorizontal: 20` → `px-5`, `marginBottom: 12` → `mb-3`, 4 의 배수가 아니면 `p-[14px]`, `gap: 6` → `gap-[6px]`.
- 모서리/테두리: `borderRadius: 14` → `rounded-[14px]`, `borderWidth: 1, borderColor: '#e5e7eb'` → `border border-gray-200`, `borderStyle: 'dashed'` → `border-dashed`.
- 그림자: `shadowColor '#1d4ed8', opacity 0.08, radius 8, offset 2` → `shadow-[0_2px_8px_rgba(29,78,216,0.08)]`.
- 헤더 상단 여백: `paddingTop: insets.top + 12` → `style={{ paddingTop: "calc(var(--sat) + 12px)" }}`; 흰 헤더의 `paddingTop: 60` → `calc(var(--sat) + 20px)`; 파란 홈 헤더의 `paddingTop: 60` → `calc(var(--sat) + 28px)`.
- 하단 여백: `insets.bottom + N` → `N` 만 (탭바가 safe-area 를 처리).
- `position: 'absolute'` 점(미읽음 등) → 부모 `relative`, 자식 `absolute top-4 right-4`.
- 가로 스크롤 탭(자녀 전환 등) → `flex overflow-x-auto no-scrollbar`.
- 눌림 효과: `activeOpacity` 는 `tap` 클래스가 대신한다.

## 6. 인쇄용 HTML (`buildPdfHtml`)

원본 함수는 그대로 복사한다(문자열 템플릿). 리포트 화면 자체에도 `@media print` 대비로 상단 네비/버튼 영역에 `no-print` 클래스를 붙인다.

## 7. 완료 조건

1. `npx tsc --noEmit` 통과
2. `npx eslint src/app/<대상 파일들>` 통과
3. 원본과 문구·섹션 순서·조건부 렌더링이 동일
