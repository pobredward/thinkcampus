/**
 * 프로그램 상세(회차 목록) · 회차 화면용 뷰 모델 — 더미 데이터 조합
 * 실데이터 전환 시 이 파일의 함수들만 Firestore 조회 결과로 바꾸면 된다.
 */

import {
  DUMMY_ATTENDANCE_MINJUN,
  DUMMY_ATTENDANCE_SEOYEON,
  type AttendanceStatus,
  type SessionRecord,
  type StudentAttendance,
} from "@/data/dummyAttendance";
import type { Program, Session } from "@/data/dummyProgram";
import { DUMMY_REPORT, type ProgramReport, type StudentReport } from "@/data/dummyReport";
import { dotDateToKey } from "@/lib/dates";

export type DayStatus = AttendanceStatus | "cancelled";

export interface DayItem {
  key: string; // 'YYYY-MM-DD'
  session: Session;
  record: SessionRecord | null;
  status: DayStatus;
}

/**
 * 더미 단계: 학생마다 다른 출결이 보이도록 studentId 로 두 데이터 중 하나를 고른다.
 * (홈 카드와 프로그램 상세가 같은 함수를 써서 서로 일치)
 */
export function pickDummyAttendance(studentId: string | null | undefined): StudentAttendance {
  if (!studentId) return DUMMY_ATTENDANCE_MINJUN;
  const sum = [...studentId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return sum % 2 === 0 ? DUMMY_ATTENDANCE_SEOYEON : DUMMY_ATTENDANCE_MINJUN;
}

export function pickDummyReport(): StudentReport {
  return DUMMY_REPORT;
}

export function buildDayItems(program: Program, attendance: StudentAttendance): DayItem[] {
  return program.sessions
    .map((session) => {
      const record = attendance.sessions.find((r) => r.sessionId === session.id) ?? null;
      const status: DayStatus = session.isCancelled ? "cancelled" : (record?.status ?? "upcoming");
      return { key: dotDateToKey(session.date), session, record, status };
    })
    .filter((d) => d.key)
    .sort((a, b) => a.key.localeCompare(b.key));
}

export const STATUS_LABEL: Record<DayStatus, string> = {
  present: "출석",
  late: "지각",
  absent: "결석",
  upcoming: "예정",
  cancelled: "휴강",
};

export const STATUS_BADGE: Record<DayStatus, string> = {
  present: "bg-green-50 text-green-700",
  late: "bg-amber-50 text-amber-700",
  absent: "bg-red-50 text-red-600",
  upcoming: "bg-brand-light text-brand",
  cancelled: "bg-gray-100 text-gray-600",
};

export function isDone(status: DayStatus): boolean {
  return status === "present" || status === "late" || status === "absent";
}

export function nextUpcoming(items: DayItem[]): DayItem | null {
  return items.find((d) => d.status === "upcoming") ?? null;
}

/** 모든 회차(휴강 제외)가 끝났는지 — 종합 리포트는 이때부터 발급 (TODO: 실데이터는 issueDate 확인) */
export function isProgramFinished(items: DayItem[]): boolean {
  return items.length > 0 && items.every((d) => d.status === "cancelled" || isDone(d.status));
}

/** 회차 주제 → 종합 리포트의 과목 평가 ('세계사 인문학 — 교류와 충돌' ↔ '세계사 인문학') */
export function matchProgramReport(topic: string, report: StudentReport): ProgramReport | null {
  return report.programs.find((p) => topic.startsWith(p.programName)) ?? null;
}

export interface ProgressSummary {
  done: number;
  total: number;
  present: number;
  late: number;
  absent: number;
}

export function summarize(items: DayItem[], total: number): ProgressSummary {
  const count = (s: DayStatus) => items.filter((d) => d.status === s).length;
  const present = count("present");
  const late = count("late");
  const absent = count("absent");
  return { done: present + late + absent, total, present, late, absent };
}

// ── 회차 화면 탭 ─────────────────────────────────────────

export type SessionTab = "attendance" | "schedule" | "content" | "qna" | "report";

export const SESSION_TABS: { id: SessionTab; label: string; title: string }[] = [
  { id: "attendance", label: "출결", title: "출결" },
  { id: "schedule", label: "일정", title: "프로그램 일정" },
  { id: "content", label: "내용", title: "프로그램 내용" },
  { id: "qna", label: "Q&A", title: "프로그램 Q&A" },
  { id: "report", label: "리포트", title: "수업 리포트" },
];

/** 리포트 탭은 끝난 회차에만 보인다 */
export function availableTabs(item: DayItem): SessionTab[] {
  const done = isDone(item.status);
  return SESSION_TABS.map((t) => t.id).filter((id) => id !== "report" || done);
}

/** 처음 열 탭 — 끝난 회차는 출결, 아직 안 한 회차는 일정 */
export function defaultTab(item: DayItem): SessionTab {
  return isDone(item.status) ? "attendance" : "schedule";
}

export function isSessionTab(v: string | null): v is SessionTab {
  return SESSION_TABS.some((t) => t.id === v);
}

/** 모든 회차에 공통으로 보여 줄 Q&A (회차별 Q&A 뒤에 붙는다) */
export const COMMON_SESSION_QNA: { q: string; a: string }[] = [
  {
    q: "결석하면 수업 내용을 따로 볼 수 있나요?",
    a: "‘내용’ 탭에서 수업 소개와 수업자료를 볼 수 있어요. 보충 설명이 필요하면 담당 강사에게 요청해 주세요.",
  },
  {
    q: "수업에 늦을 것 같으면 어떻게 하나요?",
    a: "캠퍼스로 미리 연락해 주세요. 입실한 시간이 ‘출결’ 탭에 기록돼요.",
  },
  {
    q: "회차 리포트는 언제 올라오나요?",
    a: "수업이 끝난 날 저녁에 선생님 피드백과 함께 ‘리포트’ 탭에 올라와요.",
  },
];
