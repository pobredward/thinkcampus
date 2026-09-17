/**
 * Firebase JS SDK (웹) — 모바일 앱의 @react-native-firebase 와 같은 프로젝트를 바라본다.
 *
 * - 설정값은 NEXT_PUBLIC_FIREBASE_* 환경변수 (.env.local / Vercel 환경변수)
 * - 브라우저에서 처음 사용될 때 lazy 초기화 (SSR/프리렌더 단계에서는 초기화하지 않음)
 * - 전화 OTP 는 웹에서 reCAPTCHA 가 필수 → invisible reCAPTCHA 를 자동으로 붙여준다
 * - NEXT_PUBLIC_USE_EMULATORS=1 이면 로컬 Firebase 에뮬레이터에 연결
 */

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  initializeAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber as fbSignInWithPhoneNumber,
  type Auth,
  type ConfirmationResult,
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";

// Cloud Functions 리전 — functions/src/index.ts 와 동일
export const FUNCTIONS_REGION = "asia-northeast3";

const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_EMULATORS === "1";

function readConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "thinkcampus",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? undefined,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? undefined,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };
}

/** 환경변수가 채워졌는지 (배포 전 점검용) */
export function isFirebaseConfigured(): boolean {
  const c = readConfig();
  return Boolean(c.apiKey && c.authDomain && c.appId) || USE_EMULATORS;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let fns: Functions | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  const existing = getApps();
  app = existing.length > 0 ? existing[0] : initializeApp(readConfig());
  return app;
}

export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  const a = getFirebaseApp();
  try {
    // 명시적으로 로컬(IndexedDB) 영속성 — 새로고침해도 로그인 유지
    auth = initializeAuth(a, { persistence: browserLocalPersistence });
  } catch {
    auth = getAuth(a);
  }
  if (USE_EMULATORS) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    // 에뮬레이터에서는 reCAPTCHA 없이 테스트 번호로 OTP 진행
    auth.settings.appVerificationDisabledForTesting = true;
  }
  return auth;
}

export function getDb(): Firestore {
  if (db) return db;
  db = getFirestore(getFirebaseApp());
  if (USE_EMULATORS) connectFirestoreEmulator(db, "127.0.0.1", 8080);
  return db;
}

export function getFns(): Functions {
  if (fns) return fns;
  fns = getFunctions(getFirebaseApp(), FUNCTIONS_REGION);
  if (USE_EMULATORS) connectFunctionsEmulator(fns, "127.0.0.1", 5001);
  return fns;
}

// ── 전화 OTP (invisible reCAPTCHA) ────────────────────────

const RECAPTCHA_CONTAINER_ID = "tc-recaptcha-container";
let verifier: RecaptchaVerifier | null = null;

/**
 * 발송할 때마다 새 invisible reCAPTCHA 를 만든다.
 * 같은 verifier 를 재사용하면 두 번째 발송(재발송·번호 변경)에서 토큰이 오지 않아
 * 요청이 조용히 멈추는 문제가 있어서(E2E 로 확인), 매번 기존 위젯을 지우고 새 요소에 렌더한다.
 */
function freshRecaptchaVerifier(): RecaptchaVerifier {
  resetRecaptcha();
  const el = document.createElement("div");
  el.id = RECAPTCHA_CONTAINER_ID;
  document.body.appendChild(el);
  verifier = new RecaptchaVerifier(getFirebaseAuth(), el, { size: "invisible" });
  return verifier;
}

function resetRecaptcha() {
  try {
    verifier?.clear();
  } catch {
    /* noop */
  }
  verifier = null;
  document.getElementById(RECAPTCHA_CONTAINER_ID)?.remove();
}

/**
 * 전화번호(E.164)로 SMS 인증번호 발송.
 * 반환값의 confirm(code) 로 로그인 완료 — 모바일(RNFB)과 동일한 사용법.
 */
export async function signInWithPhone(e164: string): Promise<ConfirmationResult> {
  const a = getFirebaseAuth();
  try {
    return await fbSignInWithPhoneNumber(a, e164, freshRecaptchaVerifier());
  } catch (e) {
    resetRecaptcha();
    throw e;
  }
}

export type { ConfirmationResult, User } from "firebase/auth";
