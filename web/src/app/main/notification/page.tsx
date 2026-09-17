"use client";

/**
 * 알림 / 공지사항 화면 (모바일 app/main/notification.tsx)
 * - 수업 변경, 출결 알림, 캠프 공지 등
 * - 나중에 Firestore notifications 컬렉션으로 교체 예정
 */

import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";

type NotifType = "attendance" | "notice" | "report" | "schedule";

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  date: string;
  isRead: boolean;
}

// ── 더미 알림 데이터 ─────────────────────────────────────
const DUMMY_NOTIFICATIONS: Notification[] = [
  {
    id: "n-002",
    type: "notice",
    title: "다음 수업 안내",
    body: "4회차 사고·창의력 디베이트 수업이 2026.10.17 (토) 오전 10:00~12:00 예정대로 진행됩니다. 강남구 청소년수련관 3층 301호.",
    date: "2026.10.14",
    isRead: false,
  },
  {
    id: "n-003",
    type: "schedule",
    title: "수업 준비물 안내",
    body: "다음 수업(10/17 사고·창의력 디베이트)에 필기도구와 포스트잇을 지참해주세요.",
    date: "2026.10.14",
    isRead: false,
  },
  {
    id: "n-004",
    type: "attendance",
    title: "지각 알림",
    body: "김민준 학생이 3회차(한국사 인문학) 수업에 18분 지각하였습니다.",
    date: "2026.10.03",
    isRead: false,
  },
  {
    id: "n-001",
    type: "attendance",
    title: "출결 업데이트",
    body: "김민준 학생의 2회차(세계사 인문학) 출석이 확인되었습니다.",
    date: "2026.09.19",
    isRead: true,
  },
  {
    id: "n-006",
    type: "report",
    title: "리포트 업로드 예정",
    body: "각 회차 리포트는 수업 당일 저녁에, 종합 리포트는 전체 프로그램 종료(2026.11.14) 후 영업일 기준 3~5일 내 업로드됩니다.",
    date: "2026.09.06",
    isRead: true,
  },
  {
    id: "n-007",
    type: "notice",
    title: "ThinkCampus 앱 서비스 시작",
    body: "학부모님께 자녀의 출결 및 수업 피드백을 실시간으로 확인하실 수 있는 앱 서비스가 시작되었습니다.",
    date: "2026.09.01",
    isRead: true,
  },
];

function getTypeInfo(type: NotifType): { emoji: string; color: string; bg: string; label: string } {
  switch (type) {
    case "attendance":
      return { emoji: "📋", color: "#1d4ed8", bg: "#eff6ff", label: "출결" };
    case "notice":
      return { emoji: "📢", color: "#d97706", bg: "#fffbeb", label: "공지" };
    case "report":
      return { emoji: "📊", color: "#7c3aed", bg: "#f5f3ff", label: "리포트" };
    case "schedule":
      return { emoji: "📅", color: "#059669", bg: "#ecfdf5", label: "일정" };
  }
}

export default function NotificationScreen() {
  usePageTitle("알림");
  const [notifications, setNotifications] = useState(DUMMY_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  return (
    <div className="flex flex-1 flex-col bg-[#f8fafc]">
      {/* 고정 헤더 */}
      <div
        className="sticky top-0 z-10 flex flex-col border-b border-gray-100 bg-white px-5 pb-[14px]"
        style={{ paddingTop: "calc(var(--sat) + 12px)" }}
      >
        <div className="mb-[6px] flex items-center gap-2">
          <h1 className="text-[24px] font-bold text-gray-900">알림</h1>
          {unreadCount > 0 && (
            <div className="flex min-w-5 items-center justify-center rounded-[10px] bg-brand px-[7px] py-[2px]">
              <span className="text-[14px] font-bold text-white">{unreadCount}</span>
            </div>
          )}
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllRead} className="tap self-start">
            <span className="text-[15px] font-medium text-brand">모두 읽음 처리</span>
          </button>
        )}
      </div>

      <div className="flex flex-col px-4 pb-6 pt-3">
        {notifications.length === 0 && (
          <div className="flex flex-col items-center gap-3 pt-20">
            <span className="text-[40px]">🔔</span>
            <p className="text-[16px] text-gray-500">새 알림이 없습니다</p>
          </div>
        )}

        {notifications.map((notif) => {
          const info = getTypeInfo(notif.type);
          return (
            <button
              key={notif.id}
              type="button"
              className={`tap relative mb-2 flex w-full flex-col rounded-[14px] border p-4 text-left ${
                !notif.isRead ? "border-blue-200 bg-[#fafcff]" : "border-gray-200 bg-white"
              }`}
              onClick={() => markRead(notif.id)}
            >
              {/* 미읽음 점 */}
              {!notif.isRead && (
                <span
                  className="absolute right-4 top-4 h-2 w-2 rounded-full bg-brand"
                  role="img"
                  aria-label="읽지 않음"
                />
              )}

              {/* 상단 행 */}
              <div className="mb-2 flex w-full items-center justify-between">
                <div
                  className="flex items-center gap-1 rounded-lg px-2 py-[3px]"
                  style={{ backgroundColor: info.bg }}
                >
                  <span className="text-[15px]">{info.emoji}</span>
                  <span className="text-[14px] font-bold" style={{ color: info.color }}>
                    {info.label}
                  </span>
                </div>
                <span className="pr-5 text-[14px] text-gray-500">{notif.date}</span>
              </div>

              {/* 제목 + 본문 */}
              <p
                className={`mb-1 text-[16px] ${
                  !notif.isRead ? "font-bold text-gray-900" : "font-semibold text-gray-700"
                }`}
              >
                {notif.title}
              </p>
              <p className="text-[15px] leading-[22px] text-gray-500">{notif.body}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
