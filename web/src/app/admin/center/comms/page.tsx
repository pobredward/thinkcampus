"use client";

/**
 * 센터 · 소통 — 공지 보내기(제목 · 내용 · 대상 반) + 보낸 공지
 * 보내면 대상 학생의 보호자 앱 알림에 바로 나타난다.
 */

import { useState } from "react";
import { Button, Card, Empty, ErrorBox, Field, fmtDateTime, inputClass, Loading, PageTitle, SectionLabel, Select } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { useToast } from "@/providers/ToastProvider";
import { useApi, useMutation, useQuery } from "@/services";

export default function CenterCommsPage() {
  usePageTitle("공지");
  const api = useApi();
  const toast = useToast();
  const { selectedRun, runsLoading } = useCenterRun();
  const runId = selectedRun?.id ?? null;
  const { data, loading, error, refetch } = useQuery(() => (runId ? api.center.listNotifications(runId) : null), [api, runId]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sectionId, setSectionId] = useState("");
  const send = useMutation(() => api.center.createNotice({ programRunId: runId!, title, body, sectionId: sectionId || undefined }));

  if (runsLoading) return <Loading />;
  if (!selectedRun) return <Empty title="운영 건을 먼저 골라 주세요" />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.show("제목을 입력해 주세요");
      return;
    }
    try {
      const r = await send.run();
      toast.show(`보호자 ${r.recipients}명에게 보냈어요`);
      setTitle("");
      setBody("");
    } catch (err) {
      toast.show((err as Error).message || "보내지 못했어요");
    }
  }

  return (
    <div>
      <PageTitle title="공지 보내기" desc="보낸 공지는 학부모 앱 알림에 바로 나타나요." />
      <Card>
        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
          <Field label="대상" htmlFor="notice-target">
            <Select id="notice-target" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
              <option value="">전체 · {selectedRun.studentCount}명</option>
              {selectedRun.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} · {s.studentCount}명
                </option>
              ))}
            </Select>
          </Field>
          <Field label="제목" htmlFor="notice-title" required>
            <input id="notice-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="예: 다음 주 수업 준비물 안내" className={inputClass} />
          </Field>
          <Field label="내용" htmlFor="notice-body">
            <textarea id="notice-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="학부모님께 보여 줄 내용" className={inputClass} />
          </Field>
          <Button type="submit" size="lg" loading={send.pending}>
            보내기
          </Button>
        </form>
      </Card>

      <SectionLabel>보낸 공지</SectionLabel>
      {error ? (
        <ErrorBox message={error} onRetry={() => void refetch()} />
      ) : loading && !data ? (
        <Loading />
      ) : !data || data.length === 0 ? (
        <Empty title="아직 보낸 공지가 없어요" />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((n) => (
            <li key={n.id} className="rounded-[16px] border border-line bg-card px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[16px] font-bold text-fg">{n.title}</p>
                <span className="shrink-0 text-[14px] text-sub">{fmtDateTime(n.createdAt)}</span>
              </div>
              {n.body && <p className="mt-1 text-[15px] leading-[22px] text-fg2">{n.body}</p>}
              <p className="mt-1 text-[14px] text-sub">
                {n.sectionLabel ?? "전체"} · 보호자 {n.recipients}명 · {n.createdByName}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
