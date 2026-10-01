"use client";

/**
 * 강사 · 회차 리포트 작성 — 학생 목록에서 한 명씩 펼쳐 쓴다
 *   펼치면: 참여도 · 과제 · 한마디 · 잘한 점 · 다음엔 이렇게 → [다음 학생]
 *   입력을 멈추면 자동 저장(임시), 아래 [센터 검수 요청] 으로 제출
 *   결석 학생은 피드백 없이 제출된다. 센터가 반려하면 사유가 보이고 다시 고칠 수 있다.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Photo } from "@/components/staff/Photo";
import { Badge, Button, inputClass } from "@/components/staff/ui";
import { REPORT_STATUS_TONE } from "@/components/staff/ReportReview";
import { useToast } from "@/providers/ToastProvider";
import { SESSION_REPORT_STATUS_LABEL, useMutation, type InstructorRosterEntry, type SaveReportDraftInput } from "@/services";

const SCORE_CHIPS = [
  { label: "매우 적극적", score: 95 },
  { label: "적극적", score: 82 },
  { label: "보통", score: 65 },
  { label: "소극적", score: 45 },
];

interface Draft {
  participationScore: number | null;
  homeworkDone: boolean | null;
  feedback: string;
  highlights: string;
  improvements: string;
}

function toDraft(e: InstructorRosterEntry): Draft {
  return {
    participationScore: e.report.participationScore,
    homeworkDone: e.report.homeworkDone,
    feedback: e.report.feedback,
    highlights: e.report.highlights.join("\n"),
    improvements: e.report.improvements.join("\n"),
  };
}

function toInput(runSessionId: string, studentId: string, d: Draft): SaveReportDraftInput {
  const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
  return {
    runSessionId,
    studentId,
    participationScore: d.participationScore,
    homeworkDone: d.homeworkDone,
    feedback: d.feedback,
    highlights: lines(d.highlights),
    improvements: lines(d.improvements),
  };
}

export function ReportEditor({
  runSessionId,
  roster,
  onSave,
  onSubmit,
}: {
  runSessionId: string;
  roster: InstructorRosterEntry[];
  onSave: (inputs: SaveReportDraftInput[]) => Promise<void>;
  onSubmit: () => Promise<{ submitted: number }>;
}) {
  const toast = useToast();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const draftsRef = useRef(drafts);
  useEffect(() => {
    draftsRef.current = drafts;
  });
  const dirty = useRef(new Set<string>());
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const save = useMutation(onSave);
  const submit = useMutation(onSubmit);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, Draft> = {};
      for (const e of roster) next[e.studentId] = dirty.current.has(e.studentId) && prev[e.studentId] ? prev[e.studentId] : toDraft(e);
      return next;
    });
  }, [roster]);

  const editable = useMemo(() => new Set(roster.filter((e) => e.report.status === "draft" && e.attendance).map((e) => e.studentId)), [roster]);
  const attended = roster.filter((e) => e.attendance);
  const draftCount = roster.filter((e) => e.report.status === "draft" && e.attendance).length;
  const needFeedback = roster.filter((e) => e.report.status === "draft" && e.attendance && e.attendance !== "absent" && !(drafts[e.studentId]?.feedback ?? "").trim());

  function flush(studentId: string) {
    const d = draftsRef.current[studentId];
    if (!d) return;
    dirty.current.delete(studentId);
    void save
      .run([toInput(runSessionId, studentId, d)])
      .then(() => setSavedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })))
      .catch((e: Error) => toast.show(e.message || "저장하지 못했어요"));
  }

  function update(studentId: string, patch: Partial<Draft>, immediate = false) {
    if (!editable.has(studentId)) return;
    setDrafts((m) => ({ ...m, [studentId]: { ...m[studentId], ...patch } }));
    dirty.current.add(studentId);
    clearTimeout(timers.current[studentId]);
    timers.current[studentId] = setTimeout(() => flush(studentId), immediate ? 0 : 800);
  }

  useEffect(() => {
    const t = timers.current;
    return () => Object.values(t).forEach(clearTimeout);
  }, []);

  async function handleSubmit() {
    // 아직 저장 안 된 변경을 먼저 저장
    const pending = [...dirty.current].map((id) => toInput(runSessionId, id, drafts[id])).filter(Boolean);
    try {
      if (pending.length > 0) {
        await save.run(pending);
        dirty.current.clear();
      }
      const r = await submit.run();
      toast.show(`${r.submitted}명 리포트를 센터 검수로 보냈어요`);
    } catch (e) {
      toast.show((e as Error).message || "제출하지 못했어요");
    }
  }

  const writable = attended.filter((e) => editable.has(e.studentId) && e.attendance !== "absent");
  const hasFeedback = (id: string) => !!(drafts[id]?.feedback ?? "").trim();
  // 처음에는 한마디가 비어 있는 첫 학생을 펼쳐 둔다
  const firstEmpty = writable.find((e) => !hasFeedback(e.studentId))?.studentId ?? null;
  const open = openId === undefined ? firstEmpty : openId;

  function goNext(currentId: string) {
    if (dirty.current.has(currentId)) flush(currentId);
    const idx = writable.findIndex((e) => e.studentId === currentId);
    const after = [...writable.slice(idx + 1), ...writable.slice(0, idx)];
    const target = after.find((e) => !hasFeedback(e.studentId)) ?? null;
    setOpenId(target?.studentId ?? null);
    if (target) setTimeout(() => document.getElementById(`report-${target.studentId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  if (attended.length === 0) {
    return <p className="rounded-[16px] border border-dashed border-line2 bg-card2 px-5 py-8 text-center text-[16px] text-sub">출결을 먼저 입력하면 학생별 리포트를 쓸 수 있어요.</p>;
  }

  const writtenCount = writable.filter((e) => hasFeedback(e.studentId)).length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-[14px] text-sub">
        <span>
          {writable.length > 0 ? `한마디 ${writtenCount}/${writable.length}명 작성` : `제출 ${roster.filter((e) => e.report.status !== "draft").length}명`}
        </span>
        <span>{save.pending ? "저장 중..." : savedAt ? `${savedAt} 저장됨` : "입력하면 자동 저장"}</span>
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-card">
        {attended.map((e) => {
          const d = drafts[e.studentId] ?? toDraft(e);
          const canEdit = editable.has(e.studentId);
          const absent = e.attendance === "absent";
          const isOpen = open === e.studentId && !absent;
          const written = !!d.feedback.trim();
          const state = !canEdit ? (
            <Badge tone={REPORT_STATUS_TONE[e.report.status]}>{SESSION_REPORT_STATUS_LABEL[e.report.status]}</Badge>
          ) : absent ? (
            <span className="text-[14px] text-sub">결석</span>
          ) : written ? (
            <span className="text-[14px] font-bold text-gold">작성함</span>
          ) : (
            <span className="text-[14px] font-bold text-late">작성 전</span>
          );
          return (
            <li key={e.studentId} id={`report-${e.studentId}`} className={isOpen ? "bg-card" : ""} data-testid="report-student">
              <button
                type="button"
                onClick={() => !absent && setOpenId(isOpen ? null : e.studentId)}
                aria-expanded={absent ? undefined : isOpen}
                className={`tap flex w-full items-center gap-3 px-4 py-3 text-left ${absent ? "cursor-default" : "hover:bg-elev"}`}
              >
                <Photo id={e.studentId} name={e.name} photoUrl={e.photoUrl} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-bold text-fg">{e.name}</span>
                  <span className="block text-[14px] text-sub">{absent ? "피드백 없이 제출돼요" : e.attendance === "late" ? `지각 ${e.lateMinutes ?? 0}분` : "출석"}</span>
                </span>
                {state}
                {!absent && (
                  <span aria-hidden="true" className={`text-[20px] leading-none text-faint transition-transform ${isOpen ? "rotate-90" : ""}`}>
                    ›
                  </span>
                )}
              </button>
              {e.report.returnNote && <p className="mx-4 mb-3 rounded-lg bg-danger-bg px-3 py-2 text-[14px] text-danger">센터 반려: {e.report.returnNote}</p>}

              {isOpen && (
                <div className="flex flex-col gap-4 border-t border-line px-4 pb-4 pt-4">
                  <div>
                    <p className="mb-1 text-[14px] font-semibold text-fg2">참여도</p>
                    <div role="group" aria-label={`${e.name} 참여도`} className="grid grid-cols-4 gap-1">
                      {SCORE_CHIPS.map((c) => {
                        const on = d.participationScore != null && Math.abs(d.participationScore - c.score) < 9;
                        return (
                          <button
                            key={c.score}
                            type="button"
                            aria-pressed={on}
                            disabled={!canEdit}
                            onClick={() => update(e.studentId, { participationScore: c.score }, true)}
                            className={`tap flex h-11 items-center justify-center rounded-lg border px-1 text-center text-[14px] font-bold ${on ? "border-gold bg-gold-light text-gold" : "border-line bg-elev text-fg2"} disabled:opacity-70`}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-[14px] font-semibold text-fg2">과제</p>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { v: true, label: "제출" },
                        { v: false, label: "미제출" },
                        { v: null, label: "과제 없음" },
                      ].map((o) => {
                        const on = d.homeworkDone === o.v;
                        return (
                          <button
                            key={o.label}
                            type="button"
                            aria-pressed={on}
                            disabled={!canEdit}
                            onClick={() => update(e.studentId, { homeworkDone: o.v }, true)}
                            className={`tap flex h-11 items-center justify-center rounded-lg border px-1 text-center text-[14px] font-bold ${on ? "border-gold bg-gold-light text-gold" : "border-line bg-elev text-fg2"} disabled:opacity-70`}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-[14px] font-semibold text-fg2">선생님 한마디 (학부모님께 보여요)</span>
                    <textarea
                      value={d.feedback}
                      disabled={!canEdit}
                      onChange={(ev) => update(e.studentId, { feedback: ev.target.value })}
                      onBlur={() => dirty.current.has(e.studentId) && flush(e.studentId)}
                      rows={3}
                      placeholder="오늘 수업에서 이 학생이 어땠는지 학부모님께 한두 문장으로"
                      className={`${inputClass} disabled:opacity-70`}
                    />
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-[14px] font-semibold text-fg2">잘한 점 (선택 · 한 줄에 하나)</span>
                      <textarea value={d.highlights} disabled={!canEdit} onChange={(ev) => update(e.studentId, { highlights: ev.target.value })} onBlur={() => dirty.current.has(e.studentId) && flush(e.studentId)} rows={2} className={`${inputClass} disabled:opacity-70`} />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[14px] font-semibold text-fg2">다음엔 이렇게 (선택 · 한 줄에 하나)</span>
                      <textarea value={d.improvements} disabled={!canEdit} onChange={(ev) => update(e.studentId, { improvements: ev.target.value })} onBlur={() => dirty.current.has(e.studentId) && flush(e.studentId)} rows={2} className={`${inputClass} disabled:opacity-70`} />
                    </label>
                  </div>
                  {canEdit && (
                    <Button variant="secondary" className="w-full" onClick={() => goNext(e.studentId)}>
                      {writable.some((x) => x.studentId !== e.studentId && !hasFeedback(x.studentId)) ? "다음 학생 ›" : "닫기"}
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {draftCount > 0 && (
        <div className="sticky bottom-[calc(var(--tabbar-h)+var(--sab)+8px)] mt-4 rounded-[16px] border border-line bg-paper p-3">
          {needFeedback.length > 0 && <p className="mb-2 text-[14px] text-late">한마디를 쓰면 보낼 수 있어요 — 남은 학생 {needFeedback.length}명</p>}
          <Button size="lg" className="w-full" onClick={() => void handleSubmit()} loading={submit.pending} disabled={needFeedback.length > 0}>
            {draftCount}명 리포트 센터 검수 요청
          </Button>
        </div>
      )}
    </div>
  );
}
