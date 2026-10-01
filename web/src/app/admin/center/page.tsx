"use client";

/**
 * 센터 홈 — 처음 보는 사람도 "지금 무엇을 하면 되는지"만 보이게
 *   1. 오늘 (수업 수 · 출결 미입력 → [오늘 수업 보기])
 *   2. 할 일 한 목록 (답을 기다리는 채팅 · 미처리 민원 · 검수 대기 리포트 · 강사 미배정 · 보호자 미연결) — 0 인 줄은 숨김
 * 공지 · 학생 명단 · 강사 · 만족도는 [더보기] 에.
 */

import { Badge, Button, Card, Empty, ErrorBox, fmtDate, Loading, PageTitle, SectionLabel, TaskList } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { waitedFor } from "@/lib/chatTime";
import { todayKey } from "@/lib/dates";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { PROGRAM_RUN_STATUS_LABEL } from "@/services";

export default function CenterHomePage() {
  usePageTitle("센터 홈");
  const { runs, runsLoading, runsError, selectedRun, summary, summaryLoading, refetch } = useCenterRun();

  if (runsLoading) return <Loading label="운영 건을 불러오는 중..." />;
  if (runsError) return <ErrorBox message={runsError} onRetry={() => void refetch()} />;
  if (!selectedRun || runs.length === 0) {
    return <Empty title="담당 운영 건이 아직 없어요" desc="회사에서 운영 건을 만들고 명단을 등록하면 여기에 보여요." />;
  }

  const k = summary?.dashboard;
  const today = todayKey();
  const base = "/admin/center";

  return (
    <div>
      <PageTitle eyebrow={selectedRun.campusName} title={selectedRun.title} right={selectedRun.status !== "active" ? <Badge tone="neutral">{PROGRAM_RUN_STATUS_LABEL[selectedRun.status]}</Badge> : undefined} />

      {summaryLoading || !k ? (
        <Loading />
      ) : (
        <div className="grid gap-x-4 gap-y-6 md:grid-cols-2">
          <section>
            <SectionLabel>오늘</SectionLabel>
            <Card tone="gold">
              <p className="text-[14px] font-bold text-gold">{fmtDate(today)}</p>
              {k.sessionsToday > 0 ? (
                <>
                  <p className="mt-1 text-[20px] font-extrabold leading-[28px] text-fg">수업 {k.sessionsToday}개</p>
                  <p className="mt-1 text-[15px] leading-[22px] text-sub">
                    {k.attendancePendingToday > 0 ? `출결이 아직 안 들어온 학생 ${k.attendancePendingToday}명` : "오늘 출결이 모두 입력됐어요"}
                  </p>
                  <div className="mt-3">
                    <Button href={`${base}/lessons?date=${today}`} size="lg" className="w-full">
                      오늘 수업 보기
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-1 text-[20px] font-extrabold leading-[28px] text-fg">오늘은 수업이 없어요</p>
                  <p className="mt-1 text-[15px] text-sub">{k.nextSessionDate ? `다음 수업 ${fmtDate(k.nextSessionDate)}` : "남은 수업이 없어요"}</p>
                  {k.nextSessionDate && (
                    <div className="mt-3">
                      <Button href={`${base}/lessons?date=${k.nextSessionDate}`} variant="secondary" size="lg" className="w-full">
                        다음 수업 보기
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Card>
          </section>

          <section>
            <SectionLabel>할 일</SectionLabel>
            <TaskList
              done="지금 처리할 일이 없어요"
              items={[
                {
                  label: "답을 기다리는 학부모 채팅",
                  count: k.chatWaiting,
                  unit: "개",
                  tone: "late",
                  hint: k.chatOldestWaitingAt ? `가장 오래 ${waitedFor(k.chatOldestWaitingAt)} 기다림` : undefined,
                  href: `${base}/chat?filter=waiting`,
                  testId: "center-task-chat",
                },
                { label: "미처리 민원", count: k.complaintsOpen, unit: "건", tone: "danger", href: `${base}/inquiries`, testId: "center-task-complaints" },
                { label: "검수 대기 리포트", count: k.reportsPendingReview, unit: "건", href: `${base}/reports?status=pending`, testId: "center-task-reports" },
                { label: "강사 미배정 회차", count: k.sessionsWithoutInstructor, unit: "개", tone: "danger", href: `${base}/instructors`, testId: "center-task-instructors" },
                { label: "보호자 미연결 학생", count: k.studentsWithoutGuardian, unit: "명", tone: "late", href: `${base}/students?guardian=unlinked`, testId: "center-task-guardians" },
              ]}
            />
          </section>
        </div>
      )}
    </div>
  );
}
