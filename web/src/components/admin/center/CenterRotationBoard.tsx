"use client";

import Link from "next/link";
import type { CenterScheduleDay, CenterScheduleSession } from "@/lib/centerSchedule";
import type { ProgramSectionDto } from "@/lib/centerSummary";

export function CenterRotationBoard({
  days,
  basePath,
  sectionFilter,
  sections,
}: {
  days: CenterScheduleDay[];
  basePath: string;
  sectionFilter: string;
  sections?: ProgramSectionDto[];
}) {
  if (days.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-elev/50 px-4 py-12 text-center">
        <p className="text-[15px] font-semibold text-fg">해당 날짜에 예정된 수업이 없습니다.</p>
        <p className="mt-1 text-[13px] text-sub">상단의 날짜 버튼을 눌러 다른 수업일을 확인해보세요.</p>
      </div>
    );
  }

  const day = days[0];
  const slots = day.slots;

  // 전체 세션에서 존재하는 모든 고유 반 수집
  const sectionMap = new Map<string, { id: string; label: string; studentCount?: number }>();
  if (sections && sections.length > 0) {
    for (const sec of sections) {
      sectionMap.set(sec.id, { id: sec.id, label: sec.label, studentCount: sec.studentCount });
    }
  }

  for (const slot of slots) {
    for (const sess of slot.sessions) {
      if (!sectionMap.has(sess.sectionId)) {
        sectionMap.set(sess.sectionId, {
          id: sess.sectionId,
          label: sess.sectionLabel,
          studentCount: sess.enrolledCount,
        });
      }
    }
  }

  const allSections = Array.from(sectionMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "ko", { numeric: true })
  );

  // 반 필터 적용
  const displaySections =
    sectionFilter === "all"
      ? allSections
      : allSections.filter((s) => s.id === sectionFilter);

  // 통계 요약
  let totalSessions = 0;
  let completedSessions = 0;
  for (const slot of slots) {
    for (const s of slot.sessions) {
      totalSessions += 1;
      if (s.attendanceRate >= 1) completedSessions += 1;
    }
  }

  return (
    <div className="space-y-3">
      {/* 표 상단 요약 바 */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-fg">시간표 로테이션 보드</span>
          <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[11px] font-bold text-gold">
            {slots.length}타임 · {allSections.length}개 반
          </span>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-sub">
          <span>
            출결 완료 <strong className="text-emerald-700">{completedSessions}</strong>/{totalSessions}건
          </span>
          <span className="text-line">|</span>
          <span className="text-faint">칸 터치 시 출결 시트 이동</span>
        </div>
      </div>

      {/* 로테이션 시간표 테이블 */}
      <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-xs">
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-elev">
                {/* 첫 번째 열: 시간/교시 (Sticky 고정) */}
                <th
                  scope="col"
                  className="sticky left-0 z-20 w-[110px] min-w-[110px] border-r border-line bg-elev px-3 py-3 text-center text-[12px] font-bold text-sub shadow-[1px_0_0_0_var(--line)]"
                >
                  시간 / 교시
                </th>

                {/* 반별 헤더 열 */}
                {displaySections.map((sec) => {
                  const isFiltered = sectionFilter === sec.id;
                  return (
                    <th
                      key={sec.id}
                      scope="col"
                      className={`border-r border-line last:border-r-0 px-3.5 py-3 text-center transition-colors ${
                        isFiltered ? "bg-gold/15 text-gold" : "text-fg"
                      }`}
                      style={{ minWidth: "155px" }}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[13px] font-bold">{sec.label}</span>
                        {sec.studentCount !== undefined && sec.studentCount > 0 && (
                          <span className="text-[10px] font-medium text-sub">
                            정원 {sec.studentCount}명
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {slots.map((slot, slotIdx) => (
                <tr
                  key={`${slot.startTime}-${slot.endTime}`}
                  className="transition-colors hover:bg-elev/20"
                >
                  {/* 시간 고정 열 */}
                  <td className="sticky left-0 z-10 border-r border-line bg-paper px-3 py-3.5 text-center shadow-[1px_0_0_0_var(--line)]">
                    <span className="block text-[13px] font-bold text-gold">
                      {slotIdx + 1}타임
                    </span>
                    <span className="mt-0.5 block text-[11px] font-semibold text-fg">
                      {slot.startTime}
                    </span>
                    <span className="block text-[10px] text-sub">~ {slot.endTime}</span>
                  </td>

                  {/* 각 반별 세션 셀 */}
                  {displaySections.map((sec) => {
                    const session = slot.sessions.find((s) => s.sectionId === sec.id);

                    if (!session) {
                      return (
                        <td
                          key={sec.id}
                          className="border-r border-line last:border-r-0 bg-elev/10 p-2 text-center text-[12px] text-faint"
                        >
                          —
                        </td>
                      );
                    }

                    const isCompleted = session.attendanceRate >= 1;
                    const hasRecorded = session.recordedCount > 0;
                    const isFiltered = sectionFilter === sec.id;

                    return (
                      <td
                        key={sec.id}
                        className={`border-r border-line last:border-r-0 p-2 align-top ${
                          isFiltered ? "bg-gold/5" : ""
                        }`}
                      >
                        <Link
                          href={`${basePath}/attendance?session=${session.id}`}
                          className="tap group block h-full rounded-xl border border-line bg-card p-2.5 shadow-2xs transition-all hover:border-gold hover:shadow-xs active:scale-[0.98]"
                        >
                          {/* 프로그램 주제 */}
                          <p className="line-clamp-2 text-[12.5px] font-bold leading-snug text-fg group-hover:text-gold">
                            {session.topic}
                          </p>

                          {/* 장소 & 담당 강사 */}
                          <div className="mt-1.5 flex items-center justify-between text-[11px] text-sub">
                            <span className="truncate pr-1 font-medium">{session.location}</span>
                            <span className="shrink-0 font-semibold text-fg">
                              {session.instructorName ?? "미배정"}
                            </span>
                          </div>

                          {/* 출결 상태 뱃지 */}
                          <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-1.5">
                            <span className="text-[10px] text-faint">
                              {session.recordedCount}/{session.enrolledCount}명
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                isCompleted
                                  ? "bg-emerald-500/15 text-emerald-800"
                                  : hasRecorded
                                    ? "bg-amber-500/15 text-amber-900"
                                    : "bg-line text-sub"
                              }`}
                            >
                              {isCompleted
                                ? "완료"
                                : hasRecorded
                                  ? "입력중"
                                  : "미입력"}
                            </span>
                          </div>
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
