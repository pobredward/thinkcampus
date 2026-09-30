"use client";

/**
 * 통합 관리자 · 민원·문의 (모든 캠퍼스) — 열람 전용
 *   처리는 각 캠퍼스 프로그램 매니저가 센터 앱에서 한다. 여기서는 운영 건별로 상태 · 처리 내용 · 이력 · 발주처 의견을 본다.
 *   ?run=<programRunId> 로 들어오면 그 운영 건만
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { InquiryBadges, InquiryHistory } from "@/components/staff/InquiryParts";
import { ChipRow, Empty, ErrorBox, Loading, PageTitle, Select } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { chatStamp } from "@/lib/chatTime";
import { useApi, useQuery, type InquiryDto } from "@/services";

type StatusFilter = "open" | "resolved" | "all";

export default function CompanyInquiriesPage() {
  usePageTitle("민원·문의");
  const api = useApi();
  const sp = useSearchParams();
  const router = useRouter();
  const runId = sp.get("run") ?? "";
  const { data: runs } = useQuery(() => api.company.listRuns(), [api]);
  const { data, loading, error, refetch } = useQuery(() => api.company.listInquiries(runId ? { programRunId: runId } : {}), [api, runId]);
  const [status, setStatus] = useState<StatusFilter>("open");
  const all = useMemo(() => data ?? [], [data]);
  const shown = all.filter((q) => (status === "open" ? q.status !== "resolved" : status === "resolved" ? q.status === "resolved" : true));

  return (
    <div>
      <Link href="/admin" className="tap inline-flex h-11 items-center text-[15px] font-semibold text-sub">
        ‹ 홈
      </Link>
      <PageTitle title="민원·문의" desc="모든 캠퍼스 · 처리는 각 캠퍼스 프로그램 매니저가 해요" />
      <label htmlFor="inq-run" className="sr-only">
        운영 건
      </label>
      <Select id="inq-run" value={runId} onChange={(e) => router.replace(e.target.value ? `/admin/inquiries?run=${encodeURIComponent(e.target.value)}` : "/admin/inquiries")}>
        <option value="">모든 운영 건</option>
        {(runs ?? []).map((r) => (
          <option key={r.id} value={r.id}>
            {r.contractCode} · {r.title}
          </option>
        ))}
      </Select>
      <div className="mt-3">
        <ChipRow<StatusFilter>
          label="처리 상태"
          value={status}
          onChange={setStatus}
          items={[
            { id: "open", label: "미처리", count: all.filter((q) => q.status !== "resolved").length },
            { id: "resolved", label: "처리 완료", count: all.filter((q) => q.status === "resolved").length },
            { id: "all", label: "전체", count: all.length },
          ]}
        />
      </div>
      <div className="mt-3">
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={() => void refetch()} />
        ) : shown.length === 0 ? (
          <Empty title="해당하는 민원·문의가 없어요" />
        ) : (
          <ul className="flex flex-col gap-2">
            {shown.map((q) => (
              <li key={q.id}>
                <InquiryDetails q={q} showRun={!runId} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function InquiryDetails({ q, showRun }: { q: InquiryDto; showRun: boolean }) {
  return (
    <details className="group rounded-[16px] border border-line bg-card px-4 py-3" data-testid="company-inquiry">
      <summary className="tap cursor-pointer list-none">
        <InquiryBadges q={q} />
        <p className="mt-2 text-[16px] font-bold leading-[23px] text-fg">{q.title}</p>
        <p className="mt-1 text-[14px] text-sub">
          {showRun ? `${q.programTitle} · ` : ""}
          {q.studentLabel} · {chatStamp(q.createdAt)}
        </p>
        <span className="mt-1 inline-block text-[14px] font-semibold text-gold group-open:hidden">자세히 보기</span>
      </summary>
      <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
        <p className="whitespace-pre-wrap text-[15px] leading-[23px] text-fg">{q.body}</p>
        {q.resolution && (
          <p className="whitespace-pre-wrap rounded-[10px] bg-elev px-3 py-2 text-[15px] leading-[22px] text-fg2">
            <b className="text-gold">처리 내용 </b>
            {q.resolution}
          </p>
        )}
        {q.officerNote && (
          <p className="whitespace-pre-wrap rounded-[10px] border border-line px-3 py-2 text-[15px] leading-[22px] text-fg2">
            <b className="text-fg">발주처 의견 </b>
            {q.officerNote}
          </p>
        )}
        <InquiryHistory q={q} />
      </div>
    </details>
  );
}
