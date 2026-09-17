"use client";

import { useEffect } from "react";

/** 클라이언트 페이지의 브라우저 탭 제목 — "알림 · ThinkCampus" */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} · ThinkCampus` : "ThinkCampus 학부모";
    return () => {
      document.title = prev;
    };
  }, [title]);
}
