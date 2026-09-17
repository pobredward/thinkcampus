"use client";

import { useEffect } from "react";

/**
 * RN Modal(하단 시트) 대체 — 프로필의 보호자 초대 폼 등에 사용
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="no-print fixed inset-0 z-[900] flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="tc-fade-up w-full max-w-[480px] rounded-t-[20px] bg-white px-5 pt-3"
        style={{ paddingBottom: "calc(var(--sab) + 20px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" aria-hidden="true" />
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[20px] font-bold text-gray-900">{title}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="tap flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-[17px] text-gray-500"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
