/**
 * Cloud Functions – 씽크캠퍼스 스파이크
 * 리전: asia-northeast3 (서울)
 *
 * 함수 목록:
 *   previewCode  – 코드 유효성 1차 확인 + 마스킹 학생명 반환
 *   redeemCode   – 생년월일·전화번호 검증 후 계정 연결 or 신규 생성
 *   addGuardianPhone / linkGuardianByPhone – 보호자 초대 / 초대받은 번호 자동 연결
 *   deleteAccount – 회원 탈퇴 (내 연결 정보 정리 + Auth 계정 삭제)
 *   createShareToken / viewReport – 리포트 공유 링크
 *   listPendingHouseholdMembers / linkHouseholdMember – 형제 가구 연동
 */

import { onCall, onRequest, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
// admin.firestore.FieldValue 네임스페이스 접근은 Functions 에뮬레이터에서 undefined 가 되는 경우가 있어 모듈형 import 사용
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { sha256, toE164Korea } from './lib/crypto';
import { findPendingHouseholdMembers } from './householdLink';
import { COL_GUARDIAN_LINKS } from './lib/collections';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ────────────────────────────────────────────
// 환경변수
// ────────────────────────────────────────────
if (!process.env.HASH_SALT) {
  console.warn('⚠️  HASH_SALT 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.');
}

/** 학생 이름 마스킹: "김철수" → "김○○" */
function maskName(name: string): string {
  if (name.length <= 1) return name;
  return name[0] + '○'.repeat(name.length - 1);
}

/** IP 단위 rate limit 카운터 키 — Firestore doc ID에 / 불가이므로 _ 로 치환 */
function rateLimitKey(ip: string, fn: string): string {
  const minute = Math.floor(Date.now() / 60000);
  const safeIp = ip.replace(/[/.]/g, '_');
  return `${fn}_${safeIp}_${minute}`;
}

/** 1분 10회 IP rate limit 체크 (Firestore 카운터 기반) */
async function checkRateLimit(ip: string, fnName: string): Promise<void> {
  const key = rateLimitKey(ip, fnName);
  const ref = db.collection('_ratelimit').doc(key);

  const count = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current: number = snap.exists ? (snap.data()?.count ?? 0) : 0;
    tx.set(ref, { count: current + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
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
  birthDate: string;  // YYYYMMDD
  phone: string;      // 01012345678 — 보호자 본인 번호 (엄마/아빠/할머니 누구든 가능)
  relation: string;   // 모(엄마) / 부(아빠) / 조모 등 — 관리자 확인용
}

interface RedeemCodeResponse {
  customToken?: string;
  existingUser?: boolean;
  pendingHousehold?: Array<{ studentId: string; maskedName: string }>;
}

export const redeemCode = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<RedeemCodeRequest>): Promise<RedeemCodeResponse> => {
    const { code, birthDate, phone, relation } = req.data;

    // 입력 검증
    if (!code || !birthDate || !phone) {
      throw new HttpsError('invalid-argument', '코드, 생년월일, 전화번호가 모두 필요합니다.');
    }
    if (!relation || !relation.trim()) {
      throw new HttpsError('invalid-argument', '관계를 입력해주세요 (예: 모, 부, 조모).');
    }
    if (!/^\d{8}$/.test(birthDate)) {
      throw new HttpsError('invalid-argument', '생년월일은 8자리 숫자여야 합니다.');
    }

    const normalizedPhone = toE164Korea(phone);
    const birthDateHash = sha256(birthDate);

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

      // 4. 사용 여부 — 같은 코드로 여러 보호자가 등록할 수 없도록 첫 등록 후 소진
      if (d.used) {
        throw new HttpsError('already-exists', '이미 사용된 등록코드입니다.\n다른 보호자 추가는 기존 보호자가 앱에서 초대해주세요.');
      }

      // 5. 생년월일 해시 검증 (전화번호는 검증 안 함 — 보호자가 누구든 생년월일만 맞으면 등록 가능)
      if (d.birthDateHash !== birthDateHash) {
        const newCount = (d.attemptCount ?? 0) + 1;
        const update: Record<string, unknown> = { attemptCount: newCount };
        if (newCount >= 5) {
          update.lockedUntil = Timestamp.fromDate(
            new Date(Date.now() + 10 * 60 * 1000),
          );
        }
        tx.update(codeRef, update);
        throw new HttpsError(
          'unauthenticated',
          `생년월일이 일치하지 않습니다. (시도 ${newCount}/5)`,
        );
      }

      // 검증 통과 – 코드 소진 처리
      tx.update(codeRef, {
        used: true,
        usedAt: FieldValue.serverTimestamp(),
        attemptCount: FieldValue.increment(1),
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
    const enrollmentRef = db.collection(COL_GUARDIAN_LINKS).doc();
    const studentRef = db.collection('students').doc(studentId);
    const batch = db.batch();

    if (existingUid) {
      // 기존 계정: 코드에 uid 기록 + enrollment + guardianUids 갱신
      batch.update(codeRef, { usedByUid: existingUid });
      batch.set(enrollmentRef, {
        studentId,
        campusId,
        guardianUid: existingUid,
        guardianRelation: relation.trim(),   // 관계 저장 (관리자 확인용)
        gradeAtEnrollment: 'unknown',
        status: 'active',
        createdAt: FieldValue.serverTimestamp(),
      });
      batch.update(studentRef, {
        guardianUids: FieldValue.arrayUnion(existingUid),
      });
      await batch.commit();
      const pendingHousehold = await findPendingHouseholdMembers(existingUid);
      return { existingUser: true, pendingHousehold };
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
        guardianRelation: relation.trim(),   // 관계 저장 (관리자 확인용)
        gradeAtEnrollment: 'unknown',
        status: 'active',
        createdAt: FieldValue.serverTimestamp(),
      });
      batch.update(studentRef, {
        guardianUids: FieldValue.arrayUnion(uid),
      });
      await batch.commit();
      const pendingHousehold = await findPendingHouseholdMembers(uid);
      return { customToken, pendingHousehold };
    }
  },
);

// ────────────────────────────────────────────
// addGuardianPhone
// 기존 보호자가 다른 보호자(아빠/할머니 등)의 번호를 허용 목록에 추가
// → 추가된 번호로 OTP 인증 시 해당 학생에 자동 연결됨
// ────────────────────────────────────────────
interface AddGuardianPhoneRequest {
  studentId: string;
  phone: string;    // 추가할 보호자 번호 (01012345678)
  relation: string; // 관계 (부, 조모 등) — 관리자 확인용
}

export const addGuardianPhone = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<AddGuardianPhoneRequest>): Promise<{ success: boolean }> => {
    const uid = req.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const { studentId, phone, relation } = req.data;
    if (!studentId || !phone) {
      throw new HttpsError('invalid-argument', 'studentId와 phone이 필요합니다.');
    }
    if (!relation || !relation.trim()) {
      throw new HttpsError('invalid-argument', '관계를 입력해주세요 (예: 부, 조모).');
    }

    const normalizedPhone = toE164Korea(phone);
    const phoneHash = sha256(normalizedPhone);

    // 요청자가 해당 학생의 기존 보호자인지 확인
    const studentRef = db.collection('students').doc(studentId);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) {
      throw new HttpsError('not-found', '학생을 찾을 수 없습니다.');
    }

    const guardianUids: string[] = studentSnap.data()?.guardianUids ?? [];
    if (!guardianUids.includes(uid)) {
      throw new HttpsError('permission-denied', '해당 학생의 보호자만 다른 보호자를 추가할 수 있습니다.');
    }

    // allowedGuardianPhoneHashes 배열에 추가 (중복 방지)
    // allowedGuardianPhoneRelations 맵에 해시:관계 저장 → 관리자가 누구인지 확인 가능
    await studentRef.update({
      allowedGuardianPhoneHashes: FieldValue.arrayUnion(phoneHash),
      [`allowedGuardianPhoneRelations.${phoneHash}`]: relation.trim(),
    });

    return { success: true };
  },
);

// ────────────────────────────────────────────
// linkGuardianByPhone
// OTP 인증 완료 후, allowedGuardianPhoneHashes에 내 번호가 있는 학생에 자동 연결
// 앱에서 OTP 인증 성공 직후 호출
// ────────────────────────────────────────────
export const linkGuardianByPhone = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<Record<string, never>>): Promise<{ linked: string[] }> => {
    const uid = req.auth?.uid;
    const phoneNumber = req.auth?.token?.phone_number as string | undefined;

    if (!uid || !phoneNumber) {
      throw new HttpsError('unauthenticated', '전화번호 인증이 필요합니다.');
    }

    const phoneHash = sha256(phoneNumber);

    // allowedGuardianPhoneHashes에 내 번호 해시가 포함된 학생 검색
    const studentsSnap = await db.collection('students')
      .where('allowedGuardianPhoneHashes', 'array-contains', phoneHash)
      .get();

    if (studentsSnap.empty) {
      return { linked: [] };
    }

    const batch = db.batch();
    const linkedStudentIds: string[] = [];

    for (const studentDoc of studentsSnap.docs) {
      const studentId = studentDoc.id;
      const campusData = studentDoc.data();

      // 이미 이 uid로 연결된 enrollment가 있으면 스킵
      const existing = await db.collection(COL_GUARDIAN_LINKS)
        .where('guardianUid', '==', uid)
        .where('studentId', '==', studentId)
        .limit(1)
        .get();
      if (!existing.empty) continue;

      // 저장된 관계 조회 (addGuardianPhone 시 저장한 값)
      const relations: Record<string, string> = studentDoc.data()?.allowedGuardianPhoneRelations ?? {};
      const guardianRelation = relations[phoneHash] ?? '초대됨';

      // enrollment 생성
      const enrollmentRef = db.collection(COL_GUARDIAN_LINKS).doc();
      batch.set(enrollmentRef, {
        studentId,
        campusId: campusData.campusId ?? 'unknown',
        guardianUid: uid,
        guardianRelation,   // 관계 포함
        gradeAtEnrollment: 'unknown',
        status: 'active',
        createdAt: FieldValue.serverTimestamp(),
      });

      // guardianUids 배열에 추가
      batch.update(studentDoc.ref, {
        guardianUids: FieldValue.arrayUnion(uid),
        // 사용된 해시는 제거 (선택적 — 한 번만 쓸 경우)
        // allowedGuardianPhoneHashes: FieldValue.arrayRemove(phoneHash),
      });

      linkedStudentIds.push(studentId);
    }

    await batch.commit();
    return { linked: linkedStudentIds };
  },
);

// ────────────────────────────────────────────
// deleteAccount (회원 탈퇴)
// 로그인한 보호자 본인의 계정과 개인 연결 정보를 삭제한다.
//   - guardianLinks(guardianUid == 나)            → 삭제
//   - students.guardianUids 의 내 uid              → 제거
//   - students.allowedGuardianPhoneHashes 의 내 번호 → 제거 (다시 로그인해도 자동 연결 안 됨)
//   - reports.guardianUids / guardianUid 의 내 uid  → 제거
//   - shareTokens(createdByUid == 나)              → 삭제 (공유 링크 즉시 중지)
//   - enrollmentCodes.usedByUid == 나              → 필드만 삭제 (코드는 '사용됨' 유지 → 재가입은 새 코드/초대로)
//   - Firebase Auth 사용자                         → 삭제 (마지막 단계)
// 학생 문서·출결·리포트 원본은 캠퍼스 자료라 지우지 않는다.
// accountDeletions 에는 개인정보 없이 시각·학생 id·남은 보호자 수만 남긴다 (캠퍼스 운영 확인용).
// 중간에 실패해도 다시 호출하면 이어서 정리된다 (모든 단계가 멱등).
// ────────────────────────────────────────────
interface DeleteAccountResponse {
  deleted: true;
  studentIds: string[];
}

/** 쓰기 작업을 500개 제한에 맞춰 나눠 커밋 */
async function commitInChunks(ops: Array<(b: admin.firestore.WriteBatch) => void>): Promise<void> {
  for (let i = 0; i < ops.length; i += 450) {
    const batch = db.batch();
    ops.slice(i, i + 450).forEach((op) => op(batch));
    await batch.commit();
  }
}

export const deleteAccount = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<{ confirm?: boolean }>): Promise<DeleteAccountResponse> => {
    const uid = req.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    if (req.data?.confirm !== true) {
      throw new HttpsError('invalid-argument', '탈퇴 확인이 필요합니다.');
    }

    // 전화번호: 토큰 클레임 → 없으면 Auth 사용자 레코드
    let phoneNumber = req.auth?.token?.phone_number as string | undefined;
    if (!phoneNumber) {
      try {
        phoneNumber = (await admin.auth().getUser(uid)).phoneNumber ?? undefined;
      } catch (e: any) {
        if (e.code !== 'auth/user-not-found') throw e;
      }
    }
    const phoneHash = phoneNumber ? sha256(phoneNumber) : null;

    const [enrollSnap, guardianStudentsSnap, invitedStudentsSnap, reportsSnap, legacyReportsSnap, tokensSnap, codesSnap] =
      await Promise.all([
        db.collection(COL_GUARDIAN_LINKS).where('guardianUid', '==', uid).get(),
        db.collection('students').where('guardianUids', 'array-contains', uid).get(),
        phoneHash
          ? db.collection('students').where('allowedGuardianPhoneHashes', 'array-contains', phoneHash).get()
          : Promise.resolve(null),
        db.collection('reports').where('guardianUids', 'array-contains', uid).get(),
        db.collection('reports').where('guardianUid', '==', uid).get(),
        db.collection('shareTokens').where('createdByUid', '==', uid).get(),
        db.collection('enrollmentCodes').where('usedByUid', '==', uid).get(),
      ]);

    const ops: Array<(b: admin.firestore.WriteBatch) => void> = [];

    enrollSnap.docs.forEach((d) => ops.push((b) => b.delete(d.ref)));
    tokensSnap.docs.forEach((d) => ops.push((b) => b.delete(d.ref)));
    codesSnap.docs.forEach((d) => ops.push((b) => b.update(d.ref, { usedByUid: FieldValue.delete() })));
    reportsSnap.docs.forEach((d) => ops.push((b) => b.update(d.ref, { guardianUids: FieldValue.arrayRemove(uid) })));
    legacyReportsSnap.docs.forEach((d) => ops.push((b) => b.update(d.ref, { guardianUid: FieldValue.delete() })));

    // 학생 문서: 보호자 목록·초대 목록에서 나를 한 번에 제거
    const studentIds = new Set<string>();
    const remaining: Record<string, number> = {};
    const studentDocs = new Map<string, admin.firestore.QueryDocumentSnapshot>();
    guardianStudentsSnap.docs.forEach((d) => studentDocs.set(d.id, d));
    invitedStudentsSnap?.docs.forEach((d) => studentDocs.set(d.id, d));
    enrollSnap.docs.forEach((d) => studentIds.add(d.data().studentId));

    for (const [id, d] of studentDocs) {
      const data = d.data();
      const update: Record<string, unknown> = {};
      if ((data.guardianUids ?? []).includes(uid)) {
        update.guardianUids = FieldValue.arrayRemove(uid);
        studentIds.add(id);
      }
      if (phoneHash && (data.allowedGuardianPhoneHashes ?? []).includes(phoneHash)) {
        update.allowedGuardianPhoneHashes = FieldValue.arrayRemove(phoneHash);
        update[`allowedGuardianPhoneRelations.${phoneHash}`] = FieldValue.delete();
      }
      if (Object.keys(update).length) ops.push((b) => b.update(d.ref, update));
      remaining[id] = ((data.guardianUids ?? []) as string[]).filter((g) => g !== uid).length;
    }

    const ids = [...studentIds].filter(Boolean);
    ops.push((b) =>
      b.set(db.collection('accountDeletions').doc(), {
        deletedAt: FieldValue.serverTimestamp(),
        studentIds: ids,
        remainingGuardians: Object.fromEntries(ids.map((id) => [id, remaining[id] ?? 0])),
      }),
    );

    await commitInChunks(ops);

    // 마지막: 로그인 계정 삭제 (이미 없으면 통과)
    try {
      await admin.auth().deleteUser(uid);
    } catch (e: any) {
      if (e.code !== 'auth/user-not-found') throw e;
    }

    return { deleted: true, studentIds: ids };
  },
);

// ────────────────────────────────────────────
// createShareToken
// 인증된 보호자가 자신의 리포트에 대해 7일짜리 공유 토큰 발급
// → shareTokens/{token} 에 저장 후 URL 반환
// ────────────────────────────────────────────
interface CreateShareTokenRequest {
  reportId: string;
}

interface CreateShareTokenResponse {
  url: string;
  expiresAt: string; // ISO 8601
}

export const createShareToken = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<CreateShareTokenRequest>): Promise<CreateShareTokenResponse> => {
    const uid = req.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const { reportId } = req.data;
    if (!reportId) {
      throw new HttpsError('invalid-argument', 'reportId가 필요합니다.');
    }

    // 리포트가 이 보호자 소유인지 확인
    const reportSnap = await db.collection('reports').doc(reportId).get();
    if (!reportSnap.exists) {
      throw new HttpsError('not-found', '리포트를 찾을 수 없습니다.');
    }

    const reportData = reportSnap.data()!;
    // reports 문서에 guardianUids 배열 또는 guardianUid 필드로 소유 확인
    const owners: string[] = reportData.guardianUids ?? (reportData.guardianUid ? [reportData.guardianUid] : []);
    if (!owners.includes(uid)) {
      throw new HttpsError('permission-denied', '이 리포트에 대한 접근 권한이 없습니다.');
    }

    // 고유 토큰 생성 (32바이트 랜덤 hex)
    const token = crypto.randomBytes(20).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일

    await db.collection('shareTokens').doc(token).set({
      reportId,
      createdByUid: uid,
      expiresAt: Timestamp.fromDate(expiresAt),
      createdAt: FieldValue.serverTimestamp(),
    });

    // viewReport 함수 URL (asia-northeast3 리전)
    const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? 'thinkcampus';
    const url = `https://asia-northeast3-${projectId}.cloudfunctions.net/viewReport?t=${token}`;

    return { url, expiresAt: expiresAt.toISOString() };
  },
);

// ────────────────────────────────────────────
// viewReport  (HTTP GET)
// 브라우저에서 직접 접근 — 토큰 검증 후 HTML 리포트 반환
// URL: https://asia-northeast3-{project}.cloudfunctions.net/viewReport?t={token}
// ────────────────────────────────────────────

/** 등급 → CSS 색상 */
function gradeColor(grade: string): string {
  switch (grade) {
    case 'S': return '#7c3aed';
    case 'A': return '#1d4ed8';
    case 'B': return '#0369a1';
    default:  return '#6b7280';
  }
}
function gradeBgColor(grade: string): string {
  switch (grade) {
    case 'S': return '#f5f3ff';
    case 'A': return '#eff6ff';
    case 'B': return '#f0f9ff';
    default:  return '#f9fafb';
  }
}

function buildReportHtml(report: admin.firestore.DocumentData, studentName: string): string {
  const gc = gradeColor(report.totalGrade);

  const programsHtml = (report.programs ?? []).map((p: any) => {
    const pc = gradeColor(p.grade);
    const compRows = (p.competencies ?? []).map((c: any) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;">${c.label}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="position:relative;flex:1;background:#f3f4f6;border-radius:4px;height:8px;">
              <div style="width:${c.score}%;background:${pc};height:8px;border-radius:4px;"></div>
              <div style="position:absolute;top:-2px;bottom:-2px;left:${c.benchmark}%;width:2px;background:#f59e0b;border-radius:1px;"></div>
            </div>
            <b style="color:${pc};min-width:28px;font-size:13px;">${c.score}</b>
            <span style="font-size:11px;color:${c.score - c.benchmark >= 0 ? '#16a34a' : '#dc2626'}">
              ${c.score - c.benchmark >= 0 ? '+' : ''}${c.score - c.benchmark}
            </span>
          </div>
        </td>
      </tr>`).join('');

    return `
      <div style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:20px;margin-bottom:16px;break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <span style="font-size:24px;">${p.programIcon}</span>
          <div style="flex:1;">
            <div style="font-size:16px;font-weight:700;color:#111827;">${p.programName}</div>
            <div style="font-size:12px;color:#9ca3af;">강사 ${p.instructorName} · 출석 ${p.attendance}%</div>
          </div>
          <div style="background:${gradeBgColor(p.grade)};border-radius:10px;padding:6px 14px;text-align:center;">
            <div style="font-size:22px;font-weight:900;color:${pc};">${p.grade}</div>
            <div style="font-size:12px;color:${pc};font-weight:700;">${p.overallScore}점</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="background:#f3f4f6;border-radius:8px;padding:8px 16px;text-align:center;flex:1;">
            <div style="font-size:11px;color:#9ca3af;margin-bottom:2px;">캠프 전</div>
            <div style="font-size:18px;font-weight:800;color:#374151;">${p.preScore}점</div>
          </div>
          <div style="color:#9ca3af;font-size:18px;">→</div>
          <div style="background:${gradeBgColor(p.grade)};border-radius:8px;padding:8px 16px;text-align:center;flex:1;">
            <div style="font-size:11px;color:${pc};margin-bottom:2px;">캠프 후</div>
            <div style="font-size:18px;font-weight:800;color:${pc};">${p.postScore}점</div>
          </div>
          <div style="background:#f0fdf4;border-radius:8px;padding:8px 12px;text-align:center;">
            <div style="font-size:15px;font-weight:800;color:#16a34a;">+${p.growthIndex}</div>
            <div style="font-size:10px;color:#16a34a;">향상</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
          <thead><tr style="background:#f8fafc;">
            <th style="padding:7px 10px;text-align:left;font-size:11px;color:#9ca3af;border-bottom:1px solid #e5e7eb;font-weight:600;">역량</th>
            <th style="padding:7px 10px;text-align:left;font-size:11px;color:#9ca3af;border-bottom:1px solid #e5e7eb;font-weight:600;">점수 (🟡 또래평균)</th>
          </tr></thead>
          <tbody>${compRows}</tbody>
        </table>
        <div style="background:#f8fafc;border-radius:10px;padding:12px;margin-bottom:10px;">
          <div style="font-size:11px;font-weight:700;color:#6b7280;margin-bottom:5px;">강사 총평</div>
          <div style="font-size:13px;color:#374151;line-height:1.75;">${p.instructorComment}</div>
        </div>
        ${p.highlights?.length ? `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px;margin-bottom:10px;">
          <div style="font-size:11px;font-weight:700;color:#92400e;margin-bottom:5px;">인상적이었던 점</div>
          ${p.highlights.map((h: string) => `<div style="font-size:12px;color:#78350f;margin-bottom:3px;">★ ${h}</div>`).join('')}
        </div>` : ''}
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px;">
          <div style="font-size:11px;font-weight:700;color:#1e40af;margin-bottom:5px;">향후 발전 방향</div>
          ${(p.nextSteps ?? []).map((s: string, i: number) => `
            <div style="display:flex;gap:8px;margin-bottom:4px;align-items:flex-start;">
              <div style="width:18px;height:18px;border-radius:9px;background:#1d4ed8;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">${i + 1}</div>
              <div style="font-size:12px;color:#1e40af;line-height:1.6;">${s}</div>
            </div>`).join('')}
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${studentName} 학습 리포트 · ThinkCampus</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f8fafc;color:#111827;min-height:100vh;}
    .wrap{max-width:720px;margin:0 auto;padding:24px 16px 48px;}
    .tc-badge{display:inline-block;font-size:11px;font-weight:700;color:#1d4ed8;background:#eff6ff;padding:4px 10px;border-radius:20px;margin-bottom:10px;letter-spacing:0.5px;}
    .hero{background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 100%);border-radius:20px;padding:28px;color:#fff;margin-bottom:20px;}
    .hero-name{font-size:26px;font-weight:900;margin-bottom:2px;}
    .hero-sub{font-size:13px;color:#bfdbfe;margin-bottom:20px;}
    .hero-scores{display:flex;gap:12px;flex-wrap:wrap;}
    .hero-score-box{background:rgba(255,255,255,0.15);border-radius:12px;padding:12px 20px;text-align:center;min-width:90px;}
    .hero-score-num{font-size:34px;font-weight:900;}
    .hero-score-label{font-size:11px;color:#bfdbfe;margin-top:2px;}
    .card{background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:20px;margin-bottom:16px;}
    .section-label{font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;}
    .tag-row{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;}
    .tag-green{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:20px;padding:4px 10px;font-size:12px;font-weight:600;}
    .tag-blue{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:20px;padding:4px 10px;font-size:12px;font-weight:600;}
    .score-bar-wrap{margin-bottom:6px;}
    .score-bar-bg{height:8px;background:#f3f4f6;border-radius:4px;overflow:hidden;}
    .score-bar-fill{height:8px;border-radius:4px;}
    .prog-section-title{font-size:18px;font-weight:700;color:#111827;margin:24px 0 6px;}
    .prog-section-hint{font-size:12px;color:#9ca3af;margin-bottom:14px;}
    footer{text-align:center;font-size:12px;color:#9ca3af;margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;}
    .expire-notice{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 14px;font-size:12px;color:#92400e;margin-bottom:20px;}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="tc-badge">ThinkCampus 공식 리포트</div>
    <div class="expire-notice">⏱ 이 링크는 7일 후 만료됩니다. 내용을 저장하려면 인쇄하거나 PDF로 저장하세요.</div>

    <!-- 히어로 -->
    <div class="hero">
      <div class="hero-name">${studentName} 학생</div>
      <div class="hero-sub">${report.campusName} · ${report.campPeriod}</div>
      <div class="hero-scores">
        <div class="hero-score-box">
          <div class="hero-score-num" style="color:${gc};">${report.totalGrade}</div>
          <div class="hero-score-label">종합 등급</div>
        </div>
        <div class="hero-score-box">
          <div class="hero-score-num">${report.totalScore}</div>
          <div class="hero-score-label">종합 점수</div>
        </div>
      </div>
    </div>

    <!-- 성향 유형 -->
    <div class="card">
      <div class="section-label">학습 성향 유형</div>
      <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:6px;">${report.personalityType}</div>
      <div style="font-size:13px;color:#374151;line-height:1.75;">${report.personalityDesc}</div>
    </div>

    <!-- 강점 / 발전 -->
    <div class="card" style="display:flex;gap:16px;flex-wrap:wrap;">
      <div style="flex:1;min-width:140px;">
        <div class="section-label" style="color:#16a34a;">강점 분야</div>
        <div class="tag-row">${(report.strengthAreas ?? []).map((s: string) => `<span class="tag-green">${s}</span>`).join('')}</div>
      </div>
      <div style="flex:1;min-width:140px;">
        <div class="section-label" style="color:#1d4ed8;">발전 권장</div>
        <div class="tag-row">${(report.growthAreas ?? []).map((s: string) => `<span class="tag-blue">${s}</span>`).join('')}</div>
      </div>
    </div>

    <!-- 담임 총평 -->
    <div class="card">
      <div class="section-label">담임 강사 종합 총평</div>
      <div style="font-size:14px;color:#374151;line-height:1.8;">${report.overallComment}</div>
    </div>

    <!-- 종합 점수 바 -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <div class="section-label" style="margin-bottom:0;">종합 점수</div>
        <b style="color:${gc};">${report.totalScore}점</b>
      </div>
      <div class="score-bar-bg">
        <div class="score-bar-fill" style="width:${report.totalScore}%;background:${gc};"></div>
      </div>
    </div>

    <!-- 프로그램별 상세 -->
    <div class="prog-section-title">프로그램별 상세 평가</div>
    <div class="prog-section-hint">🟡 황색 선 = 또래 평균 · 점수 우측 숫자 = 또래 대비 차이</div>
    ${programsHtml}

    <footer>
      발급일 ${report.issueDate} · ThinkCampus 공식 학습 리포트<br/>
      이 페이지는 로그인 없이 열람 가능한 임시 공유 페이지입니다.
    </footer>
  </div>
</body>
</html>`;
}

export const viewReport = onRequest(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req, res) => {
    const token = req.query['t'] as string | undefined;

    if (!token) {
      res.status(400).send('<h2>잘못된 요청입니다. 공유 링크를 다시 확인해주세요.</h2>');
      return;
    }

    // 토큰 조회
    const tokenSnap = await db.collection('shareTokens').doc(token).get();
    if (!tokenSnap.exists) {
      res.status(404).send('<h2>유효하지 않은 링크입니다.</h2>');
      return;
    }

    const tokenData = tokenSnap.data()!;

    // 만료 확인
    if (tokenData.expiresAt.toDate() < new Date()) {
      res.status(410).send(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px;">
          <h2>⏰ 링크가 만료되었습니다</h2>
          <p style="color:#6b7280;margin-top:12px;">새 공유 링크는 ThinkCampus 앱에서 생성해주세요.</p>
        </body></html>`);
      return;
    }

    // 리포트 조회
    const reportSnap = await db.collection('reports').doc(tokenData.reportId).get();
    if (!reportSnap.exists) {
      res.status(404).send('<h2>리포트를 찾을 수 없습니다.</h2>');
      return;
    }

    const report = reportSnap.data()!;

    // 학생 이름 조회
    let studentName = '학생';
    const studentSnap = await db.collection('students').doc(report.studentId).get();
    if (studentSnap.exists) {
      studentName = studentSnap.data()?.name ?? '학생';
    }

    const html = buildReportHtml(report, studentName);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(html);
  },
);

export { importRoster } from './importRoster';
export { createProgramRun } from './createProgramRun';
export { listPendingHouseholdMembers, linkHouseholdMember } from './householdLink';
export { checkCompanyAdminAccess } from './checkCompanyAdminAccess';
export { checkStaffAccess } from './checkStaffAccess';
export { getProgramRunAttendanceSheet } from './getProgramRunAttendanceSheet';
export { listStudentProgramBundles } from './listStudentProgramBundles';
export { recordSessionAttendance } from './recordSessionAttendance';
export { getCenterRunOps } from './getCenterRunOps';
export { getCenterRunSummary } from './getCenterRunSummary';
export { listCenterRoster } from './listCenterRoster';
export { listCenterSchedule } from './listCenterSchedule';
export { createCenterNotice } from './createCenterNotice';
