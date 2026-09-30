"use client";

/**
 * 센터 홈 — 오늘 할 일이 먼저
 *   1. 오늘 브리핑 (오늘 수업 · 출결 미입력 · 다음 수업일)
 *   2. 학부모 채팅 · 민원 (답을 기다리는 대화 · 가장 오래 기다린 시간 · 미처리 민원)
 *   3. 할 일 카드 4개 (검수 대기 리포트 · 보호자 미연결 · 강사 미배정 · 수강생)
 *   4. 바로 가기 (공지 보내기 · 학생 명단 · 강사 배정)
 *   5. 최근 공지
 */

import Link from "next/link";
import { Badge, Button, Card, Empty, ErrorBox, fmtDate, fmtDateTime, Loading, PageTitle, SectionLabel, Stat } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { waitedFor } from "@/lib/chatTime";
import { todayKey } from "@/lib/dates";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { PROGRAM_RUN_STATUS_LABEL, useApi, useQuery } from "@/services";

export default function CenterHomePage() {
  usePageTitle("센터 홈");
  const api = useApi();
  const { runs, runsLoading, runsError, selectedRun, summary, summaryLoading, refetch } = useCenterRun();
  const runId = selectedRun?.id ?? null;
  const { data: notices } = useQuery(() => (runId ? api.center.listNotifications(runId) : null), [api, runId]);

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
      <PageTitle
        eyebrow={`${selectedRun.campusName} · ${selectedRun.municipalityName}`}
        title={selectedRun.title}
        desc={`${selectedRun.contractCode} · ${selectedRun.sections.length}개 반 · 수강 ${selectedRun.studentCount}명`}
        right={<Badge tone={selectedRun.status === "active" ? "gold" : "neutral"}>{PROGRAM_RUN_STATUS_LABEL[selectedRun.status]}</Badge>}
      />

      {summaryLoading || !k ? (
        <Loading />
      ) : (
        <>
          {/* 오늘 브리핑 */}
          <Card tone="gold" className="mb-3">
            <p className="text-[14px] font-bold text-gold">{fmtDate(today)} 오늘</p>
            {k.sessionsToday > 0 ? (
              <>
                <p className="mt-1 text-[20px] font-extrabold leading-[28px] text-fg">
                  수업 {k.sessionsToday}개 · {k.parallelSlotsToday}개 시간대
                </p>
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
                      다음 수업 준비하기
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* 학부모 채팅 · 민원 */}
          <SectionLabel
            right={
              <Link href={`${base}/inquiries`} className="text-gold underline underline-offset-2">
                민원·문의 기록
              </Link>
            }
          >
            학부모 채팅
          </SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="답을 기다리는 대화"
              value={k.chatWaiting}
              unit="개"
              tone={k.chatWaiting > 0 ? "late" : "fg"}
              hint={k.chatOldestWaitingAt ? `가장 오래 ${waitedFor(k.chatOldestWaitingAt)}` : "모두 답했어요"}
              href={`${base}/chat${k.chatWaiting > 0 ? "?filter=waiting" : ""}`}
            />
            <Stat label="미처리 민원" value={k.complaintsOpen} unit="건" tone={k.complaintsOpen > 0 ? "danger" : "fg"} hint="접수 · 처리 중" href={`${base}/inquiries`} />
          </div>

          {/* 할 일 */}
          <SectionLabel>할 일</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="검수 대기 리포트" value={k.reportsPendingReview} unit="건" tone={k.reportsPendingReview > 0 ? "gold" : "fg"} href={`${base}/reports?status=pending`} />
            <Stat label="보호자 미연결" value={k.studentsWithoutGuardian} unit="명" tone={k.studentsWithoutGuardian > 0 ? "late" : "fg"} href={`${base}/students?guardian=unlinked`} />
            <Stat label="강사 미배정 회차" value={k.sessionsWithoutInstructor} unit="개" tone={k.sessionsWithoutInstructor > 0 ? "danger" : "fg"} href={`${base}/instructors`} />
            <Stat label="수강생" value={k.totalStudents} unit="명" hint={`${k.sectionsActive}개 반`} href={`${base}/students`} />
          </div>

          {/* 바로 가기 */}
          <SectionLabel>바로 가기</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            <Button href={`${base}/comms`} variant="secondary" className="min-h-[52px]">
              공지 보내기
            </Button>
            <Button href={`${base}/students`} variant="secondary" className="min-h-[52px]">
              학생 명단
            </Button>
            <Button href={`${base}/instructors`} variant="secondary" className="min-h-[52px]">
              강사 배정
            </Button>
          </div>

          {/* 최근 공지 */}
          <SectionLabel
            right={
              <Link href={`${base}/comms`} className="text-gold underline underline-offset-2">
                전체 보기
              </Link>
            }
          >
            최근 공지
          </SectionLabel>
          {!notices ? (
            <Loading />
          ) : notices.length === 0 ? (
            <Empty title="보낸 공지가 없어요" />
          ) : (
            <ul className="flex flex-col gap-2">
              {notices.slice(0, 3).map((n) => (
                <li key={n.id} className="rounded-[16px] border border-line bg-card px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[16px] font-bold text-fg">{n.title}</p>
                    <span className="shrink-0 text-[14px] text-sub">{fmtDateTime(n.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-[14px] text-sub">
                    {n.sectionLabel ?? "전체"} · 보호자 {n.recipients}명 · {n.createdByName}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
