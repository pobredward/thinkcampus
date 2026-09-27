/**
 * 학부모 앱 — 자녀의 수강 목록: 운영 건 + (학생이 속한 반의) 회차 + 회차 수업 내용(sessionTemplates) + 강사 이름
 */
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { assertGuardianOfStudent } from './lib/assertGuardianOfStudent';
import { loadStaff } from './lib/runContext';
import { UNASSIGNED_SECTION_ID } from './lib/centerRunHelpers';

function getDb() {
  return admin.firestore();
}

/** sessionTemplates 문서에서 학부모 앱이 보여 줄 수업 내용 */
export interface ProgramBundleSessionContent {
  description?: string;
  objectives?: string[];
  teachingMethod?: string;
  curriculum?: string[];
  materials?: string[];
  rotationNote?: string;
  programCode?: string;
  planUrl?: string;
  lessonPlans?: Array<{ lessonNumber: number; topic: string; slideUrl?: string; activityUrl?: string }>;
  qna?: Array<{ q: string; a: string }>;
}

export interface ProgramBundleRunSession {
  id: string;
  programRunId: string;
  sessionNumber: number;
  sessionTemplateId: string;
  topic: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  lessonCount: number;
  location: string;
  status: string;
  cancelReason?: string;
  overrides?: { description?: string };
  sectionId?: string;
  instructorId?: string | null;
  instructor?: { name: string; title: string; bio: string };
  content?: ProgramBundleSessionContent;
}

export interface ProgramBundleRun {
  contractCode: string;
  programTemplateId: string;
  campusId: string;
  municipalityName: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  frequency: 'weekly' | 'biweekly';
  fixedDay: number;
  startTime: string;
  endTime: string;
  location: string;
  mapQuery?: string;
  host?: string;
  logoUrl?: string;
  title?: string;
  subtitle?: string;
  category?: string;
  targetGrade?: string;
  overview?: string;
  purpose?: string;
  features?: string[];
  commonMaterials?: string[];
  notices?: string[];
  faq?: Array<{ topic: string; q: string; a: string }>;
  directions?: Array<{ label: string; text: string }>;
}

export interface StudentProgramBundleDto {
  enrollmentId: string;
  programRunId: string;
  status: string;
  run: ProgramBundleRun;
  sessions: ProgramBundleRunSession[];
}

interface ListStudentProgramBundlesRequest {
  studentId: string;
  programRunId?: string;
}

export interface ListStudentProgramBundlesResponse {
  bundles: StudentProgramBundleDto[];
}

export const listStudentProgramBundles = onCall(
  { region: 'asia-northeast3', maxInstances: 15 },
  async (
    req: CallableRequest<ListStudentProgramBundlesRequest>,
  ): Promise<ListStudentProgramBundlesResponse> => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');

    const studentId = req.data?.studentId?.trim();
    const filterRunId = req.data?.programRunId?.trim();
    if (!studentId) throw new HttpsError('invalid-argument', 'studentId가 필요합니다.');

    await assertGuardianOfStudent(uid, studentId);

    let enrQuery = getDb()
      .collection('studentProgramEnrollments')
      .where('studentId', '==', studentId);
    if (filterRunId) {
      enrQuery = enrQuery.where('programRunId', '==', filterRunId);
    }
    const enrSnap = await enrQuery.get();
    if (enrSnap.empty) return { bundles: [] };

    const runIds = [...new Set(enrSnap.docs.map((d) => d.data().programRunId as string))];
    const runSnaps = await getDb().getAll(...runIds.map((id) => getDb().collection('programRuns').doc(id)));
    const runById = new Map<string, admin.firestore.DocumentData>();
    for (const snap of runSnaps) {
      if (snap.exists) runById.set(snap.id, snap.data()!);
    }

    const sessionsByRun = new Map<string, ProgramBundleRunSession[]>();
    await Promise.all(
      runIds.map(async (runId) => {
        const sessSnap = await getDb()
          .collection('runSessions')
          .where('programRunId', '==', runId)
          .orderBy('sessionNumber', 'asc')
          .get();
        const list: ProgramBundleRunSession[] = sessSnap.docs.map((d) => {
          const s = d.data();
          return {
            id: d.id,
            programRunId: runId,
            sessionNumber: s.sessionNumber as number,
            sessionTemplateId: (s.sessionTemplateId as string) ?? '',
            topic: (s.topic as string) ?? '',
            scheduledDate: s.scheduledDate as string,
            startTime: s.startTime as string,
            endTime: s.endTime as string,
            lessonCount: s.lessonCount as number,
            location: s.location as string,
            status: (s.status as string) ?? 'scheduled',
            ...(s.cancelReason ? { cancelReason: s.cancelReason as string } : {}),
            ...(s.overrides ? { overrides: s.overrides as { description?: string } } : {}),
            sectionId: (s.sectionId as string)?.trim() || UNASSIGNED_SECTION_ID,
            instructorId: (s.instructorId as string | undefined)?.trim() || null,
          };
        });
        sessionsByRun.set(runId, list);
      }),
    );

    // 수업 내용(sessionTemplates) · 강사 프로필(staff) — 회차에 붙인다
    const allSessions = [...sessionsByRun.values()].flat();
    const tplIds = [...new Set(allSessions.map((s) => s.sessionTemplateId).filter(Boolean))];
    const tplById = new Map<string, admin.firestore.DocumentData>();
    for (let i = 0; i < tplIds.length; i += 100) {
      const snaps = await getDb().getAll(...tplIds.slice(i, i + 100).map((id) => getDb().collection('sessionTemplates').doc(id)));
      for (const t of snaps) if (t.exists) tplById.set(t.id, t.data()!);
    }
    const staff = await loadStaff(allSessions.map((s) => s.instructorId ?? ''));
    for (const s of allSessions) {
      const t = tplById.get(s.sessionTemplateId);
      if (t) {
        s.content = {
          description: (t.description as string) ?? undefined,
          objectives: (t.defaultObjectives as string[]) ?? (t.objectives as string[]) ?? undefined,
          teachingMethod: t.teachingMethod as string | undefined,
          curriculum: (t.defaultCurriculum as string[]) ?? (t.curriculum as string[]) ?? undefined,
          materials: (t.defaultMaterials as string[]) ?? (t.materials as string[]) ?? undefined,
          rotationNote: t.rotationNote as string | undefined,
          programCode: t.programCode as string | undefined,
          planUrl: t.planUrl as string | undefined,
          lessonPlans: t.lessonPlans as ProgramBundleSessionContent['lessonPlans'],
          qna: t.qna as ProgramBundleSessionContent['qna'],
        };
      }
      if (s.instructorId) {
        const p = staff.get(s.instructorId);
        if (p) s.instructor = { name: p.displayName, title: p.title ?? '', bio: p.bio ?? '' };
      }
    }

    const bundles: StudentProgramBundleDto[] = [];
    for (const enr of enrSnap.docs) {
      const data = enr.data();
      const programRunId = data.programRunId as string;
      const runData = runById.get(programRunId);
      if (!runData) continue;

      const ov = (runData.overrides as Record<string, unknown> | undefined) ?? {};
      const run: ProgramBundleRun = {
        title: (runData.title as string) || undefined,
        subtitle: runData.subtitle as string | undefined,
        category: runData.category as string | undefined,
        targetGrade: runData.targetGrade as string | undefined,
        overview: ov.overview as string | undefined,
        purpose: ov.purpose as string | undefined,
        features: ov.features as string[] | undefined,
        commonMaterials: ov.commonMaterials as string[] | undefined,
        notices: ov.notices as string[] | undefined,
        faq: ov.faq as ProgramBundleRun['faq'],
        directions: ov.directions as ProgramBundleRun['directions'],
        contractCode: runData.contractCode as string,
        programTemplateId: runData.programTemplateId as string,
        campusId: runData.campusId as string,
        municipalityName: (runData.municipalityName as string) ?? '',
        status: (runData.status as string) ?? 'draft',
        startDate: runData.startDate as string,
        endDate: (runData.endDate as string | null) ?? null,
        frequency: runData.frequency as 'weekly' | 'biweekly',
        fixedDay: runData.fixedDay as number,
        startTime: runData.startTime as string,
        endTime: runData.endTime as string,
        location: runData.location as string,
        ...(runData.mapQuery ? { mapQuery: runData.mapQuery as string } : {}),
        ...(runData.host ? { host: runData.host as string } : {}),
        ...(runData.logoUrl ? { logoUrl: runData.logoUrl as string } : {}),
      };

      // 학생이 속한 반의 회차만 (반이 없는 운영 건은 전체)
      const mySection = (data.sectionId as string)?.trim() || UNASSIGNED_SECTION_ID;
      const runSessions = sessionsByRun.get(programRunId) ?? [];
      const hasSections = runSessions.some((s) => s.sectionId && s.sectionId !== UNASSIGNED_SECTION_ID);
      const sessions = hasSections && mySection !== UNASSIGNED_SECTION_ID ? runSessions.filter((s) => s.sectionId === mySection || s.sectionId === UNASSIGNED_SECTION_ID) : runSessions;
      bundles.push({
        enrollmentId: enr.id,
        programRunId,
        status: (data.status as string) ?? 'active',
        run,
        sessions,
      });
    }

    bundles.sort((a, b) => {
      const ta = `${a.run.municipalityName} ${a.run.contractCode}`;
      const tb = `${b.run.municipalityName} ${b.run.contractCode}`;
      return ta.localeCompare(tb, 'ko');
    });

    return { bundles };
  },
);
