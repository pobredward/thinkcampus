"use client";

/**
 * 리포트 탭 (모바일 app/main/report.tsx)
 * - 자녀 2명 이상 → 상단 탭으로 전환
 * - 별도 상세 화면 없이 전체 리포트를 인라인으로 표시
 * - 임시 URL 생성(클립보드 복사) + PDF 공유
 */

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { Collapse } from "@/components/ui/Collapse";
import { Spinner } from "@/components/ui/Spinner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useShare } from "@/hooks/useShare";
import { errMessage } from "@/lib/errors";
import { getFns } from "@/lib/firebase";
import { printHtml } from "@/lib/print";
import { useDialog } from "@/providers/DialogProvider";
import {
  DUMMY_REPORT,
  getGradeColor,
  getGradeBg,
  type StudentReport,
  type ProgramReport,
  type CompetencyScore,
} from "@/data/dummyReport";

// ── 더미: 자녀 2명 리포트 시뮬레이션 ────────────────────
// 실제로는 Firestore에서 guardianUid 기준으로 조회
const DUMMY_CHILD2: StudentReport = {
  ...DUMMY_REPORT,
  reportId: "report-2026-002",
  studentId: "student-002",
  studentName: "김서연",
  totalScore: 76,
  totalGrade: "B",
  personalityType: "소통형 협력인재 (CONNECTOR)",
  personalityDesc: "타인과의 소통을 즐기고, 모둠 활동에서 뛰어난 리더십을 발휘합니다.",
  overallComment:
    "서연이는 협력과 소통 능력이 매우 뛰어나며, 특히 디베이트와 심리학 수업에서 두각을 나타냈습니다.",
  strengthAreas: ["디베이트", "유소년 심리학", "한국사 인문학"],
  growthAreas: ["AI/SW 코딩", "수학적 사고"],
  programs: DUMMY_REPORT.programs.map((p, i) => ({
    ...p,
    overallScore: Math.max(55, p.overallScore - 8 + (i % 3 === 0 ? 10 : 0)),
    preScore: p.preScore - 5,
    postScore: p.postScore - 8,
    growthIndex: p.growthIndex - 3,
    grade: p.overallScore - 8 >= 90 ? "S" : p.overallScore - 8 >= 75 ? "A" : "B",
  })) as ProgramReport[],
};

const ALL_REPORTS = [DUMMY_REPORT, DUMMY_CHILD2];

// ── PDF HTML 빌더 ─────────────────────────────────────────
function buildPdfHtml(report: StudentReport): string {
  const gradeColorMap: Record<string, string> = {
    S: '#7c3aed', A: '#1d4ed8', B: '#0369a1', C: '#6b7280',
  };
  const programRows = report.programs.map((p) => {
    const color = gradeColorMap[p.grade];
    const compRows = p.competencies.map((c) => `
      <tr>
        <td style="padding:7px 10px;border-bottom:1px solid #f3f4f6;font-size:13px;">${c.label}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #f3f4f6;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;background:#f3f4f6;border-radius:4px;height:7px;">
              <div style="width:${c.score}%;background:${color};height:7px;border-radius:4px;"></div>
            </div>
            <b style="color:${color};min-width:26px;">${c.score}</b>
          </div>
        </td>
        <td style="padding:7px 10px;border-bottom:1px solid #f3f4f6;color:#9ca3af;font-size:12px;">평균 ${c.benchmark}</td>
      </tr>`).join('');

    return `
      <div style="margin-bottom:28px;break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:2px solid #e5e7eb;margin-bottom:10px;">
          <span style="font-size:20px;">${p.programIcon}</span>
          <div style="flex:1;">
            <div style="font-size:15px;font-weight:700;">${p.programName}</div>
            <div style="font-size:12px;color:#6b7280;">강사 ${p.instructorName} · 출석 ${p.attendance}%</div>
          </div>
          <span style="font-size:22px;font-weight:900;color:${color};">${p.grade}</span>
          <span style="font-size:20px;font-weight:700;color:${color};">${p.overallScore}점</span>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
          <thead><tr style="background:#f8fafc;">
            <th style="padding:7px 10px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">역량</th>
            <th style="padding:7px 10px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">점수</th>
            <th style="padding:7px 10px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">비교</th>
          </tr></thead>
          <tbody>${compRows}</tbody>
        </table>
        <div style="background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:8px;">
          <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:4px;">강사 총평</div>
          <div style="font-size:13px;color:#374151;line-height:1.7;">${p.instructorComment}</div>
        </div>
        <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:4px;">향후 발전 방향</div>
        ${p.nextSteps.map((s, i) => `<div style="font-size:13px;color:#6b7280;margin-bottom:3px;">${i + 1}. ${s}</div>`).join('')}
      </div>`;
  }).join('');

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/>
  <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:-apple-system,Arial,sans-serif;padding:28px;color:#111827;}</style>
  </head><body>
  <div style="background:#1d4ed8;border-radius:14px;padding:24px;margin-bottom:24px;color:#fff;">
    <div style="font-size:12px;color:#bfdbfe;margin-bottom:4px;">ThinkCampus 학습 리포트</div>
    <div style="font-size:26px;font-weight:900;margin-bottom:4px;">${report.studentName} 학생</div>
    <div style="font-size:13px;color:#bfdbfe;">${report.campusName} · ${report.campPeriod}</div>
    <div style="display:flex;gap:12px;margin-top:16px;">
      <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 20px;text-align:center;">
        <div style="font-size:32px;font-weight:900;">${report.totalGrade}</div>
        <div style="font-size:11px;color:#bfdbfe;">종합 등급</div>
      </div>
      <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 20px;text-align:center;">
        <div style="font-size:32px;font-weight:900;">${report.totalScore}</div>
        <div style="font-size:11px;color:#bfdbfe;">종합 점수</div>
      </div>
    </div>
  </div>
  <div style="background:#f8fafc;border-radius:10px;padding:16px;margin-bottom:20px;border:1px solid #e5e7eb;">
    <div style="font-size:13px;font-weight:700;margin-bottom:6px;">${report.personalityType}</div>
    <div style="font-size:13px;color:#374151;line-height:1.7;">${report.personalityDesc}</div>
  </div>
  <div style="background:#f8fafc;border-radius:10px;padding:16px;margin-bottom:24px;border:1px solid #e5e7eb;">
    <div style="font-size:12px;font-weight:700;color:#6b7280;margin-bottom:8px;">담임 강사 종합 총평</div>
    <div style="font-size:14px;color:#374151;line-height:1.8;">${report.overallComment}</div>
  </div>
  <div style="font-size:17px;font-weight:700;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #1d4ed8;">프로그램별 상세 평가</div>
  ${programRows}
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:12px;">
    발급일: ${report.issueDate} · ThinkCampus 공식 리포트
  </div>
  </body></html>`;
}

// ── 메인 컴포넌트 ──────────────────────────────────────────

export default function ReportScreen() {
  usePageTitle("학습 리포트");
  const dialog = useDialog();
  const share = useShare();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  const reports = ALL_REPORTS;
  const report = reports[selectedIdx];
  const gradeColor = getGradeColor(report.totalGrade);
  const gradeBg = getGradeBg(report.totalGrade);

  function toggleProgram(id: string) {
    setExpandedProgram((prev) => (prev === id ? null : id));
  }

  async function handleShare() {
    setShareLoading(true);
    try {
      // 실제 리포트는 Firestore에서 오므로 reportId 사용
      // 더미 데이터 단계에서는 Cloud Function이 not-found를 반환할 수 있으므로
      // 에러 시 Clipboard 복사 fallback 처리
      let url: string;
      try {
        // ── 공유 URL 생성 (Cloud Function 호출) ──
        // getFns() 는 프리렌더 단계에서 실행되면 안 되므로 모듈 최상위가 아닌 핸들러 안에서 만든다.
        const createShareTokenFn = httpsCallable<
          { reportId: string },
          { url: string; expiresAt: string }
        >(getFns(), "createShareToken");
        const result = await createShareTokenFn({ reportId: report.reportId });
        url = result.data.url;
      } catch {
        // 더미 데이터 / 개발 환경 fallback: btoa 기반 임시 URL
        const raw = `${report.reportId}:${Date.now()}`;
        const token = btoa(raw)
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, "")
          .slice(0, 20);
        url = `https://report.thinkcampus.kr/r/${token}`;
      }

      // 시스템 공유 시트 (카카오톡, 문자, 메일 등) — 미지원 브라우저는 클립보드 복사
      await share({
        title: `${report.studentName} 학습 리포트`,
        message: `[ThinkCampus] ${report.studentName} 학생의 학습 리포트를 공유합니다.\n\n${url}\n\n※ 링크는 7일 후 만료됩니다.`,
        url,
      });
      // 사용자가 공유를 취소한 경우("cancelled")는 무시
    } catch (e: unknown) {
      // 실제 오류만 알림
      void dialog.alert("공유 오류", errMessage(e, "알 수 없는 오류가 발생했습니다."));
    } finally {
      setShareLoading(false);
    }
  }

  async function handlePdf() {
    setPdfLoading(true);
    try {
      // 브라우저 인쇄 다이얼로그 → "PDF로 저장"
      await printHtml(buildPdfHtml(report));
    } catch (e: unknown) {
      void dialog.alert("오류", errMessage(e));
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-[#f8fafc] pb-8">
      {/* ── 고정 헤더 ── */}
      <div
        className="no-print sticky top-0 z-10 border-b border-gray-100 bg-white px-5"
        style={{ paddingTop: "calc(var(--sat) + 12px)" }}
      >
        <div className="flex items-center justify-between pb-3">
          <h1 className="text-[24px] font-bold text-gray-900">학습 리포트</h1>
          {/* 공유 · PDF 버튼 */}
          <div className="flex gap-2">
            <button
              type="button"
              className="tap flex min-w-[36px] items-center justify-center rounded-lg border border-gray-200 px-3 py-[7px]"
              onClick={handleShare}
              disabled={shareLoading}
              aria-busy={shareLoading}
            >
              {shareLoading ? (
                <Spinner size="small" color="#1d4ed8" />
              ) : (
                <span className="text-[15px] font-medium text-gray-700">🔗 링크 공유</span>
              )}
            </button>
            <button
              type="button"
              className="tap flex min-w-[36px] items-center justify-center rounded-lg border border-brand bg-brand px-3 py-[7px]"
              onClick={handlePdf}
              disabled={pdfLoading}
              aria-busy={pdfLoading}
            >
              {pdfLoading ? (
                <Spinner size="small" color="#fff" />
              ) : (
                <span className="text-[15px] font-bold text-white">PDF</span>
              )}
            </button>
          </div>
        </div>

        {/* ── 자녀 전환 탭 (2명 이상일 때만 표시) ── */}
        {reports.length > 1 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {reports.map((r, i) => {
              const isActive = selectedIdx === i;
              return (
                <button
                  key={r.reportId}
                  type="button"
                  aria-pressed={isActive}
                  className={`tap flex shrink-0 items-center gap-2 border-b-2 px-[14px] py-[10px] ${
                    isActive ? "border-brand" : "border-transparent"
                  }`}
                  onClick={() => {
                    setSelectedIdx(i);
                    setExpandedProgram(null);
                  }}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[14px] ${
                      isActive ? "bg-brand" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`text-[14px] font-bold ${isActive ? "text-white" : "text-gray-700"}`}
                    >
                      {r.studentName.charAt(0)}
                    </span>
                  </span>
                  <span
                    className={`text-[16px] ${
                      isActive ? "font-bold text-brand" : "font-medium text-gray-500"
                    }`}
                  >
                    {r.studentName}
                  </span>
                  <span
                    className="rounded-[6px] px-[6px] py-[2px]"
                    style={{ backgroundColor: getGradeBg(r.totalGrade) }}
                  >
                    <span
                      className="text-[14px] font-extrabold"
                      style={{ color: getGradeColor(r.totalGrade) }}
                    >
                      {r.totalGrade}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 스크롤 콘텐츠 ── */}
      <div className="flex flex-col pt-4">
        {/* 종합 헤더 카드 */}
        <div className="mx-5 mb-3 rounded-2xl border border-gray-200 bg-white p-[18px]">
          <div className="mb-[14px] flex items-center gap-3">
            <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[23px] bg-blue-100">
              <span className="text-[22px] font-bold text-brand">
                {report.studentName.charAt(0)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold text-gray-900">{report.studentName} 학생</p>
              <p className="mt-px text-[14px] text-gray-500">{report.campusName}</p>
              <p className="mt-px text-[14px] text-gray-500">{report.campPeriod}</p>
            </div>
            <div
              className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px]"
              style={{ backgroundColor: gradeBg }}
            >
              <span className="text-[24px] font-black" style={{ color: gradeColor }}>
                {report.totalGrade}
              </span>
            </div>
          </div>

          {/* 종합 점수 바 */}
          <div className="mb-[5px] flex justify-between">
            <span className="text-[14px] text-gray-500">종합 점수</span>
            <span className="text-[15px] font-bold" style={{ color: gradeColor }}>
              {report.totalScore}점
            </span>
          </div>
          <div className="mb-[14px] h-[7px] overflow-hidden rounded-[4px] bg-gray-100">
            <div
              className="h-[7px] rounded-[4px]"
              style={{ width: `${report.totalScore}%`, backgroundColor: gradeColor }}
            />
          </div>

          {/* 성향 유형 */}
          <div className="rounded-[10px] border border-gray-200 bg-[#f8fafc] p-3">
            <p className="mb-1 text-[15px] font-bold text-gray-900">{report.personalityType}</p>
            <p className="text-[14px] leading-[21px] text-gray-700">{report.personalityDesc}</p>
          </div>
        </div>

        {/* 강점 / 발전 */}
        <div className="mx-5 mb-3 flex gap-[10px]">
          <div className="min-w-0 flex-1 rounded-[14px] border border-green-200 bg-green-50 p-[13px]">
            <p className="mb-2 text-[14px] font-bold text-[#166534]">강점 분야</p>
            {report.strengthAreas.map((s, i) => (
              <div key={i} className="mb-[5px] flex items-center gap-[6px]">
                <span className="h-[5px] w-[5px] shrink-0 rounded-[3px] bg-green-500" />
                <span className="flex-1 text-[14px] text-green-600">{s}</span>
              </div>
            ))}
          </div>
          <div className="min-w-0 flex-1 rounded-[14px] border border-blue-200 bg-blue-50 p-[13px]">
            <p className="mb-2 text-[14px] font-bold text-[#1e40af]">발전 권장</p>
            {report.growthAreas.map((s, i) => (
              <div key={i} className="mb-[5px] flex items-center gap-[6px]">
                <span className="h-[5px] w-[5px] shrink-0 rounded-[3px] bg-blue-400" />
                <span className="flex-1 text-[14px] text-brand">{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 담임 총평 */}
        <div className="mx-5 mb-3 rounded-[14px] border border-gray-200 bg-white p-4">
          <p className="mb-2 text-[14px] font-bold uppercase tracking-[0.5px] text-gray-500">
            담임 강사 종합 총평
          </p>
          <p className="text-[15px] leading-[22px] text-gray-700">{report.overallComment}</p>
        </div>

        {/* 프로그램별 상세 */}
        <h2 className="mx-5 mb-1 text-[16px] font-bold text-gray-900">프로그램별 상세 평가</h2>
        <p className="mx-5 mb-[10px] text-[14px] text-gray-500">
          항목을 탭하면 역량 상세를 펼칩니다.
        </p>

        {report.programs.map((prog) => (
          <ProgramCard
            key={prog.programId}
            prog={prog}
            expanded={expandedProgram === prog.programId}
            onToggle={() => toggleProgram(prog.programId)}
          />
        ))}

        {/* 발급 정보 */}
        <div className="mx-5 mt-2 flex flex-col items-center">
          <p className="text-[14px] text-gray-500">
            발급일 {report.issueDate} · ThinkCampus 공식 리포트
          </p>
        </div>
      </div>
    </div>
  );
}

// ── 프로그램 카드 ──────────────────────────────────────────

function ProgramCard({
  prog,
  expanded,
  onToggle,
}: {
  prog: ProgramReport;
  expanded: boolean;
  onToggle: () => void;
}) {
  const gradeColor = getGradeColor(prog.grade);
  const gradeBg = getGradeBg(prog.grade);

  return (
    <div className="mx-5 mb-2 overflow-hidden rounded-[14px] border border-gray-200 bg-white">
      {/* 헤더 */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="tap flex w-full items-center gap-[10px] p-[14px] text-left"
      >
        <span className="text-[22px]">{prog.programIcon}</span>
        <span className="block min-w-0 flex-1">
          <span className="block text-[16px] font-bold text-gray-900">{prog.programName}</span>
          <span className="mt-px block text-[14px] text-gray-500">
            강사 {prog.instructorName} · 출석 {prog.attendance}%
          </span>
        </span>
        <span
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: gradeBg }}
        >
          <span className="text-[16px] font-black" style={{ color: gradeColor }}>
            {prog.grade}
          </span>
        </span>
        <span
          className="min-w-[28px] shrink-0 text-right text-[18px] font-extrabold"
          style={{ color: gradeColor }}
        >
          {prog.overallScore}
        </span>
        <span
          className={`ml-[2px] inline-block text-[22px] transition-transform duration-200 ${
            expanded ? "rotate-90 text-brand" : "text-gray-500"
          }`}
        >
          ›
        </span>
      </button>

      {/* 점수 바 + 성장 칩 */}
      <div className="flex items-center gap-[10px] px-[14px] pb-3">
        <div className="h-[5px] flex-1 overflow-hidden rounded-[3px] bg-gray-100">
          <div
            className="h-[5px] rounded-[3px]"
            style={{ width: `${prog.overallScore}%`, backgroundColor: gradeColor }}
          />
        </div>
        <div className="shrink-0 rounded-lg bg-green-50 px-[7px] py-[3px]">
          <span className="text-[14px] font-bold text-green-600">+{prog.growthIndex}↑</span>
        </div>
      </div>

      {/* 확장 영역 */}
      <Collapse open={expanded}>
        <div className="border-t border-gray-100 p-[14px]">
          {/* 성장 before/after */}
          <div className="mb-[14px] flex items-center gap-[10px]">
            <div className="flex flex-col items-center">
              <span className="mb-[2px] text-[14px] text-gray-500">캠프 전</span>
              <span className="text-[20px] font-extrabold text-gray-700">{prog.preScore}점</span>
            </div>
            <span className="text-[17px] text-gray-500">→</span>
            <div className="flex flex-col items-center">
              <span className="mb-[2px] text-[14px]" style={{ color: gradeColor }}>
                캠프 후
              </span>
              <span className="text-[20px] font-extrabold" style={{ color: gradeColor }}>
                {prog.postScore}점
              </span>
            </div>
            <div
              className="ml-auto rounded-[10px] px-[10px] py-[5px]"
              style={{ backgroundColor: gradeBg }}
            >
              <span className="text-[14px] font-bold" style={{ color: gradeColor }}>
                +{prog.growthIndex}점 향상
              </span>
            </div>
          </div>

          {/* 역량 항목 */}
          <p className="mb-[10px] text-[14px] font-bold uppercase tracking-[0.5px] text-gray-500">
            역량별 평가
          </p>
          {prog.competencies.map((c, i) => (
            <CompRow key={i} comp={c} color={gradeColor} />
          ))}

          {/* 강사 총평 */}
          <div className="mt-3 mb-2 rounded-[10px] bg-[#f8fafc] p-3">
            <p className="mb-[5px] text-[14px] font-bold text-gray-700">강사 총평</p>
            <p className="text-[15px] leading-[22px] text-gray-700">{prog.instructorComment}</p>
          </div>

          {/* 인상적이었던 점 */}
          {prog.highlights.length > 0 && (
            <div className="mb-2 rounded-[10px] border border-[#fde68a] bg-amber-50 p-3">
              <p className="mb-[7px] text-[14px] font-bold text-[#92400e]">인상적이었던 점</p>
              {prog.highlights.map((h, i) => (
                <div key={i} className="mb-1 flex gap-[5px]">
                  <span className="mt-[2px] text-[14px] text-[#f59e0b]">★</span>
                  <p className="flex-1 text-[14px] leading-[20px] text-[#78350f]">{h}</p>
                </div>
              ))}
            </div>
          )}

          {/* 향후 발전 방향 */}
          <div className="rounded-[10px] border border-blue-200 bg-blue-50 p-3">
            <p className="mb-[7px] text-[14px] font-bold text-[#1e40af]">향후 발전 방향</p>
            {prog.nextSteps.map((s, i) => (
              <div key={i} className="mb-[5px] flex items-start gap-2">
                <span className="mt-px flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-[9px] bg-brand">
                  <span className="text-[14px] font-bold text-white">{i + 1}</span>
                </span>
                <p className="flex-1 text-[14px] leading-[20px] text-[#1e40af]">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </Collapse>
    </div>
  );
}

function CompRow({ comp, color }: { comp: CompetencyScore; color: string }) {
  const diff = comp.score - comp.benchmark;
  return (
    <div className="mb-[10px]">
      <div className="mb-[3px]">
        <p className="text-[15px] font-semibold text-gray-700">{comp.label}</p>
        <p className="text-[14px] text-gray-500">{comp.description}</p>
      </div>
      <div className="flex items-center gap-[6px]">
        <div className="relative h-[7px] flex-1 overflow-hidden rounded-[4px] bg-gray-100">
          <div
            className="h-[7px] rounded-[4px]"
            style={{ width: `${comp.score}%`, backgroundColor: color }}
          />
          {/* 또래 평균선 */}
          <div
            className="absolute -top-px -bottom-px w-[2px] bg-[#f59e0b]"
            style={{ left: `${comp.benchmark}%` }}
          />
        </div>
        <span
          className="min-w-[24px] text-right text-[15px] font-extrabold"
          style={{ color }}
        >
          {comp.score}
        </span>
        <span
          className="min-w-[28px] text-[14px] font-semibold"
          style={{ color: diff >= 0 ? "#16a34a" : "#dc2626" }}
        >
          {diff >= 0 ? `+${diff}` : `${diff}`}
        </span>
      </div>
    </div>
  );
}
