"use client";

import { PrimaryButton } from "@/components/ui/Button";
import { StudentPhoto } from "@/components/students/StudentPhoto";

export type AttendanceChoice = "present" | "late" | "absent";

const OPTIONS: { value: AttendanceChoice; label: string }[] = [
  { value: "present", label: "출석" },
  { value: "late", label: "지각" },
  { value: "absent", label: "결석" },
];

export interface StudentAttendanceCardStudent {
  studentId: string;
  name: string;
  photoUrl?: string | null;
  status?: AttendanceChoice;
  lateMinutes?: number;
  participationScore?: number;
}

export function StudentAttendanceCard({
  student,
  onStatus,
  onLateMinutes,
  onParticipationScore,
  onSave,
  saving,
  showParticipation,
  showSave,
}: {
  student: StudentAttendanceCardStudent;
  onStatus: (status: AttendanceChoice) => void;
  onLateMinutes?: (minutes: number) => void;
  onParticipationScore?: (score: number | undefined) => void;
  onSave?: () => void;
  saving?: boolean;
  showParticipation?: boolean;
  showSave?: boolean;
}) {
  const status = student.status;

  return (
    <article
      className={`flex flex-col rounded-[18px] border bg-card p-3 shadow-sm transition ${
        status === "present"
          ? "border-emerald-500/40"
          : status === "late"
            ? "border-amber-500/40"
            : status === "absent"
              ? "border-red-400/30"
              : "border-line"
      }`}
    >
      <div className="flex items-center gap-3">
        <StudentPhoto studentId={student.studentId} name={student.name} photoUrl={student.photoUrl} size={64} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold text-fg">{student.name}</p>
          <p className="text-[11px] text-sub">탭하여 출결</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {OPTIONS.map((opt) => {
          const on = status === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onStatus(opt.value)}
              className={`tap rounded-xl py-2.5 text-[13px] font-semibold ${
                on ? "bg-gold text-bg" : "border border-line bg-elev text-sub"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {status === "late" && onLateMinutes && (
        <label className="mt-2 flex items-center justify-center gap-2 text-[13px] text-sub">
          지각
          <input
            type="number"
            min={1}
            max={120}
            className="w-14 rounded-lg border border-line bg-paper px-2 py-1 text-center text-fg"
            value={student.lateMinutes ?? 5}
            onChange={(e) => onLateMinutes(Number(e.target.value) || 5)}
          />
          분
        </label>
      )}

      {showParticipation && onParticipationScore && (
        <label className="mt-2 block text-center text-[12px] text-sub">
          참여도
          <input
            type="number"
            min={0}
            max={100}
            className="ml-2 w-14 rounded-lg border border-line bg-paper px-2 py-1 text-center"
            value={student.participationScore ?? ""}
            placeholder="—"
            onChange={(e) => {
              const v = e.target.value;
              onParticipationScore(v === "" ? undefined : Number(v));
            }}
          />
        </label>
      )}

      {showSave && onSave && (
        <PrimaryButton
          type="button"
          className="mt-3 w-full"
          loading={saving}
          disabled={!status || saving}
          onClick={onSave}
        >
          저장
        </PrimaryButton>
      )}
    </article>
  );
}
