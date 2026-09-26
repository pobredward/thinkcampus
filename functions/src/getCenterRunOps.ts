import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { assertCenterStaffForCampus } from './auth/assertCenterStaff';
import { COL_GUARDIAN_LINKS } from './lib/collections';

function getDb() {
  return admin.firestore();
}

function todayKstDate(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function sessionTopic(data: admin.firestore.DocumentData): string {
  const overrides = data.overrides as { topic?: string } | undefined;
  return overrides?.topic?.trim() || (data.topic as string)?.trim() || `회차 ${data.sessionNumber}`;
}

export type CenterReportStatus = 'draft' | 'centerReviewed' | 'published';

export interface GetCenterRunOpsRequest {
  programRunId: string;
}

export interface CenterDashboardKpi {
  sessionsToday: number;
  attendancePendingSessions: number;
  reportsPendingReview: number;
  studentsWithoutGuardian: number;
  sessionsWithoutInstructor: number;
}

export interface CenterLessonRow {
  id: string;
  sessionNumber: number;
  topic: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  location: string;
  instructorName?: string;
  attendanceRate: number;
}

export interface CenterStudentRow {
  studentId: string;
  name: string;
  householdId?: string;
  enrollmentCodeStatus: 'unused' | 'used' | 'unknown';
}

export interface CenterGuardianRow {
  studentId: string;
  studentName: string;
  guardians: Array<{
    name: string;
    relation: string;
    linked: boolean;
    linkedAt?: string;
  }>;
  unlinkedNote?: string;
}

export interface CenterInstructorRow {
  staffId: string;
  name: string;
  email?: string;
  sessionsThisWeek: number;
}

export interface CenterReportRow {
  id: string;
  sessionNumber: number;
  studentName: string;
  status: CenterReportStatus;
  instructorName?: string;
  submittedAt?: string;
}

export interface CenterNotificationRow {
  id: string;
  type: string;
  title: string;
  sentAt: string;
  channel: string;
}

export interface GetCenterRunOpsResponse {
  programRunId: string;
  contractCode: string;
  campusId: string;
  dashboard: CenterDashboardKpi;
  lessons: CenterLessonRow[];
  students: CenterStudentRow[];
  guardians: CenterGuardianRow[];
  instructors: CenterInstructorRow[];
  reports: CenterReportRow[];
  notifications: CenterNotificationRow[];
}

async function resolveStaffName(staffId: string): Promise<{ name: string; email?: string }> {
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

async function resolveGuardianDisplay(uid: string): Promise<string> {
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

function formatTimestamp(ts: admin.firestore.Timestamp | undefined): string | undefined {
  if (!ts) return undefined;
  return ts.toDate().toISOString().slice(0, 10);
}

function formatSentAt(ts: admin.firestore.Timestamp | undefined): string {
  if (!ts) return '—';
  const d = ts.toDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const getCenterRunOps = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<GetCenterRunOpsRequest>): Promise<GetCenterRunOpsResponse> => {
    const programRunId = req.data?.programRunId?.trim();
    if (!programRunId) {
      throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
    }

    const runSnap = await getDb().collection('programRuns').doc(programRunId).get();
    if (!runSnap.exists) {
      throw new HttpsError('not-found', '운영 건을 찾을 수 없습니다.');
    }
    const run = runSnap.data()!;
    const campusId = run.campusId as string;
    const contractCode = run.contractCode as string;
    const runLocation = (run.location as string) || '';
    assertCenterStaffForCampus(req, campusId);

    const today = todayKstDate();

    const [sessSnap, enrSnap, attSnap, linksSnap, reportsSnap, notifSnap] = await Promise.all([
      getDb()
        .collection('runSessions')
        .where('programRunId', '==', programRunId)
        .orderBy('sessionNumber', 'asc')
        .get(),
      getDb().collection('studentProgramEnrollments').where('programRunId', '==', programRunId).get(),
      getDb().collection('sessionAttendance').where('programRunId', '==', programRunId).get(),
      getDb().collection(COL_GUARDIAN_LINKS).where('campusId', '==', campusId).get(),
      getDb().collection('sessionReports').where('programRunId', '==', programRunId).get(),
      getDb()
        .collection('notifications')
        .where('programRunId', '==', programRunId)
        .orderBy('createdAt', 'desc')
        .limit(30)
        .get()
        .catch(() => null),
    ]);

    const enrollmentCount = enrSnap.size;
    const studentIds = enrSnap.docs.map((d) => d.data().studentId as string);
    const studentIdSet = new Set(studentIds);

    const attBySession = new Map<string, number>();
    for (const doc of attSnap.docs) {
      const sid = doc.data().runSessionId as string;
      if (!sid) continue;
      attBySession.set(sid, (attBySession.get(sid) ?? 0) + 1);
    }

    const instructorIds = new Set<string>();
    let sessionsToday = 0;
    let attendancePendingSessions = 0;
    let sessionsWithoutInstructor = 0;

    const lessons: CenterLessonRow[] = [];
    for (const doc of sessSnap.docs) {
      const s = doc.data();
      const status = s.status as string;
      if (status === 'cancelled') continue;

      const scheduledDate = s.scheduledDate as string;
      if (scheduledDate === today) sessionsToday += 1;

      const instructorId = s.instructorId as string | undefined;
      if (!instructorId) sessionsWithoutInstructor += 1;
      else instructorIds.add(instructorId);

      const recorded = attBySession.get(doc.id) ?? 0;
      const rate = enrollmentCount > 0 ? recorded / enrollmentCount : 0;
      if (enrollmentCount > 0 && recorded < enrollmentCount) {
        attendancePendingSessions += 1;
      }

      lessons.push({
        id: doc.id,
        sessionNumber: s.sessionNumber as number,
        topic: sessionTopic(s),
        scheduledDate,
        startTime: (s.startTime as string) || (run.startTime as string) || '',
        endTime: (s.endTime as string) || (run.endTime as string) || '',
        location: (s.location as string) || runLocation,
        attendanceRate: rate,
      });
    }

    const instructorNameById = new Map<string, string>();
    await Promise.all(
      [...instructorIds].map(async (id) => {
        const { name } = await resolveStaffName(id);
        instructorNameById.set(id, name);
      }),
    );
    for (const lesson of lessons) {
      const sessDoc = sessSnap.docs.find((d) => d.id === lesson.id);
      const iid = sessDoc?.data().instructorId as string | undefined;
      if (iid) lesson.instructorName = instructorNameById.get(iid);
    }

    const students: CenterStudentRow[] = [];
    let studentsWithoutGuardian = 0;

    const linksByStudent = new Map<string, admin.firestore.QueryDocumentSnapshot[]>();
    for (const linkDoc of linksSnap.docs) {
      const sid = linkDoc.data().studentId as string;
      if (!studentIdSet.has(sid)) continue;
      const arr = linksByStudent.get(sid) ?? [];
      arr.push(linkDoc);
      linksByStudent.set(sid, arr);
    }

    for (const enrDoc of enrSnap.docs) {
      const data = enrDoc.data();
      const studentId = data.studentId as string;
      let name = (data.studentName as string)?.trim();
      let householdId: string | undefined;
      const stSnap = await getDb().collection('students').doc(studentId).get();
      if (stSnap.exists) {
        const st = stSnap.data()!;
        if (!name) name = (st.name as string) || studentId;
        householdId = st.householdId as string | undefined;
        const guardians = (st.guardianUids as string[] | undefined) ?? [];
        if (guardians.length === 0) studentsWithoutGuardian += 1;
      } else if (!name) {
        name = studentId;
        studentsWithoutGuardian += 1;
      }

      let enrollmentCodeStatus: CenterStudentRow['enrollmentCodeStatus'] = 'unknown';
      const codeSnap = await getDb()
        .collection('enrollmentCodes')
        .where('studentId', '==', studentId)
        .limit(1)
        .get();
      if (!codeSnap.empty) {
        enrollmentCodeStatus = codeSnap.docs[0].data().used ? 'used' : 'unused';
      }

      students.push({
        studentId,
        name,
        householdId,
        enrollmentCodeStatus,
      });
    }
    students.sort((a, b) => a.name.localeCompare(b.name, 'ko'));

    const guardians: CenterGuardianRow[] = [];
    for (const st of students) {
      const linkDocs = linksByStudent.get(st.studentId) ?? [];
      if (linkDocs.length === 0) {
        const note =
          st.enrollmentCodeStatus === 'unused'
            ? '등록코드 발급됨 · 앱 미연결'
            : st.enrollmentCodeStatus === 'used'
              ? '코드 사용됨 · 연결 문서 없음'
              : '연결된 보호자 없음';
        guardians.push({
          studentId: st.studentId,
          studentName: st.name,
          guardians: [],
          unlinkedNote: note,
        });
        continue;
      }

      const guardianEntries: CenterGuardianRow['guardians'] = [];
      for (const linkDoc of linkDocs) {
        const ld = linkDoc.data();
        const guardianUid = ld.guardianUid as string;
        const name = await resolveGuardianDisplay(guardianUid);
        guardianEntries.push({
          name,
          relation: (ld.guardianRelation as string) || '보호자',
          linked: (ld.status as string) !== 'inactive',
          linkedAt: formatTimestamp(ld.createdAt as admin.firestore.Timestamp),
        });
      }
      guardians.push({
        studentId: st.studentId,
        studentName: st.name,
        guardians: guardianEntries,
      });
    }

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const sessionsPerInstructor = new Map<string, number>();
    for (const doc of sessSnap.docs) {
      const s = doc.data();
      if ((s.status as string) === 'cancelled') continue;
      const date = s.scheduledDate as string;
      if (date < weekStartStr) continue;
      const iid = s.instructorId as string | undefined;
      if (!iid) continue;
      sessionsPerInstructor.set(iid, (sessionsPerInstructor.get(iid) ?? 0) + 1);
    }

    const instructors: CenterInstructorRow[] = [];
    for (const staffId of instructorIds) {
      const { name, email } = await resolveStaffName(staffId);
      instructors.push({
        staffId,
        name,
        email,
        sessionsThisWeek: sessionsPerInstructor.get(staffId) ?? 0,
      });
    }
    instructors.sort((a, b) => a.name.localeCompare(b.name, 'ko'));

    const studentNameById = new Map(students.map((s) => [s.studentId, s.name]));

    let reportsPendingReview = 0;
    const reports: CenterReportRow[] = [];
    for (const doc of reportsSnap.docs) {
      const r = doc.data();
      const status = (r.status as CenterReportStatus) || 'draft';
      if (status === 'centerReviewed') reportsPendingReview += 1;

      const studentId = r.studentId as string;
      let instructorName: string | undefined;
      const instructorId = r.instructorId as string | undefined;
      if (instructorId) {
        instructorName = instructorNameById.get(instructorId) ?? (await resolveStaffName(instructorId)).name;
      }

      reports.push({
        id: doc.id,
        sessionNumber: (r.sessionNumber as number) ?? 0,
        studentName: studentNameById.get(studentId) ?? studentId,
        status,
        instructorName,
        submittedAt: formatTimestamp(
          (r.submittedAt as admin.firestore.Timestamp) || (r.updatedAt as admin.firestore.Timestamp),
        ),
      });
    }
    reports.sort((a, b) => b.sessionNumber - a.sessionNumber);

    const notifications: CenterNotificationRow[] = [];
    if (notifSnap) {
      for (const doc of notifSnap.docs) {
        const n = doc.data();
        notifications.push({
          id: doc.id,
          type: (n.type as string) || 'notice',
          title: (n.title as string) || '알림',
          sentAt: formatSentAt(n.createdAt as admin.firestore.Timestamp),
          channel: (n.channel as string) || '앱 알림',
        });
      }
    }

    return {
      programRunId,
      contractCode,
      campusId,
      dashboard: {
        sessionsToday,
        attendancePendingSessions,
        reportsPendingReview,
        studentsWithoutGuardian,
        sessionsWithoutInstructor,
      },
      lessons,
      students,
      guardians,
      instructors,
      reports,
      notifications,
    };
  },
);
