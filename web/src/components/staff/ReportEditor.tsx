"use client";

/**
 * 강사 · 회차 리포트 작성 — 학생마다 참여도 · 과제 · 한마디 · 잘한 점 · 다음엔 이렇게
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

  if (attended.length === 0) {
    return <p className="rounded-[16px] border border-dashed border-line2 bg-card2 px-5 py-8 text-center text-[16px] text-sub">출결을 먼저 입력하면 학생별 리포트를 쓸 수 있어요.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-[14px] text-sub">
        <span>
          작성 중 {draftCount}명 · 제출 {roster.filter((e) => e.report.status !== "draft").length}명
        </span>
        <span>{save.pending ? "저장 중..." : savedAt ? `${savedAt} 저장됨` : "입력하면 자동 저장"}</span>
      </div>

      <ul className="flex flex-col gap-3">
        {attended.map((e) => {
          const d = drafts[e.studentId] ?? toDraft(e);
          const canEdit = editable.has(e.studentId);
          const absent = e.attendance === "absent";
          return (
            <li key={e.studentId} className={`rounded-[18px] border p-4 ${canEdit ? "border-line bg-card" : "border-line bg-card2"}`}>
              <div className="flex items-center gap-3">
                <Photo id={e.studentId} name={e.name} photoUrl={e.photoUrl} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] font-bold text-fg">{e.name}</p>
                  <p className="text-[14px] text-sub">{absent ? "결석 — 피드백 없이 제출돼요" : e.attendance === "late" ? `지각 ${e.lateMinutes ?? 0}분` : "출석"}</p>
                </div>
                <Badge tone={REPORT_STATUS_TONE[e.report.status]}>{SESSION_REPORT_STATUS_LABEL[e.report.status]}</Badge>
              </div>
              {e.report.returnNote && <p className="mt-2 rounded-lg bg-danger-bg px-3 py-2 text-[14px] text-danger">센터 반려: {e.report.returnNote}</p>}

              {!absent && (
                <div className="mt-3 flex flex-col gap-3">
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
                            className={`tap h-11 rounded-lg border text-[14px] font-bold ${on ? "border-gold bg-gold-light text-gold" : "border-line bg-elev text-fg2"} disabled:opacity-70`}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-fg2">과제</span>
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
                          className={`tap h-10 rounded-lg border px-3 text-[14px] font-bold ${on ? "border-gold bg-gold-light text-gold" : "border-line bg-elev text-fg2"} disabled:opacity-70`}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-[14px] font-semibold text-fg2">선생님 한마디</span>
                    <textarea
                      value={d.feedback}
                      disabled={!canEdit}
                      onChange={(ev) => update(e.studentId, { feedback: ev.target.value })}
                      onBlur={() => dirty.current.has(e.studentId) && flush(e.studentId)}
                      rows={2}
                      placeholder="오늘 수업에서 이 학생이 어땠는지 학부모님께 한두 문장으로"
                      className={`${inputClass} disabled:opacity-70`}
                    />
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-[14px] font-semibold text-gold">잘한 점 (한 줄에 하나)</span>
                      <textarea value={d.highlights} disabled={!canEdit} onChange={(ev) => update(e.studentId, { highlights: ev.target.value })} onBlur={() => dirty.current.has(e.studentId) && flush(e.studentId)} rows={2} className={`${inputClass} disabled:opacity-70`} />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[14px] font-semibold text-sub">다음엔 이렇게 (한 줄에 하나)</span>
                      <textarea value={d.improvements} disabled={!canEdit} onChange={(ev) => update(e.studentId, { improvements: ev.target.value })} onBlur={() => dirty.current.has(e.studentId) && flush(e.studentId)} rows={2} className={`${inputClass} disabled:opacity-70`} />
                    </label>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {draftCount > 0 && (
        <div className="sticky bottom-[calc(var(--tabbar-h)+var(--sab)+8px)] mt-4 rounded-[16px] border border-line bg-paper p-3">
          {needFeedback.length > 0 && <p className="mb-2 text-[14px] text-late">한마디가 비어 있는 학생 {needFeedback.length}명: {needFeedback.map((x) => x.name).join(", ")}</p>}
          <Button size="lg" className="w-full" onClick={() => void handleSubmit()} loading={submit.pending} disabled={needFeedback.length > 0}>
            {draftCount}명 리포트 센터 검수 요청
          </Button>
        </div>
      )}
    </div>
  );
}
