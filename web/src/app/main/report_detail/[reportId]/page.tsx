"use client";

/**
 * 리포트 상세 화면 (모바일 app/main/report_detail/[reportId].tsx)
 * - 종합 요약 (성향 분석 / 종합 등급 / 강점·발전 영역)
 * - 6개 프로그램별 상세 평가 (역량 점수 + 바 차트 + 강사 코멘트)
 * - PDF 다운로드 / 공유
 *
 * 웹: expo-print 대신 브라우저 인쇄 다이얼로그(printHtml)를 사용한다.
 *     "PDF 저장·공유" 와 "인쇄" 모두 인쇄 다이얼로그에서 "PDF로 저장" 가능.
 */

import { useState } from "react";
import { useParams } from "next/navigation";
import { useBack } from "@/hooks/useBack";
import { Collapse } from "@/components/ui/Collapse";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Spinner } from "@/components/ui/Spinner";
import {
  DUMMY_REPORT,
  getGradeColor,
  getGradeBg,
  type ProgramReport,
  type CompetencyScore,
} from "@/data/dummyReport";
import { usePageTitle } from "@/hooks/usePageTitle";
import { errMessage } from "@/lib/errors";
import { printHtml } from "@/lib/print";
import { useDialog } from "@/providers/DialogProvider";

// ── PDF HTML 생성 ──────────────────────────────────────────

function buildPdfHtml(report: typeof DUMMY_REPORT): string {
  const gradeColor: Record<string, string> = {
    S: '#7c3aed', A: '#1d4ed8', B: '#0369a1', C: '#6b7280',
  };

  const programRows = report.programs.map((p) => {
    const competencyRows = p.competencies.map((c) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;">${c.label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;background:#f3f4f6;border-radius:4px;height:8px;">
              <div style="width:${c.score}%;background:${gradeColor[p.grade]};height:8px;border-radius:4px;"></div>
            </div>
            <span style="font-weight:700;color:${gradeColor[p.grade]};min-width:30px;">${c.score}</span>
          </div>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:12px;">${c.benchmark} (또래평균)</td>
      </tr>`).join('');

    return `
      <div style="margin-bottom:32px;break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;">
          <span style="font-size:22px;">${p.programIcon}</span>
          <div>
            <div style="font-size:16px;font-weight:700;color:#111827;">${p.programName}</div>
            <div style="font-size:12px;color:#6b7280;">강사: ${p.instructorName} · 출석률 ${p.attendance}%</div>
          </div>
          <div style="margin-left:auto;display:flex;align-items:center;gap:8px;">
            <div style="background:${getGradeBg(p.grade)};border-radius:8px;padding:4px 12px;">
              <span style="font-weight:900;font-size:20px;color:${gradeColor[p.grade]};">${p.grade}</span>
            </div>
            <div style="font-size:22px;font-weight:700;color:${gradeColor[p.grade]};">${p.overallScore}점</div>
          </div>
        </div>
        <div style="margin-bottom:12px;">
          <div style="font-size:13px;color:#6b7280;margin-bottom:4px;">성장지수: 캠프 전 ${p.preScore}점 → 캠프 후 ${p.postScore}점 (+${p.growthIndex}점 향상)</div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">역량 항목</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">점수</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">비교</th>
            </tr>
          </thead>
          <tbody>${competencyRows}</tbody>
        </table>
        <div style="background:#f8fafc;border-radius:8px;padding:14px;margin-bottom:10px;">
          <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:6px;">강사 총평</div>
          <div style="font-size:13px;color:#374151;line-height:1.7;">${p.instructorComment}</div>
        </div>
        <div>
          <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:6px;">향후 발전 방향</div>
          ${p.nextSteps.map((s, i) => `<div style="font-size:13px;color:#6b7280;margin-bottom:4px;">${i + 1}. ${s}</div>`).join('')}
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #111827; background: #fff; }
  @media print { body { -webkit-print-color-adjust: exact; } }
</style>
</head>
<body style="padding:32px;max-width:800px;margin:0 auto;">

  <!-- 헤더 -->
  <div style="background:#1d4ed8;border-radius:16px;padding:28px 32px;margin-bottom:28px;color:#fff;">
    <div style="font-size:13px;color:#bfdbfe;margin-bottom:6px;">ThinkCampus 학습 리포트</div>
    <div style="font-size:28px;font-weight:900;margin-bottom:6px;">${report.studentName} 학생</div>
    <div style="font-size:14px;color:#bfdbfe;">${report.campusName} · ${report.campPeriod}</div>
    <div style="display:flex;align-items:center;gap:16px;margin-top:20px;">
      <div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:12px 24px;text-align:center;">
        <div style="font-size:36px;font-weight:900;">${report.totalGrade}</div>
        <div style="font-size:12px;color:#bfdbfe;margin-top:2px;">종합 등급</div>
      </div>
      <div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:12px 24px;text-align:center;">
        <div style="font-size:36px;font-weight:900;">${report.totalScore}</div>
        <div style="font-size:12px;color:#bfdbfe;margin-top:2px;">종합 점수</div>
      </div>
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:700;margin-bottom:4px;">${report.personalityType}</div>
        <div style="font-size:12px;color:#bfdbfe;line-height:1.6;">${report.personalityDesc.slice(0, 80)}...</div>
      </div>
    </div>
  </div>

  <!-- 강점 & 발전 영역 -->
  <div style="display:flex;gap:12px;margin-bottom:28px;">
    <div style="flex:1;background:#f0fdf4;border-radius:12px;padding:16px;border:1px solid #bbf7d0;">
      <div style="font-size:13px;font-weight:700;color:#166534;margin-bottom:10px;">강점 분야</div>
      ${report.strengthAreas.map((s) => `<div style="font-size:13px;color:#16a34a;margin-bottom:4px;">✓ ${s}</div>`).join('')}
    </div>
    <div style="flex:1;background:#eff6ff;border-radius:12px;padding:16px;border:1px solid #bfdbfe;">
      <div style="font-size:13px;font-weight:700;color:#1e40af;margin-bottom:10px;">발전 권장 영역</div>
      ${report.growthAreas.map((s) => `<div style="font-size:13px;color:#1d4ed8;margin-bottom:4px;">→ ${s}</div>`).join('')}
    </div>
  </div>

  <!-- 담임 총평 -->
  <div style="background:#fafafa;border-radius:12px;padding:18px;margin-bottom:32px;border:1px solid #e5e7eb;">
    <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:8px;">담임 강사 종합 총평</div>
    <div style="font-size:14px;color:#374151;line-height:1.8;">${report.overallComment}</div>
  </div>

  <!-- 프로그램별 상세 -->
  <div style="font-size:18px;font-weight:700;color:#111827;margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid #1d4ed8;">프로그램별 상세 평가</div>
  ${programRows}

  <!-- 발급 정보 -->
  <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:12px;">
    발급일: ${report.issueDate} · ThinkCampus · 본 리포트는 공식 발급 문서입니다.
  </div>
</body>
</html>`;
}

// ── 메인 컴포넌트 ──────────────────────────────────────────

export default function ReportDetailScreen() {
  usePageTitle("리포트 상세");
  const goBack = useBack("/main/report");
  const dialog = useDialog();
  const { reportId } = useParams<{ reportId: string }>();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);

  // TODO: reportId로 Firestore 조회 (현재는 더미)
  const report = DUMMY_REPORT;

  async function handleDownloadPdf() {
    setPdfLoading(true);
    try {
      // 브라우저 인쇄 다이얼로그 → "PDF로 저장" / 공유
      await printHtml(buildPdfHtml(report));
    } catch (e: unknown) {
      void dialog.alert("오류", "PDF 생성 중 오류가 발생했습니다.\n" + errMessage(e));
    } finally {
      setPdfLoading(false);
    }
  }

  async function handlePrint() {
    try {
      await printHtml(buildPdfHtml(report));
    } catch {
      void dialog.alert("오류", "인쇄 중 오류가 발생했습니다.");
    }
  }

  const gradeColor = getGradeColor(report.totalGrade);
  const gradeBg = getGradeBg(report.totalGrade);

  return (
    <div className="flex flex-1 flex-col bg-[#f8fafc] pb-10" data-report-id={reportId}>
      {/* ── 상단 네비 ── */}
      <div
        className="no-print flex items-center justify-between border-b border-gray-100 bg-white px-5 pb-3"
        style={{ paddingTop: "calc(var(--sat) + 12px)" }}
      >
        <button type="button" onClick={goBack} className="tap">
          <span className="text-[16px] font-medium text-brand">← 목록</span>
        </button>
        <div className="flex gap-2">
          {/* 웹에서는 인쇄가 동작하므로 항상 표시 */}
          <button
            type="button"
            onClick={() => void handlePrint()}
            className="tap rounded-lg border border-gray-200 px-[14px] py-2"
          >
            <span className="text-[15px] font-medium text-gray-700">인쇄</span>
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadPdf()}
            disabled={pdfLoading}
            className={`tap flex items-center justify-center rounded-lg border border-brand bg-brand px-[14px] py-2 ${
              pdfLoading ? "opacity-60" : ""
            }`}
          >
            {pdfLoading ? (
              <Spinner color="#fff" size="small" />
            ) : (
              <span className="text-[15px] font-bold text-white">PDF 저장·공유</span>
            )}
          </button>
        </div>
      </div>

      {/* ── 종합 헤더 카드 ── */}
      <div className="mx-5 mt-4 rounded-2xl border border-gray-200 bg-white p-[18px]">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-blue-100">
            <span className="text-[22px] font-bold text-brand">{report.studentName.charAt(0)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[18px] font-bold text-gray-900">{report.studentName} 학생</p>
            <p className="mt-px text-[14px] text-gray-500">{report.campusName}</p>
            <p className="mt-px text-[14px] text-gray-500">{report.campPeriod}</p>
          </div>
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px]"
            style={{ backgroundColor: gradeBg }}
          >
            <span className="text-[26px] font-black" style={{ color: gradeColor }}>
              {report.totalGrade}
            </span>
          </div>
        </div>

        {/* 종합 점수 */}
        <div className="mb-[6px] flex justify-between">
          <span className="text-[15px] font-medium text-gray-500">종합 점수</span>
          <span className="text-[16px] font-bold" style={{ color: gradeColor }}>
            {report.totalScore}점
          </span>
        </div>
        <ProgressBar
          value={report.totalScore / 100}
          height={8}
          color={gradeColor}
          track="#f3f4f6"
          className="mb-4"
        />

        {/* 성향 유형 */}
        <div className="rounded-[10px] border border-gray-200 bg-[#f8fafc] p-[14px]">
          <p className="mb-[6px] text-[16px] font-bold text-gray-900">{report.personalityType}</p>
          <p className="text-[15px] leading-[22px] text-gray-700">{report.personalityDesc}</p>
        </div>
      </div>

      {/* ── 강점 / 발전 영역 ── */}
      <div className="mx-5 mt-3 flex gap-[10px]">
        <div className="min-w-0 flex-1 rounded-[14px] border border-green-200 bg-green-50 p-[14px]">
          <p className="mb-[10px] text-[14px] font-bold text-[#166534]">강점 분야</p>
          {report.strengthAreas.map((s, i) => (
            <div key={i} className="mb-[6px] flex items-center gap-[6px]">
              <span className="h-[6px] w-[6px] shrink-0 rounded-[3px] bg-green-500" />
              <span className="flex-1 text-[14px] text-green-600">{s}</span>
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1 rounded-[14px] border border-blue-200 bg-blue-50 p-[14px]">
          <p className="mb-[10px] text-[14px] font-bold text-[#1e40af]">발전 권장</p>
          {report.growthAreas.map((s, i) => (
            <div key={i} className="mb-[6px] flex items-center gap-[6px]">
              <span className="h-[6px] w-[6px] shrink-0 rounded-[3px] bg-blue-400" />
              <span className="flex-1 text-[14px] text-brand">{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 담임 총평 ── */}
      <div className="mx-5 mt-3 rounded-[14px] border border-gray-200 bg-white p-4">
        <p className="mb-[10px] text-[14px] font-bold uppercase tracking-[0.5px] text-gray-500">
          담임 강사 종합 총평
        </p>
        <p className="text-[16px] leading-[25px] text-gray-700">{report.overallComment}</p>
      </div>

      {/* ── 프로그램별 상세 ── */}
      <h2 className="mx-5 mt-6 mb-[10px] text-[16px] font-bold text-gray-900">
        프로그램별 상세 평가
      </h2>

      {report.programs.map((prog) => (
        <ProgramCard
          key={prog.programId}
          prog={prog}
          expanded={expandedProgram === prog.programId}
          onToggle={() =>
            setExpandedProgram((prev) => (prev === prog.programId ? null : prog.programId))
          }
        />
      ))}
    </div>
  );
}

// ── 프로그램 카드 컴포넌트 ────────────────────────────────

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
    <div className="mx-5 mb-[10px] overflow-hidden rounded-[14px] border border-gray-200 bg-white">
      {/* 헤더 (항상 표시) */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="tap flex w-full items-center gap-[10px] p-[14px] text-left"
      >
        <span className="text-[24px]">{prog.programIcon}</span>
        <span className="block min-w-0 flex-1">
          <span className="block text-[16px] font-bold text-gray-900">{prog.programName}</span>
          <span className="mt-[2px] block text-[14px] text-gray-500">
            강사 {prog.instructorName} · 출석 {prog.attendance}%
          </span>
        </span>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: gradeBg }}
        >
          <span className="text-[17px] font-black" style={{ color: gradeColor }}>
            {prog.grade}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className="text-[20px] font-extrabold" style={{ color: gradeColor }}>
            {prog.overallScore}
          </span>
        </span>
        <span
          className={`inline-block text-[22px] ${expanded ? "rotate-90 text-brand" : "rotate-0 text-gray-500"}`}
        >
          ›
        </span>
      </button>

      {/* 점수 바 (항상 표시) */}
      <div className="flex items-center gap-[10px] px-[14px] pb-3">
        <ProgressBar
          value={prog.overallScore / 100}
          height={6}
          color={gradeColor}
          track="#f3f4f6"
          className="flex-1"
        />
        <div className="shrink-0 rounded-[10px] bg-green-50 px-2 py-[3px]">
          <span className="text-[14px] font-bold text-green-600">+{prog.growthIndex}↑ 성장</span>
        </div>
      </div>

      {/* 확장 영역 */}
      <Collapse open={expanded}>
        <div className="border-t border-gray-100 p-[14px]">
          {/* 성장 지수 */}
          <div className="mb-4 flex h-20 items-center">
            <GrowthBar label="캠프 전" score={prog.preScore} color="#9ca3af" />
            <div className="px-3">
              <span className="text-[20px] text-gray-500">→</span>
            </div>
            <GrowthBar label="캠프 후" score={prog.postScore} color={gradeColor} />
          </div>

          {/* 역량별 점수 */}
          <p className="mb-[10px] text-[14px] font-bold uppercase tracking-[0.5px] text-gray-500">
            역량별 평가
          </p>
          {prog.competencies.map((c, i) => (
            <CompetencyRow key={i} comp={c} gradeColor={gradeColor} />
          ))}

          {/* 강사 총평 */}
          <div className="mt-[14px] mb-[10px] rounded-[10px] bg-[#f8fafc] p-3">
            <p className="mb-[6px] text-[14px] font-bold text-gray-700">강사 총평</p>
            <p className="text-[15px] leading-[22px] text-gray-700">{prog.instructorComment}</p>
          </div>

          {/* 인상적이었던 점 */}
          {prog.highlights.length > 0 && (
            <div className="mb-[10px] rounded-[10px] border border-[#fde68a] bg-amber-50 p-3">
              <p className="mb-2 text-[14px] font-bold text-[#92400e]">인상적이었던 점</p>
              {prog.highlights.map((h, i) => (
                <div key={i} className="mb-[5px] flex gap-[6px]">
                  <span className="text-[14px] text-[#f59e0b]">★</span>
                  <p className="flex-1 text-[15px] leading-[21px] text-[#78350f]">{h}</p>
                </div>
              ))}
            </div>
          )}

          {/* 향후 발전 방향 */}
          <div className="rounded-[10px] border border-blue-200 bg-blue-50 p-3">
            <p className="mb-2 text-[14px] font-bold text-[#1e40af]">향후 발전 방향</p>
            {prog.nextSteps.map((s, i) => (
              <div key={i} className="mb-[6px] flex items-start gap-2">
                <div className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[9px] bg-brand">
                  <span className="text-[14px] font-bold text-white">{i + 1}</span>
                </div>
                <p className="flex-1 text-[15px] leading-[21px] text-[#1e40af]">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </Collapse>
    </div>
  );
}

function GrowthBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex flex-1 flex-col items-center">
      {/* 줄 높이는 RN 기본값(11→13, 16→19)에 맞춰 growthRow 높이 80 안에 들어가도록 지정 */}
      <p className="mb-1 text-[14px] leading-[18px] text-gray-500">{label}</p>
      <p className="mb-1 text-[17px] font-extrabold leading-[22px]" style={{ color }}>
        {score}점
      </p>
      <div className="flex h-10 w-[70%] flex-col justify-end overflow-hidden rounded bg-gray-100">
        <div className="w-full rounded" style={{ height: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function CompetencyRow({ comp, gradeColor }: { comp: CompetencyScore; gradeColor: string }) {
  const diff = comp.score - comp.benchmark;
  return (
    <div className="mb-3">
      <div className="mb-1">
        <p className="text-[15px] font-semibold text-gray-700">{comp.label}</p>
        <p className="text-[14px] text-gray-500">{comp.description}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative h-2 flex-1 overflow-visible rounded bg-gray-100">
          {/* 또래 평균 */}
          <div
            className="absolute -top-[2px] -bottom-[2px] z-[1] w-[2px] bg-[#f59e0b]"
            style={{ left: `${comp.benchmark}%` }}
          />
          {/* 점수 바 */}
          <div
            className="h-2 rounded"
            style={{ width: `${comp.score}%`, backgroundColor: gradeColor }}
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="min-w-[28px] text-[16px] font-extrabold" style={{ color: gradeColor }}>
            {comp.score}
          </span>
          <span
            className="text-[14px] font-semibold"
            style={{ color: diff >= 0 ? "#16a34a" : "#dc2626" }}
          >
            {diff >= 0 ? `+${diff}` : diff}
          </span>
        </div>
      </div>
    </div>
  );
}
