/**
 * 체험판 · 학부모 API — 보호자 신선웅(010-7656-7933)의 두 자녀 신민준(1반) · 신서연(4반)
 */

import type { GuardianApi } from "@/services/api";
import type { ChildDto, GuardianNotificationDto, GuardianProgramBundle, StudentReport } from "@/services/types";
import { attendanceRecordDtos, buildProgramForSection, campusName, delay, runById } from "./select";
import { DEMO_GUARDIAN_NAME, DEMO_GUARDIAN_UID, getDemoWorld, mutateDemoWorld, resetDemoWorld } from "./world";
import { demoShareToken } from "@/services/sharedReport";
import { buildRoomDetail, guardianRooms, markReadInWorld, sendMessageInWorld, type ChatViewer } from "./chat";
import { pendingSurveysFor, submitSurveyInWorld, surveyDtoFor } from "./survey";

function toDotDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, ".");
}

export function demoGuardianName(): string | null {
  const g = getDemoWorld().guardians.find((x) => x.uid === DEMO_GUARDIAN_UID);
  return g ? g.displayName : DEMO_GUARDIAN_NAME;
}

export function setDemoGuardianName(name: string): void {
  mutateDemoWorld((w) => {
    const g = w.guardians.find((x) => x.uid === DEMO_GUARDIAN_UID);
    if (g) g.displayName = name;
  });
}

export function createDemoGuardianApi(): GuardianApi {
  const uid = DEMO_GUARDIAN_UID;
  const viewer: ChatViewer = { kind: "guardian", uid };

  return {
    async listChildren(opts) {
      const w = getDemoWorld();
      const links = w.guardianLinks.filter((l) => l.guardianUid === uid && (!opts?.activeOnly || l.status === "active"));
      const list: ChildDto[] = links.map((l) => {
        const student = w.students.find((s) => s.id === l.studentId);
        return {
          guardianLinkId: l.id,
          studentId: l.studentId,
          studentName: student?.name ?? l.studentId,
          campusId: l.campusId,
          campusName: campusName(w, l.campusId),
          relation: l.guardianRelation,
        };
      });
      const unique = list.filter((c, i) => list.findIndex((x) => x.studentId === c.studentId) === i);
      unique.sort((a, b) => a.studentName.localeCompare(b.studentName, "ko"));
      return delay(unique);
    },

    async listProgramBundles(studentId) {
      const w = getDemoWorld();
      const bundles: GuardianProgramBundle[] = w.enrollments
        .filter((e) => e.studentId === studentId)
        .map((e) => {
          const run = runById(w, e.programRunId);
          return {
            enrollmentId: e.id,
            programRunId: e.programRunId,
            status: e.status,
            program: buildProgramForSection(w, run, e.sectionId, e.status),
          };
        });
      // 수강 중 → 예정 → 완료(최근순)
      const order = { active: 0, upcoming: 1, completed: 2, withdrawn: 3 } as const;
      bundles.sort((a, b) => order[a.status] - order[b.status] || b.program.startDate.localeCompare(a.program.startDate));
      return delay(bundles);
    },

    async getProgramBundle(studentId, programRunId) {
      const all = await this.listProgramBundles(studentId);
      return all.find((b) => b.programRunId === programRunId) ?? null;
    },

    async listAttendance(studentId, programRunId) {
      return delay(attendanceRecordDtos(getDemoWorld(), studentId, programRunId));
    },

    async getFinalReport(studentId, programRunId) {
      const r = getDemoWorld().finalReports.find((x) => x.studentId === studentId && x.programRunId === programRunId);
      if (!r) return delay(null);
      const report: StudentReport & { programRunId?: string } = { ...r };
      delete report.programRunId;
      return delay(report);
    },

    async listNotifications() {
      const w = getDemoWorld();
      const myStudents = new Set(w.guardianLinks.filter((l) => l.guardianUid === uid).map((l) => l.studentId));
      const myRuns = new Set(w.enrollments.filter((e) => myStudents.has(e.studentId)).map((e) => e.programRunId));
      const mySections = new Set(w.enrollments.filter((e) => myStudents.has(e.studentId)).map((e) => `${e.programRunId}/${e.sectionId}`));
      const list: GuardianNotificationDto[] = w.notifications
        .filter((n) => {
          if (n.studentId) return myStudents.has(n.studentId);
          if (n.programRunId && n.sectionId) return mySections.has(`${n.programRunId}/${n.sectionId}`);
          if (n.programRunId) return myRuns.has(n.programRunId);
          return true;
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          date: toDotDate(n.createdAt),
          isRead: n.readBy.includes(uid),
        }));
      return delay(list);
    },

    async markNotificationRead(id) {
      mutateDemoWorld((w) => {
        const n = w.notifications.find((x) => x.id === id);
        if (n && !n.readBy.includes(uid)) n.readBy.push(uid);
      });
    },

    async createShareLink(reportId) {
      // 체험판 링크는 쿠키 없이도 누구나 열린다 (/r/demo-<reportId> 가 같은 시드로 리포트를 다시 만든다)
      if (!getDemoWorld().finalReports.some((r) => r.reportId === reportId)) throw new Error("리포트를 찾을 수 없어요");
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      return delay({ url: `${origin}/r/${demoShareToken(reportId)}`, expiresAt: expires.toISOString() }, 300);
    },

    async listPendingHousehold() {
      // 같은 가구인데 아직 내 계정에 연결되지 않은 학생
      const w = getDemoWorld();
      const mine = w.students.filter((s) => s.guardianUids.includes(uid));
      const households = new Set(mine.map((s) => s.householdId));
      const pending = w.students
        .filter((s) => households.has(s.householdId) && !s.guardianUids.includes(uid))
        .map((s) => ({ studentId: s.id, maskedName: s.name[0] + "○".repeat(Math.max(1, s.name.length - 1)) }));
      return delay(pending);
    },

    async linkHouseholdMember(studentId, birthDate) {
      const w = getDemoWorld();
      const s = w.students.find((x) => x.id === studentId);
      if (!s) throw new Error("학생을 찾을 수 없습니다.");
      if (s.birthDate !== birthDate) throw new Error("생년월일이 일치하지 않습니다.");
      mutateDemoWorld((world) => {
        const st = world.students.find((x) => x.id === studentId)!;
        if (!st.guardianUids.includes(uid)) st.guardianUids.push(uid);
        world.guardianLinks.push({
          id: `gl-${uid}-${studentId}`,
          guardianUid: uid,
          studentId,
          campusId: st.campusId,
          guardianRelation: "부",
          status: "active",
        });
      });
      await delay(undefined, 200);
    },

    async addGuardianPhone(studentId, phone, relation) {
      mutateDemoWorld((w) => {
        const s = w.students.find((x) => x.id === studentId);
        if (!s) throw new Error("학생을 찾을 수 없습니다.");
        if (!s.guardianUids.includes(uid)) throw new Error("해당 학생의 보호자만 다른 보호자를 추가할 수 있습니다.");
        if (!s.allowedGuardianPhones.some((p) => p.phone === phone)) s.allowedGuardianPhones.push({ phone, relation });
      });
      await delay(undefined, 200);
    },

    async deleteAccount() {
      // 체험: 세계를 처음 상태로 돌린다 (실서비스는 deleteAccount Function)
      resetDemoWorld();
      await delay(undefined, 300);
    },

    // ── 채팅 ──
    async listChatRooms() {
      return delay(guardianRooms(getDemoWorld(), uid));
    },

    async getChatRoom(roomId) {
      return delay(buildRoomDetail(getDemoWorld(), viewer, roomId));
    },

    async sendChatMessage(input) {
      mutateDemoWorld((w) => sendMessageInWorld(w, viewer, input));
      await delay(undefined, 150);
    },

    async markChatRead(roomId) {
      const w = getDemoWorld();
      const room = w.chatRooms.find((r) => r.id === roomId);
      const unread = room ? w.chatMessages.some((m) => m.roomId === roomId && m.fromRole !== "guardian" && m.createdAt > (room.lastReadAt[uid] ?? "")) : false;
      if (unread) mutateDemoWorld((world) => markReadInWorld(world, viewer, roomId));
    },

    async countUnreadChats() {
      return guardianRooms(getDemoWorld(), uid).reduce((n, r) => n + r.unread, 0);
    },

    watchChat() {
      return () => {};
    },

    // ── 만족도 조사 ──
    async listPendingSurveys() {
      return delay(pendingSurveysFor(getDemoWorld(), uid));
    },

    async getSurvey(studentId, programRunId) {
      return delay(surveyDtoFor(getDemoWorld(), uid, studentId, programRunId));
    },

    async submitSurvey(input) {
      mutateDemoWorld((w) => submitSurveyInWorld(w, uid, input));
      await delay(undefined, 200);
    },
  };
}
