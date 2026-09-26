import * as admin from 'firebase-admin';

export const UNASSIGNED_SECTION_ID = '_unassigned';

export function getDb() {
  return admin.firestore();
}

export function todayKstDate(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export function sessionTopic(data: admin.firestore.DocumentData): string {
  const overrides = data.overrides as { topic?: string } | undefined;
  return overrides?.topic?.trim() || (data.topic as string)?.trim() || `회차 ${data.sessionNumber}`;
}

export async function resolveStaffName(staffId: string): Promise<{ name: string; email?: string }> {
  const snap = await getDb().collection('staff').doc(staffId).get();
  if (snap.exists) {
    const d = snap.data()!;
    return {
      name: (d.displayName as string) || (d.name as string) || staffId,
      email: d.email as string | undefined,
    };
  }
  try {
    const user = await admin.auth().getUser(staffId);
    return { name: user.displayName || user.email || staffId, email: user.email };
  } catch {
    return { name: staffId };
  }
}

export function formatTimestamp(ts: admin.firestore.Timestamp | undefined): string | undefined {
  if (!ts) return undefined;
  return ts.toDate().toISOString().slice(0, 10);
}

export function formatSentAt(ts: admin.firestore.Timestamp | undefined): string {
  if (!ts) return '—';
  const d = ts.toDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
