"use client";

/**
 * 회사 홈 — 전체 현황 (운영 중 · 수강생 · 승인 대기 · 마지막 명단 등록) + 운영 건 목록
 */

import { Badge, Button, Empty, ErrorBox, fmtDateTime, Loading, PageTitle, RowLink, SectionLabel, Stat } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { PROGRAM_RUN_STATUS_LABEL, useApi, useQuery } from "@/services";

export default function CompanyHomePage() {
  usePageTitle("회사 홈");
  const api = useApi();
  const { data, loading, error, refetch } = useQuery(() => api.company.getHome(), [api]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={() => void refetch()} />;
  if (!data) return null;

  const open = data.runs.filter((r) => r.status === "active" || r.status === "scheduled");

  return (
    <div>
      <PageTitle title="씽크캠퍼스 운영 현황" desc={`캠퍼스 ${data.campuses.length}곳 · 운영 중 ${open.length}건`} />
      <div className="grid grid-cols-2 gap-3">
        <Stat label="수강생" value={data.totalStudents} unit="명" hint="운영 중·예정 기준" />
        <Stat label="승인 대기 리포트" value={data.reportsAwaitingApproval} unit="건" tone={data.reportsAwaitingApproval > 0 ? "gold" : "fg"} href="/admin/policy" />
        <Stat label="운영 중" value={data.runs.filter((r) => r.status === "active").length} unit="건" href="/admin/runs" />
        <Stat label="마지막 명단 등록" value={data.lastImport ? `${data.lastImport.rowCount}명` : "-"} hint={data.lastImport ? `${fmtDateTime(data.lastImport.at)} · ${data.lastImport.contractCode}` : "아직 없음"} href="/admin/import" />
      </div>

      <SectionLabel right={<Button href="/admin/runs/new" size="sm" variant="secondary">새 운영 건</Button>}>운영 건</SectionLabel>
      {data.runs.length === 0 ? (
        <Empty title="운영 건이 없어요" action={<Button href="/admin/runs/new">첫 운영 건 만들기</Button>} />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.runs.map((r) => (
            <li key={r.id}>
              <RowLink
                href={`/admin/runs/${encodeURIComponent(r.id)}`}
                title={r.title}
                desc={`${r.contractCode} · ${r.campusName} · ${r.sections.length}개 반 · ${r.studentCount}명`}
                badge={<Badge tone={r.status === "active" ? "gold" : r.status === "scheduled" ? "neutral" : "dim"}>{PROGRAM_RUN_STATUS_LABEL[r.status]}</Badge>}
              />
            </li>
          ))}
        </ul>
      )}

      <SectionLabel>캠퍼스</SectionLabel>
      <ul className="grid grid-cols-2 gap-2">
        {data.campuses.map((c) => (
          <li key={c.id} className="rounded-[16px] border border-line bg-card px-4 py-3">
            <p className="text-[16px] font-bold text-fg">{c.name}</p>
            <p className="text-[14px] text-sub">
              {c.municipalityName} · 운영 {c.runCount}건 · {c.studentCount}명
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
