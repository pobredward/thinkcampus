"use client";

/**
 * 프로그램 종합 학습 리포트 (모바일 app/main/program/[programId]/report.tsx)
 * 진입: 프로그램 상세(회차 목록) 아래 [종합 리포트 보기] · 회차 리포트 탭 · 홈 샘플 리포트 카드
 * (종합 리포트 버튼은 모든 회차가 끝난 뒤에만 열린다)
 *
 * 해당 학생의 종합 리포트
 * - 종합 등급 & 총평
 * - 프로그램별 역량 평가
 * - PDF/공유 기능
 */

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ProgramHeader } from "@/components/program/ProgramHeader";
import { useBack } from "@/hooks/useBack";
import { httpsCallable } from "firebase/functions";
import { Collapse } from "@/components/ui/Collapse";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Spinner } from "@/components/ui/Spinner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useShare } from "@/hooks/useShare";
import { getFns } from "@/lib/firebase";
import { useDialog } from "@/providers/DialogProvider";
import {
  DUMMY_REPORT,
  getGradeColor,
  getGradeBg,
  type StudentReport,
  type ProgramReport,
} from "@/data/dummyReport";

export default function ProgramReportPage() {
  usePageTitle("종합 리포트");
  const sp = useSearchParams();
  const { programId } = useParams<{ programId: string }>();
  const studentName = sp.get("studentName");
  const programTitle = sp.get("programTitle") ?? "";
  // 들어온 화면으로 (앱 안 기록이 없으면 회차 목록)
  const goBack = useBack(`/main/program/${programId}?${sp.toString()}`);
  const header = (
    <ProgramHeader
      mode="report"
      studentName={studentName ?? ""}
      programTitle={programTitle}
      onBack={goBack}
    />
  );
  const dialog = useDialog();
  const share = useShare();
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  // TODO: Firestore에서 studentId+programId 기준 조회
  const report: StudentReport = DUMMY_REPORT;
  const isReportReady = true; // TODO: 실제로는 issueDate 확인

  function toggleProgram(id: string) {
    setExpandedProgram((prev) => (prev === id ? null : id));
  }

  async function handleShare() {
    setSharing(true);
    try {
      const fn = httpsCallable<{ reportId: string }, { url: string }>(getFns(), "createShareToken");
      const result = await fn({ reportId: report.reportId });
      const data = result.data;
      await share({
        title: `${report.studentName} 학생 리포트`,
        message: `ThinkCampus 리포트 링크: ${data.url}`,
        url: data.url,
      });
    } catch {
      // 공유 기능 미구현 시 더미 URL로 대체
      try {
        await share({
          title: `${report.studentName} 학생 리포트`,
          message: `ThinkCampus 리포트 (미리보기): https://thinkcampus.app/report/${report.reportId}`,
          url: `https://thinkcampus.app/report/${report.reportId}`,
        });
      } catch {
        void dialog.alert("오류", "공유 중 문제가 발생했습니다.");
      }
    } finally {
      setSharing(false);
    }
  }

  if (!isReportReady) {
    return (
      <div className="flex flex-1 flex-col bg-[#f8fafc]">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#f8fafc] p-8">
          <p className="text-[48px]">⏳</p>
          <p className="text-[20px] font-bold text-gray-700">리포트 준비 중</p>
          <p className="text-center text-[16px] leading-[25px] text-gray-500">
            캠프 종료 후 영업일 기준
            <br />
            3~5일 내에 업로드됩니다.
          </p>
        </div>
      </div>
    );
  }

  const gradeColor = getGradeColor(report.totalGrade);
  const gradeBg = getGradeBg(report.totalGrade);

  return (
    <div className="flex flex-1 flex-col bg-[#f8fafc]">
      {header}
      <div className="flex flex-1 flex-col bg-[#f8fafc] pt-4 pb-8">
        {/* ── 종합 등급 카드 ───────────────── */}
        <div className="mx-4 mb-2 rounded-[20px] border border-gray-200 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="mb-1 text-[14px] text-gray-500">
                {studentName ?? report.studentName} 학생
              </p>
              <p className="text-[16px] font-bold text-gray-900">{report.personalityType}</p>
            </div>
            <div
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px]"
              style={{ backgroundColor: gradeBg }}
            >
              <span className="text-[30px] font-black" style={{ color: gradeColor }}>
                {report.totalGrade}
              </span>
            </div>
          </div>

          <div className="mb-4 flex items-baseline gap-1">
            <span className="text-[40px] font-extrabold leading-[1.2] text-gray-900">
              {report.totalScore}
            </span>
            <span className="text-[16px] text-gray-500">/ 100점</span>
          </div>

          {/* 강점·성장 분야 */}
          <div className="mb-[14px] flex gap-2">
            <div className="flex flex-1 flex-col gap-1 rounded-[10px] bg-[#f8fafc] p-[10px]">
              <p className="mb-[2px] text-[14px] font-bold text-gray-700">💪 강점 분야</p>
              {report.strengthAreas.map((a, i) => (
                <p key={i} className="text-[14px] font-medium text-brand">
                  • {a}
                </p>
              ))}
            </div>
            <div className="flex flex-1 flex-col gap-1 rounded-[10px] bg-amber-50 p-[10px]">
              <p className="mb-[2px] text-[14px] font-bold text-gray-700">🚀 발전 분야</p>
              {report.growthAreas.map((a, i) => (
                <p key={i} className="text-[14px] font-medium text-amber-600">
                  • {a}
                </p>
              ))}
            </div>
          </div>

          {/* 담임 총평 */}
          <div className="mb-[14px] rounded-xl border-l-[3px] border-brand bg-gray-50 p-[14px]">
            <p className="mb-[6px] text-[14px] font-bold uppercase tracking-[0.3px] text-gray-500">
              담임 총평
            </p>
            <p className="text-[15px] leading-[24px] text-gray-700">{report.overallComment}</p>
          </div>

          {/* 공유 버튼 */}
          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="tap no-print flex w-full items-center justify-center rounded-xl bg-brand py-[13px]"
          >
            {sharing ? (
              <Spinner color="#fff" size="small" />
            ) : (
              <span className="text-[16px] font-bold text-white">📤 리포트 공유하기</span>
            )}
          </button>
        </div>

        {/* ── 프로그램별 상세 ──────────────── */}
        <p className="px-4 pt-4 pb-2 text-[14px] font-bold uppercase tracking-[0.5px] text-gray-500">
          프로그램별 평가
        </p>

        {report.programs.map((prog) => (
          <ProgramCard
            key={prog.programId}
            program={prog}
            expanded={expandedProgram === prog.programId}
            onToggle={() => toggleProgram(prog.programId)}
          />
        ))}

        <div className="h-8" />
      </div>
    </div>
  );
}

// ── 프로그램 리포트 카드 ──────────────────────────────────

function ProgramCard({
  program,
  expanded,
  onToggle,
}: {
  program: ProgramReport;
  expanded: boolean;
  onToggle: () => void;
}) {
  const gradeColor = getGradeColor(program.grade);
  const gradeBg = getGradeBg(program.grade);

  return (
    <div className="mx-4 mb-2 overflow-hidden rounded-[14px] border border-gray-200 bg-white">
      {/* 카드 헤더 */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="tap flex w-full items-center gap-[10px] p-[14px] text-left"
      >
        <span className="text-[24px]">{program.programIcon}</span>
        <span className="block min-w-0 flex-1">
          <span className="block truncate text-[16px] font-bold text-gray-900">
            {program.programName}
          </span>
          <span className="mt-[2px] block text-[14px] text-gray-500">{program.instructorName}</span>
        </span>
        <span
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: gradeBg }}
        >
          <span className="text-[17px] font-extrabold" style={{ color: gradeColor }}>
            {program.grade}
          </span>
        </span>
        <span className="ml-[2px] text-[14px] text-gray-500">{expanded ? "∧" : "∨"}</span>
      </button>

      {/* 확장 영역 */}
      <Collapse open={expanded}>
        <div className="flex flex-col gap-3 border-t border-gray-100 p-[14px]">
          {/* 점수 바 */}
          <div className="flex items-center gap-[10px]">
            <p className="text-[22px] font-extrabold text-gray-900">{program.overallScore}점</p>
            <div className="rounded-lg border border-green-200 bg-green-50 px-2 py-[3px]">
              <p className="text-[14px] font-bold text-green-600">+{program.growthIndex}점 성장</p>
            </div>
          </div>

          {/* 역량별 바 차트 */}
          {program.competencies.map((comp) => (
            <div key={comp.label} className="flex items-center gap-2">
              <p className="w-20 shrink-0 text-[14px] text-gray-700">{comp.label}</p>
              <div className="relative flex-1">
                {/* 또래 평균 */}
                <div
                  className="absolute top-[-3px] z-[1] h-[14px] w-[2px] rounded-[1px] bg-gray-400"
                  style={{ left: `${comp.benchmark}%` }}
                />
                {/* 내 점수 */}
                <ProgressBar
                  value={comp.score / 100}
                  height={8}
                  color={getGradeColor(
                    comp.score >= 90 ? "S" : comp.score >= 75 ? "A" : comp.score >= 60 ? "B" : "C",
                  )}
                />
              </div>
              <p className="w-7 shrink-0 text-right text-[14px] font-bold text-gray-700">
                {comp.score}
              </p>
            </div>
          ))}
          <p className="text-right text-[14px] text-gray-500">| 또래 평균</p>

          {/* 강사 코멘트 */}
          <div className="rounded-[10px] border-l-[3px] border-gray-500 bg-gray-50 p-3">
            <p className="mb-[6px] text-[14px] font-bold uppercase tracking-[0.3px] text-gray-500">
              강사 코멘트
            </p>
            <p className="text-[15px] leading-[22px] text-gray-700">{program.instructorComment}</p>
          </div>

          {/* 하이라이트 */}
          {program.highlights.length > 0 && (
            <div className="flex flex-col gap-[6px]">
              <p className="text-[14px] font-bold text-gray-700">✨ 인상적이었던 점</p>
              {program.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-[2.5px] bg-brand" />
                  <p className="flex-1 text-[14px] leading-[22px] text-gray-700">{h}</p>
                </div>
              ))}
            </div>
          )}

          {/* 다음 단계 */}
          {program.nextSteps.length > 0 && (
            <div className="flex flex-col gap-2 rounded-[10px] bg-blue-50 p-3">
              <p className="mb-1 text-[14px] font-bold text-brand">📌 향후 발전 방향</p>
              {program.nextSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="h-[18px] w-[18px] shrink-0 rounded-[9px] bg-brand text-center text-[14px] font-bold leading-[21px] text-white">
                    {i + 1}
                  </span>
                  <p className="flex-1 text-[14px] leading-[22px] text-[#1e40af]">{step}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Collapse>
    </div>
  );
}
