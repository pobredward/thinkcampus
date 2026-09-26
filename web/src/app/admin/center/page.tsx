"use client";

import Link from "next/link";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCenterSummary } from "@/hooks/useCenterSummary";
import { centerStaffBase } from "@/lib/staffAppNav";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { usePathname } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

export default function CenterHomePage() {
  usePageTitle("센터 홈");
  const pathname = usePathname();
  const { role, active } = useDemoPortal();
  const demoCenter = active && role === "center";
  const base = centerStaffBase(pathname, demoCenter);
  const { selectedRun, runsLoading } = useCenterRun();
  const { data: summary, loading, error } = useCenterSummary(selectedRun?.id);

  const d = summary?.dashboard;

  const urgentTasks = d
    ? [
        {
          id: "attendance",
          label: "출결 미완료",
          value: `${d.attendancePendingSessions}회차`,
          href: `${base}/lessons`,
          warn: d.attendancePendingSessions > 0,
          desc: "오늘 수업 출결 등록 필요",
          badge: d.attendancePendingSessions > 0 ? "처리 필요" : "완료",
        },
        {
          id: "reports",
          label: "리포트 검수 대기",
          value: `${d.reportsPendingReview}건`,
          href: `${base}/reports`,
          warn: d.reportsPendingReview > 0,
          desc: "강사 제출 리포트 검수",
          badge: d.reportsPendingReview > 0 ? "검수 대기" : "완료",
        },
        {
          id: "guardian",
          label: "학부모 미연결",
          value: `${d.studentsWithoutGuardian}명`,
          href: `${base}/students?guardian=unlinked`,
          warn: d.studentsWithoutGuardian > 0,
          desc: "앱 초대 및 등록코드 안내",
          badge: d.studentsWithoutGuardian > 0 ? "안내 필요" : "완료",
        },
        {
          id: "instructor",
          label: "강사 미배정",
          value: `${d.sessionsWithoutInstructor}회차`,
          href: `${base}/instructors`,
          warn: d.sessionsWithoutInstructor > 0,
          desc: "이번 주 회차 강사 매칭",
          badge: d.sessionsWithoutInstructor > 0 ? "배정 필요" : "완료",
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      {/* 최상단 요약 배너 */}
      <div>
        <h2 className="text-[19px] font-bold text-fg">오늘의 캠퍼스 운영</h2>
        <p className="text-[12px] text-sub">
          {selectedRun
            ? `${selectedRun.contractCode} (${selectedRun.municipalityName}) 현황 및 긴급 조치`
            : runsLoading
              ? "운영 정보를 불러오는 중…"
              : "부여된 운영 건이 없습니다."}
        </p>
      </div>

      {(loading || runsLoading) && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {d && !loading && (
        <>
          {/* 오늘 수업 브리핑 카드 */}
          <Link
            href={`${base}/lessons`}
            className="tap block rounded-2xl border border-gold/30 bg-gradient-to-br from-card via-card to-elev p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-gold">오늘의 로테이션</span>
              <span className="text-[12px] font-semibold text-gold">수업 보드 보기 ›</span>
            </div>
            <p className="mt-1 text-[18px] font-bold text-fg">
              {d.parallelSlotsToday}개 타임 · 총 {d.sessionsToday}개 회차 진행
            </p>
            <p className="mt-0.5 text-[12px] text-sub">
              활성 {d.sectionsActive}개 반 (총 수강 {d.totalStudents}명) · 터치하여 실시간 반별 출결 확인
            </p>
          </Link>

          {/* 긴급 조치 카드 (Action Center) */}
          <section className="space-y-2">
            <h3 className="text-[14px] font-bold text-fg">오늘 처리할 일</h3>
            <div className="grid grid-cols-2 gap-2">
              {urgentTasks.map((t) => (
                <Link
                  key={t.id}
                  href={t.href}
                  className={`tap flex flex-col justify-between rounded-xl border p-3 transition-colors ${
                    t.warn
                      ? "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
                      : "border-line bg-card hover:bg-elev"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-sub">{t.label}</span>
                    <span
                      className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                        t.warn ? "bg-amber-500/20 text-amber-900" : "bg-line text-sub"
                      }`}
                    >
                      {t.badge}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[20px] font-bold text-fg">{t.value}</p>
                  <p className="mt-0.5 truncate text-[11px] text-faint">{t.desc}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* 빠른 실행 바로가기 (Quick Shortcuts) */}
          <section className="space-y-2 pt-1">
            <h3 className="text-[14px] font-bold text-fg">빠른 실행</h3>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`${base}/comms`}
                className="tap flex items-center gap-2.5 rounded-xl border border-line bg-card p-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
                  💬
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[13px] text-fg">공지 및 소통</p>
                  <p className="text-[11px] text-sub truncate">알림톡 발송·공지 이력</p>
                </div>
              </Link>
              <Link
                href={`${base}/reports`}
                className="tap flex items-center gap-2.5 rounded-xl border border-line bg-card p-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
                  📄
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[13px] text-fg">회차 리포트</p>
                  <p className="text-[11px] text-sub truncate">검수 및 학부모 공개</p>
                </div>
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
