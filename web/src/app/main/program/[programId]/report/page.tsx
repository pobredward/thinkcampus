"use client";

/**
 * 프로그램 종합 학습 리포트 (모바일 app/main/program/[programId]/report.tsx)
 * 진입: 프로그램 화면 아래 [종합 리포트 보기](모든 회차가 끝난 뒤) · 회차 리포트 탭 · [샘플 미리보기](?sample=1)
 *
 *   ?sample=1  → 이 학생·이 프로그램 이름으로 만든 예시 리포트 (lib/reportSample). PDF 는 되고 공유 링크는 안 된다
 *   그 외      → api.guardian.getFinalReport. 아직 발급 전이면 "준비 중" + 샘플 미리보기 안내
 *
 * 본문은 components/report/FinalReportView, 버튼은 ReportActions (공유 링크 시트 · PDF)
 */

import { useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ProgramHeader } from "@/components/program/ProgramHeader";
import { FinalReportView } from "@/components/report/FinalReportView";
import { ReportActions } from "@/components/report/ReportActions";
import { Spinner } from "@/components/ui/Spinner";
import { getDummyProgram } from "@/data/programView";
import { useChildren } from "@/hooks/useChildren";
import { useFinalReport } from "@/hooks/useFinalReport";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useProgramBundle } from "@/hooks/useProgramBundle";
import { programCrumbs } from "@/lib/crumbs";
import { buildSampleReport } from "@/lib/reportSample";
import { useApi } from "@/services";

export default function ProgramReportPage() {
  usePageTitle("종합 리포트");
  const sp = useSearchParams();
  const router = useRouter();
  const { programId } = useParams<{ programId: string }>();
  const studentName = sp.get("studentName") ?? "";
  const sid = sp.get("sid");
  const sampleMode = sp.get("sample") === "1";
  const api = useApi();

  const { program: loadedProgram, loading: programLoading } = useProgramBundle(programId, sid);
  const program = loadedProgram ?? getDummyProgram(programId);
  const programTitle = sp.get("programTitle") ?? program.title;
  const { children } = useChildren({ activeOnly: true });
  const campusName = children.find((c) => c.studentId === sid)?.campusName;

  const { report, loading: reportLoading } = useFinalReport(sampleMode ? null : sid, programId);

  const sample = useMemo(() => {
    if (!sampleMode) return null;
    return buildSampleReport({
      reportId: `sample-${programId}`,
      studentId: sid ?? "sample",
      studentName: studentName || "우리 아이",
      programTitle,
      campusName,
      campPeriod: `${program.startDate} – ${program.endDate}`,
      issuedBy: campusName ? `${campusName} · 담당 선생님` : undefined,
      sessions: program.sessions.map((s) => ({
        sessionNumber: s.sessionNumber,
        date: s.date,
        topic: s.topic,
        instructorName: s.instructor.name,
        instructorTitle: s.instructor.title || undefined,
      })),
    });
  }, [sampleMode, programId, sid, studentName, programTitle, campusName, program]);

  const header = (
    <ProgramHeader
      mode="report"
      studentName={studentName}
      programTitle={programTitle}
      badge={sampleMode ? "샘플" : undefined}
      crumbs={[...programCrumbs({ programId, programTitle, sp }), { label: sampleMode ? "리포트 샘플" : "종합 리포트" }]}
    />
  );

  const loading = sampleMode ? programLoading && !loadedProgram : reportLoading;
  if (loading) {
    return (
      <div className="flex flex-1 flex-col bg-paper">
        {header}
        <div className="flex flex-1 items-center justify-center p-12">
          <Spinner size="large" />
        </div>
      </div>
    );
  }

  const shown = sampleMode ? sample : report;

  if (!shown) {
    const openSample = () => {
      const p = new URLSearchParams(sp.toString());
      p.set("sample", "1");
      router.replace(`/main/program/${programId}/report?${p.toString()}`);
    };
    return (
      <div className="flex flex-1 flex-col bg-paper">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-paper p-8" data-testid="report-pending">
          <p className="text-[20px] font-bold text-fg2">리포트 준비 중</p>
          <p className="text-center text-[16px] leading-[25px] text-sub">
            마지막 수업이 끝나면 영업일 기준
            <br />
            3~5일 안에 올라와요.
          </p>
          <button type="button" onClick={openSample} className="tap mt-2 inline-flex min-h-[48px] items-center rounded-xl border border-gold-dim bg-gold-light px-5 text-[16px] font-bold text-gold">
            어떤 리포트를 받게 되나요? 샘플 미리보기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-paper">
      {header}
      <FinalReportView
        report={shown}
        sample={sampleMode}
        cover="meta"
        actions={<ReportActions report={shown} sample={sampleMode} createShareLink={() => api.guardian.createShareLink(shown.reportId)} />}
      />
    </div>
  );
}
