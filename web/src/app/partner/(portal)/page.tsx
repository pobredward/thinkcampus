"use client";

/**
 * 발주처 · 현황 — 처음 보는 담당 공무원도 한눈에
 *   1. 숫자 4개 (누르면 그 메뉴로): 진행 회차 · 출석률 · 민원 · 학부모 만족도
 *   2. 다음 수업 (언제 · 무엇을 · 누가) · 최근 민원 (무엇이 · 어떻게 처리됐는지)
 * 회차별 출석 표는 [참여], 문의 응대 숫자는 [민원·문의], 공지는 보고서에.
 */

import Link from "next/link";
import { dayLabel, Kpi, LessonStatus, rateText } from "@/components/partner/parts";
import { InquiryStatusChip } from "@/components/staff/InquiryParts";
import { Card, Empty, ErrorBox, Loading, SectionLabel } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { chatStamp } from "@/lib/chatTime";
import { usePartnerRun } from "@/providers/PartnerRunProvider";
import { PROGRAM_RUN_STATUS_LABEL, useApi, useQuery } from "@/services";

export default function PartnerHomePage() {
  usePageTitle("발주처 현황");
  const api = useApi();
  const { selectedRun, runsLoading, runsError } = usePartnerRun();
  const runId = selectedRun?.id ?? null;
  const { data, loading, error, refetch } = useQuery(() => (runId ? api.partner.getHome(runId) : null), [api, runId]);

  if (runsLoading) return <Loading label="담당 운영 건을 불러오는 중..." />;
  if (runsError) return <ErrorBox message={runsError} />;
  if (!selectedRun) return <Empty title="담당 운영 건이 아직 없어요" desc="씽크캠퍼스 통합 관리자가 운영 건을 연결하면 여기에 보여요." />;
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={() => void refetch()} />;
  if (!data) return null;

  const { run, progress, attendance, inquiryStats: st, nextLesson, recentComplaints, survey } = data;
  const openComplaints = Math.max(0, st.complaints.received - st.complaints.resolved);

  return (
    <div data-testid="partner-home">
      <div className="mb-5">
        <p className="text-[15px] font-bold text-gold">
          {run.campusName} · {PROGRAM_RUN_STATUS_LABEL[run.status]}
        </p>
        <h1 className="mt-1 text-[26px] font-extrabold leading-[34px] text-fg md:text-[30px]">{run.title}</h1>
        <p className="mt-1 text-[15px] text-sub">
          {run.sections.length}개 반 · 수강 {run.studentCount}명
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="진행 회차" value={`${progress.done} / ${progress.total}`} unit="회" hint={progress.nextDate ? `다음 수업 ${dayLabel(progress.nextDate)}` : "모든 수업을 마쳤어요"} href="/partner/lessons" />
        <Kpi label="출석률" value={rateText(attendance.rate)} tone="gold" hint="지각 포함" href="/partner/participation" />
        <Kpi
          label="민원"
          value={st.complaints.received}
          unit="건"
          tone={openComplaints > 0 ? "late" : "fg"}
          hint={st.complaints.received === 0 ? "접수된 민원 없음" : openComplaints === 0 ? "모두 처리 완료" : `처리 중 ${openComplaints}건`}
          href="/partner/inquiries"
        />
        <Kpi label="학부모 만족도" value={survey?.overallAvg != null ? survey.overallAvg.toFixed(1) : "-"} unit="/ 5" hint={survey ? `${survey.responses}명 응답` : "조사 전"} href="/partner/survey" />
      </div>

      <div className="mt-6 grid gap-x-4 gap-y-6 lg:grid-cols-2">
        <section>
          <SectionLabel right={<Link href="/partner/lessons" className="text-gold underline underline-offset-2">전체 회차</Link>}>다음 수업</SectionLabel>
          {nextLesson ? (
            <Card>
              <div className="flex flex-wrap items-center gap-2">
                <LessonStatus status={nextLesson.status} />
                <span className="text-[15px] text-sub">
                  {dayLabel(nextLesson.date)} · {nextLesson.slots.join(" / ")}
                </span>
              </div>
              <p className="mt-2 text-[18px] font-bold text-fg">
                {nextLesson.sessionNumber}회차 · {nextLesson.topic}
              </p>
              {nextLesson.description && <p className="mt-2 text-[15px] leading-[23px] text-fg2">{nextLesson.description}</p>}
              <p className="mt-3 text-[14px] text-sub">강사 {nextLesson.instructors.map((i) => i.name).join(", ")}</p>
            </Card>
          ) : (
            <Empty title="남은 수업이 없어요" />
          )}
        </section>
        <section>
          <SectionLabel right={<Link href="/partner/inquiries" className="text-gold underline underline-offset-2">민원 전체</Link>}>최근 민원</SectionLabel>
          {recentComplaints.length === 0 ? (
            <Empty title="접수된 민원이 없어요" />
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-card">
              {recentComplaints.slice(0, 3).map((q) => (
                <li key={q.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-[16px] font-bold text-fg">{q.title}</p>
                    <InquiryStatusChip status={q.status} />
                  </div>
                  <p className="mt-1 text-[14px] text-sub">{chatStamp(q.createdAt)}</p>
                  {q.resolution && <p className="mt-1 line-clamp-2 text-[15px] leading-[22px] text-fg2">처리: {q.resolution}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
