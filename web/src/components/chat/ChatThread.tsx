"use client";

/**
 * 채팅 대화 내용 — 학부모 · 센터 채팅 화면 공통
 *   - 날짜가 바뀌면 가운데 구분선 "9월 30일 (수)"
 *   - 내 메시지: 오른쪽 · 골드 틴트 / 상대 메시지: 왼쪽 · 카드색 (보낸 사람이 바뀔 때만 이름)
 *   - 안내(시스템) 메시지: 가운데 카드 — 빠른 질문 자동 답, 민원 접수 · 처리 알림
 *   - 불편·요청으로 접수된 메시지: 말풍선 위에 "불편·요청 접수 · 분류" + 처리 상태
 *   - 사진: 누르면 크게
 * 스크롤은 화면이 맡는다 (마지막 메시지로 내리기).
 */

import { useState, type ReactNode } from "react";
import { chatClock, chatDayKey, chatDayLabel } from "@/lib/chatTime";
import {
  INQUIRY_CATEGORY_LABEL,
  INQUIRY_STATUS_LABEL,
  type ChatMessageDto,
  type InquiryDto,
  type InquiryStatus,
} from "@/services/types";

const STATUS_TONE: Record<InquiryStatus, string> = {
  received: "border-late/40 bg-late-bg text-late",
  inProgress: "border-gold-dim bg-gold-light text-gold",
  resolved: "border-line2 bg-elev text-fg2",
};

export function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-[1px] text-[14px] font-bold ${STATUS_TONE[status]}`}>
      {INQUIRY_STATUS_LABEL[status]}
    </span>
  );
}

function PhotoGrid({ urls, align, onOpen }: { urls: string[]; align: "left" | "right"; onOpen: (u: string) => void }) {
  if (urls.length === 0) return null;
  return (
    <div className={`mb-1 flex flex-wrap gap-[6px] ${align === "right" ? "justify-end" : ""}`}>
      {urls.map((u, i) => (
        <button key={i} type="button" onClick={() => onOpen(u)} className="tap overflow-hidden rounded-[12px] border border-line" aria-label={`사진 ${i + 1} 크게 보기`}>
          {/* data URL · Storage URL 모두 — next/image 최적화 대상이 아니다 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt="" className="block h-[120px] w-[120px] object-cover" />
        </button>
      ))}
    </div>
  );
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="사진" className="fixed inset-0 z-[950] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="max-h-full max-w-full rounded-[8px] object-contain" />
      <button type="button" onClick={onClose} aria-label="닫기" className="tap absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-elev text-[18px] text-fg" style={{ marginTop: "var(--sat)" }}>
        ✕
      </button>
    </div>
  );
}

export function ChatThread({
  messages,
  inquiries,
  actionsFor,
  emptyNote,
}: {
  messages: ChatMessageDto[];
  inquiries: InquiryDto[];
  /** 상대 메시지 아래에 붙일 동작 (센터: 민원으로 등록) */
  actionsFor?: (m: ChatMessageDto) => ReactNode;
  emptyNote?: ReactNode;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const inquiryById = new Map(inquiries.map((q) => [q.id, q]));

  if (messages.length === 0) return <>{emptyNote ?? null}</>;

  const rows: ReactNode[] = [];
  let lastDay = "";
  let lastSender = "";
  messages.forEach((m, i) => {
    const day = chatDayKey(m.createdAt);
    if (day !== lastDay) {
      lastDay = day;
      lastSender = "";
      rows.push(
        <div key={`d-${day}-${i}`} className="my-4 flex items-center gap-3" role="separator" aria-label={chatDayLabel(m.createdAt)}>
          <span className="h-px flex-1 bg-line" />
          <span className="text-[14px] font-semibold text-faint">{chatDayLabel(m.createdAt)}</span>
          <span className="h-px flex-1 bg-line" />
        </div>,
      );
    }

    if (m.fromRole === "system") {
      lastSender = "";
      const q = m.inquiryId ? inquiryById.get(m.inquiryId) : undefined;
      rows.push(
        <div key={m.id} className="my-3 flex justify-center" data-testid="chat-system">
          <div className="w-full max-w-[420px] rounded-[14px] border border-line bg-card2 px-4 py-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[14px] font-bold text-gold">안내</span>
              {q && <InquiryStatusBadge status={q.status} />}
              <span className="ml-auto text-[14px] text-faint">{chatClock(m.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap break-words text-[15px] leading-[23px] text-fg2">{m.text}</p>
          </div>
        </div>,
      );
      return;
    }

    const senderKey = `${m.fromRole}:${m.fromName}`;
    const showName = !m.mine && senderKey !== lastSender;
    lastSender = senderKey;
    const q = m.inquiryId ? inquiryById.get(m.inquiryId) : undefined;
    const align = m.mine ? "right" : "left";
    const actions = actionsFor?.(m);

    rows.push(
      <div key={m.id} className={`mt-2 flex flex-col ${m.mine ? "items-end" : "items-start"}`} data-testid={m.mine ? "chat-mine" : "chat-theirs"}>
        {showName && <p className="mb-1 ml-1 text-[14px] font-semibold text-sub">{m.fromName}</p>}
        <div className={`flex max-w-[86%] items-end gap-[6px] ${m.mine ? "flex-row-reverse" : ""}`}>
          <div className="min-w-0">
            <PhotoGrid urls={m.photoUrls} align={align} onOpen={setPhoto} />
            {(m.text || q || m.kind === "inquiry") && (
              <div
                className={`rounded-[16px] border px-[14px] py-[10px] ${
                  m.mine ? "rounded-br-[6px] border-gold-border bg-gold-light" : "rounded-bl-[6px] border-line bg-card"
                }`}
              >
                {m.kind === "inquiry" && (
                  <div className="mb-[6px] flex flex-wrap items-center gap-[6px]">
                    <span className="text-[14px] font-bold text-late">불편·요청 접수{q ? ` · ${INQUIRY_CATEGORY_LABEL[q.category]}` : ""}</span>
                    {q && <InquiryStatusBadge status={q.status} />}
                  </div>
                )}
                {m.text && <p className="whitespace-pre-wrap break-words text-[16px] leading-[24px] text-fg">{m.text}</p>}
              </div>
            )}
          </div>
          <div className={`flex shrink-0 flex-col pb-[2px] ${m.mine ? "items-end" : "items-start"}`}>
            {m.mine && m.readByOther && <span className="text-[14px] font-semibold text-gold">읽음</span>}
            <span className="whitespace-nowrap text-[14px] text-faint">{chatClock(m.createdAt)}</span>
          </div>
        </div>
        {actions && <div className="mt-1">{actions}</div>}
      </div>,
    );
  });

  return (
    <>
      {rows}
      {photo && <Lightbox url={photo} onClose={() => setPhoto(null)} />}
    </>
  );
}
