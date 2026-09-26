import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { COL_GUARDIAN_LINKS } from './lib/collections';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export interface PendingHouseholdMember {
  studentId: string;
  maskedName: string;
}

function maskName(name: string): string {
  if (name.length <= 1) return name;
  return name[0] + '○'.repeat(name.length - 1);
}

/** 이미 연결된 자녀와 같은 householdId — 아직 연결 안 된 형제 */
export async function findPendingHouseholdMembers(guardianUid: string): Promise<PendingHouseholdMember[]> {
  const linkedSnap = await db.collection('students').where('guardianUids', 'array-contains', guardianUid).get();
  if (linkedSnap.empty) return [];

  const householdIds = new Set<string>();
  for (const doc of linkedSnap.docs) {
    const hh = doc.data().householdId as string | undefined;
    if (hh) householdIds.add(hh);
  }
  if (householdIds.size === 0) return [];

  const seen = new Set<string>();
  const pending: PendingHouseholdMember[] = [];

  for (const hh of householdIds) {
    const sibSnap = await db.collection('students').where('householdId', '==', hh).get();
    for (const doc of sibSnap.docs) {
      const uids: string[] = doc.data().guardianUids ?? [];
      if (uids.includes(guardianUid)) continue;
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);
      pending.push({
        studentId: doc.id,
        maskedName: maskName((doc.data().name as string) ?? '학생'),
      });
    }
  }
  return pending;
}

async function assertSameHousehold(guardianUid: string, targetStudentId: string): Promise<{
  campusId: string;
  householdId: string;
}> {
  const targetSnap = await db.collection('students').doc(targetStudentId).get();
  if (!targetSnap.exists) {
    throw new HttpsError('not-found', '학생을 찾을 수 없습니다.');
  }
  const householdId = targetSnap.data()?.householdId as string | undefined;
  if (!householdId) {
    throw new HttpsError('failed-precondition', '가구 연동 정보가 없습니다.');
  }

  const mine = await db.collection('students').where('guardianUids', 'array-contains', guardianUid).get();
  const inHousehold = mine.docs.some((d) => d.data().householdId === householdId);
  if (!inHousehold) {
    throw new HttpsError('permission-denied', '같은 가구의 자녀만 연동할 수 있습니다.');
  }

  let campusId = '';
  const codeSnap = await db.collection('enrollmentCodes').where('studentId', '==', targetStudentId).limit(1).get();
  if (!codeSnap.empty) {
    campusId = codeSnap.docs[0].data().campusId as string;
  }
  if (!campusId) {
    const enrSnap = await db
      .collection(COL_GUARDIAN_LINKS)
      .where('guardianUid', '==', guardianUid)
      .limit(1)
      .get();
    campusId = enrSnap.docs[0]?.data()?.campusId as string ?? '';
  }
  if (!campusId) {
    throw new HttpsError('failed-precondition', '캠퍼스 정보를 찾을 수 없습니다.');
  }

  return { campusId, householdId };
}

interface LinkHouseholdMemberRequest {
  studentId: string;
  birthDate: string;
  relation?: string;
}

export const listPendingHouseholdMembers = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<Record<string, never>>): Promise<{ pending: PendingHouseholdMember[] }> => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    const pending = await findPendingHouseholdMembers(uid);
    return { pending };
  },
);

export const linkHouseholdMember = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<LinkHouseholdMemberRequest>): Promise<{ linked: boolean }> => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');

    const { studentId, birthDate, relation } = req.data ?? {};
    if (!studentId || !birthDate || !/^\d{8}$/.test(birthDate)) {
      throw new HttpsError('invalid-argument', 'studentId와 생년월일(8자리)이 필요합니다.');
    }

    const studentRef = db.collection('students').doc(studentId);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) {
      throw new HttpsError('not-found', '학생을 찾을 수 없습니다.');
    }

    const storedBirth = (studentSnap.data()?.birthDate as string) ?? '';
    if (storedBirth !== birthDate) {
      throw new HttpsError('unauthenticated', '생년월일이 일치하지 않습니다.');
    }

    const uids: string[] = studentSnap.data()?.guardianUids ?? [];
    if (uids.includes(uid)) {
      return { linked: true };
    }

    const { campusId } = await assertSameHousehold(uid, studentId);

    const existingEnr = await db
      .collection(COL_GUARDIAN_LINKS)
      .where('guardianUid', '==', uid)
      .where('studentId', '==', studentId)
      .limit(1)
      .get();
    if (!existingEnr.empty) {
      return { linked: true };
    }

    const batch = db.batch();
    const enrollmentRef = db.collection(COL_GUARDIAN_LINKS).doc();
    batch.set(enrollmentRef, {
      studentId,
      campusId,
      guardianUid: uid,
      guardianRelation: (relation ?? '기타').trim(),
      gradeAtEnrollment: 'unknown',
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
      linkedVia: 'householdLink',
    });
    batch.update(studentRef, {
      guardianUids: FieldValue.arrayUnion(uid),
    });

    const openCodes = await db
      .collection('enrollmentCodes')
      .where('studentId', '==', studentId)
      .where('used', '==', false)
      .get();
    for (const codeDoc of openCodes.docs) {
      batch.update(codeDoc.ref, {
        used: true,
        usedVia: 'householdLink',
        usedByUid: uid,
        usedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    return { linked: true };
  },
);
