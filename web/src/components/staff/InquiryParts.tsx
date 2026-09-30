"use client";

/**
 * 민원 · 문의 공통 조각 — 센터(처리) · 통합 관리자(열람) · 발주처 담당자(열람)
 *   InquiryBadges      상태 · 종류 · 분류
 *   InquiryRow         목록 한 줄 (→ 상세)
 *   InquiryHistory     처리 이력 (접수 → 처리 중 → 처리 완료, 메모)
 *   InquiryUpdateForm  상태 바꾸기 · 진행 메모 · 처리 내용 · 학부모에게 알림 (센터)
 *   FileInquirySheet   채팅 메시지를 민원으로 등록 · 전화·현장 접수(민원 · 문의) 기록 (센터)
 *                      (채팅 질문은 따로 등록하지 않아도 문의 건수 · 첫 답변 시간이 자동으로 잡힌다)
 */

import { useState } from "react";
import Link from "next/link";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Badge, Button, Field, inputClass, Select } from "@/components/staff/ui";
import { chatStamp } from "@/lib/chatTime";
import {
  INQUIRY_CATEGORY_LABEL,
  INQUIRY_CHANNEL_LABEL,
  INQUIRY_KIND_LABEL,
  INQUIRY_STATUS_LABEL,
  useApi,
  useMutation,
  type FileInquiryInput,
  type InquiryCategory,
  type InquiryChannel,
  type InquiryDto,
  type InquiryKind,
  type InquiryStatus,
} from "@/services";

export const INQUIRY_CATEGORIES: InquiryCategory[] = ["lesson", "instructor", "facility", "safety", "operation", "etc"];

export function InquiryStatusChip({ status }: { status: InquiryStatus }) {
  return <Badge tone={status === "received" ? "late" : status === "inProgress" ? "gold" : "dim"}>{INQUIRY_STATUS_LABEL[status]}</Badge>;
}

export function InquiryBadges({ q }: { q: InquiryDto }) {
  return (
    <span className="flex flex-wrap items-center gap-[6px]">
      <InquiryStatusChip status={q.status} />
      <Badge tone={q.kind === "complaint" ? "danger" : "neutral"}>{INQUIRY_KIND_LABEL[q.kind]}</Badge>
      <span className="text-[14px] text-sub">
        {INQUIRY_CATEGORY_LABEL[q.category]} · {INQUIRY_CHANNEL_LABEL[q.channel]}
      </span>
    </span>
  );
}

export function InquiryRow({ q, href }: { q: InquiryDto; href?: string }) {
  const body = (
    <>
      <InquiryBadges q={q} />
      <p className="mt-2 text-[16px] font-bold leading-[23px] text-fg">{q.title}</p>
      <p className="mt-1 text-[14px] text-sub">
        {q.studentLabel} · {chatStamp(q.createdAt)}
        {q.status === "resolved" && q.resolvedAt ? ` · 처리 ${chatStamp(q.resolvedAt)}` : ""}
      </p>
      {q.resolution && <p className="mt-2 line-clamp-2 text-[15px] leading-[22px] text-fg2">처리: {q.resolution}</p>}
    </>
  );
  if (!href) return <div className="rounded-[16px] border border-line bg-card px-4 py-3">{body}</div>;
  return (
    <Link href={href} className="tap block rounded-[16px] border border-line bg-card px-4 py-3 hover:border-gold-dim" data-testid="inquiry-row">
      {body}
    </Link>
  );
}

export function InquiryHistory({ q }: { q: InquiryDto }) {
  return (
    <ol className="flex flex-col gap-3 border-l-2 border-line2 pl-4">
      {q.history.map((h, i) => (
        <li key={i} className="relative">
          <span className={`absolute -left-[23px] top-[5px] h-3 w-3 rounded-full border-2 border-paper ${h.status === "resolved" ? "bg-gold" : h.status === "inProgress" ? "bg-gold-dim" : "bg-late"}`} aria-hidden="true" />
          <p className="text-[15px] font-semibold text-fg">
            {INQUIRY_STATUS_LABEL[h.status]} <span className="font-normal text-sub">· {h.byName} · {chatStamp(h.at)}</span>
          </p>
          {h.note && <p className="mt-[2px] whitespace-pre-wrap text-[15px] leading-[22px] text-fg2">{h.note}</p>}
        </li>
      ))}
    </ol>
  );
}

/** 상태 바꾸기 · 처리 내용 (센터 담당자) */
export function InquiryUpdateForm({ q, onDone }: { q: InquiryDto; onDone?: () => void }) {
  const api = useApi();
  const [status, setStatus] = useState<InquiryStatus>(q.status === "received" ? "inProgress" : q.status);
  const [note, setNote] = useState("");
  const [resolution, setResolution] = useState(q.resolution ?? "");
  const [notify, setNotify] = useState(q.channel === "chat");
  const [localError, setLocalError] = useState<string | null>(null);
  const save = useMutation(() =>
    api.center.updateInquiry({
      inquiryId: q.id,
      status,
      note: note.trim() || undefined,
      resolution: status === "resolved" ? resolution.trim() : undefined,
      notifyGuardian: q.channel === "chat" ? notify : false,
    }),
  );

  async function submit() {
    setLocalError(null);
    if (status === "resolved" && !resolution.trim()) {
      setLocalError("처리 내용을 적어 주세요. 학부모와 발주처 담당자에게 보여요.");
      return;
    }
    if (status === q.status && !note.trim() && (status !== "resolved" || resolution.trim() === (q.resolution ?? ""))) {
      setLocalError("바뀐 내용이 없어요.");
      return;
    }
    try {
      await save.run();
      setNote("");
      onDone?.();
    } catch {
      /* save.error */
    }
  }

  const statuses: InquiryStatus[] = ["received", "inProgress", "resolved"];
  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="처리 상태" className="grid grid-cols-3 gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={status === s}
            onClick={() => setStatus(s)}
            className={`tap flex h-11 items-center justify-center rounded-xl border text-[15px] font-bold ${status === s ? "border-gold bg-gold-light text-gold" : "border-line2 bg-elev text-fg2"}`}
          >
            {INQUIRY_STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      <Field label="진행 메모" htmlFor={`note-${q.id}`} hint="처리 이력에 남아요 (예: 시설팀에 점검 요청)">
        <textarea id={`note-${q.id}`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} className={`${inputClass} resize-none`} />
      </Field>
      {status === "resolved" && (
        <Field label="처리 내용" htmlFor={`res-${q.id}`} required hint="학부모 채팅방과 발주처 담당자 화면 · 보고서에 보여요">
          <textarea id={`res-${q.id}`} value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} maxLength={1000} className={`${inputClass} resize-none`} placeholder="어떻게 처리했는지 적어 주세요" />
        </Field>
      )}
      {q.channel === "chat" && (
        <label className="flex min-h-[44px] items-center gap-3">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-5 w-5 accent-[#d4b06a]" />
          <span className="text-[15px] text-fg2">처리 완료되면 학부모 채팅방에 처리 내용을 알려요</span>
        </label>
      )}
      {(localError ?? save.error) && (
        <p className="text-[15px] text-danger" role="alert">
          {localError ?? save.error}
        </p>
      )}
      <Button size="lg" onClick={() => void submit()} loading={save.pending} className="w-full">
        저장
      </Button>
    </div>
  );
}

/** 민원·문의 등록 — 채팅 메시지에서(from) 또는 전화·현장 접수 */
export function FileInquirySheet({
  open,
  onClose,
  programRunId,
  from,
  students,
  onFiled,
}: {
  open: boolean;
  onClose: () => void;
  programRunId: string;
  /** 채팅 메시지에서 등록할 때 */
  from?: { chatRoomId: string; messageId: string; studentId: string; studentLabel: string; text: string };
  /** 전화·현장 접수 때 학생 고르기 (선택) */
  students?: Array<{ studentId: string; label: string }>;
  onFiled?: (q: InquiryDto) => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={from ? "민원으로 등록" : "전화·현장 접수 기록"}>
      {open && <FileInquiryForm programRunId={programRunId} from={from} students={students} onFiled={(q) => { onFiled?.(q); onClose(); }} />}
    </BottomSheet>
  );
}

function FileInquiryForm({
  programRunId,
  from,
  students,
  onFiled,
}: {
  programRunId: string;
  from?: { chatRoomId: string; messageId: string; studentId: string; studentLabel: string; text: string };
  students?: Array<{ studentId: string; label: string }>;
  onFiled: (q: InquiryDto) => void;
}) {
  const api = useApi();
  const [kind, setKind] = useState<InquiryKind>("complaint");
  const [channel, setChannel] = useState<InquiryChannel>(from ? "chat" : "phone");
  const [category, setCategory] = useState<InquiryCategory | "">("");
  const firstLine = (from?.text ?? "").replace(/\s+/g, " ").trim();
  const [title, setTitle] = useState(firstLine.length > 24 ? `${firstLine.slice(0, 24)}…` : firstLine);
  const [body, setBody] = useState(from?.text ?? "");
  const [studentId, setStudentId] = useState(from?.studentId ?? "");
  const [resolveNow, setResolveNow] = useState(false);
  const [resolution, setResolution] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const file = useMutation(async () => {
    const input: FileInquiryInput = {
      programRunId,
      kind,
      category: category as InquiryCategory,
      channel,
      title,
      body,
      studentId: studentId || undefined,
      chatRoomId: from?.chatRoomId,
      messageId: from?.messageId,
    };
    const q = await api.center.fileInquiry(input);
    if (!from && resolveNow) await api.center.updateInquiry({ inquiryId: q.id, status: "resolved", resolution: resolution.trim() });
    return q;
  });

  async function submit() {
    setLocalError(null);
    if (!category) return setLocalError("분류를 골라 주세요.");
    if (!title.trim()) return setLocalError("제목을 적어 주세요.");
    if (!body.trim()) return setLocalError("내용을 적어 주세요.");
    if (resolveNow && !resolution.trim()) return setLocalError("처리 내용을 적어 주세요.");
    try {
      onFiled(await file.run());
    } catch {
      /* file.error */
    }
  }

  return (
    <div className="flex max-h-[70dvh] flex-col gap-4 overflow-y-auto pb-1">
      {from && (
        <div className="rounded-[12px] border border-line bg-elev px-3 py-2">
          <p className="text-[14px] font-semibold text-sub">{from.studentLabel} 보호자 메시지</p>
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[15px] text-fg2">{from.text || "(사진)"}</p>
        </div>
      )}
      {!from && (
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="종류">
          {(["complaint", "question"] as InquiryKind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={`tap flex h-11 items-center justify-center rounded-xl border text-[15px] font-bold ${kind === k ? "border-gold bg-gold-light text-gold" : "border-line2 bg-elev text-fg2"}`}
            >
              {k === "complaint" ? "민원 (불편·요청)" : "문의 (질문)"}
            </button>
          ))}
        </div>
      )}
      {!from && (
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="접수 경로">
          {(["phone", "onsite"] as InquiryChannel[]).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={channel === c}
              onClick={() => setChannel(c)}
              className={`tap flex h-11 items-center justify-center rounded-xl border text-[15px] font-bold ${channel === c ? "border-gold bg-gold-light text-gold" : "border-line2 bg-elev text-fg2"}`}
            >
              {INQUIRY_CHANNEL_LABEL[c]}
            </button>
          ))}
        </div>
      )}
      <Field label="분류" htmlFor="inq-cat" required>
        <Select id="inq-cat" value={category} onChange={(e) => setCategory(e.target.value as InquiryCategory)}>
          <option value="">골라 주세요</option>
          {INQUIRY_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {INQUIRY_CATEGORY_LABEL[c]}
            </option>
          ))}
        </Select>
      </Field>
      {!from && students && (
        <Field label="학생 (선택)" htmlFor="inq-student">
          <Select id="inq-student" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">학생 미지정</option>
            {students.map((s) => (
              <option key={s.studentId} value={s.studentId}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="제목" htmlFor="inq-title" required>
        <input id="inq-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} className={inputClass} />
      </Field>
      <Field label="내용" htmlFor="inq-body" required>
        <textarea id="inq-body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={1000} className={`${inputClass} resize-none`} />
      </Field>
      {!from && (
        <>
          <label className="flex min-h-[44px] items-center gap-3">
            <input type="checkbox" checked={resolveNow} onChange={(e) => setResolveNow(e.target.checked)} className="h-5 w-5 accent-[#d4b06a]" />
            <span className="text-[15px] text-fg2">통화 중에 바로 해결했어요 (처리 완료로 기록)</span>
          </label>
          {resolveNow && (
            <Field label="처리 내용" htmlFor="inq-res" required>
              <textarea id="inq-res" value={resolution} onChange={(e) => setResolution(e.target.value)} rows={2} maxLength={1000} className={`${inputClass} resize-none`} />
            </Field>
          )}
        </>
      )}
      {(localError ?? file.error) && (
        <p className="text-[15px] text-danger" role="alert">
          {localError ?? file.error}
        </p>
      )}
      <Button size="lg" onClick={() => void submit()} loading={file.pending} className="w-full">
        {from ? "민원으로 등록" : "기록하기"}
      </Button>
    </div>
  );
}
