"use client";

/**
 * 발주처 · 민원·문의 — 민원은 원문 그대로 + 우리 처리 내용 · 이력. 담당자 의견을 남길 수 있다.
 *   채팅 문의(단순 질문)는 원문 없이 건수 · 답변 수 · 평균 첫 답변 시간만
 *   전화 · 현장으로 기록된 문의는 목록으로
 */

import { useState } from "react";
import { InquiryBadges, InquiryHistory, InquiryStatusChip } from "@/components/staff/InquiryParts";
import { Button, ChipRow, Empty, ErrorBox, inputClass, Loading, PageTitle, SectionLabel } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { chatStamp } from "@/lib/chatTime";
import { usePartnerRun } from "@/providers/PartnerRunProvider";
import { useToast } from "@/providers/ToastProvider";
import { useApi, useMutation, useQuery, type InquiryDto } from "@/services";

type Filter = "all" | "open" | "resolved";

export default function PartnerInquiriesPage() {
  usePageTitle("민원·문의");
  const api = useApi();
  const { selectedRun } = usePartnerRun();
  const runId = selectedRun?.id ?? null;
  const { data, loading, error, refetch } = useQuery(() => (runId ? api.partner.listInquiries(runId) : null), [api, runId]);
  const [filter, setFilter] = useState<Filter>("all");

  if (!selectedRun) return <Loading />;
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={() => void refetch()} />;
  if (!data) return null;
  const { stats, complaints, loggedQuestions } = data;
  const shown = complaints.filter((q) => (filter === "open" ? q.status !== "resolved" : filter === "resolved" ? q.status === "resolved" : true));

  return (
    <div>
      <PageTitle title="민원·문의" desc="학부모 민원은 원문과 처리 내용을 그대로 보여 드려요. 학부모 연락처는 보이지 않아요." />
      <p className="mb-2 rounded-[14px] border border-line bg-card px-4 py-3 text-[15px] text-fg2" data-testid="partner-question-stats">
        학부모 문의 <b className="text-fg">{stats.questions.received}건</b> · 답변 {stats.questions.answered}건
        {stats.questions.avgFirstReplyMinutes != null ? ` · 평균 첫 답변 ${stats.questions.avgFirstReplyMinutes}분` : ""}
        <span className="text-sub"> (앱 채팅 · 전화)</span>
      </p>

      <SectionLabel>민원</SectionLabel>
      <ChipRow<Filter>
        label="처리 상태"
        value={filter}
        onChange={setFilter}
        items={[
          { id: "all", label: "전체", count: complaints.length },
          { id: "open", label: "처리 중", count: complaints.filter((q) => q.status !== "resolved").length },
          { id: "resolved", label: "처리 완료", count: complaints.filter((q) => q.status === "resolved").length },
        ]}
      />
      <div className="mt-3">
        {shown.length === 0 ? (
          <Empty title="해당하는 민원이 없어요" />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {shown.map((q) => (
              <li key={q.id}>
                <ComplaintCard q={q} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <SectionLabel>전화 · 현장 문의 기록</SectionLabel>
      {loggedQuestions.length === 0 ? (
        <Empty title="기록된 문의가 없어요" desc="앱 채팅 문의는 위 건수에만 잡혀요." />
      ) : (
        <ul className="flex flex-col gap-2">
          {loggedQuestions.map((q) => (
            <li key={q.id} className="rounded-[16px] border border-line bg-card px-4 py-3">
              <InquiryBadges q={q} />
              <p className="mt-2 text-[16px] font-bold text-fg">{q.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-[15px] leading-[22px] text-fg2">{q.body}</p>
              {q.resolution && <p className="mt-2 text-[15px] text-fg2">답변: {q.resolution}</p>}
              <p className="mt-1 text-[14px] text-sub">{chatStamp(q.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ComplaintCard({ q }: { q: InquiryDto }) {
  const api = useApi();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(q.officerNote ?? "");
  const save = useMutation(() => api.partner.setOfficerNote(q.id, note));

  return (
    <article className="h-full rounded-[18px] border border-line bg-card px-4 py-4" data-testid="partner-complaint">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-[17px] font-bold leading-[24px] text-fg">{q.title}</h2>
        <InquiryStatusChip status={q.status} />
      </div>
      <p className="mt-1 text-[14px] text-sub">
        {q.studentLabel} · {chatStamp(q.createdAt)} 접수
      </p>
      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-[23px] text-fg">{q.body}</p>
      {q.resolution ? (
        <div className="mt-3 rounded-[12px] border border-gold-border bg-gold-light px-3 py-2">
          <p className="text-[14px] font-bold text-gold">
            처리 내용{q.resolvedAt ? ` · ${chatStamp(q.resolvedAt)}` : ""}
            {q.resolvedByName ? ` · ${q.resolvedByName}` : ""}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[15px] leading-[22px] text-fg">{q.resolution}</p>
        </div>
      ) : (
        <p className="mt-3 text-[15px] text-late">아직 처리 중이에요.</p>
      )}
      <details className="mt-3">
        <summary className="tap cursor-pointer text-[14px] font-semibold text-sub">처리 이력 {q.history.length}건</summary>
        <div className="mt-2">
          <InquiryHistory q={q} />
        </div>
      </details>
      <div className="mt-3 border-t border-line pt-3">
        {editing ? (
          <div className="flex flex-col gap-2">
            <label htmlFor={`note-${q.id}`} className="text-[14px] font-semibold text-fg2">
              담당자 의견 (씽크캠퍼스 담당자에게 보여요)
            </label>
            <textarea id={`note-${q.id}`} value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} className={`${inputClass} resize-none`} />
            {save.error && <p className="text-[14px] text-danger">{save.error}</p>}
            <div className="flex gap-2">
              <Button
                size="sm"
                loading={save.pending}
                onClick={async () => {
                  try {
                    await save.run();
                    toast.show("의견을 남겼어요");
                    setEditing(false);
                  } catch {
                    /* save.error */
                  }
                }}
              >
                저장
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                취소
              </Button>
            </div>
          </div>
        ) : q.officerNote ? (
          <button type="button" onClick={() => setEditing(true)} className="tap w-full text-left">
            <p className="text-[14px] font-bold text-sub">담당자 의견</p>
            <p className="mt-1 whitespace-pre-wrap text-[15px] leading-[22px] text-fg2">{q.officerNote}</p>
          </button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            의견 남기기
          </Button>
        )}
      </div>
    </article>
  );
}
