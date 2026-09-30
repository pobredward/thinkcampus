"use client";

/**
 * 채팅 탭 — 학부모 대화방 목록 (모바일 app/main/(tabs)/chat.tsx)
 *   자녀 × 프로그램마다 방 하나 (수강 중 · 예정 · 끝난 지 30일 안)
 *   수업 준비물 · 결석·지각 · 수업 중 궁금한 점을 담당 선생님께 바로 묻는다.
 *   끝난 프로그램 방은 읽기만 된다.
 *   api.guardian.listChatRooms() (실서비스: Callable listGuardianChatRooms)
 */

import { useEffect } from "react";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { chatListTime } from "@/lib/chatTime";
import { useApi, useQuery, type ChatRoomDto } from "@/services";

export default function ChatListScreen() {
  usePageTitle("채팅");
  const api = useApi();
  const { data, loading, error, refetch } = useQuery(() => api.guardian.listChatRooms(), [api]);
  useEffect(() => api.guardian.watchChat({}, () => void refetch()), [api, refetch]);
  const rooms = data ?? [];

  return (
    <div className="flex flex-1 flex-col bg-paper">
      <div className="sticky top-0 z-10 border-b border-line bg-paper px-5 pb-[14px]" style={{ paddingTop: "calc(var(--sat) + 12px)" }}>
        <h1 className="text-[24px] font-bold text-fg">채팅</h1>
        <p className="mt-1 text-[15px] leading-[22px] text-sub">수업 준비나 수업 중 궁금한 점을 담당 선생님께 바로 물어보세요.</p>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-8 pt-4">
        {loading && !data && (
          <div className="flex justify-center pt-16">
            <Spinner size="large" />
          </div>
        )}
        {error && !data && (
          <div className="rounded-[16px] border border-danger-border bg-danger-bg px-5 py-4">
            <p className="text-[16px] text-danger">{error}</p>
            <button type="button" onClick={() => void refetch()} className="tap mt-2 text-[15px] font-semibold text-gold">
              다시 불러오기
            </button>
          </div>
        )}
        {data && rooms.length === 0 && (
          <div className="mt-6 rounded-[20px] border border-dashed border-line bg-card px-6 py-9 text-center">
            <p className="text-[18px] font-bold text-fg2">대화할 수 있는 프로그램이 없어요</p>
            <p className="mt-2 text-[16px] leading-[24px] text-sub">프로그램을 수강하면 담당 선생님과 여기서 대화할 수 있어요.</p>
          </div>
        )}
        {rooms.map((r) => (
          <RoomCard key={r.id} room={r} />
        ))}
      </div>
    </div>
  );
}

function RoomCard({ room }: { room: ChatRoomDto }) {
  const preview = room.lastMessage
    ? `${room.lastMessage.fromRole === "guardian" ? "나: " : ""}${room.lastMessage.text}`
    : "아직 대화가 없어요. 궁금한 점을 물어보세요.";
  return (
    <Link
      href={`/main/chat/${encodeURIComponent(room.id)}`}
      className={`tap block rounded-[18px] border px-5 py-4 ${room.unread > 0 ? "border-gold-dim bg-card" : "border-line bg-card"}`}
      data-testid="chat-room"
    >
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[17px] font-bold text-fg">
          {room.studentName}
          {room.sectionLabel && <span className="font-semibold text-sub"> · {room.sectionLabel}</span>}
        </p>
        {room.lastMessage && <span className="shrink-0 text-[14px] text-faint">{chatListTime(room.lastMessage.at)}</span>}
      </div>
      <p className="mt-[2px] truncate text-[15px] text-sub">{room.programTitle}</p>
      <div className="mt-2 flex items-center gap-2">
        <p className={`min-w-0 flex-1 truncate text-[15px] ${room.unread > 0 ? "font-semibold text-fg" : "text-fg2"}`}>{preview}</p>
        {room.unread > 0 && (
          <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-gold px-2 text-[14px] font-bold text-ink" aria-label={`안 읽은 메시지 ${room.unread}개`}>
            {room.unread}
          </span>
        )}
      </div>
      {(room.status === "readonly" || room.openInquiryCount > 0) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {room.openInquiryCount > 0 && (
            <span className="rounded-md border border-late/40 bg-late-bg px-2 py-[1px] text-[14px] font-bold text-late">처리 중인 요청 {room.openInquiryCount}</span>
          )}
          {room.status === "readonly" && (
            <span className="rounded-md border border-line2 bg-elev px-2 py-[1px] text-[14px] font-semibold text-sub">끝난 프로그램 · 읽기만 가능</span>
          )}
        </div>
      )}
    </Link>
  );
}
