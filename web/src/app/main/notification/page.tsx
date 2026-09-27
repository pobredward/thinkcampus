"use client";

/**
 * 알림 / 공지사항 화면 (모바일 app/main/notification.tsx)
 * - 수업 변경, 출결 알림, 캠프 공지 등
 * - api.guardian.listNotifications() (실서비스: Callable listGuardianNotifications)
 */

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useApi, useQuery, type GuardianNotificationDto } from "@/services";

type NotifType = GuardianNotificationDto["type"];

function getTypeInfo(type: NotifType): { label: string } {
  switch (type) {
    case "attendance":
      return { label: "출결" };
    case "notice":
      return { label: "공지" };
    case "report":
      return { label: "리포트" };
    case "schedule":
      return { label: "일정" };
  }
}

export default function NotificationScreen() {
  usePageTitle("알림");
  const api = useApi();
  const { data, loading } = useQuery(() => api.guardian.listNotifications(), [api]);
  const [notifications, setNotifications] = useState<GuardianNotificationDto[]>([]);
  useEffect(() => {
    if (data) setNotifications(data);
  }, [data]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function markAllRead() {
    const unread = notifications.filter((n) => !n.isRead);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    for (const n of unread) void api.guardian.markNotificationRead(n.id).catch(() => {});
  }

  function markRead(id: string) {
    if (notifications.find((n) => n.id === id)?.isRead) return;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    void api.guardian.markNotificationRead(id).catch(() => {});
  }

  return (
    <div className="flex flex-1 flex-col bg-paper">
      {/* 고정 헤더 */}
      <div
        className="sticky top-0 z-10 flex flex-col border-b border-line bg-paper px-5 pb-[14px]"
        style={{ paddingTop: "calc(var(--sat) + 12px)" }}
      >
        <div className="mb-[6px] flex items-center gap-2">
          <h1 className="text-[24px] font-bold text-fg">알림</h1>
          {unreadCount > 0 && (
            <div className="flex min-w-5 items-center justify-center rounded-[10px] bg-gold px-[7px] py-[2px]">
              <span className="text-[14px] font-bold text-ink">{unreadCount}</span>
            </div>
          )}
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllRead} className="tap self-start">
            <span className="text-[15px] font-medium text-gold">모두 읽음 처리</span>
          </button>
        )}
      </div>

      <div className="flex flex-col px-4 pb-6 pt-3">
        {loading && notifications.length === 0 && (
          <div className="flex justify-center pt-16">
            <Spinner size="large" />
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center gap-3 pt-20">
            <p className="text-[16px] text-sub">새 알림이 없습니다</p>
          </div>
        )}

        {notifications.map((notif) => {
          const info = getTypeInfo(notif.type);
          return (
            <button
              key={notif.id}
              type="button"
              className={`tap relative mb-2 flex w-full flex-col rounded-[14px] border p-4 text-left ${
                !notif.isRead ? "border-gold-border bg-card" : "border-line bg-card"
              }`}
              onClick={() => markRead(notif.id)}
            >
              {/* 미읽음 점 */}
              {!notif.isRead && (
                <span
                  className="absolute right-4 top-4 h-2 w-2 rounded-full bg-gold"
                  role="img"
                  aria-label="읽지 않음"
                />
              )}

              {/* 상단 행 */}
              <div className="mb-2 flex w-full items-center justify-between">
                <span className="rounded-md bg-elev px-2 py-[3px] text-[14px] font-bold text-fg2">
                  {info.label}
                </span>
                <span className="pr-5 text-[14px] text-sub">{notif.date}</span>
              </div>

              {/* 제목 + 본문 */}
              <p
                className={`mb-1 text-[16px] ${
                  !notif.isRead ? "font-bold text-fg" : "font-semibold text-fg2"
                }`}
              >
                {notif.title}
              </p>
              <p className="text-[15px] leading-[22px] text-sub">{notif.body}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
