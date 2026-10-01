"use client";

/**
 * 회차 리포트 검수 목록 — 센터(검수 대기 → 공개/승인 요청/반려)와 회사(승인 대기 → 공개/반려)가 같이 쓴다
 *   회차(날짜 · 반)별로 묶고, 묶음 단위로 한 번에 처리할 수 있다. 행을 누르면 내용을 본다.
 */

import { useMemo, useState } from "react";
import { Badge, Button, Empty, fmtDate, inputClass, type ChipTone } from "@/components/staff/ui";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { getParticipationLabel } from "@/data/dummyAttendance";
import { useToast } from "@/providers/ToastProvider";
import { SESSION_REPORT_STATUS_LABEL, useMutation, type ReportReviewAction, type SessionReportRow, type SessionReportStatus } from "@/services";

export const REPORT_STATUS_TONE: Record<SessionReportStatus, ChipTone> = {
  draft: "dim",
  submitted: "late",
  reviewed: "gold",
  published: "gold",
};

const ATT_LABEL = { present: "출석", late: "지각", absent: "결석" } as const;

interface Group {
  key: string;
  runSessionId: string;
  scheduledDate: string;
  sessionNumber: number;
  sectionLabel: string;
  topic: string;
  instructorName: string;
  rows: SessionReportRow[];
}

export function ReportReviewList({
  rows,
  mode,
  requireCompanyApproval,
  onReview,
}: {
  rows: SessionReportRow[];
  mode: "center" | "company";
  /** 운영 건별 회사 승인 정책 (programRunId → boolean) */
  requireCompanyApproval: (programRunId: string) => boolean;
  onReview: (ids: string[], action: ReportReviewAction, note?: string) => Promise<void>;
}) {
  const toast = useToast();
  const review = useMutation(onReview);
  const [detail, setDetail] = useState<SessionReportRow | null>(null);
  const [returning, setReturning] = useState<{ ids: string[]; label: string } | null>(null);
  const [note, setNote] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const r of rows) {
      const g = map.get(r.runSessionId) ?? {
        key: r.runSessionId,
        runSessionId: r.runSessionId,
        scheduledDate: r.scheduledDate,
        sessionNumber: r.sessionNumber,
        sectionLabel: r.sectionLabel,
        topic: r.topic,
        instructorName: r.instructorName,
        rows: [],
      };
      g.rows.push(r);
      map.set(r.runSessionId, g);
    }
    return [...map.values()].sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate) || a.sectionLabel.localeCompare(b.sectionLabel, "ko"));
  }, [rows]);

  /** 이 행에 지금 할 수 있는 다음 단계 */
  function nextAction(r: SessionReportRow): { action: ReportReviewAction; label: string } | null {
    if (mode === "center") {
      if (r.status !== "submitted") return null;
      return requireCompanyApproval(r.programRunId) ? { action: "approve", label: "승인 요청" } : { action: "publish", label: "학부모 공개" };
    }
    if (r.status !== "reviewed") return null;
    return { action: "publish", label: "학부모 공개" };
  }

  async function run(ids: string[], action: ReportReviewAction, key: string, noteText?: string) {
    setBusyKey(key);
    try {
      await review.run(ids, action, noteText);
      toast.show(action === "return" ? "강사에게 돌려보냈어요" : action === "approve" ? "회사 승인을 요청했어요" : "학부모에게 공개했어요");
      setDetail(null);
      setReturning(null);
      setNote("");
    } catch (e) {
      toast.show((e as Error).message || "처리하지 못했어요");
    } finally {
      setBusyKey(null);
    }
  }

  if (rows.length === 0) return <Empty title="해당하는 리포트가 없어요" />;

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => {
        const actionable = g.rows.filter((r) => nextAction(r));
        const sameStatus = g.rows.every((r) => r.status === g.rows[0]?.status);
        const first = actionable[0] ? nextAction(actionable[0]) : null;
        return (
          <section key={g.key} aria-label={`${g.sessionNumber}회차 ${g.sectionLabel}`} className="rounded-[18px] border border-line bg-card p-3">
            <div className="flex items-start justify-between gap-2 px-1">
              <div className="min-w-0">
                <p className="text-[16px] font-bold text-fg">
                  {fmtDate(g.scheduledDate)} · {g.sessionNumber}회차 {g.sectionLabel}
                </p>
                <p className="mt-[2px] truncate text-[14px] text-sub">
                  {g.topic} · {g.instructorName}
                </p>
              </div>
              <span className="shrink-0 text-[14px] text-sub">{g.rows.length}명</span>
            </div>

            {first && actionable.length > 1 && (
              <div className="mt-2 flex gap-2 px-1">
                <Button onClick={() => void run(actionable.map((r) => r.id), first.action, g.key)} loading={busyKey === g.key} className="flex-1">
                  {actionable.length}명 모두 {first.label}
                </Button>
                <Button variant="danger" onClick={() => setReturning({ ids: actionable.map((r) => r.id), label: `${g.sectionLabel} ${actionable.length}명` })}>
                  모두 반려
                </Button>
              </div>
            )}

            <ul className="mt-2 flex flex-col gap-1">
              {g.rows.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setDetail(r)}
                    className="tap flex w-full items-center gap-3 rounded-[12px] px-2 py-2 text-left hover:bg-elev"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[16px] font-bold text-fg">{r.studentName}</span>
                        {r.attendanceStatus && (
                          <span className={`text-[14px] ${r.attendanceStatus === "absent" ? "text-danger" : r.attendanceStatus === "late" ? "text-late" : "text-sub"}`}>
                            {ATT_LABEL[r.attendanceStatus]}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-[14px] text-sub">{r.feedback || (r.attendanceStatus === "absent" ? "결석 — 피드백 없음" : "피드백 없음")}</span>
                    </span>
                    {!sameStatus && <Badge tone={REPORT_STATUS_TONE[r.status]}>{SESSION_REPORT_STATUS_LABEL[r.status]}</Badge>}
                    <span aria-hidden="true" className="shrink-0 text-[20px] leading-none text-faint">
                      ›
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {/* 상세 */}
      <BottomSheet open={!!detail} onClose={() => setDetail(null)} title={detail ? `${detail.studentName} · ${detail.sessionNumber}회차` : undefined}>
        {detail && (
          <div className="flex flex-col gap-3 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={REPORT_STATUS_TONE[detail.status]}>{SESSION_REPORT_STATUS_LABEL[detail.status]}</Badge>
              {detail.attendanceStatus && <Badge tone={detail.attendanceStatus === "absent" ? "danger" : detail.attendanceStatus === "late" ? "late" : "neutral"}>{ATT_LABEL[detail.attendanceStatus]}</Badge>}
              <span className="text-[14px] text-sub">
                {detail.sectionLabel} · {detail.instructorName}
              </span>
            </div>
            {detail.returnNote && <p className="rounded-lg bg-danger-bg px-3 py-2 text-[14px] text-danger">반려 사유: {detail.returnNote}</p>}
            {detail.participationScore != null && (
              <p className="text-[15px] text-fg2">
                참여도 <b className="text-fg">{getParticipationLabel(detail.participationScore)}</b> · {detail.participationScore}점
                {detail.homeworkDone != null ? ` · 과제 ${detail.homeworkDone ? "제출" : "미제출"}` : ""}
              </p>
            )}
            <p className="rounded-[14px] bg-elev px-4 py-3 text-[16px] leading-[24px] text-fg">{detail.feedback || "피드백 없음"}</p>
            {detail.highlights.length > 0 && (
              <div>
                <p className="text-[14px] font-bold text-gold">잘한 점</p>
                <ul className="mt-1 list-disc pl-5 text-[15px] leading-[22px] text-fg2">
                  {detail.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
            {detail.improvements.length > 0 && (
              <div>
                <p className="text-[14px] font-bold text-sub">다음엔 이렇게</p>
                <ul className="mt-1 list-disc pl-5 text-[15px] leading-[22px] text-fg2">
                  {detail.improvements.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
            {nextAction(detail) && (
              <div className="mt-2 grid grid-cols-[2fr_1fr] gap-2">
                <Button size="lg" onClick={() => void run([detail.id], nextAction(detail)!.action, detail.id)} loading={busyKey === detail.id}>
                  {nextAction(detail)!.label}
                </Button>
                <Button size="lg" variant="danger" onClick={() => setReturning({ ids: [detail.id], label: detail.studentName })}>
                  반려
                </Button>
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* 반려 사유 */}
      <BottomSheet open={!!returning} onClose={() => setReturning(null)} title="강사에게 돌려보내기">
        {returning && (
          <div className="flex flex-col gap-3 pb-2">
            <p className="text-[15px] text-sub">{returning.label}의 리포트를 작성 중 상태로 되돌리고, 아래 사유를 강사에게 보여 줘요.</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="예: 잘한 점을 한 가지 더 적어 주세요." className={inputClass} aria-label="반려 사유" />
            <Button size="lg" variant="danger" onClick={() => void run(returning.ids, "return", "return", note)} loading={busyKey === "return"}>
              반려하기
            </Button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
