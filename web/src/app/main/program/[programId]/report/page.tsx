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
import { getDummyProgram } from "@/data/programView";
import { programCrumbs } from "@/lib/crumbs";
import { httpsCallable } from "firebase/functions";
import { Collapse } from "@/components/ui/Collapse";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Spinner } from "@/components/ui/Spinner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useShare } from "@/hooks/useShare";
import { DEMO_MODE } from "@/lib/demo";
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
  const programTitle = sp.get("programTitle") ?? getDummyProgram(programId).title;
  const header = (
    <ProgramHeader
      mode="report"
      studentName={studentName ?? ""}
      programTitle={programTitle}
      crumbs={[...programCrumbs({ programId, programTitle, sp }), { label: "종합 리포트" }]}
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
      if (DEMO_MODE) throw new Error("demo"); // 체험 모드: 서버 호출 없이 미리보기 링크로
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
      <div className="flex flex-1 flex-col bg-paper">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-paper p-8">
          <p className="text-[20px] font-bold text-fg2">리포트 준비 중</p>
          <p className="text-center text-[16px] leading-[25px] text-sub">
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
    <div className="flex flex-1 flex-col bg-paper">
      {header}
      <div className="flex flex-1 flex-col bg-paper pt-4 pb-8">
        {/* ── 종합 등급 카드 ───────────────── */}
        <div className="mx-4 mb-2 rounded-[20px] border border-line bg-card p-5">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="mb-1 text-[14px] text-sub">
                {studentName ?? report.studentName} 학생
              </p>
              <p className="text-[16px] font-bold text-fg">{report.personalityType}</p>
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
            <span className="text-[40px] font-extrabold leading-[1.2] text-fg">
              {report.totalScore}
            </span>
            <span className="text-[16px] text-sub">/ 100점</span>
          </div>

          {/* 강점·성장 분야 */}
          <div className="mb-[14px] flex gap-2">
            <div className="flex flex-1 flex-col gap-1 rounded-[10px] bg-paper p-[10px]">
              <p className="mb-[2px] text-[14px] font-bold text-fg2">강점 분야</p>
              {report.strengthAreas.map((a, i) => (
                <p key={i} className="text-[14px] font-medium text-gold">
                  • {a}
                </p>
              ))}
            </div>
            <div className="flex flex-1 flex-col gap-1 rounded-[10px] bg-elev p-[10px]">
              <p className="mb-[2px] text-[14px] font-bold text-fg2">발전 분야</p>
              {report.growthAreas.map((a, i) => (
                <p key={i} className="text-[14px] font-medium text-sub">
                  • {a}
                </p>
              ))}
            </div>
          </div>

          {/* 담임 총평 */}
          <div className="mb-[14px] rounded-xl border-l-[3px] border-gold bg-elev p-[14px]">
            <p className="mb-[6px] text-[14px] font-bold uppercase tracking-[0.3px] text-sub">
              담임 총평
            </p>
            <p className="text-[15px] leading-[24px] text-fg2">{report.overallComment}</p>
          </div>

          {/* 공유 버튼 */}
          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="tap no-print flex w-full items-center justify-center rounded-xl bg-brand py-[13px]"
          >
            {sharing ? (
              <Spinner color="#0c0e13" size="small" />
            ) : (
              <span className="text-[16px] font-bold text-ink">리포트 공유하기</span>
            )}
          </button>
        </div>

        {/* ── 프로그램별 상세 ──────────────── */}
        <p className="px-4 pt-4 pb-2 text-[14px] font-bold uppercase tracking-[0.5px] text-sub">
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
    <div className="mx-4 mb-2 overflow-hidden rounded-[14px] border border-line bg-card">
      {/* 카드 헤더 */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="tap flex w-full items-center gap-[10px] p-[14px] text-left"
      >
        <span className="block min-w-0 flex-1">
          <span className="block truncate text-[16px] font-bold text-fg">
            {program.programName}
          </span>
          <span className="mt-[2px] block text-[14px] text-sub">{program.instructorName}</span>
        </span>
        <span
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: gradeBg }}
        >
          <span className="text-[17px] font-extrabold" style={{ color: gradeColor }}>
            {program.grade}
          </span>
        </span>
        <span className="ml-[2px] text-[14px] text-sub">{expanded ? "∧" : "∨"}</span>
      </button>

      {/* 확장 영역 */}
      <Collapse open={expanded}>
        <div className="flex flex-col gap-3 border-t border-line p-[14px]">
          {/* 점수 바 */}
          <div className="flex items-center gap-[10px]">
            <p className="text-[22px] font-extrabold text-fg">{program.overallScore}점</p>
            <div className="rounded-lg border border-line bg-elev px-2 py-[3px]">
              <p className="text-[14px] font-bold text-gold">+{program.growthIndex}점 성장</p>
            </div>
          </div>

          {/* 역량별 바 차트 */}
          {program.competencies.map((comp) => (
            <div key={comp.label} className="flex items-center gap-2">
              <p className="w-20 shrink-0 text-[14px] text-fg2">{comp.label}</p>
              <div className="relative flex-1">
                {/* 또래 평균 */}
                <div
                  className="absolute top-[-3px] z-[1] h-[14px] w-[2px] rounded-[1px] bg-line2"
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
              <p className="w-7 shrink-0 text-right text-[14px] font-bold text-fg2">
                {comp.score}
              </p>
            </div>
          ))}
          <p className="text-right text-[14px] text-sub">| 또래 평균</p>

          {/* 강사 코멘트 */}
          <div className="rounded-[10px] border-l-[3px] border-line2 bg-elev p-3">
            <p className="mb-[6px] text-[14px] font-bold uppercase tracking-[0.3px] text-sub">
              강사 코멘트
            </p>
            <p className="text-[15px] leading-[22px] text-fg2">{program.instructorComment}</p>
          </div>

          {/* 하이라이트 */}
          {program.highlights.length > 0 && (
            <div className="flex flex-col gap-[6px]">
              <p className="text-[14px] font-bold text-fg2">인상적이었던 점</p>
              {program.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-[2.5px] bg-brand" />
                  <p className="flex-1 text-[14px] leading-[22px] text-fg2">{h}</p>
                </div>
              ))}
            </div>
          )}

          {/* 다음 단계 */}
          {program.nextSteps.length > 0 && (
            <div className="flex flex-col gap-2 rounded-[10px] bg-elev p-3">
              <p className="mb-1 text-[14px] font-bold text-gold">향후 발전 방향</p>
              {program.nextSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="h-[18px] w-[18px] shrink-0 rounded-[9px] bg-brand text-center text-[14px] font-bold leading-[21px] text-ink">
                    {i + 1}
                  </span>
                  <p className="flex-1 text-[14px] leading-[22px] text-fg">{step}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Collapse>
    </div>
  );
}
