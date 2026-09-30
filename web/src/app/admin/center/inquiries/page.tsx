"use client";

/**
 * 센터 · 민원·문의 기록 (지금 보고 있는 운영 건)
 *   필터: 미처리 · 처리 완료 · 전체 / 민원 · 문의
 *   [전화·현장 접수 기록] — 앱 밖에서 들어온 민원 · 문의도 여기에 남겨야 발주처 화면 · 보고서 건수에 잡힌다
 *   채팅으로 들어온 질문은 따로 적지 않아도 문의 건수 · 첫 답변 시간이 자동으로 잡힌다
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileInquirySheet, InquiryRow } from "@/components/staff/InquiryParts";
import { Button, ChipRow, Empty, ErrorBox, Loading, PageTitle } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { useToast } from "@/providers/ToastProvider";
import { useApi, useQuery, type InquiryKind } from "@/services";

type StatusFilter = "open" | "resolved" | "all";
type KindFilter = "all" | InquiryKind;

export default function CenterInquiriesPage() {
  usePageTitle("민원·문의");
  const api = useApi();
  const router = useRouter();
  const toast = useToast();
  const { selectedRun } = useCenterRun();
  const runId = selectedRun?.id ?? null;
  const { data, loading, error, refetch } = useQuery(() => (runId ? api.center.listInquiries({ programRunId: runId }) : null), [api, runId]);
  const [status, setStatus] = useState<StatusFilter>("open");
  const [kind, setKind] = useState<KindFilter>("all");
  const [sheet, setSheet] = useState(false);
  const { data: roster } = useQuery(() => (sheet && runId ? api.center.listRoster({ programRunId: runId, pageSize: 500 }) : null), [api, runId, sheet]);

  const all = useMemo(() => data ?? [], [data]);
  const shown = useMemo(
    () =>
      all.filter((q) => {
        if (status === "open" && q.status === "resolved") return false;
        if (status === "resolved" && q.status !== "resolved") return false;
        if (kind !== "all" && q.kind !== kind) return false;
        return true;
      }),
    [all, status, kind],
  );

  if (!selectedRun) return <Loading />;

  return (
    <div>
      <PageTitle
        title="민원·문의"
        desc={`${selectedRun.title} · 앱 채팅 · 전화 · 현장 접수를 한곳에서`}
        right={
          <Button size="sm" onClick={() => setSheet(true)}>
            전화·현장 접수
          </Button>
        }
      />

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
      <div className="mt-1">
        <ChipRow<KindFilter>
          label="종류"
          value={kind}
          onChange={setKind}
          items={[
            { id: "all", label: "민원 · 문의" },
            { id: "complaint", label: "민원", count: all.filter((q) => q.kind === "complaint").length },
            { id: "question", label: "문의", count: all.filter((q) => q.kind === "question").length },
          ]}
        />
      </div>

      <div className="mt-3">
        {loading && !data ? (
          <Loading />
        ) : error && !data ? (
          <ErrorBox message={error} onRetry={() => void refetch()} />
        ) : shown.length === 0 ? (
          <Empty title={status === "open" ? "처리할 민원·문의가 없어요" : "기록이 없어요"} desc="전화나 현장에서 받은 민원·문의도 기록해 두면 발주처 보고서에 함께 잡혀요." />
        ) : (
          <ul className="flex flex-col gap-2">
            {shown.map((q) => (
              <li key={q.id}>
                <InquiryRow q={q} href={`/admin/center/inquiries/${encodeURIComponent(q.id)}`} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <FileInquirySheet
        open={sheet}
        onClose={() => setSheet(false)}
        programRunId={selectedRun.id}
        students={(roster?.rows ?? []).map((r) => ({ studentId: r.studentId, label: `${r.name} (${r.sectionLabel})` }))}
        onFiled={(q) => {
          toast.show("기록했어요");
          router.push(`/admin/center/inquiries/${encodeURIComponent(q.id)}`);
        }}
      />
    </div>
  );
}
