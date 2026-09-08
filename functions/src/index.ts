/**
 * Cloud Functions – 씽크캠퍼스 스파이크
 * 리전: asia-northeast3 (서울)
 *
 * 함수 목록:
 *   previewCode  – 코드 유효성 1차 확인 + 마스킹 학생명 반환
 *   redeemCode   – 생년월일·전화번호 검증 후 계정 연결 or 신규 생성
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

admin.initializeApp();
const db = admin.firestore();

// ────────────────────────────────────────────
// 환경변수
// ────────────────────────────────────────────
const HASH_SALT = process.env.HASH_SALT ?? '';
if (!HASH_SALT) {
  console.warn('⚠️  HASH_SALT 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.');
}

// ────────────────────────────────────────────
// 유틸
// ────────────────────────────────────────────
function sha256(value: string): string {
  return crypto.createHash('sha256').update(value + HASH_SALT).digest('hex');
}

/** 한국 전화번호 → E.164 (+821012345678) */
function toE164Korea(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('82')) return '+' + digits;
  if (digits.startsWith('0')) return '+82' + digits.slice(1);
  return '+82' + digits;
}

/** 학생 이름 마스킹: "김철수" → "김○○" */
function maskName(name: string): string {
  if (name.length <= 1) return name;
  return name[0] + '○'.repeat(name.length - 1);
}

/** IP 단위 rate limit 카운터 키 */
function rateLimitKey(ip: string, fn: string): string {
  const minute = Math.floor(Date.now() / 60000);
  return `ratelimit/${fn}/${ip}/${minute}`;
}

/** 1분 10회 IP rate limit 체크 (Firestore 카운터 기반) */
async function checkRateLimit(ip: string, fnName: string): Promise<void> {
  const key = rateLimitKey(ip, fnName);
  const ref = db.collection('_ratelimit').doc(key);

  const count = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current: number = snap.exists ? (snap.data()?.count ?? 0) : 0;
    tx.set(ref, { count: current + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return current + 1;
  });

  if (count > 10) {
    throw new HttpsError('resource-exhausted', '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
  }
}

// ────────────────────────────────────────────
// previewCode
// ────────────────────────────────────────────
interface PreviewCodeRequest {
  code: string;
}

interface PreviewCodeResponse {
  campusName: string;
  maskedStudentName: string;
}

export const previewCode = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<PreviewCodeRequest>): Promise<PreviewCodeResponse> => {
    const { code } = req.data;

    if (!code || typeof code !== 'string') {
      throw new HttpsError('invalid-argument', '코드가 필요합니다.');
    }

    // IP rate limit (1분 10회)
    const ip = req.rawRequest.ip ?? 'unknown';
    await checkRateLimit(ip, 'previewCode');

    // 코드 문서 조회
    const codeSnap = await db.collection('enrollmentCodes').doc(code).get();

    if (!codeSnap.exists) {
      throw new HttpsError('not-found', '존재하지 않는 등록코드입니다.');
    }

    const codeData = codeSnap.data()!;

    // 만료 확인
    if (codeData.expiresAt && codeData.expiresAt.toDate() < new Date()) {
      throw new HttpsError('deadline-exceeded', '만료된 등록코드입니다.');
    }

    // 잠금 확인
    if (codeData.lockedUntil && codeData.lockedUntil.toDate() > new Date()) {
      const remaining = Math.ceil(
        (codeData.lockedUntil.toDate().getTime() - Date.now()) / 1000,
      );
      throw new HttpsError(
        'resource-exhausted',
        `시도 횟수 초과로 ${remaining}초 동안 잠겨 있습니다.`,
      );
    }

    // 사용 여부 확인 (used=true면 previewCode 단계에서도 차단)
    if (codeData.used) {
      throw new HttpsError('already-exists', '이미 사용된 등록코드입니다.');
    }

    // 캠퍼스 조회
    const campusSnap = await db.collection('campuses').doc(codeData.campusId).get();
    const campusName: string = campusSnap.exists
      ? (campusSnap.data()?.name ?? '알 수 없는 캠퍼스')
      : '알 수 없는 캠퍼스';

    // 학생 이름 조회 후 마스킹 (전체 이름을 클라이언트에 노출하지 않음)
    const studentSnap = await db.collection('students').doc(codeData.studentId).get();
    const studentName: string = studentSnap.exists
      ? (studentSnap.data()?.name ?? '알 수 없음')
      : '알 수 없음';

    return {
      campusName,
      maskedStudentName: maskName(studentName),
    };
  },
);

// ────────────────────────────────────────────
// redeemCode
// ────────────────────────────────────────────
interface RedeemCodeRequest {
  code: string;
  birthDate: string; // YYYYMMDD
  phone: string;     // 01012345678 (정규화 전)
}

interface RedeemCodeResponse {
  customToken?: string;
  existingUser?: boolean;
}

export const redeemCode = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<RedeemCodeRequest>): Promise<RedeemCodeResponse> => {
    const { code, birthDate, phone } = req.data;

    // 입력 검증
    if (!code || !birthDate || !phone) {
      throw new HttpsError('invalid-argument', '코드, 생년월일, 전화번호가 모두 필요합니다.');
    }
    if (!/^\d{8}$/.test(birthDate)) {
      throw new HttpsError('invalid-argument', '생년월일은 8자리 숫자여야 합니다.');
    }

    const normalizedPhone = toE164Korea(phone);
    const birthDateHash = sha256(birthDate);
    const guardianPhoneHash = sha256(normalizedPhone);

    const codeRef = db.collection('enrollmentCodes').doc(code);

    // ── 트랜잭션 ──────────────────────────────
    const result = await db.runTransaction(async (tx) => {
      const codeSnap = await tx.get(codeRef);

      // 1. 존재 여부
      if (!codeSnap.exists) {
        throw new HttpsError('not-found', '존재하지 않는 등록코드입니다.');
      }

      const d = codeSnap.data()!;

      // 2. 만료
      if (d.expiresAt && d.expiresAt.toDate() < new Date()) {
        throw new HttpsError('deadline-exceeded', '만료된 등록코드입니다.');
      }

      // 3. 잠금
      if (d.lockedUntil && d.lockedUntil.toDate() > new Date()) {
        const remaining = Math.ceil(
          (d.lockedUntil.toDate().getTime() - Date.now()) / 1000,
        );
        throw new HttpsError(
          'resource-exhausted',
          `시도 횟수 초과. ${remaining}초 후 다시 시도해주세요.`,
        );
      }

      // 4. 사용 여부
      if (d.used) {
        throw new HttpsError('already-exists', '이미 사용된 등록코드입니다.');
      }

      // 5. 생년월일 해시 검증
      if (d.birthDateHash !== birthDateHash) {
        // 실패 카운트 증가
        const newCount = (d.attemptCount ?? 0) + 1;
        const update: Record<string, unknown> = { attemptCount: newCount };
        if (newCount >= 5) {
          update.lockedUntil = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 10 * 60 * 1000),
          );
        }
        tx.update(codeRef, update);
        throw new HttpsError(
          'unauthenticated',
          `생년월일이 일치하지 않습니다. (시도 ${newCount}/5)`,
        );
      }

      // 6. 보호자 전화번호 해시 검증
      if (d.guardianPhoneHash !== guardianPhoneHash) {
        const newCount = (d.attemptCount ?? 0) + 1;
        const update: Record<string, unknown> = { attemptCount: newCount };
        if (newCount >= 5) {
          update.lockedUntil = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 10 * 60 * 1000),
          );
        }
        tx.update(codeRef, update);
        throw new HttpsError(
          'unauthenticated',
          `전화번호가 일치하지 않습니다. (시도 ${newCount}/5)`,
        );
      }

      // 검증 통과 – 코드 소진 처리
      tx.update(codeRef, {
        used: true,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
        attemptCount: admin.firestore.FieldValue.increment(1),
      });

      return { studentId: d.studentId, campusId: d.campusId };
    });

    // ── 트랜잭션 완료 후 계정 처리 ────────────
    const { studentId, campusId } = result;

    // 전화번호로 기존 계정 조회
    let existingUid: string | null = null;
    try {
      const existingUser = await admin.auth().getUserByPhoneNumber(normalizedPhone);
      existingUid = existingUser.uid;
    } catch (e: any) {
      if (e.code !== 'auth/user-not-found') throw e;
    }

    // 학생-보호자 guardianUids 갱신 및 enrollment 생성을 묶어서 처리
    const enrollmentRef = db.collection('enrollments').doc();
    const studentRef = db.collection('students').doc(studentId);
    const batch = db.batch();

    if (existingUid) {
      // 기존 계정: 코드에 uid 기록 + enrollment + guardianUids 갱신
      batch.update(codeRef, { usedByUid: existingUid });
      batch.set(enrollmentRef, {
        studentId,
        campusId,
        guardianUid: existingUid,
        gradeAtEnrollment: 'unknown',
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      batch.update(studentRef, {
        guardianUids: admin.firestore.FieldValue.arrayUnion(existingUid),
      });
      await batch.commit();
      return { existingUser: true };
    } else {
      // 신규 계정: uid 생성 후 customToken 발급
      const newUser = await admin.auth().createUser({ phoneNumber: normalizedPhone });
      const uid = newUser.uid;
      const customToken = await admin.auth().createCustomToken(uid);

      batch.update(codeRef, { usedByUid: uid });
      batch.set(enrollmentRef, {
        studentId,
        campusId,
        guardianUid: uid,
        gradeAtEnrollment: 'unknown',
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      batch.update(studentRef, {
        guardianUids: admin.firestore.FieldValue.arrayUnion(uid),
      });
      await batch.commit();
      return { customToken };
    }
  },
);
