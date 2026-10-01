"use client";

/**
 * 회사 홈 — 처음 보는 사람도 한눈에
 *   1. 한 줄 요약 (캠퍼스 · 운영 중 · 수강생)
 *   2. 할 일 (승인 대기 리포트 · 미처리 민원) — 0 인 줄은 숨김
 *   3. 진행 중 · 예정 운영 건 (+ 새 운영 건). 끝난 운영 건 · 명단 기록은 각 탭에서
 */

import Link from "next/link";
import { Badge, Button, Empty, ErrorBox, Loading, PageTitle, RowLink, SectionLabel, TaskList } from "@/components/staff/ui";
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
  const active = data.runs.filter((r) => r.status === "active").length;

  return (
    <div>
      <PageTitle title="운영 현황" desc={`캠퍼스 ${data.campuses.length}곳 · 운영 중 ${active}건 · 수강생 ${data.totalStudents}명`} />

      <SectionLabel>할 일</SectionLabel>
      <TaskList
        done="지금 처리할 일이 없어요"
        items={[
          { label: "승인 대기 리포트", count: data.reportsAwaitingApproval, unit: "건", href: "/admin/policy", testId: "company-task-reports" },
          { label: "미처리 민원", count: data.complaintsOpen, unit: "건", tone: "danger", hint: "처리는 각 캠퍼스 프로그램 매니저가 해요", href: "/admin/inquiries", testId: "company-task-complaints" },
        ]}
      />

      <SectionLabel
        right={
          <div className="flex items-center gap-3">
            <Link href="/admin/runs" className="text-gold underline underline-offset-2">
              전체 보기
            </Link>
            <Button href="/admin/runs/new" size="sm" variant="secondary">
              새 운영 건
            </Button>
          </div>
        }
      >
        진행 중인 운영 건
      </SectionLabel>
      {open.length === 0 ? (
        <Empty title="진행 중인 운영 건이 없어요" action={<Button href="/admin/runs/new">운영 건 만들기</Button>} />
      ) : (
        <ul className="flex flex-col gap-2">
          {open.map((r) => (
            <li key={r.id}>
              <RowLink
                href={`/admin/runs/${encodeURIComponent(r.id)}`}
                title={r.title}
                desc={`${r.campusName} · 수강 ${r.studentCount}명`}
                badge={<Badge tone={r.status === "active" ? "gold" : "neutral"}>{PROGRAM_RUN_STATUS_LABEL[r.status]}</Badge>}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
