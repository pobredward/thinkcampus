"use client";

/**
 * 채팅방 — 학부모 ↔ 캠퍼스 담당 선생님 (모바일 app/main/chat/[roomId].tsx)
 *
 *   [헤더]   홈 › 채팅 › 학생 · 프로그램명 · 답변 시간 · (접수한 요청 n건 — 누르면 처리 상태)
 *   [대화]   날짜 구분 · 말풍선 · 안내 카드(빠른 질문 자동 답, 접수 · 처리 알림)
 *   [입력]   빠른 질문 칩 (다음 수업 준비물 · 결석·지각 알려요 · 장소·주차 · 기타 문의)
 *            불편·요청 사항으로 접수 (켜면 분류를 고르고 보냄 → 민원으로 접수)
 *            사진(최대 3장) · 글 · 보내기
 *   끝난 프로그램 방은 읽기만 된다.
 *
 * 탭바는 숨긴다 (입력줄이 맨 아래에 붙도록) — main/layout.tsx
 */

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatThread, InquiryStatusBadge } from "@/components/chat/ChatThread";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Spinner } from "@/components/ui/Spinner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { chatStamp } from "@/lib/chatTime";
import { CALL_CENTER_PHONE, CALL_CENTER_TEL } from "@/lib/contact";
import {
  INQUIRY_CATEGORY_LABEL,
  useApi,
  useMutation,
  useQuery,
  type InquiryCategory,
  type InquiryDto,
  type QuickTopic,
  type SendChatMessageInput,
} from "@/services";

const QUICK: Array<{ id: QuickTopic; label: string }> = [
  { id: "materials", label: "다음 수업 준비물" },
  { id: "absence", label: "결석·지각 알려요" },
  { id: "place", label: "장소·주차" },
  { id: "etc", label: "기타 문의" },
];

const QUICK_TEXT: Partial<Record<QuickTopic, string>> = {
  materials: "다음 수업 준비물이 궁금해요.",
  place: "수업 장소와 주차 안내가 궁금해요.",
};

const ABSENCE_TEMPLATE = "다음 수업에 결석(지각) 예정이에요.\n사유: ";

const CATEGORIES: InquiryCategory[] = ["lesson", "instructor", "facility", "safety", "operation", "etc"];

export default function GuardianChatRoomScreen() {
  const params = useParams<{ roomId: string }>();
  const roomId = decodeURIComponent(params.roomId);
  const api = useApi();
  const { data, loading, error, refetch } = useQuery(() => api.guardian.getChatRoom(roomId), [api, roomId]);
  usePageTitle(data ? `${data.room.studentName} 채팅` : "채팅");
  useEffect(() => api.guardian.watchChat({ roomId }, () => void refetch()), [api, roomId, refetch]);

  const send = useMutation((input: SendChatMessageInput) => api.guardian.sendChatMessage(input));
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [quick, setQuick] = useState<QuickTopic | null>(null);
  const [asInquiry, setAsInquiry] = useState(false);
  const [category, setCategory] = useState<InquiryCategory | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showInquiries, setShowInquiries] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // 읽음 처리 — 안 읽은 메시지가 있을 때만
  const unread = data?.room.unread ?? 0;
  useEffect(() => {
    if (unread > 0) void api.guardian.markChatRead(roomId).catch(() => {});
  }, [api, roomId, unread, data?.messages.length]);

  // 새 메시지가 오면 맨 아래로
  const count = data?.messages.length ?? 0;
  const firstScroll = useRef(true);
  useEffect(() => {
    if (!count) return;
    endRef.current?.scrollIntoView({ block: "end", behavior: firstScroll.current ? "auto" : "smooth" });
    firstScroll.current = false;
  }, [count]);

  async function submit(input: SendChatMessageInput) {
    setLocalError(null);
    try {
      await send.run(input);
      return true;
    } catch {
      return false;
    }
  }

  async function handleSend() {
    if (asInquiry && !category) {
      setLocalError("어떤 내용인지 먼저 골라 주세요.");
      return;
    }
    const ok = await submit({
      roomId,
      text,
      photoDataUrls: photos.length ? photos : undefined,
      quick: quick ?? undefined,
      asInquiry: asInquiry && category ? { category } : undefined,
    });
    if (ok) {
      setText("");
      setPhotos([]);
      setQuick(null);
      setAsInquiry(false);
      setCategory(null);
    }
  }

  function pickQuick(id: QuickTopic) {
    setLocalError(null);
    const direct = QUICK_TEXT[id];
    if (direct) {
      void submit({ roomId, text: direct, quick: id });
      return;
    }
    setQuick(id);
    if (id === "absence") setText(ABSENCE_TEMPLATE);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }

  if (loading && !data) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-1 flex-col px-5" style={{ paddingTop: "calc(var(--sat) + 4px)" }}>
        <Breadcrumbs items={[{ label: "홈", href: "/main" }, { label: "채팅", href: "/main/chat" }, { label: "대화방" }]} className="mb-4" />
        <div className="rounded-[16px] border border-danger-border bg-danger-bg px-5 py-4">
          <p className="text-[16px] text-danger">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { room, messages, inquiries, hours } = data;
  const openCount = inquiries.filter((q) => q.status !== "resolved").length;
  const showQuick = room.status === "open" && !asInquiry && !text.trim() && photos.length === 0;

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-paper">
      {/* ── 헤더 ─────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper px-5 pb-3" style={{ paddingTop: "calc(var(--sat) + 4px)" }}>
        <Breadcrumbs
          items={[
            { label: "홈", href: "/main" },
            { label: "채팅", href: "/main/chat" },
            { label: `${room.studentName}${room.sectionLabel ? ` · ${room.sectionLabel}` : ""}` },
          ]}
          className="mb-1"
        />
        <h1 className="line-clamp-1 text-[20px] font-extrabold leading-[28px] text-fg">{room.programTitle}</h1>
        <p className="mt-[2px] text-[14px] leading-[20px] text-sub">
          {room.staffLabel} · 답변 {hours}
        </p>
        {inquiries.length > 0 && (
          <button
            type="button"
            onClick={() => setShowInquiries((v) => !v)}
            aria-expanded={showInquiries}
            className="tap mt-2 flex min-h-[40px] items-center gap-2 rounded-[10px] border border-line bg-card px-3 text-left"
          >
            <span className="text-[15px] font-semibold text-fg2">
              접수한 요청 {inquiries.length}건{openCount > 0 ? ` · 처리 중 ${openCount}` : " · 모두 처리됨"}
            </span>
            <span aria-hidden="true" className="text-[15px] text-gold">
              {showInquiries ? "접기" : "보기"}
            </span>
          </button>
        )}
        {showInquiries && (
          <div className="mt-2 flex max-h-[45dvh] flex-col gap-2 overflow-y-auto">
            {inquiries.map((q) => (
              <InquirySummary key={q.id} q={q} />
            ))}
          </div>
        )}
      </header>

      {/* ── 대화 ─────────────────────────────── */}
      <main className="flex flex-1 flex-col px-4 pb-4 pt-1" aria-live="polite">
        <ChatThread
          messages={messages}
          inquiries={inquiries}
          emptyNote={
            <div className="mt-6 rounded-[18px] border border-line bg-card px-5 py-5">
              <p className="text-[17px] font-bold text-fg">무엇이든 편하게 물어보세요</p>
              <p className="mt-2 text-[15px] leading-[23px] text-fg2">
                수업 준비물, 결석·지각, 수업 중 궁금한 점을 담당 선생님께 바로 보낼 수 있어요. 불편한 점은 아래 &lsquo;불편·요청 사항으로 접수&rsquo;를 켜고 보내 주세요.
              </p>
              <p className="mt-3 text-[14px] text-sub">답변 시간: {hours}</p>
            </div>
          }
        />
        <div ref={endRef} />
      </main>

      {/* ── 입력 ─────────────────────────────── */}
      {room.status === "readonly" ? (
        <div className="sticky bottom-0 border-t border-line bg-card2 px-5 pt-3" style={{ paddingBottom: "calc(var(--sab) + 14px)" }}>
          <p className="text-[15px] leading-[22px] text-sub">끝난 프로그램이라 대화를 읽기만 할 수 있어요.</p>
          <a href={CALL_CENTER_TEL} className="tap mt-1 inline-flex min-h-[40px] items-center text-[15px] font-semibold text-gold">
            고객센터 전화 {CALL_CENTER_PHONE}
          </a>
        </div>
      ) : (
        <ChatComposer
          text={text}
          onTextChange={(v) => {
            setText(v);
            if (!v.trim() && quick === "absence") setQuick(null);
          }}
          photos={photos}
          onPhotosChange={setPhotos}
          onSend={() => void handleSend()}
          sending={send.pending}
          sendLabel={asInquiry ? "접수" : "보내기"}
          placeholder={asInquiry ? "불편하셨던 점이나 요청 사항을 적어 주세요" : "메시지를 입력하세요"}
          error={localError ?? send.error}
          textareaRef={textareaRef}
          above={
            <div className="mb-2 flex flex-col gap-2">
              {showQuick && (
                <div role="group" aria-label="빠른 질문" className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3">
                  {QUICK.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => pickQuick(q.id)}
                      disabled={send.pending}
                      className="tap flex h-10 shrink-0 items-center rounded-full border border-gold-dim bg-gold-light px-4 text-[15px] font-semibold text-gold disabled:opacity-50"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                role="switch"
                aria-checked={asInquiry}
                onClick={() => {
                  setAsInquiry((v) => !v);
                  setLocalError(null);
                }}
                className="tap flex min-h-[40px] items-center gap-3 self-start rounded-[10px] px-1"
              >
                <span className={`relative h-[24px] w-[42px] shrink-0 rounded-full transition-colors ${asInquiry ? "bg-late" : "bg-line2"}`} aria-hidden="true">
                  <span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-fg transition-all ${asInquiry ? "left-[21px]" : "left-[3px]"}`} />
                </span>
                <span className={`text-[15px] font-semibold ${asInquiry ? "text-late" : "text-sub"}`}>불편·요청 사항으로 접수</span>
              </button>
              {asInquiry && (
                <div className="rounded-[12px] border border-late/40 bg-late-bg px-3 py-3">
                  <p className="text-[15px] font-semibold text-fg">어떤 내용인가요?</p>
                  <div role="group" aria-label="요청 분류" className="mt-2 flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={category === c}
                        onClick={() => {
                          setCategory(c);
                          setLocalError(null);
                        }}
                        className={`tap flex h-10 items-center rounded-full border px-4 text-[15px] font-semibold ${
                          category === c ? "border-late bg-late text-ink" : "border-line2 bg-card text-fg2"
                        }`}
                      >
                        {INQUIRY_CATEGORY_LABEL[c]}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[14px] leading-[20px] text-sub">담당 선생님이 확인하고 처리 결과를 이 대화방으로 알려 드려요.</p>
                </div>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}

function InquirySummary({ q }: { q: InquiryDto }) {
  return (
    <div className="rounded-[12px] border border-line bg-card px-4 py-3" data-testid="guardian-inquiry">
      <div className="flex flex-wrap items-center gap-2">
        <InquiryStatusBadge status={q.status} />
        <span className="text-[14px] text-sub">
          {INQUIRY_CATEGORY_LABEL[q.category]} · {chatStamp(q.createdAt)}
        </span>
      </div>
      <p className="mt-1 text-[15px] font-semibold text-fg">{q.title}</p>
      {q.resolution && (
        <p className="mt-2 whitespace-pre-wrap rounded-[10px] bg-elev px-3 py-2 text-[15px] leading-[22px] text-fg2">
          <span className="font-bold text-gold">처리 내용 </span>
          {q.resolution}
        </p>
      )}
    </div>
  );
}
