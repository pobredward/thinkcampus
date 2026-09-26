export interface DemoInstructorProfile {
  staffId: string;
  name: string;
  email: string;
  phone: string;
  bio: string;
  campusName: string;
  specialties: string[];
}

export const DEMO_INSTRUCTOR_PROFILES: DemoInstructorProfile[] = [
  {
    staffId: "demo-instructor",
    name: "박강사",
    email: "teacher@demo.thinkcampus.kr",
    phone: "010-2222-3333",
    bio: "창의융합 프로그램 5년차. 로테이션 수업·소그룹 활동 전문.",
    campusName: "달성캠퍼스",
    specialties: ["창의활동", "협동게임"],
  },
  {
    staffId: "demo-instructor-2",
    name: "이보조",
    email: "assistant@demo.thinkcampus.kr",
    phone: "010-4444-5555",
    bio: "보조 강사 · 1~4반 오전 타임 담당.",
    campusName: "달성캠퍼스",
    specialties: ["미술", "만들기"],
  },
  {
    staffId: "demo-instructor-3",
    name: "최선생",
    email: "choi@demo.thinkcampus.kr",
    phone: "010-6666-7777",
    bio: "오후 타임·5~6반 로테이션.",
    campusName: "달성캠퍼스",
    specialties: ["코딩", "STEAM"],
  },
];

export function getDemoInstructor(staffId: string): DemoInstructorProfile | undefined {
  return DEMO_INSTRUCTOR_PROFILES.find((p) => p.staffId === staffId);
}

const ASSIGN_KEY = "tc-demo-instructor-assignments";

export type DemoAssignmentMap = Record<string, string | null>;

export function readDemoAssignments(): DemoAssignmentMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(ASSIGN_KEY) ?? "{}") as DemoAssignmentMap;
  } catch {
    return {};
  }
}

export function writeDemoAssignment(sessionId: string, staffId: string | null) {
  const map = readDemoAssignments();
  if (staffId) map[sessionId] = staffId;
  else delete map[sessionId];
  sessionStorage.setItem(ASSIGN_KEY, JSON.stringify(map));
}

export function resolveDemoInstructorId(sessionId: string, defaultId?: string | null): string | null {
  const map = readDemoAssignments();
  if (sessionId in map) return map[sessionId];
  return defaultId ?? null;
}
