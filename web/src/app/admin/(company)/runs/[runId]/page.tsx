"use client";

/**
 * 회사 · 운영 건 상세 — 기본 정보 · 반 · 리포트 정책 · 강사 · 회차 일정
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Button, Card, Empty, ErrorBox, fmtDate, KeyValue, Loading, PageTitle, SectionLabel } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { WEEKDAYS } from "@/lib/dates";
import { useToast } from "@/providers/ToastProvider";
import { PROGRAM_RUN_STATUS_LABEL, useApi, useMutation, useQuery } from "@/services";

export default function CompanyRunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const api = useApi();
  const toast = useToast();
  const { data, loading, error, refetch } = useQuery(() => (runId ? api.company.getRun(runId) : null), [api, runId]);
  usePageTitle(data ? data.title : "운영 건");
  const policy = useMutation((v: boolean) => api.company.updateRunPolicy(runId, { requireCompanyApproval: v }));

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={() => void refetch()} />;
  if (!data) return <Empty title="운영 건을 찾을 수 없어요" />;

  const byDate = new Map<string, typeof data.sessions>();
  for (const s of data.sessions) byDate.set(s.scheduledDate, [...(byDate.get(s.scheduledDate) ?? []), s]);

  async function togglePolicy() {
    try {
      await policy.run(!data!.reportPolicy.requireCompanyApproval);
      toast.show("리포트 정책을 바꿨어요");
    } catch (e) {
      toast.show((e as Error).message);
    }
  }

  return (
    <div>
      <Link href="/admin/runs" className="tap inline-flex h-11 items-center text-[15px] font-semibold text-sub">
        ‹ 운영 건 목록
      </Link>
      <PageTitle eyebrow={data.contractCode} title={data.title} desc={`${data.campusName} · ${data.municipalityName}`} right={<Badge tone={data.status === "active" ? "gold" : "neutral"}>{PROGRAM_RUN_STATUS_LABEL[data.status]}</Badge>} />

      <Card>
        <KeyValue
          items={[
            { k: "프로그램", v: data.programTemplateTitle },
            { k: "기간", v: `${fmtDate(data.startDate)} ~ ${data.endDate ? fmtDate(data.endDate) : ""}` },
            { k: "일정", v: `${data.frequency === "biweekly" ? "격주" : "매주"} ${WEEKDAYS[data.fixedDay]}요일 · ${data.startTime}–${data.endTime} · 총 ${data.totalSessions}회` },
            { k: "장소", v: data.location },
            { k: "주최", v: data.host ?? "-" },
            { k: "수강생", v: `${data.studentCount}명 · 보호자 연결 ${data.guardianLinkedCount}명` },
            { k: "출석률", v: data.attendanceRate != null ? `${data.attendanceRate}%` : "아직 없음" },
          ]}
        />
      </Card>

      <SectionLabel>반</SectionLabel>
      <ul className="grid grid-cols-3 gap-2">
        {data.sections.map((s) => (
          <li key={s.id} className="rounded-[14px] border border-line bg-card px-3 py-2 text-center">
            <p className="text-[16px] font-bold text-fg">{s.label}</p>
            <p className="text-[14px] text-sub">{s.studentCount}명</p>
          </li>
        ))}
      </ul>

      <SectionLabel>리포트 정책</SectionLabel>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[16px] font-bold text-fg">{data.reportPolicy.requireCompanyApproval ? "회사 승인 후 공개" : "센터 검수 후 바로 공개"}</p>
            <p className="mt-[2px] text-[14px] text-sub">{data.reportPolicy.requireCompanyApproval ? "센터가 검수한 리포트를 회사가 한 번 더 승인해요." : "센터가 확인하면 학부모에게 바로 공개돼요."}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void togglePolicy()} loading={policy.pending}>
            바꾸기
          </Button>
        </div>
      </Card>

      <SectionLabel>강사</SectionLabel>
      {data.instructors.length === 0 ? (
        <Empty title="아직 배정된 강사가 없어요" desc="센터 앱의 강사 배정에서 회차별로 정해요." />
      ) : (
        <ul className="flex flex-wrap gap-2">
          {data.instructors.map((i) => (
            <li key={i.staffId} className="rounded-full border border-line bg-card px-4 py-2 text-[15px] text-fg2">
              <b className="text-fg">{i.name}</b> · {i.sessionCount}회
            </li>
          ))}
        </ul>
      )}

      <SectionLabel right={`${data.sessions.length}개 회차`}>회차 일정</SectionLabel>
      <ul className="flex flex-col gap-2">
        {[...byDate.entries()].map(([date, list]) => (
          <li key={date} className="rounded-[16px] border border-line bg-card px-4 py-3">
            <p className="text-[16px] font-bold text-fg">
              {fmtDate(date)} · {list[0].sessionNumber}회차
            </p>
            <p className="mt-[2px] text-[14px] text-sub">{list[0].topic}</p>
            <ul className="mt-2 flex flex-wrap gap-1">
              {list.map((s) => (
                <li key={s.id} className={`rounded-md border px-2 py-[2px] text-[14px] ${s.status === "cancelled" ? "border-line text-faint" : "border-line bg-elev text-fg2"}`}>
                  {s.sectionLabel} {s.startTime} · {s.instructorName ?? <span className="text-danger">미배정</span>}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
