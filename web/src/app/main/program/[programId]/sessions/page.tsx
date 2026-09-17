"use client";

/**
 * (이전 경로) 프로그램 상세 — sessions 탭
 * 탭 구조를 회차 목록 한 화면으로 통합하면서 /main/program/[programId] 로 옮겼다.
 * 모바일 앱 경로(/main/program/[programId]/sessions)와 맞춘 링크가 깨지지 않도록 리디렉션만 남긴다.
 */

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

export default function LegacyProgramTabRedirect() {
  const { programId } = useParams<{ programId: string }>();
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const qs = params.toString();
    router.replace(`/main/program/${programId}${qs ? `?${qs}` : ""}`);
  }, [programId, params, router]);

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Spinner />
    </div>
  );
}
