import { HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

export async function assertGuardianOfStudent(guardianUid: string, studentId: string): Promise<void> {
  const snap = await admin.firestore().collection('students').doc(studentId).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', '학생을 찾을 수 없습니다.');
  }
  const uids: string[] = snap.data()?.guardianUids ?? [];
  if (!uids.includes(guardianUid)) {
    throw new HttpsError('permission-denied', '이 학생에 대한 접근 권한이 없습니다.');
  }
}
