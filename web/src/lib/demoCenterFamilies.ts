/** 체험판 학부모·가구 더미 */

import { buildDemoRoster, demoStudentName } from "@/lib/demoCenterScale";

export interface DemoGuardianDetail {
  studentId: string;
  studentName: string;
  sectionLabel: string;
  guardians: Array<{ name: string; relation: string; phone: string; linked: boolean; linkedAt?: string }>;
  unlinkedNote?: string;
}

const PARENT_NAMES = ["김영희", "이철수", "박미경", "최준호", "정수진", "강동원", "조은아", "윤서준"];
const RELATIONS = ["모(엄마)", "부(아빠)", "조부모", "기타 보호자"];

export function buildDemoGuardianDetails(): DemoGuardianDetail[] {
  const roster = buildDemoRoster(72);
  return roster.map((s, i) => {
    if (!s.guardianLinked) {
      return {
        studentId: s.studentId,
        studentName: s.name,
        sectionLabel: s.sectionLabel,
        guardians: [],
        unlinkedNote: i % 3 === 0 ? "등록코드 발급 · 앱 미연결" : "보호자 정보 대기",
      };
    }
    const parentName = PARENT_NAMES[i % PARENT_NAMES.length];
    const relation = RELATIONS[i % 2];
    const phone = `010-${String(2000 + (i % 8000)).slice(-4)}-${String(1000 + (i % 9000)).slice(-4)}`;
    const sibling = i % 5 === 0 && i > 0;
    const guardians = [
      {
        name: parentName,
        relation,
        phone,
        linked: true,
        linkedAt: "2026-09-10",
      },
    ];
    if (sibling) {
      guardians.push({
        name: parentName,
        relation: "형제 자녀 동일 가구",
        phone,
        linked: true,
        linkedAt: "2026-09-10",
      });
    }
    return {
      studentId: s.studentId,
      studentName: s.name,
      sectionLabel: s.sectionLabel,
      guardians,
    };
  });
}

/** 강사 회차용 소규모 명단 (12명, 이름 중복 없음) */
export function buildDemoInstructorSessionRoster() {
  return Array.from({ length: 12 }, (_, i) => ({
    studentId: `demo-stu-${i}`,
    name: demoStudentName(i),
    attendance: "unset" as const,
    participationScore: (i % 5) + 1,
  }));
}
