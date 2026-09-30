/**
 * 종합 리포트 공유 링크
 *   createShareToken (index.ts) — 보호자가 shareTokens/{token} 을 만들고 웹 주소(/r/<token>)를 받는다
 *   getSharedReport            — 링크를 연 사람(로그인 없음)이 토큰으로 리포트 문서를 받는다
 *
 * 주소: `${WEB_ORIGIN}/r/<token>` — WEB_ORIGIN 은 functions/.env (기본 https://thinkcampus.app)
 * 만료: 7일. 만료된 토큰은 failed-precondition (details.expiresAt) — 웹이 "새 링크를 부탁하세요" 로 안내
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getDb } from './lib/centerRunHelpers';
import { tsToIso } from './lib/runContext';

export const SHARE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function webOrigin(): string {
  return (process.env.WEB_ORIGIN ?? 'https://thinkcampus.app').replace(/\/+$/, '');
}

export function sharedReportUrl(token: string): string {
  return `${webOrigin()}/r/${encodeURIComponent(token)}`;
}

interface GetSharedReportRequest {
  token: string;
}

interface GetSharedReportResponse {
  report: admin.firestore.DocumentData & { reportId: string; studentName: string };
  expiresAt: string;
}

/** 서버 전용 필드는 빼고 돌려준다 (보호자 uid 목록 등) */
const PRIVATE_FIELDS = ['guardianUids', 'guardianUid', 'createdAt', 'updatedAt'];

export const getSharedReport = onCall(
  { region: 'asia-northeast3', maxInstances: 20 },
  async (req: CallableRequest<GetSharedReportRequest>): Promise<GetSharedReportResponse> => {
    const token = typeof req.data?.token === 'string' ? req.data.token.trim() : '';
    if (!/^[a-f0-9]{20,64}$/.test(token)) {
      throw new HttpsError('invalid-argument', '잘못된 링크입니다.');
    }

    const db = getDb();
    const tokenSnap = await db.collection('shareTokens').doc(token).get();
    if (!tokenSnap.exists) {
      throw new HttpsError('not-found', '유효하지 않은 링크입니다.');
    }
    const tokenData = tokenSnap.data()!;
    const expiresAt = tsToIso(tokenData.expiresAt) ?? new Date(0).toISOString();
    if (new Date(expiresAt) < new Date()) {
      throw new HttpsError('failed-precondition', '링크 기간이 지났습니다.', { expiresAt });
    }

    const reportSnap = await db.collection('reports').doc(tokenData.reportId as string).get();
    if (!reportSnap.exists) {
      throw new HttpsError('not-found', '리포트를 찾을 수 없습니다.');
    }
    const data = reportSnap.data()!;

    let studentName = (data.studentName as string | undefined)?.trim() || '';
    if (!studentName && data.studentId) {
      const studentSnap = await db.collection('students').doc(data.studentId as string).get();
      studentName = (studentSnap.data()?.name as string | undefined) ?? '학생';
    }

    const report: Record<string, unknown> = { reportId: reportSnap.id, studentName: studentName || '학생' };
    for (const [k, v] of Object.entries(data)) {
      if (PRIVATE_FIELDS.includes(k)) continue;
      report[k] = v;
    }

    return { report: report as GetSharedReportResponse['report'], expiresAt };
  },
);
