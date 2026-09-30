"use client";

/**
 * 발주처 · 보고서 — 담당 공무원이 사업 보고서를 쓰는 데 필요한 자료를 한 번에
 *
 *   [양식 만들기]   제목 · 넣을 장(1~10) · 학생별 출결표 여부 → 아래 미리 보기가 바로 바뀐다
 *   [개요 정리하기] 장마다 핵심 숫자 한두 줄 → 복사해서 자기 보고서(한글 양식)에 붙여 넣는다
 *   내려받기        한글(HWPX) · 워드(DOCX) · PDF · 엑셀(XLSX) — 모두 브라우저에서 만든다 (서버에 파일을 남기지 않는다)
 *
 *   자료: api.partner.getReportData (실서비스: Callable getPartnerReportData)
 *   학생 이름은 운영 건 설정대로 가려지고, 후기는 공개 동의분만, 연락처 · 생년월일은 들어가지 않는다
 */

import { useMemo, useState } from "react";
import { Button, Card, Empty, ErrorBox, inputClass, Loading, PageTitle, SectionLabel } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { saveBlob } from "@/lib/download";
import { buildOutline, buildReportDoc, defaultReportOptions, REPORT_SECTIONS, reportFileName, type Block, type ReportOptions, type ReportSectionId } from "@/lib/partnerReport/model";
import { copyToClipboard } from "@/lib/share";
import { usePartnerRun } from "@/providers/PartnerRunProvider";
import { useToast } from "@/providers/ToastProvider";
import { useApi, useQuery, type PartnerReportData } from "@/services";

type Format = "hwpx" | "docx" | "pdf" | "xlsx";

const FORMATS: Array<{ id: Format; label: string; desc: string }> = [
  { id: "hwpx", label: "한글 (HWPX)", desc: "한컴오피스 한글 2014 이상" },
  { id: "docx", label: "워드 (DOCX)", desc: "MS Word · 한글에서도 열려요" },
  { id: "pdf", label: "PDF", desc: "결재 · 인쇄용" },
  { id: "xlsx", label: "엑셀 (XLSX)", desc: "표 자료 묶음 (시트별)" },
];

export default function PartnerReportsPage() {
  usePageTitle("보고서");
  const api = useApi();
  const { selectedRun } = usePartnerRun();
  const runId = selectedRun?.id ?? null;
  const { data, loading, error, refetch } = useQuery(() => (runId ? api.partner.getReportData(runId) : null), [api, runId]);

  if (!selectedRun) return <Loading />;
  if (loading && !data) return <Loading label="보고서 자료를 모으는 중..." />;
  if (error && !data) return <ErrorBox message={error} onRetry={() => void refetch()} />;
  if (!data) return <Empty title="자료를 불러오지 못했어요" />;
  return <ReportBuilder key={data.run.id} data={data} />;
}

function ReportBuilder({ data }: { data: PartnerReportData }) {
  const toast = useToast();
  const [opts, setOpts] = useState<ReportOptions>(() => defaultReportOptions(data));
  const [busy, setBusy] = useState<Format | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const doc = useMemo(() => buildReportDoc(data, opts), [data, opts]);
  const outline = useMemo(() => buildOutline(data, opts), [data, opts]);

  function toggle(id: ReportSectionId) {
    setOpts((o) => ({ ...o, sections: o.sections.includes(id) ? o.sections.filter((x) => x !== id) : REPORT_SECTIONS.map((s) => s.id).filter((x) => x === id || o.sections.includes(x)) }));
  }

  async function download(f: Format) {
    if (opts.sections.length === 0) {
      toast.show("넣을 장을 하나 이상 골라 주세요");
      return;
    }
    setBusy(f);
    try {
      if (f === "hwpx") {
        const { renderHwpx, loadHwpxHeader } = await import("@/lib/partnerReport/hwpx");
        const bytes = await renderHwpx(doc, await loadHwpxHeader());
        saveBlob(new Blob([bytes as BlobPart], { type: "application/hwp+zip" }), reportFileName(doc, "hwpx"));
      } else if (f === "docx") {
        const { renderDocx } = await import("@/lib/partnerReport/docx");
        saveBlob(await renderDocx(doc), reportFileName(doc, "docx"));
      } else if (f === "pdf") {
        const { renderPartnerReportPdf } = await import("@/lib/partnerReport/pdf");
        saveBlob(await renderPartnerReportPdf(doc), reportFileName(doc, "pdf"));
      } else {
        const { renderXlsx } = await import("@/lib/partnerReport/xlsx");
        saveBlob(await renderXlsx(data, opts), reportFileName(doc, "xlsx"));
      }
      toast.show("파일을 만들었어요");
    } catch (e) {
      toast.show((e as Error).message || "파일을 만들지 못했어요");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageTitle title="사업 보고서" desc="필요한 장을 고르면 한글 · 워드 · PDF · 엑셀로 바로 받을 수 있어요. 숫자는 오늘까지의 기록이에요." />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* ── 양식 만들기 ── */}
        <section aria-labelledby="form-title" className="lg:sticky lg:top-[128px] lg:max-h-[calc(100dvh-140px)] lg:self-start lg:overflow-y-auto">
          <Card>
            <h2 id="form-title" className="text-[18px] font-bold text-fg">
              양식 만들기
            </h2>
            <label htmlFor="rep-title" className="mt-4 block text-[15px] font-semibold text-fg2">
              보고서 제목
            </label>
            <input id="rep-title" value={opts.title} onChange={(e) => setOpts((o) => ({ ...o, title: e.target.value }))} maxLength={80} className={`${inputClass} mt-1`} />
            <p className="mt-4 text-[15px] font-semibold text-fg2">넣을 장</p>
            <ul className="mt-2 flex flex-col gap-1" data-testid="report-sections">
              {REPORT_SECTIONS.map((s) => {
                const disabled = s.id === "finalReports" && !data.finalReports;
                const on = opts.sections.includes(s.id) && !disabled;
                return (
                  <li key={s.id}>
                    <label className={`flex min-h-[48px] cursor-pointer items-start gap-3 rounded-[12px] px-2 py-2 ${disabled ? "opacity-50" : "hover:bg-elev"}`}>
                      <input type="checkbox" checked={on} disabled={disabled} onChange={() => toggle(s.id)} className="mt-[3px] h-5 w-5 shrink-0 accent-[#d4b06a]" />
                      <span>
                        <span className="block text-[16px] font-semibold text-fg">{s.label}</span>
                        <span className="block text-[14px] leading-[20px] text-sub">{disabled ? "아직 발급된 종합 리포트가 없어요" : s.desc}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <label className="mt-3 flex min-h-[48px] cursor-pointer items-start gap-3 rounded-[12px] border border-line px-3 py-3">
              <input
                type="checkbox"
                checked={opts.includeStudentTable}
                onChange={(e) => setOpts((o) => ({ ...o, includeStudentTable: e.target.checked }))}
                className="mt-[3px] h-5 w-5 shrink-0 accent-[#d4b06a]"
              />
              <span>
                <span className="block text-[15px] font-semibold text-fg">학생별 출결표 넣기</span>
                <span className="block text-[14px] leading-[20px] text-sub">
                  참여 현황에 학생 × 회차 표를 붙여요 ({data.participation.students.length}명{data.participation.masked ? " · 이름 일부 가림" : ""})
                </span>
              </span>
            </label>
          </Card>

          <Card className="mt-4">
            <h2 className="text-[18px] font-bold text-fg">내려받기</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => void download(f.id)}
                  disabled={!!busy}
                  className="tap flex min-h-[64px] flex-col items-start justify-center rounded-[14px] border border-gold-dim bg-gold-light px-4 py-2 text-left disabled:opacity-60"
                  data-testid={`report-download-${f.id}`}
                >
                  <span className="text-[16px] font-bold text-gold">{busy === f.id ? "만드는 중…" : f.label}</span>
                  <span className="text-[14px] text-sub">{f.desc}</span>
                </button>
              ))}
            </div>
            <Button variant="secondary" className="mt-3 w-full" onClick={() => setOutlineOpen((v) => !v)}>
              {outlineOpen ? "개요 닫기" : "개요 정리하기"}
            </Button>
            {outlineOpen && (
              <div className="mt-3" data-testid="report-outline">
                <p className="text-[14px] leading-[20px] text-sub">장마다 핵심 숫자만 모았어요. 기관 보고서 양식에 붙여 넣어 쓰세요.</p>
                <textarea readOnly value={outline} rows={14} className={`${inputClass} mt-2 resize-y font-mono text-[14px] leading-[21px]`} aria-label="보고서 개요" />
                <Button
                  className="mt-2 w-full"
                  onClick={async () => {
                    try {
                      await copyToClipboard(outline);
                      toast.show("개요를 복사했어요");
                    } catch {
                      toast.show("복사하지 못했어요. 글을 직접 선택해 주세요.");
                    }
                  }}
                >
                  개요 복사
                </Button>
              </div>
            )}
          </Card>
        </section>

        {/* ── 미리 보기 ── */}
        <section aria-labelledby="preview-title">
          <SectionLabel>
            <span id="preview-title">미리 보기</span>
          </SectionLabel>
          <div className="rounded-[18px] border border-line bg-card px-5 py-6 md:px-8" data-testid="report-preview">
            <h2 className="text-center text-[22px] font-extrabold leading-[30px] text-fg">{doc.title}</h2>
            <p className="mt-1 text-center text-[15px] text-sub">{doc.subtitle}</p>
            <p className="mb-4 text-center text-[14px] text-faint">{doc.preparedLine}</p>
            {doc.blocks.length === 0 ? <p className="text-center text-[15px] text-sub">넣을 장을 골라 주세요.</p> : doc.blocks.map((b, i) => <PreviewBlock key={i} b={b} />)}
          </div>
        </section>
      </div>
    </div>
  );
}

function PreviewTable({ head, rows, widths, firstColHead, align }: { head: string[] | null; rows: string[][]; widths: number[]; firstColHead?: boolean; align?: Array<"L" | "C" | "R"> }) {
  const total = widths.reduce((a, b) => a + b, 0) || 1;
  const cls = (a?: "L" | "C" | "R") => (a === "C" ? "text-center" : a === "R" ? "text-right" : "text-left");
  return (
    <div className="my-2 overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-[14px]">
        <colgroup>
          {widths.map((w, i) => (
            <col key={i} style={{ width: `${(w / total) * 100}%` }} />
          ))}
        </colgroup>
        {head && (
          <thead>
            <tr>
              {head.map((h, i) => (
                <th key={i} className="border border-line2 bg-elev px-2 py-[6px] text-center font-bold text-fg">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {widths.map((_, ci) => (
                <td key={ci} className={`whitespace-pre-line border border-line2 px-2 py-[6px] align-middle ${firstColHead && ci === 0 ? "bg-elev text-center font-bold text-fg" : `text-fg2 ${cls(align?.[ci])}`}`}>
                  {r[ci] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviewBlock({ b }: { b: Block }) {
  switch (b.t) {
    case "h1":
      return <h3 className="mt-6 text-[18px] font-extrabold text-fg">{b.text}</h3>;
    case "h2":
      return <h4 className="mt-4 text-[16px] font-bold text-fg">{b.text}</h4>;
    case "h3":
      return <h5 className="mt-3 text-[15px] font-bold text-fg2">{b.text}</h5>;
    case "p":
      return <p className={`mt-1 whitespace-pre-line leading-[24px] ${b.tone === "muted" ? "text-[14px] text-sub" : "text-[15px] text-fg2"}`}>{b.text}</p>;
    case "bullets":
      return (
        <ul className="mt-1 list-disc pl-5 text-[15px] leading-[23px] text-fg2">
          {b.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );
    case "table":
      return <PreviewTable head={b.head} rows={b.rows} widths={b.widths} align={b.align} />;
    case "kv":
      return <PreviewTable head={null} rows={b.rows} widths={[24, 76]} firstColHead />;
    case "pageBreak":
      return <hr className="my-4 border-line" />;
  }
}
