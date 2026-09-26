/** 센터 관리 Phase A — 체험판 더미 운영 데이터 */

import { DEMO_CENTER_SESSIONS, DEMO_CENTER_STUDENTS } from "@/lib/demoPortal";

export const DEMO_CENTER_HOME_TASKS = [
  { id: "sessions-today", label: "오늘 회차", value: "1건", hrefSuffix: "/lessons", tone: "default" as const },
  { id: "attendance-pending", label: "출결 미입력", value: "2회차", hrefSuffix: "/lessons", tone: "warn" as const },
  { id: "reports-review", label: "리포트 검수 대기", value: "3건", hrefSuffix: "/reports", tone: "warn" as const },
  { id: "guardian-unlinked", label: "학부모 미연결", value: "1명", hrefSuffix: "/students?guardian=unlinked", tone: "warn" as const },
  { id: "instructor-gap", label: "강사 미배정 회차", value: "0건", hrefSuffix: "/lessons", tone: "default" as const },
];

export const DEMO_CENTER_LESSONS = DEMO_CENTER_SESSIONS.map((s, i) => ({
  ...s,
  startTime: "10:00",
  endTime: "12:00",
  location: "청소년수련관 3층",
  instructorName: i === 0 ? "박강사" : "박강사",
  attendanceRate: i === 0 ? 1 : i === 1 ? 0.67 : 0,
}));

export const DEMO_CENTER_GUARDIANS = [
  {
    studentId: "student-001",
    studentName: "신민준",
    guardians: [{ name: "신선웅", relation: "부(아빠)", linked: true, linkedAt: "2026-09-11" }],
  },
  {
    studentId: "student-002",
    studentName: "신서연",
    guardians: [{ name: "신선웅", relation: "부(아빠)", linked: true, linkedAt: "2026-09-11" }],
  },
  {
    studentId: "student-004",
    studentName: "김하은",
    guardians: [],
    unlinkedNote: "등록코드 발급됨 · 앱 미연결",
  },
];

export const DEMO_CENTER_INSTRUCTORS = [
  {
    staffId: "demo-instructor",
    name: "박강사",
    email: "teacher@demo.thinkcampus.kr",
    sessionsThisWeek: 2,
    role: "instructor",
  },
  {
    staffId: "demo-instructor-2",
    name: "이보조",
    email: "assistant@demo.thinkcampus.kr",
    sessionsThisWeek: 1,
    role: "instructor",
  },
];

export const DEMO_CENTER_REPORT_QUEUE = [
  {
    id: "sr-1",
    sessionNumber: 2,
    studentName: "신민준",
    status: "draft" as const,
    instructorName: "박강사",
    submittedAt: "2026-09-20",
  },
  {
    id: "sr-2",
    sessionNumber: 2,
    studentName: "신서연",
    status: "centerReviewed" as const,
    instructorName: "박강사",
    submittedAt: "2026-09-20",
  },
  {
    id: "sr-3",
    sessionNumber: 1,
    studentName: "김하은",
    status: "published" as const,
    instructorName: "박강사",
    submittedAt: "2026-09-06",
  },
];

export const DEMO_CENTER_NOTIFICATIONS = [
  {
    id: "n-1",
    type: "attendance",
    title: "신민준 2회차 출석 처리",
    sentAt: "2026-09-19 12:05",
    channel: "앱 알림",
  },
  {
    id: "n-2",
    type: "notice",
    title: "10월 3일 수업 장소 안내",
    sentAt: "2026-09-25 09:00",
    channel: "앱 알림",
  },
];

export const DEMO_CENTER_STUDENT_ROWS = DEMO_CENTER_STUDENTS.map((s) => ({
  ...s,
  householdId: s.studentId === "student-004" ? "hh-demo-2" : "hh-demo-1",
  enrollmentCodeStatus: "used" as const,
}));

export const DEMO_COMPANY_HOME_SUMMARY = {
  activeRuns: 2,
  campuses: 1,
  lastImport: "2026-09-20 (dryRun 검증)",
  pendingReviews: 0,
};
