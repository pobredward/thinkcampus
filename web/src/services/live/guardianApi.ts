/**
 * 실서비스 · 학부모 API — Firestore(guardianLinks · sessionAttendance) + Cloud Functions
 */

import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { COL_GUARDIAN_LINKS } from "@/lib/collections";
import { getDb, getFirebaseAuth } from "@/lib/firebase";
import { dtoToStudentProgramBundle, type StudentProgramBundleDto } from "@/lib/studentProgramBundlesApi";
import type { GuardianApi } from "@/services/api";
import type {
  AttendanceRecordDto,
  ChatRoomDetail,
  ChatRoomDto,
  ChildDto,
  GuardianNotificationDto,
  PendingHouseholdMember,
  PendingSurveyDto,
  SurveyDto,
} from "@/services/types";
import { watchChatLive } from "./chatWatch";
import { call } from "./call";
import { DUMMY_NOTIFICATIONS, dummyAttendance, dummyBundles, dummyFinalReport, isDummyProgramId } from "./dummyFallback";
import { normalizeStudentReport } from "@/lib/reportNormalize";
import { SAMPLE_SHARE_TOKEN } from "@/services/sharedReport";

function isDummyReport(reportId: string): boolean {
  return reportId === dummyFinalReport().reportId;
}

function requireUid(): string {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("로그인이 필요해요. 다시 로그인해 주세요.");
  return uid;
}

export function createLiveGuardianApi(): GuardianApi {
  return {
    async listChildren(opts) {
      const uid = requireUid();
      const db = getDb();
      const constraints = [where("guardianUid", "==", uid)];
      if (opts?.activeOnly) constraints.push(where("status", "==", "active"));
      const snap = await getDocs(query(collection(db, COL_GUARDIAN_LINKS), ...constraints));
      const list: ChildDto[] = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          const [sSnap, cSnap] = await Promise.all([
            getDoc(doc(db, "students", data.studentId)),
            getDoc(doc(db, "campuses", data.campusId)),
          ]);
          return {
            guardianLinkId: d.id,
            studentId: data.studentId,
            studentName: sSnap.exists() ? (sSnap.data()?.name ?? data.studentId) : data.studentId,
            campusId: data.campusId,
            campusName: cSnap.exists() ? (cSnap.data()?.name ?? data.campusId) : data.campusId,
            relation: data.guardianRelation ?? "",
          };
        }),
      );
      // 같은 학생이 중복 연결된 경우(등록코드 재사용 등) 한 번만, 이름순으로 정렬해 순서를 고정
      const unique = list.filter((c, i) => list.findIndex((x) => x.studentId === c.studentId) === i);
      unique.sort((a, b) => a.studentName.localeCompare(b.studentName, "ko"));
      return unique;
    },

    async listProgramBundles(studentId) {
      const res = await call<{ studentId: string }, { bundles: StudentProgramBundleDto[] }>("listStudentProgramBundles", { studentId });
      const list = (res.bundles ?? []).map(dtoToStudentProgramBundle);
      // 서버에 수강 정보가 아직 없는 계정 → 예시 프로그램 (dummyFallback.ts)
      return list.length > 0 ? list : dummyBundles();
    },

    async getProgramBundle(studentId, programRunId) {
      if (isDummyProgramId(programRunId)) return dummyBundles().find((b) => b.programRunId === programRunId) ?? null;
      const res = await call<{ studentId: string; programRunId: string }, { bundles: StudentProgramBundleDto[] }>(
        "listStudentProgramBundles",
        { studentId, programRunId },
      );
      const dto = res.bundles?.[0];
      return dto ? dtoToStudentProgramBundle(dto) : null;
    },

    async listAttendance(studentId, programRunId) {
      if (programRunId && isDummyProgramId(programRunId)) return dummyAttendance(studentId, programRunId);
      const db = getDb();
      const constraints = [where("studentId", "==", studentId)];
      if (programRunId) constraints.push(where("programRunId", "==", programRunId));
      const snap = await getDocs(query(collection(db, "sessionAttendance"), ...constraints));
      const records = snap.docs.map((d) => d.data() as AttendanceRecordDto);
      // 전체 조회(홈 카드): 예시 프로그램(prog-001)의 출결을 같이 돌려준다 — 실데이터 운영 건 카드에는 영향 없음
      return programRunId ? records : [...records, ...dummyAttendance(studentId)];
    },

    async getFinalReport(studentId, programRunId) {
      if (isDummyProgramId(programRunId)) return dummyFinalReport();
      // 종합 리포트(reports) — 아직 발급 전이거나 권한이 없으면 null
      try {
        const snap = await getDocs(
          query(collection(getDb(), "reports"), where("studentId", "==", studentId), where("programRunId", "==", programRunId), limit(1)),
        );
        const d = snap.docs[0];
        if (!d) return null;
        return normalizeStudentReport({ ...(d.data() as Record<string, unknown>), reportId: d.id });
      } catch {
        return null;
      }
    },

    async listNotifications() {
      const res = await call<Record<string, never>, { notifications: GuardianNotificationDto[] }>("listGuardianNotifications", {});
      const list = res.notifications ?? [];
      return list.length > 0 ? list : DUMMY_NOTIFICATIONS;
    },

    async markNotificationRead(id) {
      if (id.startsWith("n-")) return; // 예시 알림
      await call<{ notificationId: string }, { ok: boolean }>("markNotificationRead", { notificationId: id });
    },

    async createShareLink(reportId) {
      try {
        return await call<{ reportId: string }, { url: string; expiresAt: string }>("createShareToken", { reportId });
      } catch (e) {
        // 예시 리포트(서버에 없음)는 미리보기 링크로 — 실제 리포트가 서버에 있으면 위 Function 이 링크를 만든다
        if (!isDummyReport(reportId)) throw e;
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        return { url: `${origin}/r/${SAMPLE_SHARE_TOKEN}`, expiresAt: expires.toISOString() };
      }
    },

    async listPendingHousehold() {
      const res = await call<Record<string, never>, { pending: PendingHouseholdMember[] }>("listPendingHouseholdMembers", {});
      return res.pending ?? [];
    },

    async linkHouseholdMember(studentId, birthDate) {
      await call<{ studentId: string; birthDate: string }, { linked: boolean }>("linkHouseholdMember", { studentId, birthDate });
    },

    async addGuardianPhone(studentId, phone, relation) {
      await call<{ studentId: string; phone: string; relation: string }, { success: boolean }>("addGuardianPhone", { studentId, phone, relation });
    },

    async deleteAccount() {
      await call<{ confirm: boolean }, { deleted: boolean }>("deleteAccount", { confirm: true });
    },

    // ── 채팅 (functions/src/chat.ts) ──
    async listChatRooms() {
      return (await call<Record<string, never>, { rooms: ChatRoomDto[] }>("listGuardianChatRooms", {})).rooms ?? [];
    },

    getChatRoom: (roomId) => call<{ roomId: string }, ChatRoomDetail>("getChatRoom", { roomId }),

    async sendChatMessage(input) {
      await call("sendChatMessage", input);
    },

    async markChatRead(roomId) {
      await call("markChatRead", { roomId });
    },

    async countUnreadChats() {
      // 방 문서의 unreadBy.{uid} 합 — Firestore 직접 조회 (규칙: guardianUids 에 내 uid)
      const uid = getFirebaseAuth().currentUser?.uid;
      if (!uid) return 0;
      try {
        const snap = await getDocs(query(collection(getDb(), "chatRooms"), where("guardianUids", "array-contains", uid)));
        return snap.docs.reduce((n, d) => n + (Number((d.data().unreadBy as Record<string, number> | undefined)?.[uid]) || 0), 0);
      } catch {
        return 0;
      }
    },

    watchChat(target, onChange) {
      return watchChatLive(target.roomId ? { roomId: target.roomId } : { guardian: true }, onChange);
    },

    // ── 만족도 조사 (functions/src/survey.ts) ──
    async listPendingSurveys() {
      return (await call<Record<string, never>, { surveys: PendingSurveyDto[] }>("listPendingSurveys", {})).surveys ?? [];
    },

    async getSurvey(studentId, programRunId) {
      return (await call<{ studentId: string; programRunId: string }, { survey: SurveyDto | null }>("getSurvey", { studentId, programRunId })).survey ?? null;
    },

    async submitSurvey(input) {
      await call("submitSurvey", input);
    },
  };
}
