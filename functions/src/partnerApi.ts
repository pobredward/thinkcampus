/**
 * 발주처 담당자(지자체 담당 공무원) 포털 — /partner
 *
 *   역할: Custom Claim role 'officer' + officers/{uid} 문서 (programRunIds · disabled · mustChangePassword)
 *   담당자는 officers.programRunIds 의 운영 건만 본다 (문서가 기준 — Claim 은 표시용)
 *   - 민원은 원문 그대로 + 우리 처리 내용. 채팅 원문은 보이지 않는다 (문의는 건수 · 답변 수 · 첫 답변 시간만)
 *   - 학생 이름은 운영 건 설정(programRuns.partnerNameMasking)에 따라 "김○준"
 *   - 연락처 · 생년월일 · 등록코드는 어떤 경우에도 내보내지 않는다
 *
 * Callable: getPartnerAccess · completeOfficerPasswordChange · listPartnerRuns · getPartnerHome · listPartnerLessons
 *           listPartnerInquiries · setOfficerNote · getPartnerParticipation · getPartnerSurveyResults
 *           listPartnerInstructors · getPartnerReportData
 * 응답 모양은 web/src/services/types.ts 의 Partner* 와 같고, 계산은 web/src/services/demo/partnerApi.ts 와 같다.
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { getDb, todayKstDate, UNASSIGNED_SECTION_ID } from './lib/centerRunHelpers';
import { DEFAULT_CHAT_HOURS, REGION, maskName, tsIso } from './lib/chatShared';
import { inquiryDtos, inquiryStatsFor } from './inquiries';
import { surveyResultsFor } from './survey';
import {
  loadCampuses,
  loadRunContext,
  loadStaff,
  loadStudents,
  runSummaryDto,
  runTitle,
  type DocumentData,
  type RunContext,
} from './lib/runContext';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

async function officerDoc(req: CallableRequest<unknown>): Promise<{ uid: string; data: DocumentData }> {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  const snap = await getDb().collection('officers').doc(uid).get();
  if (!snap.exists || snap.data()!.disabled) throw new HttpsError('permission-denied', '발주처 담당자 계정이 아니에요.');
  return { uid, data: snap.data()! };
}

async function assertOfficerRun(req: CallableRequest<unknown>, programRunId: unknown): Promise<{ uid: string; ctx: RunContext }> {
  const id = typeof programRunId === 'string' ? programRunId.trim() : '';
  if (!id) throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
  const o = await officerDoc(req);
  if (!((o.data.programRunIds as string[] | undefined) ?? []).includes(id)) throw new HttpsError('permission-denied', '담당하는 운영 건이 아니에요.');
  return { uid: o.uid, ctx: await loadRunContext(id, { reports: false }) };
}

function sectionRange(labels: string[]): string {
  const nums = labels.map((l) => Number(l.replace(/[^0-9]/g, ''))).filter((n) => Number.isFinite(n) && n > 0);
  if (nums.length === labels.length && nums.length > 1) {
    const sorted = [...nums].sort((a, b) => a - b);
    if (sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1)) return `${sorted[0]}~${sorted[sorted.length - 1]}반`;
  }
  return labels.join('·');
}

interface AttendanceRow {
  sessionNumber: number;
  date: string;
  enrolled: number;
  present: number;
  late: number;
  absent: number;
  unrecorded: number;
  rate: number | null;
}

async function partnerLessons(ctx: RunContext) {
  const today = todayKstDate();
  const sessions = ctx.sessions.filter((s) => s.status !== 'cancelled');
  const staff = await loadStaff(sessions.map((s) => s.instructorId ?? ''));
  const tplIds = [...new Set(sessions.map((s) => s.sessionTemplateId).filter(Boolean))];
  const tpls = new Map<string, DocumentData>();
  if (tplIds.length) {
    const snaps = await getDb().getAll(...tplIds.map((id) => getDb().collection('sessionTemplates').doc(id)));
    for (const s of snaps) if (s.exists) tpls.set(s.id, s.data()!);
  }
  const numbers = [...new Set(sessions.map((s) => s.sessionNumber))].sort((a, b) => a - b);
  return numbers.map((n) => {
    const list = sessions.filter((s) => s.sessionNumber === n).sort((a, b) => a.startTime.localeCompare(b.startTime) || a.sectionId.localeCompare(b.sectionId));
    const date = list.map((s) => s.scheduledDate).sort()[0];
    const tpl = tpls.get(list[0].sessionTemplateId);
    const slotMap = new Map<string, string[]>();
    const instructorMap = new Map<string, string[]>();
    let enrolled = 0;
    let present = 0;
    let late = 0;
    let absent = 0;
    for (const s of list) {
      const label = ctx.sectionLabel(s.sectionId);
      const key = `${s.startTime}–${s.endTime}`;
      slotMap.set(key, [...(slotMap.get(key) ?? []), label]);
      const name = s.instructorId ? (staff.get(s.instructorId)?.displayName ?? '배정 예정') : '배정 예정';
      instructorMap.set(name, [...(instructorMap.get(name) ?? []), label]);
      const enr = ctx.activeEnrollments(s.sectionId);
      enrolled += enr.length;
      for (const e of enr) {
        const a = ctx.attendance.get(`${s.id}__${e.studentId}`);
        if (!a) continue;
        if (a.status === 'present') present++;
        else if (a.status === 'late') late++;
        else absent++;
      }
    }
    const recorded = present + late + absent;
    const ov = (list[0].raw.overrides as { description?: string } | undefined) ?? {};
    const attendance: AttendanceRow = {
      sessionNumber: n,
      date,
      enrolled,
      present,
      late,
      absent,
      unrecorded: Math.max(0, enrolled - recorded),
      rate: recorded > 0 ? Math.round(((present + late) / recorded) * 1000) / 10 : null,
    };
    return {
      sessionNumber: n,
      date,
      slots: [...slotMap.entries()].map(([time, labels]) => (slotMap.size > 1 || ctx.sections.length > 1 ? `${time} (${sectionRange(labels)})` : time)),
      topic: list[0].topic,
      description: ov.description ?? (tpl?.description as string | undefined) ?? '',
      objectives: (tpl?.objectives as string[] | undefined) ?? [],
      curriculum: (tpl?.curriculum as string[] | undefined) ?? [],
      materials: (tpl?.materials as string[] | undefined) ?? [],
      lessonCount: list[0].lessonCount,
      instructors: [...instructorMap.entries()].map(([name, sections]) => ({ name, sections })),
      status: (date < today ? 'done' : date === today ? 'today' : 'upcoming') as 'done' | 'today' | 'upcoming',
      attendance,
    };
  });
}

function overallRate(rows: AttendanceRow[]): number | null {
  const recorded = rows.reduce((n, r) => n + r.present + r.late + r.absent, 0);
  if (!recorded) return null;
  return Math.round((rows.reduce((n, r) => n + r.present + r.late, 0) / recorded) * 1000) / 10;
}

async function partnerParticipation(ctx: RunContext, lessons: Awaited<ReturnType<typeof partnerLessons>>) {
  const today = todayKstDate();
  const masked = !!ctx.run.partnerNameMasking;
  const enr = ctx.activeEnrollments();
  const students = await loadStudents(enr.map((e) => e.studentId));
  const rsBySection = new Map<string, Map<number, string>>();
  for (const s of ctx.sessions) {
    const m = rsBySection.get(s.sectionId) ?? new Map<number, string>();
    m.set(s.sessionNumber, s.id);
    rsBySection.set(s.sectionId, m);
  }
  const unassigned = rsBySection.get(UNASSIGNED_SECTION_ID);
  const rows = enr
    .map((e) => {
      const raw = (students.get(e.studentId)?.name as string | undefined) ?? e.studentName ?? e.studentId;
      const statuses = lessons.map((l) => {
        const rsId = rsBySection.get(e.sectionId)?.get(l.sessionNumber) ?? unassigned?.get(l.sessionNumber);
        const a = rsId ? ctx.attendance.get(`${rsId}__${e.studentId}`) : undefined;
        return a ? ((a.status as 'present' | 'late' | 'absent') ?? null) : null;
      });
      return {
        studentId: e.studentId,
        name: masked ? maskName(raw) : raw,
        sectionLabel: ctx.sectionLabel(e.sectionId),
        statuses,
        present: statuses.filter((x) => x === 'present').length,
        late: statuses.filter((x) => x === 'late').length,
        absent: statuses.filter((x) => x === 'absent').length,
      };
    })
    .sort((a, b) => a.sectionLabel.localeCompare(b.sectionLabel, 'ko', { numeric: true }) || a.name.localeCompare(b.name, 'ko'));
  return {
    sessions: lessons.map((l) => ({ sessionNumber: l.sessionNumber, date: l.date, done: l.date <= today && l.attendance.present + l.attendance.late + l.attendance.absent > 0 })),
    sections: ctx.sections.map((sec) => {
      const list = rows.filter((r) => r.sectionLabel === sec.label);
      const rec = list.reduce((n, r) => n + r.present + r.late + r.absent, 0);
      const ok = list.reduce((n, r) => n + r.present + r.late, 0);
      return { id: sec.id, label: sec.label, studentCount: list.length, rate: rec ? Math.round((ok / rec) * 1000) / 10 : null };
    }),
    students: rows,
    masked,
  };
}

async function partnerInstructors(ctx: RunContext) {
  const sessions = ctx.sessions.filter((s) => s.status !== 'cancelled' && s.instructorId);
  const staff = await loadStaff(sessions.map((s) => s.instructorId!));
  const byStaff = new Map<string, typeof sessions>();
  for (const s of sessions) byStaff.set(s.instructorId!, [...(byStaff.get(s.instructorId!) ?? []), s]);
  const instructors = [...byStaff.entries()]
    .map(([uid, list]) => {
      const p = staff.get(uid);
      return {
        staffId: uid,
        name: p?.displayName ?? uid,
        title: p?.title,
        bio: p?.bio,
        specialties: p?.specialties ?? [],
        photoUrl: p?.photoUrl,
        sessions: list
          .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.startTime.localeCompare(b.startTime))
          .map((s) => ({ sessionNumber: s.sessionNumber, date: s.scheduledDate, sectionLabel: ctx.sectionLabel(s.sectionId), topic: s.topic })),
      };
    })
    .sort((a, b) => b.sessions.length - a.sessions.length || a.name.localeCompare(b.name, 'ko'));
  const campusId = ctx.run.campusId as string;
  const [campusSnap, managers] = await Promise.all([
    getDb().collection('campuses').doc(campusId).get(),
    getDb().collection('staff').where('campusIds', 'array-contains', campusId).get(),
  ]);
  const campus = campusSnap.data() ?? {};
  const manager = managers.docs.map((d) => d.data()).find((d) => d.role === 'centerAdmin');
  return {
    instructors,
    contact: {
      campusName: (campus.name as string) ?? campusId,
      address: campus.address as string | undefined,
      managerName: (manager?.displayName as string) || (manager?.name as string) || '캠퍼스 담당',
      managerRole: '프로그램 매니저',
      phone: campus.phone as string | undefined, // 캠퍼스 대표 번호만 (개인 연락처는 내보내지 않는다)
      hours: (campus.chatHours as string) || DEFAULT_CHAT_HOURS,
    },
  };
}

async function recentNotices(programRunId: string, limit?: number) {
  const snap = await getDb().collection('notifications').where('programRunId', '==', programRunId).where('type', '==', 'notice').get();
  const list = snap.docs
    .map((d) => ({ id: d.id, title: (d.data().title as string) ?? '', createdAt: tsIso(d.data().createdAt), recipients: (d.data().recipients as number) ?? 0 }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return limit ? list.slice(0, limit) : list;
}

async function inquiriesFor(ctx: RunContext) {
  const snap = await getDb().collection('inquiries').where('programRunId', '==', ctx.runId).get();
  const dtos = await inquiryDtos(
    snap.docs.map((d) => ({ id: d.id, data: d.data() })),
    { mask: !!ctx.run.partnerNameMasking },
  );
  dtos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    stats: await inquiryStatsFor(ctx.runId),
    complaints: dtos.filter((q) => q.kind === 'complaint'),
    loggedQuestions: dtos.filter((q) => q.kind === 'question'),
  };
}

// ── Callable ─────────────────────────────────────────────

export const getPartnerAccess = onCall(REGION, async (req: CallableRequest<Record<string, never>>) => {
  const uid = req.auth?.uid;
  const empty = { allowed: false, uid: uid ?? '', displayName: '', organization: '', programRunIds: [] as string[], mustChangePassword: false };
  if (!uid) return empty;
  const snap = await getDb().collection('officers').doc(uid).get();
  if (!snap.exists || snap.data()!.disabled) return empty;
  const o = snap.data()!;
  await snap.ref.update({ lastLoginAt: Timestamp.now() });
  return {
    allowed: true,
    uid,
    displayName: (o.displayName as string) ?? '',
    email: o.email as string | undefined,
    organization: (o.organization as string) ?? '',
    title: o.title as string | undefined,
    programRunIds: (o.programRunIds as string[]) ?? [],
    mustChangePassword: !!o.mustChangePassword,
  };
});

/** 첫 로그인 — 클라이언트가 updatePassword 를 마친 뒤 부른다 */
export const completeOfficerPasswordChange = onCall(REGION, async (req: CallableRequest<Record<string, never>>) => {
  const o = await officerDoc(req);
  await getDb().collection('officers').doc(o.uid).update({ mustChangePassword: false, passwordChangedAt: Timestamp.now() });
  return { ok: true };
});

export const listPartnerRuns = onCall(REGION, async (req: CallableRequest<Record<string, never>>) => {
  const o = await officerDoc(req);
  const ids = (o.data.programRunIds as string[] | undefined) ?? [];
  const campuses = await loadCampuses();
  const order: Record<string, number> = { active: 0, scheduled: 1, draft: 2, completed: 3, cancelled: 4 };
  const runs = [];
  for (const id of ids) {
    const snap = await getDb().collection('programRuns').doc(id).get();
    if (!snap.exists) continue;
    const r = snap.data()!;
    runs.push({
      id,
      title: runTitle(r),
      contractCode: (r.contractCode as string) ?? '',
      campusName: (campuses.get(r.campusId as string)?.name as string) ?? (r.campusId as string),
      municipalityName: (r.municipalityName as string) ?? '',
      status: (r.status as string) ?? 'draft',
      startDate: (r.startDate as string) ?? '',
      endDate: (r.endDate as string | null) ?? null,
    });
  }
  runs.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || b.startDate.localeCompare(a.startDate));
  return { runs };
});

export const getPartnerHome = onCall(REGION, async (req: CallableRequest<{ programRunId: string }>) => {
  const { ctx } = await assertOfficerRun(req, req.data?.programRunId);
  const lessons = await partnerLessons(ctx);
  const rows = lessons.map((l) => l.attendance);
  const done = lessons.filter((l) => l.status === 'done' || (l.status === 'today' && l.attendance.present + l.attendance.late + l.attendance.absent > 0)).length;
  const next = lessons.find((l) => l.status === 'upcoming' || (l.status === 'today' && l.attendance.unrecorded > 0)) ?? null;
  const [campuses, inq, notices, survey] = await Promise.all([loadCampuses(), inquiriesFor(ctx), recentNotices(ctx.runId, 3), surveyResultsFor(ctx.runId, { publicOnly: true, mask: true })]);
  return {
    run: runSummaryDto(ctx, campuses, lessons.length),
    host: ctx.run.host as string | undefined,
    progress: { done, total: lessons.length, nextDate: next?.date ?? null },
    attendance: { rate: overallRate(rows), rows },
    inquiryStats: inq.stats,
    nextLesson: next,
    recentComplaints: inq.complaints.slice(0, 3),
    recentNotices: notices,
    survey: survey ? { title: survey.title, status: survey.status, responses: survey.responses, eligible: survey.eligible, overallAvg: survey.overallAvg } : null,
  };
});

export const listPartnerLessons = onCall(REGION, async (req: CallableRequest<{ programRunId: string }>) => {
  const { ctx } = await assertOfficerRun(req, req.data?.programRunId);
  return { lessons: await partnerLessons(ctx) };
});

export const listPartnerInquiries = onCall(REGION, async (req: CallableRequest<{ programRunId: string }>) => {
  const { ctx } = await assertOfficerRun(req, req.data?.programRunId);
  return inquiriesFor(ctx);
});

export const setOfficerNote = onCall(REGION, async (req: CallableRequest<{ inquiryId: string; note: string }>) => {
  const inquiryId = req.data?.inquiryId?.trim();
  if (!inquiryId) throw new HttpsError('invalid-argument', 'inquiryId가 필요합니다.');
  const ref = getDb().collection('inquiries').doc(inquiryId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', '민원을 찾을 수 없어요.');
  const o = await officerDoc(req);
  if (!((o.data.programRunIds as string[] | undefined) ?? []).includes(snap.data()!.programRunId as string)) throw new HttpsError('permission-denied', '담당하는 운영 건이 아니에요.');
  const note = typeof req.data?.note === 'string' ? req.data.note.trim().slice(0, 500) : '';
  await ref.update({ officerNote: note || null, officerNoteByUid: o.uid, officerNoteAt: Timestamp.now() });
  return { ok: true };
});

export const getPartnerParticipation = onCall(REGION, async (req: CallableRequest<{ programRunId: string }>) => {
  const { ctx } = await assertOfficerRun(req, req.data?.programRunId);
  return partnerParticipation(ctx, await partnerLessons(ctx));
});

export const getPartnerSurveyResults = onCall(REGION, async (req: CallableRequest<{ programRunId: string }>) => {
  const { ctx } = await assertOfficerRun(req, req.data?.programRunId);
  return { results: await surveyResultsFor(ctx.runId, { publicOnly: true, mask: true }) };
});

export const listPartnerInstructors = onCall(REGION, async (req: CallableRequest<{ programRunId: string }>) => {
  const { ctx } = await assertOfficerRun(req, req.data?.programRunId);
  return partnerInstructors(ctx);
});

/** 보고서 한 벌 — 브라우저가 HWPX · DOCX · PDF · XLSX 로 만든다 */
export const getPartnerReportData = onCall(REGION, async (req: CallableRequest<{ programRunId: string }>) => {
  const { ctx } = await assertOfficerRun(req, req.data?.programRunId);
  const run = ctx.run;
  const [lessons, campuses, tplSnap, notices, survey, finalsSnap] = await Promise.all([
    partnerLessons(ctx),
    loadCampuses(),
    run.programTemplateId ? getDb().collection('programTemplates').doc(run.programTemplateId as string).get() : null,
    recentNotices(ctx.runId),
    surveyResultsFor(ctx.runId, { publicOnly: true, mask: true }),
    getDb().collection('reports').where('programRunId', '==', ctx.runId).get(),
  ]);
  const participation = await partnerParticipation(ctx, lessons);
  const { instructors, contact } = await partnerInstructors(ctx);
  const inquiries = await inquiriesFor(ctx);
  const tpl = tplSnap?.data() ?? {};
  const ov = (run.overrides as Record<string, unknown> | undefined) ?? {};
  const rows = lessons.map((l) => l.attendance);
  const slots = [...new Set(lessons.flatMap((l) => l.slots))];
  const grades = { S: 0, A: 0, B: 0, C: 0 } as Record<'S' | 'A' | 'B' | 'C', number>;
  const strengths = new Map<string, number>();
  for (const d of finalsSnap.docs) {
    const f = d.data();
    const g = f.totalGrade as 'S' | 'A' | 'B' | 'C';
    if (g in grades) grades[g]++;
    for (const s of (f.strengthAreas as string[] | undefined) ?? []) strengths.set(s, (strengths.get(s) ?? 0) + 1);
  }
  const summary = runSummaryDto(ctx, campuses, lessons.length);
  return {
    generatedAt: new Date().toISOString(),
    run: {
      id: ctx.runId,
      title: summary.title,
      contractCode: summary.contractCode,
      municipalityName: summary.municipalityName,
      host: run.host as string | undefined,
      campusName: summary.campusName,
      location: summary.location,
      targetGrade: (run.targetGrade as string) || (tpl.targetGrade as string) || '',
      startDate: summary.startDate,
      endDate: summary.endDate,
      scheduleLine: `${summary.frequency === 'weekly' ? '매주' : '격주'} ${WEEKDAYS[summary.fixedDay] ?? ''}요일 · ${slots.join(' / ') || `${summary.startTime}–${summary.endTime}`}`,
      totalSessions: lessons.length,
      lessonsPerSession: lessons[0]?.lessonCount ?? 3,
      minutesPerLesson: (run.minutesPerLesson as number) ?? 40,
      sections: summary.sections.map((s) => ({ label: s.label, studentCount: s.studentCount })),
      studentCount: participation.students.length,
      purpose: (ov.purpose as string) || (tpl.purpose as string) || '',
      overview: (ov.overview as string) || (tpl.overview as string) || '',
      features: (ov.features as string[] | undefined) ?? (tpl.features as string[] | undefined) ?? [],
    },
    lessons,
    instructors,
    contact,
    participation,
    attendanceRows: rows,
    overallAttendanceRate: overallRate(rows),
    inquiries: {
      stats: inquiries.stats,
      complaints: [...inquiries.complaints].reverse(),
      loggedQuestions: [...inquiries.loggedQuestions].reverse(),
    },
    survey,
    notices: [...notices].reverse().map((n) => ({ title: n.title, createdAt: n.createdAt, recipients: n.recipients })),
    finalReports: finalsSnap.size
      ? {
          issued: finalsSnap.size,
          students: participation.students.length,
          grades,
          topStrengths: [...strengths.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, count]) => ({ label, count })),
        }
      : null,
  };
});
