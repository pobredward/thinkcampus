"use client";

/**
 * 공유된 종합 리포트 — 보호자가 만든 링크로 누구나 로그인 없이 연다 (/r/<토큰>)
 *   - 본문은 앱과 같은 FinalReportView, 버튼은 PDF 저장만 (공유 링크는 보호자만 만든다)
 *   - 토큰: demo-<reportId>(체험판) 또는 shareTokens/{token}(실서비스 · 7일)
 *   - 만료·없음은 안내 화면. 링크는 새로 만들면 된다는 것만 알려 준다
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FinalReportView } from "@/components/report/FinalReportView";
import { ReportActions } from "@/components/report/ReportActions";
import { Spinner } from "@/components/ui/Spinner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { fetchSharedReport, type SharedReportResult } from "@/services/sharedReport";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<SharedReportResult | { status: "loading" } | { status: "error" }>({ status: "loading" });
  usePageTitle(state.status === "ok" ? `${state.report.studentName} 학생 종합 리포트` : "공유된 리포트");

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    fetchSharedReport(decodeURIComponent(token ?? ""))
      .then((r) => alive && setState(r))
      .catch(() => alive && setState({ status: "error" }));
    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-paper">
      <header className="flex items-center justify-between border-b border-line px-5 pb-3" style={{ paddingTop: "calc(var(--sat) + 12px)" }}>
        <p className="text-[15px] font-bold tracking-[0.02em] text-gold">ThinkCampus</p>
        <p className="text-[14px] text-sub">공유된 종합 리포트</p>
      </header>

      {state.status === "loading" && (
        <div className="flex flex-1 items-center justify-center p-12">
          <Spinner size="large" />
        </div>
      )}

      {(state.status === "not-found" || state.status === "error" || state.status === "expired") && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16 text-center" data-testid="shared-report-unavailable">
          <p className="text-[20px] font-bold text-fg2">{state.status === "expired" ? "링크 기간이 지났어요" : state.status === "error" ? "지금은 열 수 없어요" : "열 수 없는 링크예요"}</p>
          <p className="text-[16px] leading-[25px] text-sub">
            {state.status === "expired"
              ? `이 링크는 ${fmtDate(state.expiresAt) || "만료일"}까지만 열렸어요. 리포트를 보낸 분께 새 링크를 부탁해 주세요.`
              : state.status === "error"
                ? "잠시 후 다시 열어 주세요. 계속 안 되면 리포트를 보낸 분께 새 링크를 부탁해 주세요."
                : "주소가 잘못됐거나 이미 지워진 링크예요. 리포트를 보낸 분께 새 링크를 부탁해 주세요."}
          </p>
        </div>
      )}

      {state.status === "ok" && (
        <div className="pt-4">
          <p className="mx-4 mb-3 rounded-[12px] border border-line bg-card2 px-4 py-3 text-[14px] leading-[21px] text-sub" data-testid="shared-report-note">
            보호자가 공유한 리포트예요.{state.expiresAt ? ` 이 링크는 ${fmtDate(state.expiresAt)}까지 열려요.` : state.demo ? " 체험판 예시 데이터예요." : ""}
          </p>
          <FinalReportView report={state.report} actions={<ReportActions report={state.report} />} />
        </div>
      )}

      <footer className="mt-auto px-5 py-6 text-center text-[14px] text-faint">ThinkCampus · 지자체 주말수업 학부모 앱</footer>
    </div>
  );
}
