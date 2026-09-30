/**
 * 통합 관리자 — 발주처 담당자(지자체 담당 공무원) 계정 · 운영 건 설정
 *
 *   officers/{uid}  displayName, email, organization, title?, phone?, programRunIds[], mustChangePassword, disabled?, createdByUid, createdAt, lastLoginAt?
 *   Custom Claim    { role: 'officer' }  (운영 건 범위는 officers 문서가 기준)
 *
 * Callable: listOfficers · inviteOfficer · revokeOfficer · updateProgramRunPartnerSettings
 *   inviteOfficer — 새 이메일이면 계정을 만들고 임시 비밀번호를 한 번만 돌려준다 (첫 로그인 때 바꾸게 한다)
 *                   이미 담당자 계정이면 운영 건만 더한다 (임시 비밀번호 없음)
 *                   직원 · 학부모 계정 이메일이면 거절 (역할을 섞지 않는다)
 *   revokeOfficer — 운영 건에서 뺀다. 남은 운영 건이 없으면 로그인도 막는다
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { assertCompanyAdmin } from './auth/assertCompanyAdmin';
import { getDb } from './lib/centerRunHelpers';
import { REGION, tsIso } from './lib/chatShared';
import { loadRun } from './lib/runContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function tempPassword(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyz';
  const bytes = crypto.randomBytes(8);
  const word = Array.from(bytes.subarray(0, 4), (b) => letters[b % letters.length]).join('');
  const digits = Array.from(bytes.subarray(4), (b) => String(b % 10)).join('');
  return `Tc-${word}${digits}`;
}

function officerDto(uid: string, o: FirebaseFirestore.DocumentData) {
  return {
    uid,
    displayName: (o.displayName as string) ?? '',
    email: (o.email as string) ?? '',
    organization: (o.organization as string) ?? '',
    title: (o.title as string | undefined) || undefined,
    phone: (o.phone as string | undefined) || undefined,
    programRunIds: (o.programRunIds as string[]) ?? [],
    mustChangePassword: !!o.mustChangePassword,
    lastLoginAt: o.lastLoginAt ? tsIso(o.lastLoginAt) : undefined,
    createdAt: tsIso(o.createdAt),
  };
}

export const listOfficers = onCall(REGION, async (req: CallableRequest<{ programRunId: string }>) => {
  assertCompanyAdmin(req);
  const programRunId = req.data?.programRunId?.trim();
  if (!programRunId) throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
  const snap = await getDb().collection('officers').where('programRunIds', 'array-contains', programRunId).get();
  const officers = snap.docs.filter((d) => !d.data().disabled).map((d) => officerDto(d.id, d.data()));
  officers.sort((a, b) => a.displayName.localeCompare(b.displayName, 'ko'));
  return { officers };
});

interface InviteOfficerRequest {
  programRunId: string;
  email: string;
  displayName: string;
  organization: string;
  title?: string;
  phone?: string;
}

export const inviteOfficer = onCall(REGION, async (req: CallableRequest<InviteOfficerRequest>) => {
  const actor = assertCompanyAdmin(req);
  const d = req.data ?? ({} as InviteOfficerRequest);
  const programRunId = d.programRunId?.trim();
  const email = d.email?.trim().toLowerCase();
  const displayName = d.displayName?.trim().slice(0, 40);
  const organization = d.organization?.trim().slice(0, 60);
  if (!programRunId) throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
  if (!email || !EMAIL_RE.test(email)) throw new HttpsError('invalid-argument', '이메일을 확인해 주세요.');
  if (!displayName) throw new HttpsError('invalid-argument', '이름을 입력해 주세요.');
  if (!organization) throw new HttpsError('invalid-argument', '소속 기관을 입력해 주세요.');
  await loadRun(programRunId);
  const db = getDb();
  const now = Timestamp.now();
  const profile = {
    displayName,
    email,
    organization,
    ...(d.title?.trim() ? { title: d.title.trim().slice(0, 20) } : {}),
    ...(d.phone?.trim() ? { phone: d.phone.trim().slice(0, 20) } : {}),
  };

  let existing: admin.auth.UserRecord | null = null;
  try {
    existing = await admin.auth().getUserByEmail(email);
  } catch {
    existing = null;
  }

  if (existing) {
    const role = existing.customClaims?.role as string | undefined;
    const staff = await db.collection('staff').doc(existing.uid).get();
    if ((role && role !== 'officer') || staff.exists) throw new HttpsError('already-exists', '직원 계정으로 쓰는 이메일이에요. 다른 이메일을 써 주세요.');
    const ref = db.collection('officers').doc(existing.uid);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('already-exists', '다른 용도로 가입된 이메일이에요. 다른 이메일을 써 주세요.');
    await ref.update({ ...profile, programRunIds: FieldValue.arrayUnion(programRunId), disabled: false, updatedAt: now });
    if (existing.disabled) await admin.auth().updateUser(existing.uid, { disabled: false });
    if (role !== 'officer') await admin.auth().setCustomUserClaims(existing.uid, { role: 'officer' });
    return { uid: existing.uid, email, tempPassword: null };
  }

  const password = tempPassword();
  const user = await admin.auth().createUser({ email, password, displayName, emailVerified: false });
  await admin.auth().setCustomUserClaims(user.uid, { role: 'officer' });
  await db
    .collection('officers')
    .doc(user.uid)
    .set({ ...profile, programRunIds: [programRunId], mustChangePassword: true, disabled: false, createdByUid: actor, createdAt: now, updatedAt: now });
  return { uid: user.uid, email, tempPassword: password };
});

export const revokeOfficer = onCall(REGION, async (req: CallableRequest<{ uid: string; programRunId: string }>) => {
  assertCompanyAdmin(req);
  const uid = req.data?.uid?.trim();
  const programRunId = req.data?.programRunId?.trim();
  if (!uid || !programRunId) throw new HttpsError('invalid-argument', 'uid와 programRunId가 필요합니다.');
  const ref = getDb().collection('officers').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', '담당자를 찾을 수 없어요.');
  const left = ((snap.data()!.programRunIds as string[]) ?? []).filter((id) => id !== programRunId);
  await ref.update({ programRunIds: left, disabled: left.length === 0, updatedAt: Timestamp.now() });
  if (left.length === 0) {
    await admin.auth().updateUser(uid, { disabled: true });
    await admin.auth().revokeRefreshTokens(uid);
  }
  return { ok: true };
});

export const updateProgramRunPartnerSettings = onCall(REGION, async (req: CallableRequest<{ programRunId: string; nameMasking: boolean }>) => {
  assertCompanyAdmin(req);
  const programRunId = req.data?.programRunId?.trim();
  if (!programRunId) throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
  await loadRun(programRunId);
  await getDb().collection('programRuns').doc(programRunId).update({ partnerNameMasking: !!req.data?.nameMasking, updatedAt: Timestamp.now() });
  return { ok: true };
});
