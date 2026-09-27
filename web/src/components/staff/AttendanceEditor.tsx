"use client";

/**
 * 출결 입력 — 센터(출결 시트)와 강사(회차 화면 출결 탭)가 같이 쓴다
 *   - 학생 카드마다 [출석] [지각] [결석] 버튼 (44px). 누르는 즉시 저장
 *   - 지각이면 늦은 시간(분) 조절
 *   - "아직 안 한 학생 모두 출석" 으로 한 번에
 */

import { useEffect, useMemo, useState } from "react";
import { Photo } from "@/components/staff/Photo";
import { Badge, Button } from "@/components/staff/ui";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useToast } from "@/providers/ToastProvider";
import type { AttendanceStatus, RecordAttendanceInput } from "@/services";
import { useMutation } from "@/services";

export interface AttendanceEditorStudent {
  studentId: string;
  name: string;
  photoUrl?: string;
  status?: AttendanceStatus;
  lateMinutes?: number;
  note?: string;
}

const STATUS: Array<{ id: AttendanceStatus; label: string; on: string }> = [
  { id: "present", label: "출석", on: "border-gold bg-gold-light text-gold" },
  { id: "late", label: "지각", on: "border-late bg-late-bg text-late" },
  { id: "absent", label: "결석", on: "border-danger bg-danger-bg text-danger" },
];

export function AttendanceEditor({
  runSessionId,
  students,
  onSave,
  readOnly = false,
}: {
  runSessionId: string;
  students: AttendanceEditorStudent[];
  onSave: (inputs: RecordAttendanceInput[]) => Promise<void>;
  readOnly?: boolean;
}) {
  const toast = useToast();
  const [local, setLocal] = useState<Record<string, { status: AttendanceStatus; lateMinutes?: number }>>({});
  useEffect(() => {
    // 서버 값이 바뀌면 화면도 맞춘다
    const next: Record<string, { status: AttendanceStatus; lateMinutes?: number }> = {};
    for (const s of students) if (s.status) next[s.studentId] = { status: s.status, lateMinutes: s.lateMinutes };
    setLocal(next);
  }, [students]);

  const save = useMutation(onSave);
  const [savingId, setSavingId] = useState<string | null>(null);

  const recorded = useMemo(() => students.filter((s) => local[s.studentId]).length, [students, local]);
  const counts = useMemo(() => {
    const c = { present: 0, late: 0, absent: 0 };
    for (const s of students) {
      const v = local[s.studentId];
      if (v) c[v.status]++;
    }
    return c;
  }, [students, local]);

  async function set(studentId: string, status: AttendanceStatus, lateMinutes?: number) {
    if (readOnly) return;
    const prev = local[studentId];
    const minutes = status === "late" ? (lateMinutes ?? prev?.lateMinutes ?? 10) : undefined;
    setLocal((m) => ({ ...m, [studentId]: { status, lateMinutes: minutes } }));
    setSavingId(studentId);
    try {
      await save.run([{ runSessionId, studentId, status, lateMinutes: minutes }]);
    } catch (e) {
      setLocal((m) => {
        const copy = { ...m };
        if (prev) copy[studentId] = prev;
        else delete copy[studentId];
        return copy;
      });
      toast.show((e as Error).message || "저장하지 못했어요");
    } finally {
      setSavingId(null);
    }
  }

  async function markRestPresent() {
    const rest = students.filter((s) => !local[s.studentId]);
    if (rest.length === 0) return;
    const inputs: RecordAttendanceInput[] = rest.map((s) => ({ runSessionId, studentId: s.studentId, status: "present" }));
    setLocal((m) => {
      const copy = { ...m };
      for (const s of rest) copy[s.studentId] = { status: "present" };
      return copy;
    });
    try {
      await save.run(inputs);
      toast.show(`${rest.length}명 출석으로 저장했어요`);
    } catch (e) {
      toast.show((e as Error).message || "저장하지 못했어요");
    }
  }

  return (
    <div>
      <div className="rounded-[16px] border border-line bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-[16px] font-bold text-fg">
            입력 {recorded}/{students.length}명
          </p>
          <div className="flex gap-1">
            <Badge tone="gold">출석 {counts.present}</Badge>
            <Badge tone="late">지각 {counts.late}</Badge>
            <Badge tone="danger">결석 {counts.absent}</Badge>
          </div>
        </div>
        <ProgressBar value={students.length ? recorded / students.length : 0} height={6} className="mt-3" />
        {!readOnly && recorded < students.length && (
          <Button onClick={() => void markRestPresent()} variant="secondary" className="mt-3 w-full" loading={save.pending && savingId === null}>
            아직 안 한 {students.length - recorded}명 모두 출석
          </Button>
        )}
      </div>

      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {students.map((s) => {
          const v = local[s.studentId];
          return (
            <li key={s.studentId} className={`rounded-[16px] border p-3 ${v ? "border-line bg-card" : "border-line2 bg-card2"}`}>
              <div className="flex items-center gap-3">
                <Photo id={s.studentId} name={s.name} photoUrl={s.photoUrl} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-bold text-fg">{s.name}</p>
                  <p className="text-[14px] text-sub">
                    {v ? (v.status === "late" ? `${v.lateMinutes ?? 0}분 늦음` : STATUS.find((x) => x.id === v.status)?.label) : "아직 입력 전"}
                    {s.note ? ` · ${s.note}` : ""}
                  </p>
                </div>
                {savingId === s.studentId && <span className="text-[14px] text-gold">저장 중</span>}
              </div>
              {!readOnly && (
                <div role="group" aria-label={`${s.name} 출결`} className="mt-2 grid grid-cols-3 gap-1">
                  {STATUS.map((st) => {
                    const on = v?.status === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => void set(s.studentId, st.id)}
                        className={`tap h-11 rounded-lg border text-[15px] font-bold ${on ? st.on : "border-line bg-elev text-fg2"}`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {!readOnly && v?.status === "late" && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-elev px-3 py-1">
                  <span className="text-[14px] text-sub">늦은 시간</span>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label="5분 줄이기" onClick={() => void set(s.studentId, "late", Math.max(1, (v.lateMinutes ?? 10) - 5))} className="tap h-9 w-9 rounded-md border border-line text-[17px] font-bold text-fg2">
                      −
                    </button>
                    <span className="w-[3.5em] text-center text-[15px] font-bold text-fg">{v.lateMinutes ?? 10}분</span>
                    <button type="button" aria-label="5분 늘리기" onClick={() => void set(s.studentId, "late", (v.lateMinutes ?? 10) + 5)} className="tap h-9 w-9 rounded-md border border-line text-[17px] font-bold text-fg2">
                      +
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
