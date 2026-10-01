"use client";

/**
 * 센터 · 채팅 — 학부모 대화방 (지금 보고 있는 운영 건)
 *   위: 답을 기다리는 대화 n (가장 오래 기다린 시간) · 미처리 민원 n (→ 민원·문의 기록)
 *   필터: 전체 · 답변 대기 · 안 읽음 · 민원 있는 방 / 학생 이름 찾기
 *   답을 기다리는 방이 맨 위 (오래 기다린 순)
 *   api.center.listChatRooms (실서비스: Callable listCenterChatRooms · 방 문서 실시간)
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge, ChipRow, Empty, ErrorBox, inputClass, Loading, PageTitle } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { chatListTime, waitedFor } from "@/lib/chatTime";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { useApi, useQuery, type ChatRoomDto } from "@/services";

type Filter = "all" | "waiting" | "unread" | "inquiry";

export default function CenterChatListPage() {
  usePageTitle("학부모 채팅");
  const api = useApi();
  const sp = useSearchParams();
  const { selectedRun, summary } = useCenterRun();
  const runId = selectedRun?.id ?? null;
  const campusId = selectedRun?.campusId ?? null;
  const { data, loading, error, refetch } = useQuery(() => (runId ? api.center.listChatRooms(runId) : null), [api, runId]);
  useEffect(() => {
    if (!runId || !campusId) return;
    return api.center.watchChat({ programRunId: runId, campusId }, () => void refetch());
  }, [api, runId, campusId, refetch]);

  const [filter, setFilter] = useState<Filter>(sp.get("filter") === "waiting" ? "waiting" : "all");
  const [q, setQ] = useState("");
  const rooms = useMemo(() => data ?? [], [data]);
  const shown = useMemo(() => {
    const term = q.trim();
    return rooms.filter((r) => {
      if (filter === "waiting" && !r.waiting) return false;
      if (filter === "unread" && r.unread === 0) return false;
      if (filter === "inquiry" && r.openInquiryCount === 0) return false;
      if (term && !r.studentName.includes(term) && !r.guardianLabel.includes(term)) return false;
      return true;
    });
  }, [rooms, filter, q]);

  if (!selectedRun) return <Loading />;
  const k = summary?.dashboard;
  const waiting = rooms.filter((r) => r.waiting).length;

  return (
    <div>
      <PageTitle
        title="학부모 채팅"
        desc="학부모 문의에 답해 주세요. 불편 사항은 민원으로 등록할 수 있어요."
        right={
          <Link href="/admin/center/inquiries" className="tap inline-flex h-10 items-center rounded-lg border border-line bg-elev px-3 text-[14px] font-semibold text-fg2">
            민원 기록{k && k.complaintsOpen > 0 ? ` (${k.complaintsOpen})` : ""}
          </Link>
        }
      />

      <ChipRow<Filter>
        label="대화방 필터"
        value={filter}
        onChange={setFilter}
        items={[
          { id: "all", label: "전체", count: rooms.length },
          { id: "waiting", label: "답변 대기", count: waiting },
          { id: "unread", label: "안 읽음", count: rooms.filter((r) => r.unread > 0).length },
          { id: "inquiry", label: "민원 처리 중", count: rooms.filter((r) => r.openInquiryCount > 0).length },
        ]}
      />
      <div className="mb-3 mt-2">
        <label htmlFor="chat-search" className="sr-only">
          학생 · 보호자 이름 찾기
        </label>
        <input id="chat-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="학생 · 보호자 이름 찾기" className={inputClass} />
      </div>

      {loading && !data ? (
        <Loading />
      ) : error && !data ? (
        <ErrorBox message={error} onRetry={() => void refetch()} />
      ) : shown.length === 0 ? (
        <Empty
          title={rooms.length === 0 ? "아직 학부모 메시지가 없어요" : "조건에 맞는 대화가 없어요"}
          desc={rooms.length === 0 ? "학부모가 앱 채팅 탭에서 메시지를 보내면 여기에 보여요." : undefined}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((r) => (
            <li key={r.id}>
              <RoomRow room={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RoomRow({ room }: { room: ChatRoomDto }) {
  const preview = room.lastMessage ? `${room.lastMessage.fromRole === "staff" ? "나: " : room.lastMessage.fromRole === "system" ? "안내: " : ""}${room.lastMessage.text}` : "";
  return (
    <Link
      href={`/admin/center/chat/${encodeURIComponent(room.id)}`}
      className={`tap block rounded-[16px] border px-4 py-3 hover:border-gold-dim ${room.waiting ? "border-late/50 bg-card" : "border-line bg-card"}`}
      data-testid="center-chat-room"
    >
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[16px] font-bold text-fg">
          {room.studentName}
          <span className="font-semibold text-sub"> · {room.sectionLabel}</span>
        </p>
        {room.lastMessage && <span className="shrink-0 text-[14px] text-faint">{chatListTime(room.lastMessage.at)}</span>}
      </div>
      <p className="mt-[2px] truncate text-[14px] text-sub">{room.guardianLabel}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className={`min-w-0 flex-1 truncate text-[15px] ${room.unread > 0 ? "font-semibold text-fg" : "text-fg2"}`}>{preview}</p>
        {room.unread > 0 && (
          <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-gold px-2 text-[14px] font-bold text-ink" aria-label={`안 읽은 메시지 ${room.unread}개`}>
            {room.unread}
          </span>
        )}
      </div>
      {(room.waiting || room.openInquiryCount > 0 || room.status === "readonly") && (
        <div className="mt-2 flex flex-wrap gap-2">
          {room.waiting && room.waitingSince && <Badge tone="late">답변 대기 {waitedFor(room.waitingSince)}</Badge>}
          {room.openInquiryCount > 0 && <Badge tone="danger">민원 처리 중 {room.openInquiryCount}</Badge>}
          {room.status === "readonly" && <Badge tone="dim">끝난 프로그램</Badge>}
        </div>
      )}
    </Link>
  );
}
