"use client";

/**
 * 센터 · 강사 상세 — 프로필 + 이 운영 건의 회차 목록에서 배정/해제
 *   같은 시간에 다른 반을 맡고 있으면 "겹침" 으로 표시하고 배정을 막는다
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Photo } from "@/components/staff/Photo";
import { Badge, Button, Card, ChipRow, Empty, ErrorBox, fmtDate, KeyValue, Loading, PageTitle, SectionLabel } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { todayKey } from "@/lib/dates";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { useToast } from "@/providers/ToastProvider";
import { useApi, useMutation, useQuery } from "@/services";

type Filter = "upcoming" | "mine" | "unassigned" | "all";

export default function CenterInstructorDetailPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const api = useApi();
  const toast = useToast();
  const { selectedRun, runsLoading } = useCenterRun();
  const runId = selectedRun?.id ?? null;
  const { data, loading, error, refetch } = useQuery(() => (runId && staffId ? api.center.getInstructor(staffId, runId) : null), [api, runId, staffId]);
  usePageTitle(data ? `${data.profile.name} 강사` : "강사");
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [busy, setBusy] = useState<string | null>(null);
  const assign = useMutation((runSessionId: string, id: string | null) => api.center.assignInstructor(runSessionId, id));
  const today = todayKey();

  const sessions = useMemo(() => {
    if (!data) return [];
    return data.sessions.filter((s) => {
      if (filter === "mine") return s.instructorId === staffId;
      if (filter === "unassigned") return !s.instructorId;
      if (filter === "upcoming") return s.scheduledDate >= today;
      return true;
    });
  }, [data, filter, staffId, today]);

  if (runsLoading || (loading && !data)) return <Loading />;
  if (!selectedRun) return <Empty title="운영 건을 먼저 골라 주세요" />;
  if (error) return <ErrorBox message={error} onRetry={() => void refetch()} />;
  if (!data) return null;

  const p = data.profile;
  const counts = {
    upcoming: data.sessions.filter((s) => s.scheduledDate >= today).length,
    mine: data.sessions.filter((s) => s.instructorId === staffId).length,
    unassigned: data.sessions.filter((s) => !s.instructorId).length,
    all: data.sessions.length,
  };

  async function toggle(sessionId: string, mine: boolean) {
    setBusy(sessionId);
    try {
      await assign.run(sessionId, mine ? null : staffId);
      toast.show(mine ? "배정을 해제했어요" : `${p.name} 강사를 배정했어요`);
    } catch (e) {
      toast.show((e as Error).message || "저장하지 못했어요");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <Link href="/admin/center/instructors" className="tap inline-flex h-11 items-center text-[15px] font-semibold text-sub">
        ‹ 강사 목록
      </Link>
      <PageTitle title={p.name} desc={p.specialties.length ? p.specialties.join(" · ") : "전담 멘토"} right={<Photo id={p.staffId} name={p.name} photoUrl={p.photoUrl} size={56} />} />

      <Card>
        <KeyValue
          items={[
            { k: "소개", v: p.bio ?? "-" },
            { k: "이메일", v: p.email ?? "-" },
            { k: "이번 주", v: `${p.sessionsThisWeek}회 수업` },
            { k: "이 운영 건", v: `${p.sessionsInRun}회 담당` },
          ]}
        />
      </Card>

      <SectionLabel right={`${selectedRun.title}`}>회차 배정</SectionLabel>
      <ChipRow
        label="회차 필터"
        value={filter}
        onChange={setFilter}
        items={[
          { id: "upcoming", label: "앞으로", count: counts.upcoming },
          { id: "mine", label: "담당", count: counts.mine },
          { id: "unassigned", label: "미배정", count: counts.unassigned },
          { id: "all", label: "전체", count: counts.all },
        ]}
      />

      {sessions.length === 0 ? (
        <div className="mt-2">
          <Empty title="해당하는 회차가 없어요" />
        </div>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {sessions.map((s) => {
            const mine = s.instructorId === staffId;
            const past = s.scheduledDate < today;
            return (
              <li key={s.id} className={`flex items-center gap-3 rounded-[16px] border p-3 ${mine ? "border-gold-dim bg-card" : "border-line bg-card"}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-bold text-fg">
                    {fmtDate(s.scheduledDate)} · {s.startTime}–{s.endTime}
                  </p>
                  <p className="mt-[2px] text-[14px] text-sub">
                    {s.sessionNumber}회차 {s.sectionLabel} · {s.topic}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {mine ? (
                      <Badge tone="gold">담당</Badge>
                    ) : s.instructorName ? (
                      <Badge tone="neutral">{s.instructorName}</Badge>
                    ) : (
                      <Badge tone="danger">미배정</Badge>
                    )}
                    {s.conflict && !mine && <Badge tone="late">같은 시간 수업 있음</Badge>}
                  </div>
                </div>
                <Button
                  onClick={() => void toggle(s.id, mine)}
                  variant={mine ? "secondary" : "primary"}
                  size="sm"
                  disabled={past || (!mine && s.conflict)}
                  loading={busy === s.id}
                  ariaLabel={`${s.sessionNumber}회차 ${s.sectionLabel} ${mine ? "배정 해제" : "배정"}`}
                >
                  {mine ? "해제" : s.instructorName ? "바꾸기" : "배정"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
