/** 체험판: 대규모 캠퍼스·로테이션(1~8반) 시뮬레이션 */

import type { CenterRosterRow } from "@/lib/centerRoster";
import type { CenterScheduleDay } from "@/lib/centerSchedule";
import type { ProgramSectionDto } from "@/lib/centerSummary";

export const DEMO_SECTION_COUNT = 6;

export function buildDemoSections(totalStudents = 72): ProgramSectionDto[] {
  const per = Math.ceil(totalStudents / DEMO_SECTION_COUNT);
  return Array.from({ length: DEMO_SECTION_COUNT }, (_, i) => ({
    id: `sec-${i + 1}`,
    label: `${i + 1}반`,
    sortOrder: i,
    studentCount: i === DEMO_SECTION_COUNT - 1 ? totalStudents - per * (DEMO_SECTION_COUNT - 1) : per,
  }));
}

const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오"];
const GIVEN = [
  "민준",
  "서연",
  "도윤",
  "하은",
  "지우",
  "수아",
  "예준",
  "지민",
  "현우",
  "서윤",
  "준서",
  "유진",
];

/** 성×이름 조합으로 72명까지 서로 다른 한글 이름 */
export function demoStudentName(index: number): string {
  const surname = SURNAMES[index % SURNAMES.length];
  const given = GIVEN[Math.floor(index / SURNAMES.length) % GIVEN.length];
  return `${surname}${given}`;
}

function PARENT_GUARDIAN_NAME(i: number): string {
  const names = ["김영희", "이철수", "박미경", "최준호", "정수진", "강미라", "조성훈", "윤지혜"];
  return names[i % names.length];
}

export function buildDemoRoster(total = 72): CenterRosterRow[] {
  const rows: CenterRosterRow[] = [];
  for (let i = 0; i < total; i++) {
    const sectionIndex = i % DEMO_SECTION_COUNT;
    const sectionId = `sec-${sectionIndex + 1}`;
    const name = demoStudentName(i);
    const guardianLinked = i % 11 !== 0;
    rows.push({
      enrollmentId: `demo-enr-${i}`,
      studentId: `demo-stu-${i}`,
      name,
      sectionId,
      sectionLabel: `${sectionIndex + 1}반`,
      householdId: `hh-${Math.floor(i / 2)}`,
      enrollmentCodeStatus: guardianLinked ? "used" : "unused",
      guardianSummary: guardianLinked ? `${PARENT_GUARDIAN_NAME(i)} · 연결됨` : "미연결",
      guardianLinked,
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export function filterDemoRoster(
  rows: CenterRosterRow[],
  opts: { sectionId?: string; q?: string; guardianFilter?: string; offset: number; limit: number },
): { rows: CenterRosterRow[]; nextOffset: number | null } {
  let list = rows;
  if (opts.sectionId && opts.sectionId !== "all") {
    list = list.filter((r) => r.sectionId === opts.sectionId);
  }
  if (opts.q) {
    const q = opts.q.toLowerCase();
    list = list.filter((r) => r.name.toLowerCase().includes(q));
  }
  if (opts.guardianFilter === "linked") list = list.filter((r) => r.guardianLinked);
  if (opts.guardianFilter === "unlinked") list = list.filter((r) => !r.guardianLinked);
  const slice = list.slice(opts.offset, opts.offset + opts.limit);
  const next = opts.offset + opts.limit < list.length ? opts.offset + opts.limit : null;
  return { rows: slice, nextOffset: next };
}

const ROTATION_TOPICS = [
  "AI 비전 인식과 이미지 분류",
  "자율주행 RC카 센서 코딩",
  "피지컬 아두이노 스마트홈",
  "3D 모델링 & 입체 메이커",
  "블록코딩 게임 알고리즘",
  "마이크로비트 무선 제어",
];

const ROOMS = [
  "3층 1실습실",
  "3층 2실습실",
  "3층 3실습실",
  "4층 AI랩",
  "4층 로봇공학실",
  "4층 메이커스페이스",
];

const INSTRUCTORS = [
  { id: "demo-instructor", name: "박강사" },
  { id: "demo-instructor-2", name: "이보조" },
  { id: "demo-instructor-3", name: "최선임" },
];

/** 오늘을 기준으로 8회차 주차별 일자 목록 (과거 3회차 ~ 미래 4회차) */
export function buildDemoScheduleDates(baseDate = "2026-09-27"): string[] {
  try {
    const [y, m, d] = baseDate.split("-").map(Number);
    const base = new Date(Date.UTC(y, m - 1, d));
    const dates: string[] = [];
    for (let i = -3; i <= 4; i++) {
      const dt = new Date(base);
      dt.setUTCDate(base.getUTCDate() + i * 7);
      dates.push(dt.toISOString().slice(0, 10));
    }
    return dates;
  } catch {
    return [
      "2026-09-06",
      "2026-09-13",
      "2026-09-20",
      "2026-09-27",
      "2026-10-04",
      "2026-10-11",
      "2026-10-18",
      "2026-10-25",
    ];
  }
}

/** 선택 날짜의 3타임 × 6반 전체 로테이션 시간표 */
export function buildDemoScheduleToday(date: string): CenterScheduleDay[] {
  const slots = [
    { start: "10:00", end: "10:50" },
    { start: "11:00", end: "11:50" },
    { start: "13:00", end: "13:50" },
  ];
  const day: CenterScheduleDay = { date, slots: [] };
  const allDates = buildDemoScheduleDates();
  const dateIndex = allDates.indexOf(date);
  const isPast = dateIndex !== -1 && dateIndex < 3; // 4회차(오늘) 이전
  const isFuture = dateIndex !== -1 && dateIndex > 3; // 4회차(오늘) 이후

  let sessionCount = 0;
  slots.forEach((slot, slotIdx) => {
    const sessions = [];
    for (let secIdx = 0; secIdx < DEMO_SECTION_COUNT; secIdx++) {
      sessionCount += 1;
      const secNum = secIdx + 1;
      const sectionId = `sec-${secNum}`;
      // 로테이션: 시간대와 반 번호에 따라 주제와 교실이 회전
      const topicIdx = (secIdx + slotIdx + (dateIndex >= 0 ? dateIndex : 0)) % ROTATION_TOPICS.length;
      const roomIdx = secIdx % ROOMS.length;
      const instructor = INSTRUCTORS[(secIdx + slotIdx) % INSTRUCTORS.length];

      let recordedCount = 0;
      let attendanceRate = 0;
      if (isPast) {
        recordedCount = 12;
        attendanceRate = 1;
      } else if (isFuture) {
        recordedCount = 0;
        attendanceRate = 0;
      } else {
        // 오늘: 1교시는 완료, 2교시는 일부 입력, 3교시는 미입력
        if (slotIdx === 0) {
          recordedCount = 12;
          attendanceRate = 1;
        } else if (slotIdx === 1) {
          recordedCount = secNum % 2 === 0 ? 9 : 6;
          attendanceRate = recordedCount / 12;
        } else {
          recordedCount = 0;
          attendanceRate = 0;
        }
      }

      sessions.push({
        id: `demo-sess-${date}-${slotIdx + 1}-${secNum}`,
        sessionNumber: slotIdx + 1,
        topic: ROTATION_TOPICS[topicIdx],
        sectionId,
        sectionLabel: `${secNum}반`,
        startTime: slot.start,
        endTime: slot.end,
        location: ROOMS[roomIdx],
        instructorId: instructor.id,
        instructorName: instructor.name,
        attendanceRate,
        enrolledCount: 12,
        recordedCount,
      });
    }
    day.slots.push({ startTime: slot.start, endTime: slot.end, sessions });
  });

  return [day];
}
