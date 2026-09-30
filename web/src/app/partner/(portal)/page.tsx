"use client";

/**
 * 발주처 · 현황 — 담당 공무원이 한 화면에서 보는 것
 *   1. 숫자 4개: 진행 회차 · 전체 출석률 · 민원(접수 · 처리 완료 · 처리 중) · 만족도
 *   2. 회차별 출석 (30명 중 29명 …)
 *   3. 다음 수업 (무엇을 · 누가) · 최근 민원 (원문 + 처리 내용) · 최근 공지
 */

import Link from "next/link";
import { AttendanceTable, dayLabel, Kpi, LessonBody, LessonStatus, rateText } from "@/components/partner/parts";
import { InquiryBadges } from "@/components/staff/InquiryParts";
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

  const { run, progress, attendance, inquiryStats: st, nextLesson, recentComplaints, recentNotices, survey } = data;
  const complaintsTotal = st.complaints.received;

  return (
    <div data-testid="partner-home">
      <div className="mb-5">
        <p className="text-[15px] font-bold text-gold">
          {run.municipalityName} · {run.campusName} · {PROGRAM_RUN_STATUS_LABEL[run.status]}
        </p>
        <h1 className="mt-1 text-[26px] font-extrabold leading-[34px] text-fg md:text-[30px]">{run.title}</h1>
        <p className="mt-1 text-[15px] text-sub">
          {run.contractCode} · {run.sections.length}개 반 · 수강 {run.studentCount}명{data.host ? ` · 주최 ${data.host}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="진행 회차" value={`${progress.done} / ${progress.total}`} unit="회" hint={progress.nextDate ? `다음 수업 ${dayLabel(progress.nextDate)}` : "모든 수업을 마쳤어요"} />
        <Kpi label="전체 출석률" value={rateText(attendance.rate)} tone="gold" hint="출석 + 지각 / 입력된 인원" />
        <Kpi
          label="민원"
          value={complaintsTotal}
          unit="건 접수"
          tone={st.complaints.inProgress > 0 ? "late" : "fg"}
          hint={
            <>
              처리 완료 {st.complaints.resolved} · 처리 중 <b className={st.complaints.inProgress ? "text-late" : ""}>{st.complaints.inProgress}</b>
            </>
          }
        />
        <Kpi
          label="학부모 만족도"
          value={survey?.overallAvg != null ? survey.overallAvg.toFixed(2) : "-"}
          unit="/ 5"
          hint={survey ? `응답 ${survey.responses}/${survey.eligible}명` : "조사 전"}
        />
      </div>
      <p className="mt-2 text-[14px] text-sub">
        학부모 문의 {st.questions.received}건 · 답변 {st.questions.answered}건
        {st.questions.avgFirstReplyMinutes != null ? ` · 평균 첫 답변 ${st.questions.avgFirstReplyMinutes}분` : ""} (앱 채팅 · 전화 기록 기준)
      </p>

      <SectionLabel right={<Link href="/partner/participation" className="text-gold underline underline-offset-2">학생별 보기</Link>}>회차별 출석</SectionLabel>
      <AttendanceTable rows={attendance.rows} />

      <div className="mt-2 grid gap-4 lg:grid-cols-2">
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
              <div className="mt-3">
                <LessonBody l={nextLesson} />
              </div>
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
            <ul className="flex flex-col gap-2">
              {recentComplaints.map((q) => (
                <li key={q.id} className="rounded-[16px] border border-line bg-card px-4 py-3">
                  <InquiryBadges q={q} />
                  <p className="mt-2 text-[16px] font-bold text-fg">{q.title}</p>
                  <p className="mt-1 text-[14px] text-sub">
                    {q.studentLabel} · {chatStamp(q.createdAt)}
                  </p>
                  {q.resolution && <p className="mt-2 line-clamp-2 text-[15px] leading-[22px] text-fg2">처리: {q.resolution}</p>}
                </li>
              ))}
            </ul>
          )}
          <SectionLabel>학부모 공지</SectionLabel>
          {recentNotices.length === 0 ? (
            <Empty title="보낸 공지가 없어요" />
          ) : (
            <ul className="flex flex-col gap-2">
              {recentNotices.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3 rounded-[14px] border border-line bg-card px-4 py-3">
                  <span className="min-w-0 truncate text-[15px] font-semibold text-fg">{n.title}</span>
                  <span className="shrink-0 text-[14px] text-sub">
                    {chatStamp(n.createdAt)} · {n.recipients}명
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
