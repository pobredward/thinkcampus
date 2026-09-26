import * as admin from 'firebase-admin';
import { getDb } from './centerRunHelpers';

export async function resolveGuardianDisplay(uid: string): Promise<string> {
  const snap = await getDb().collection('staff').doc(uid).get();
  if (snap.exists) {
    const d = snap.data()!;
    const n = (d.displayName as string) || (d.name as string);
    if (n) return n;
  }
  try {
    const user = await admin.auth().getUser(uid);
    return user.displayName || user.email || '보호자';
  } catch {
    return '보호자';
  }
}
