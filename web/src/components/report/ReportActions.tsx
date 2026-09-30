"use client";

/**
 * 종합 리포트 버튼 줄 — [리포트 공유] [PDF 저장]
 *   공유: 공유 링크를 만들고 시트에 보여 준다 (링크 복사 · 카카오톡/문자 공유 · 만료일)
 *   PDF : 브라우저에서 PDF 파일을 만들어 저장한다. 파일 공유가 되는 기기(휴대폰)에서는 바로 보내기도 고른다
 *   샘플 리포트는 PDF 만 된다 (공유 링크는 실제 리포트가 발급된 뒤에)
 */

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Spinner } from "@/components/ui/Spinner";
import type { StudentReport } from "@/data/dummyReport";
import { copyToClipboard, shareText } from "@/lib/share";
import { useDialog } from "@/providers/DialogProvider";
import { useToast } from "@/providers/ToastProvider";
import type { ShareLink } from "@/services";

const btn = "tap inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl text-[16px] font-bold disabled:opacity-60";

function fmtExpires(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ReportActions({
  report,
  sample = false,
  createShareLink,
}: {
  report: StudentReport;
  sample?: boolean;
  /** 없으면 공유 버튼을 숨긴다 (공개 페이지) */
  createShareLink?: () => Promise<ShareLink>;
}) {
  const toast = useToast();
  const dialog = useDialog();
  const [shareBusy, setShareBusy] = useState(false);
  const [link, setLink] = useState<ShareLink | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfChoice, setPdfChoice] = useState<{ blob: Blob; fileName: string } | null>(null);

  const shareTitle = `${report.studentName} 학생 종합 리포트`;

  async function onShare() {
    if (!createShareLink) return;
    if (sample) {
      void dialog.alert("샘플 리포트", "실제 리포트가 발급되면 공유 링크를 만들 수 있어요. 지금은 PDF 로 저장해 볼 수 있어요.");
      return;
    }
    setShareBusy(true);
    try {
      setLink(await createShareLink());
    } catch {
      void dialog.alert("오류", "공유 링크를 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setShareBusy(false);
    }
  }

  async function onCopy() {
    if (!link) return;
    try {
      await copyToClipboard(link.url);
      toast.show("링크를 복사했어요");
    } catch {
      toast.show("복사하지 못했어요. 링크를 길게 눌러 복사해 주세요.", { durationMs: 3500 });
    }
  }

  async function onSystemShare() {
    if (!link) return;
    const r = await shareText({ title: shareTitle, message: `${shareTitle} — ThinkCampus`, url: link.url });
    if (r === "copied") toast.show("공유 시트가 없어 링크를 복사했어요");
    else if (r === "blocked") toast.show("링크 복사 버튼을 눌러 주세요");
    else if (r === "shared") setLink(null);
  }

  async function onPdf() {
    setPdfBusy(true);
    try {
      const m = await import("@/lib/reportPdf");
      const blob = await m.renderReportPdfBlob(report, sample);
      const fileName = m.reportPdfFileName(report, sample);
      if (m.canSharePdfFile()) {
        setPdfChoice({ blob, fileName });
      } else {
        m.saveBlob(blob, fileName);
        toast.show("PDF 를 저장했어요");
      }
    } catch {
      void dialog.alert("오류", "PDF 를 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function onPdfSave() {
    if (!pdfChoice) return;
    const m = await import("@/lib/reportPdf");
    m.saveBlob(pdfChoice.blob, pdfChoice.fileName);
    setPdfChoice(null);
    toast.show("PDF 를 저장했어요");
  }

  async function onPdfSend() {
    if (!pdfChoice) return;
    const m = await import("@/lib/reportPdf");
    try {
      const r = await m.sharePdfFile(pdfChoice.blob, pdfChoice.fileName, shareTitle);
      if (r === "shared") setPdfChoice(null);
    } catch {
      toast.show("보내지 못했어요. 파일로 저장한 뒤 보내 주세요.", { durationMs: 3500 });
    }
  }

  return (
    <>
      <div className="no-print flex gap-2" data-testid="report-actions">
        {createShareLink && (
          <button type="button" onClick={() => void onShare()} disabled={shareBusy} aria-busy={shareBusy} className={`${btn} bg-brand text-ink`} data-testid="report-share">
            {shareBusy ? <Spinner color="#0c0e13" size="small" /> : "리포트 공유"}
          </button>
        )}
        <button type="button" onClick={() => void onPdf()} disabled={pdfBusy} aria-busy={pdfBusy} className={`${btn} border border-line2 bg-elev text-fg`} data-testid="report-pdf">
          {pdfBusy ? (
            <>
              <Spinner size="small" />
              <span className="text-[15px] text-fg2">PDF 만드는 중</span>
            </>
          ) : (
            "PDF 저장"
          )}
        </button>
      </div>

      {/* 공유 링크 시트 */}
      <BottomSheet open={!!link} onClose={() => setLink(null)} title="리포트 공유 링크">
        {link && (
          <div className="flex flex-col gap-3 pb-1" data-testid="share-sheet">
            <p className="text-[15px] leading-[22px] text-fg2">링크를 받은 분은 로그인 없이 리포트를 보고 PDF 로 저장할 수 있어요.</p>
            <p className="rounded-xl border border-line bg-card2 px-4 py-3 text-[14px] leading-[21px] text-fg [overflow-wrap:anywhere] select-all" data-testid="share-url">
              {link.url}
            </p>
            {fmtExpires(link.expiresAt) && <p className="text-[14px] text-sub">이 링크는 {fmtExpires(link.expiresAt)}까지 열려요. 그 뒤에는 다시 만들면 돼요.</p>}
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => void onCopy()} className={`${btn} border border-line2 bg-elev text-fg`} data-testid="share-copy">
                링크 복사
              </button>
              <button type="button" onClick={() => void onSystemShare()} className={`${btn} bg-brand text-ink`}>
                카카오톡·문자로 보내기
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* PDF 저장 / 보내기 선택 (파일 공유가 되는 기기) */}
      <BottomSheet open={!!pdfChoice} onClose={() => setPdfChoice(null)} title="PDF 가 준비됐어요">
        {pdfChoice && (
          <div className="flex flex-col gap-3 pb-1">
            <p className="text-[15px] leading-[22px] text-fg2">{pdfChoice.fileName}</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => void onPdfSave()} className={`${btn} border border-line2 bg-elev text-fg`}>
                파일로 저장
              </button>
              <button type="button" onClick={() => void onPdfSend()} className={`${btn} bg-brand text-ink`}>
                카카오톡·문자로 보내기
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
