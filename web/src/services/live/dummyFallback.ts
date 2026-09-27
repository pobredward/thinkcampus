/**
 * 실서비스 · 서버에 아직 데이터가 없는 계정을 위한 더미 (모바일 앱과 같은 규칙)
 *
 * 학부모 앱은 처음 배포 단계에서 운영 건·회차·알림이 아직 서버에 없을 수 있다.
 * 그때는 data/dummy*.ts 의 예시 프로그램으로 화면을 채우고, 서버에 실데이터가 들어오면 자동으로 실데이터만 보여 준다.
 * (services/live/guardianApi.ts 만 이 파일을 쓴다 — 화면은 더미 여부를 모른다)
 */

import { calcSummary } from "@/data/dummyAttendance";
import { DUMMY_PAST_PROGRAMS } from "@/data/dummyHistory";
import { DUMMY_PROGRAM } from "@/data/dummyProgram";
import { DUMMY_REPORT } from "@/data/dummyReport";
import { DUMMY_PROGRAMS, pickDummyAttendance } from "@/data/programView";
import type { AttendanceRecordDto, GuardianNotificationDto, GuardianProgramBundle, StudentReport } from "@/services/types";

export function isDummyProgramId(id: string): boolean {
  return DUMMY_PROGRAMS.some((p) => p.id === id) || DUMMY_PAST_PROGRAMS.some((p) => p.programId === id);
}

export function dummyBundles(): GuardianProgramBundle[] {
  const current: GuardianProgramBundle[] = DUMMY_PROGRAMS.map((p) => ({
    enrollmentId: `dummy-${p.id}`,
    programRunId: p.id,
    status: p.status === "upcoming" ? "upcoming" : p.status === "completed" ? "completed" : "active",
    program: p,
  }));
  // 이전 수강 이력 (홈 맨 아래 버튼 · /main/history)
  const past: GuardianProgramBundle[] = DUMMY_PAST_PROGRAMS.map((p) => ({
    enrollmentId: `dummy-${p.programId}`,
    programRunId: p.programId,
    status: "completed",
    program: {
      ...DUMMY_PROGRAM,
      id: p.programId,
      title: p.title,
      subtitle: p.subtitle,
      startDate: p.startDate,
      endDate: p.endDate,
      totalSessions: p.totalSessions,
      totalHours: p.totalHours,
      status: "completed",
    },
  }));
  return [...current, ...past];
}

/** 더미 출결 — 학생마다 다른 출결이 보이도록 studentId 로 고른다 (홈 카드·회차 화면이 같은 규칙) */
export function dummyAttendance(studentId: string, programRunId?: string): AttendanceRecordDto[] {
  const att = pickDummyAttendance(studentId);
  const runId = programRunId ?? DUMMY_PROGRAMS[0].id;
  if (programRunId && programRunId !== DUMMY_PROGRAMS[0].id) return [];
  return att.sessions
    .filter((s) => s.status !== "upcoming")
    .map((s) => ({
      runSessionId: s.sessionId,
      programRunId: runId,
      studentId,
      status: s.status as AttendanceRecordDto["status"],
      lateMinutes: s.lateMinutes,
      checkinTime: s.checkinTime,
      participationScore: s.participationScore ?? undefined,
      homeworkDone: s.homeworkDone,
      feedback: s.feedback ?? undefined,
      highlights: s.highlights,
      improvements: s.improvements,
    }));
}

export function dummyDoneCount(studentId: string): number {
  return calcSummary(pickDummyAttendance(studentId)).doneCount;
}

export function dummyFinalReport(): StudentReport {
  return DUMMY_REPORT;
}

export const DUMMY_NOTIFICATIONS: GuardianNotificationDto[] = [
  {
    id: "n-002",
    type: "notice",
    title: "다음 수업 안내",
    body: "4회차 사고·창의력 디베이트 수업이 2026.10.17 (토) 오전 10:00~12:00 예정대로 진행됩니다. 강남구 청소년수련관 3층 301호.",
    date: "2026.10.14",
    isRead: false,
  },
  {
    id: "n-003",
    type: "schedule",
    title: "수업 준비물 안내",
    body: "다음 수업(10/17 사고·창의력 디베이트)에 필기도구와 포스트잇을 지참해주세요.",
    date: "2026.10.14",
    isRead: false,
  },
  {
    id: "n-004",
    type: "attendance",
    title: "지각 알림",
    body: "김민준 학생이 3회차(한국사 인문학) 수업에 18분 지각하였습니다.",
    date: "2026.10.03",
    isRead: false,
  },
  {
    id: "n-001",
    type: "attendance",
    title: "출결 업데이트",
    body: "김민준 학생의 2회차(세계사 인문학) 출석이 확인되었습니다.",
    date: "2026.09.19",
    isRead: true,
  },
  {
    id: "n-006",
    type: "report",
    title: "리포트 업로드 예정",
    body: "각 회차 리포트는 수업 당일 저녁에, 종합 리포트는 전체 프로그램 종료(2026.11.14) 후 영업일 기준 3~5일 내 업로드됩니다.",
    date: "2026.09.06",
    isRead: true,
  },
  {
    id: "n-007",
    type: "notice",
    title: "ThinkCampus 앱 서비스 시작",
    body: "학부모님께 자녀의 출결 및 수업 피드백을 실시간으로 확인하실 수 있는 앱 서비스가 시작되었습니다.",
    date: "2026.09.01",
    isRead: true,
  },
];
