/**
 * 센터 · 학생 명단 — web/src/services/types.ts 의 CenterRosterPage
 *   반·이름·보호자 연결 필터, 형제 이름, 미사용 등록코드, 보호자 연락처, 출결 합계
 */
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { assertCenterOrCompanyForCampus } from './auth/staffClaims';
import { getDb } from './lib/centerRunHelpers';
import { loadRunContext, loadStudents } from './lib/runContext';

export type RosterGuardianFilter = 'all' | 'linked' | 'unlinked';

export interface ListCenterRosterRequest {
  programRunId: string;
  sectionId?: string;
  q?: string;
  guardianFilter?: RosterGuardianFilter;
  pageSize?: number;
  cursor?: string;
}

const MAX_PAGE = 200;

export const listCenterRoster = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<ListCenterRosterRequest>) => {
    const programRunId = req.data?.programRunId?.trim();
    if (!programRunId) throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
    const ctx = await loadRunContext(programRunId, { reports: false });
    assertCenterOrCompanyForCampus(req, ctx.run.campusId as string);

    const sectionFilter = req.data?.sectionId?.trim();
    const q = req.data?.q?.trim().toLowerCase();
    const guardianFilter = req.data?.guardianFilter ?? 'all';
    const pageSize = Math.min(Math.max(req.data?.pageSize ?? MAX_PAGE, 1), MAX_PAGE);
    const start = Math.max(0, Number(req.data?.cursor ?? 0) || 0);

    const enrolled = ctx.activeEnrollments(sectionFilter && sectionFilter !== 'all' ? sectionFilter : undefined).filter(
      (e) => !sectionFilter || sectionFilter === 'all' || e.sectionId === sectionFilter,
    );
    const students = await loadStudents(enrolled.map((e) => e.studentId));

    // 형제: 같은 householdId 의 다른 학생 (이 캠퍼스 전체에서)
    const householdIds = [...new Set([...students.values()].map((s) => s.householdId as string | undefined).filter((h): h is string => !!h))];
    const siblingsByHousehold = new Map<string, Array<{ id: string; name: string }>>();
    for (let i = 0; i < householdIds.length; i += 30) {
      const chunk = householdIds.slice(i, i + 30);
      const snap = await getDb().collection('students').where('householdId', 'in', chunk).get();
      for (const d of snap.docs) {
        const h = d.data().householdId as string;
        siblingsByHousehold.set(h, [...(siblingsByHousehold.get(h) ?? []), { id: d.id, name: (d.data().name as string) ?? d.id }]);
      }
    }

    // 미사용 등록코드 (초대 안내용)
    const codeByStudent = new Map<string, { code: string; used: boolean }>();
    const studentIds = enrolled.map((e) => e.studentId);
    for (let i = 0; i < studentIds.length; i += 30) {
      const chunk = studentIds.slice(i, i + 30);
      const snap = await getDb().collection('enrollmentCodes').where('studentId', 'in', chunk).get();
      for (const d of snap.docs) {
        const sid = d.data().studentId as string;
        const used = Boolean(d.data().used);
        const prev = codeByStudent.get(sid);
        if (!prev || (prev.used && !used)) codeByStudent.set(sid, { code: d.id, used });
      }
    }

    // 보호자 연락처: 첫 보호자의 Auth 전화번호
    const guardianPhone = new Map<string, string>();
    const firstGuardianUids = [...new Set(enrolled.map((e) => ((students.get(e.studentId)?.guardianUids as string[] | undefined) ?? [])[0]).filter((u): u is string => !!u))];
    if (firstGuardianUids.length > 0) {
      const res = await admin.auth().getUsers(firstGuardianUids.slice(0, 100).map((uid) => ({ uid })));
      for (const u of res.users) if (u.phoneNumber) guardianPhone.set(u.uid, u.phoneNumber);
    }

    let rows = enrolled.map((e) => {
      const st = students.get(e.studentId);
      const name = e.studentName || (st?.name as string) || e.studentId;
      const guardianUids = (st?.guardianUids as string[] | undefined) ?? [];
      const householdId = st?.householdId as string | undefined;
      const siblingNames = householdId ? (siblingsByHousehold.get(householdId) ?? []).filter((s) => s.id !== e.studentId).map((s) => s.name) : [];
      const code = codeByStudent.get(e.studentId);
      let present = 0;
      let late = 0;
      let absent = 0;
      for (const [key, att] of ctx.attendance) {
        if (!key.endsWith(`__${e.studentId}`)) continue;
        if (att.status === 'present') present += 1;
        else if (att.status === 'late') late += 1;
        else if (att.status === 'absent') absent += 1;
      }
      return {
        enrollmentId: e.id,
        studentId: e.studentId,
        name,
        photoUrl: st?.photoUrl as string | undefined,
        sectionId: e.sectionId,
        sectionLabel: ctx.sectionLabel(e.sectionId),
        householdId,
        siblingNames,
        enrollmentCodeStatus: (code ? (code.used ? 'used' : 'unused') : 'unknown') as 'used' | 'unused' | 'unknown',
        enrollmentCode: code && !code.used ? code.code : undefined,
        guardianSummary: guardianUids.length > 0 ? `보호자 ${guardianUids.length}명 연결` : '보호자 미연결',
        guardianLinked: guardianUids.length > 0,
        guardianPhone: guardianUids[0] ? guardianPhone.get(guardianUids[0]) : undefined,
        attendance: { present, late, absent },
      };
    });
    if (q) rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    if (guardianFilter === 'linked') rows = rows.filter((r) => r.guardianLinked);
    if (guardianFilter === 'unlinked') rows = rows.filter((r) => !r.guardianLinked);
    rows.sort((a, b) => a.sectionLabel.localeCompare(b.sectionLabel, 'ko') || a.name.localeCompare(b.name, 'ko'));

    const page = rows.slice(start, start + pageSize);
    return { rows: page, nextCursor: start + pageSize < rows.length ? String(start + pageSize) : null, total: rows.length };
  },
);
