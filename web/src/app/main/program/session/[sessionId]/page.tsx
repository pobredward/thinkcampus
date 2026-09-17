"use client";

/**
 * (이전 경로) 회차 상세 /main/program/session/[sessionId]
 * 회차 화면(/main/program/[programId]/session/[sessionId])의 "내용" 탭으로 합쳐졌다.
 * 모바일 앱 경로(/main/program/[sessionId])와 맞춘 링크가 깨지지 않도록 리디렉션만 남긴다.
 */

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { DUMMY_PROGRAM } from "@/data/dummyProgram";

export default function LegacySessionRedirect() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();

  useEffect(() => {
    // TODO: 실데이터 전환 시 sessionId 로 소속 programId 조회
    router.replace(`/main/program/${DUMMY_PROGRAM.id}/session/${sessionId}?tab=content`);
  }, [sessionId, router]);

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Spinner />
    </div>
  );
}
