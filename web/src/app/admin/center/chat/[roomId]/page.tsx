"use client";

/**
 * 센터 · 채팅방 — 학부모 한 가정(학생 × 운영 건)과의 대화
 *   위: 학생 · 반 · 보호자 · 이 방에서 접수된 민원 (처리 중이면 [처리하기])
 *   대화: 학부모 메시지 아래 [민원으로 등록] (이미 접수된 것은 [처리하기])
 *   입력: 자주 쓰는 답변 · 사진 · 글
 *   api.center.getChatRoom · sendChatMessage · markChatRead · fileInquiry · updateInquiry
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatThread } from "@/components/chat/ChatThread";
import { FileInquirySheet, InquiryBadges, InquiryUpdateForm } from "@/components/staff/InquiryParts";
import { Badge, Button, Card, ErrorBox, Loading } from "@/components/staff/ui";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { usePageTitle } from "@/hooks/usePageTitle";
import { waitedFor } from "@/lib/chatTime";
import { useToast } from "@/providers/ToastProvider";
import { useApi, useMutation, useQuery, type ChatMessageDto, type InquiryDto, type SendChatMessageInput } from "@/services";

/** 자주 쓰는 답변 — 누르면 입력칸에 들어간다 (고쳐서 보낼 수 있다) */
const SAVED_REPLIES = [
  "안녕하세요, 담당 선생님입니다. 확인하고 바로 안내해 드릴게요.",
  "알려 주셔서 감사합니다. 담당 강사님께 전달해 두었어요.",
  "결석(지각) 확인했어요. 출결에 반영해 둘게요. 다음 수업 자료는 따로 챙겨 드릴게요.",
  "준비물은 필기도구와 물병이면 충분해요. 나머지 재료는 교실에 준비되어 있어요.",
  "주차는 건물 뒤편 주차장을 이용해 주세요. 수업 시간 동안 무료예요.",
  "불편을 드려 죄송합니다. 확인하고 처리 결과를 이 대화방으로 알려 드릴게요.",
];

export default function CenterChatRoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = decodeURIComponent(params.roomId);
  const api = useApi();
  const toast = useToast();
  const { data, loading, error, refetch } = useQuery(() => api.center.getChatRoom(roomId), [api, roomId]);
  usePageTitle(data ? `${data.room.studentName} 채팅` : "채팅");
  useEffect(() => api.center.watchChat({ roomId }, () => void refetch()), [api, roomId, refetch]);

  const send = useMutation((input: SendChatMessageInput) => api.center.sendChatMessage(input));
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [savedOpen, setSavedOpen] = useState(false);
  const [fileFrom, setFileFrom] = useState<ChatMessageDto | null>(null);
  const [handling, setHandling] = useState<InquiryDto | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const unread = data?.room.unread ?? 0;
  useEffect(() => {
    if (unread > 0) void api.center.markChatRead(roomId).catch(() => {});
  }, [api, roomId, unread, data?.messages.length]);

  const count = data?.messages.length ?? 0;
  const firstScroll = useRef(true);
  useEffect(() => {
    if (!count) return;
    endRef.current?.scrollIntoView({ block: "end", behavior: firstScroll.current ? "auto" : "smooth" });
    firstScroll.current = false;
  }, [count]);

  // 처리 시트가 열려 있는 동안 민원 상태가 바뀌면 최신으로
  const handlingId = handling?.id;
  const latestHandling = handlingId ? data?.inquiries.find((q) => q.id === handlingId) : undefined;

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={() => void refetch()} />;
  if (!data) return null;
  const { room, messages, inquiries, hours } = data;
  const openInquiries = inquiries.filter((q) => q.status !== "resolved");

  async function handleSend() {
    try {
      await send.run({ roomId, text, photoDataUrls: photos.length ? photos : undefined });
      setText("");
      setPhotos([]);
    } catch {
      /* send.error */
    }
  }

  return (
    <div className="-mb-8 flex flex-1 flex-col">
      <Link href="/admin/center/chat" className="tap inline-flex h-11 items-center self-start text-[15px] font-semibold text-sub">
        ‹ 채팅 목록
      </Link>
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[22px] font-extrabold leading-[30px] text-fg">
            {room.studentName} <span className="text-[17px] font-bold text-sub">· {room.sectionLabel}</span>
          </h1>
          {room.waiting && room.waitingSince && <Badge tone="late">답변 대기 {waitedFor(room.waitingSince)}</Badge>}
          {room.status === "readonly" && <Badge tone="dim">끝난 프로그램 · 읽기 전용</Badge>}
        </div>
        <p className="mt-1 text-[15px] text-sub">
          {room.guardianLabel} · {room.programTitle}
        </p>
        <p className="mt-[2px] text-[14px] text-faint">학부모 앱 안내: 답변 {hours}</p>
      </div>

      {inquiries.length > 0 && (
        <Card tone={openInquiries.length ? "gold" : "card2"} className="mb-3">
          <p className="text-[15px] font-bold text-fg">
            이 대화방 민원 {inquiries.length}건{openInquiries.length ? ` · 처리 중 ${openInquiries.length}` : " · 모두 처리됨"}
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {inquiries.map((q) => (
              <li key={q.id} className="flex items-start gap-3 rounded-[12px] border border-line bg-card px-3 py-2">
                <div className="min-w-0 flex-1">
                  <InquiryBadges q={q} />
                  <p className="mt-1 truncate text-[15px] font-semibold text-fg">{q.title}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  {q.status !== "resolved" && (
                    <Button size="sm" onClick={() => setHandling(q)}>
                      처리하기
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" href={`/admin/center/inquiries/${encodeURIComponent(q.id)}`}>
                    상세
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section aria-label="대화" aria-live="polite" className="flex flex-1 flex-col pb-3">
        <ChatThread
          messages={messages}
          inquiries={inquiries}
          actionsFor={(m) => {
            if (m.fromRole !== "guardian" || room.status !== "open") return null;
            if (m.inquiryId) {
              const q = inquiries.find((x) => x.id === m.inquiryId);
              if (!q || q.status === "resolved") return null;
              return (
                <button type="button" onClick={() => setHandling(q)} className="tap inline-flex min-h-[36px] items-center rounded-lg border border-gold-dim bg-gold-light px-3 text-[14px] font-bold text-gold">
                  처리하기
                </button>
              );
            }
            return (
              <button
                type="button"
                onClick={() => setFileFrom(m)}
                className="tap inline-flex min-h-[36px] items-center rounded-lg border border-line2 bg-elev px-3 text-[14px] font-semibold text-sub"
                data-testid="chat-file-inquiry"
              >
                민원으로 등록
              </button>
            );
          }}
          emptyNote={<p className="py-10 text-center text-[15px] text-sub">아직 메시지가 없어요.</p>}
        />
        <div ref={endRef} />
      </section>

      {room.status === "open" ? (
        <ChatComposer
          aboveTabBar
          text={text}
          onTextChange={setText}
          photos={photos}
          onPhotosChange={setPhotos}
          onSend={() => void handleSend()}
          sending={send.pending}
          placeholder="답장을 입력하세요"
          error={send.error}
          textareaRef={textareaRef}
          above={
            <div className="mb-2 flex">
              <button
                type="button"
                onClick={() => setSavedOpen(true)}
                className="tap inline-flex h-10 items-center rounded-full border border-gold-dim bg-gold-light px-4 text-[15px] font-semibold text-gold"
              >
                자주 쓰는 답변
              </button>
            </div>
          }
        />
      ) : (
        <p className="mb-8 rounded-[14px] border border-line bg-card2 px-4 py-3 text-[15px] text-sub">끝난 프로그램의 대화방이라 읽기만 할 수 있어요.</p>
      )}

      <BottomSheet open={savedOpen} onClose={() => setSavedOpen(false)} title="자주 쓰는 답변">
        <ul className="flex max-h-[60dvh] flex-col gap-2 overflow-y-auto">
          {SAVED_REPLIES.map((r) => (
            <li key={r}>
              <button
                type="button"
                onClick={() => {
                  setText((prev) => (prev.trim() ? `${prev}\n${r}` : r));
                  setSavedOpen(false);
                  requestAnimationFrame(() => textareaRef.current?.focus());
                }}
                className="tap w-full rounded-[12px] border border-line bg-elev px-4 py-3 text-left text-[15px] leading-[22px] text-fg2"
              >
                {r}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>

      <FileInquirySheet
        open={!!fileFrom}
        onClose={() => setFileFrom(null)}
        programRunId={room.programRunId}
        from={fileFrom ? { chatRoomId: room.id, messageId: fileFrom.id, studentId: room.studentId, studentLabel: room.studentName, text: fileFrom.text } : undefined}
        onFiled={() => toast.show("민원으로 등록했어요")}
      />

      <BottomSheet open={!!handling} onClose={() => setHandling(null)} title="민원 처리">
        {handling && (
          <div className="max-h-[70dvh] overflow-y-auto pb-1">
            <p className="mb-1 text-[16px] font-bold text-fg">{(latestHandling ?? handling).title}</p>
            <p className="mb-4 whitespace-pre-wrap text-[15px] leading-[22px] text-fg2">{(latestHandling ?? handling).body}</p>
            <InquiryUpdateForm
              key={handling.id}
              q={latestHandling ?? handling}
              onDone={() => {
                setHandling(null);
                toast.show("저장했어요");
              }}
            />
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
