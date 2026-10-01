/**
 * 학부모 채팅 · 민원 · 만족도 · 발주처 담당자 공통 규칙
 * (web/src/services/demo/chat.ts · survey.ts 와 같은 규칙 — 체험판과 실서비스가 같은 결과를 내도록)
 */

import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { getDb, todayKstDate } from './centerRunHelpers';
import type { DocumentData } from './runContext';

export const REGION = { region: 'asia-northeast3', maxInstances: 10 } as const;

export const DEFAULT_CHAT_HOURS = '평일 09:00–18:00 · 수업 날은 수업 시간에도';
/** 끝난 프로그램 방은 종료 뒤 30일까지 읽기 전용으로 보인다 */
export const READONLY_DAYS = 30;
/** 채팅 사진 한 장 (JPEG data URL) 최대 길이 — Firestore 문서 1MB 안 */
export const MAX_PHOTO_DATA_URL = 900_000;

export const INQUIRY_CATEGORIES = ['lesson', 'instructor', 'facility', 'safety', 'operation', 'etc'] as const;
export type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number];
export const INQUIRY_CATEGORY_LABEL: Record<InquiryCategory, string> = {
  lesson: '수업 내용',
  instructor: '강사',
  facility: '시설·환경',
  safety: '안전',
  operation: '운영·안내',
  etc: '기타',
};
export type InquiryStatus = 'received' | 'inProgress' | 'resolved';
export type InquiryKind = 'question' | 'complaint';
export type InquiryChannel = 'chat' | 'phone' | 'onsite';

export function chatRoomId(programRunId: string, studentId: string): string {
  return `${programRunId}__${studentId}`;
}

export function parseRoomId(roomId: unknown): { programRunId: string; studentId: string } {
  const id = typeof roomId === 'string' ? roomId.trim() : '';
  const i = id.indexOf('__');
  if (i <= 0 || i + 2 >= id.length || id.includes('/')) throw new HttpsError('invalid-argument', '대화방을 찾을 수 없어요.');
  return { programRunId: id.slice(0, i), studentId: id.slice(i + 2) };
}

function addDays(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 운영 중 · 예정 → open, 끝난 지 30일 안 → readonly, 그 밖 → hidden */
export function roomStatusOf(run: DocumentData): 'open' | 'readonly' | 'hidden' {
  const status = (run.status as string) ?? 'draft';
  if (status === 'active' || status === 'scheduled') return 'open';
  if (status === 'completed') {
    const end = (run.endDate as string | null) ?? null;
    if (!end) return 'readonly';
    return addDays(end, READONLY_DAYS) >= todayKstDate() ? 'readonly' : 'hidden';
  }
  return 'hidden';
}

/** "네 알겠습니다!" · "감사합니다" 같은 짧은 인사 — 답을 기다리는 메시지로 치지 않는다 */
const ACK = /(감사|고맙|알겠|확인했|확인할게|좋아요|수고|넵|^네[\s.!~]*$|^예[\s.!~]*$)/;
export function isAcknowledgement(text: string): boolean {
  const t = text.trim();
  if (!t || /[?？]/.test(t) || t.length > 40) return false;
  return ACK.test(t);
}

export function isQuestionText(text: string): boolean {
  return /[?？]/.test(text);
}

export function maskName(name: string): string {
  if (name.length <= 1) return name;
  if (name.length === 2) return `${name[0]}○`;
  return `${name[0]}${'○'.repeat(name.length - 2)}${name[name.length - 1]}`;
}

/** 학생이 이 운영 건에 (탈퇴 아닌) 수강 등록돼 있는지 · 반 */
export async function enrollmentOf(programRunId: string, studentId: string): Promise<{ sectionId: string; status: string } | null> {
  const snap = await getDb()
    .collection('studentProgramEnrollments')
    .where('programRunId', '==', programRunId)
    .where('studentId', '==', studentId)
    .get();
  const doc = snap.docs.map((d) => d.data()).find((d) => d.status !== 'withdrawn');
  if (!doc) return null;
  return { sectionId: (doc.sectionId as string) || '', status: (doc.status as string) ?? 'active' };
}

/** 보호자 표시 이름 (Auth displayName) — 여러 명 한 번에 */
export async function guardianNames(uids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const ids = [...new Set(uids.filter(Boolean))];
  for (let i = 0; i < ids.length; i += 100) {
    try {
      const res = await admin.auth().getUsers(ids.slice(i, i + 100).map((uid) => ({ uid })));
      for (const u of res.users) if (u.displayName) out.set(u.uid, u.displayName);
    } catch {
      /* 이름이 없으면 관계로 표시 */
    }
  }
  return out;
}

const RELATION_LABEL: Record<string, string> = { 모: '어머니', 부: '아버지', 조모: '할머니', 조부: '할아버지' };

/** "손영란 (모)" · "어머니" · "아버지 외 1명" */
export async function guardianLabelFor(studentId: string, names?: Map<string, string>): Promise<string> {
  const snap = await getDb().collection('guardianLinks').where('studentId', '==', studentId).get();
  const links = snap.docs.map((d) => d.data()).filter((l) => (l.status as string | undefined) !== 'inactive');
  if (links.length === 0) return '연결된 보호자 없음';
  const first = links[0];
  const nm = names ?? (await guardianNames([first.guardianUid as string]));
  const name = nm.get(first.guardianUid as string);
  const rel = (first.guardianRelation as string | undefined)?.trim();
  const base = name ? `${name}${rel ? ` (${rel})` : ''}` : (rel && RELATION_LABEL[rel]) || rel || '보호자';
  return links.length > 1 ? `${base} 외 ${links.length - 1}명` : base;
}

export function tsIso(v: unknown): string {
  if (!v) return '';
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && typeof (v as { toDate?: unknown }).toDate === 'function') return (v as { toDate: () => Date }).toDate().toISOString();
  return '';
}
