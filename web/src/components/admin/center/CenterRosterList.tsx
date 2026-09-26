"use client";

import { PrimaryButton } from "@/components/ui/Button";
import { StudentPhoto } from "@/components/students/StudentPhoto";
import { useToast } from "@/providers/ToastProvider";
import type { CenterRosterRow } from "@/lib/centerRoster";

export function CenterRosterList({
  rows,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  rows: CenterRosterRow[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  const toast = useToast();

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-elev px-4 py-10 text-center text-sub">
        조건에 맞는 학생이 없습니다.
      </p>
    );
  }

  const handleContact = (student: CenterRosterRow) => {
    if (student.guardianLinked) {
      toast.show(`${student.name} 학생 보호자(${student.guardianSummary}) 연결 시도`);
    } else {
      navigator.clipboard?.writeText?.(
        `[ThinkCampus] ${student.name} 학생의 학부모 앱 연결 등록코드: TC-${student.studentId.slice(0, 4).toUpperCase()}`
      );
      toast.show(`${student.name} 학생의 등록코드 안내가 복사되었습니다.`);
    }
  };

  return (
    <div className="space-y-2.5">
      <ul className="divide-y divide-line rounded-xl border border-line bg-card">
        {rows.map((s) => (
          <li key={s.enrollmentId} className="flex items-center gap-3 px-3.5 py-3">
            <StudentPhoto
              studentId={s.studentId}
              name={s.name}
              photoUrl={s.photoUrl}
              size={46}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-fg">{s.name}</p>
                <span className="rounded bg-elev px-1.5 py-0.5 text-[11px] font-medium text-sub">
                  {s.sectionLabel}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[12px] text-sub">
                {s.guardianLinked ? (
                  <span className="text-emerald-700">● {s.guardianSummary}</span>
                ) : (
                  <span className="text-amber-800">○ 보호자 미연결</span>
                )}
                {s.householdId ? ` · ${s.householdId}` : ""}
              </p>
            </div>

            {/* 원터치 연락 / 초대 액션 버튼 */}
            <button
              type="button"
              onClick={() => handleContact(s)}
              className={`tap shrink-0 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                s.guardianLinked
                  ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20"
                  : "border-amber-600/30 bg-amber-500/10 text-amber-900 hover:bg-amber-500/20"
              }`}
            >
              {s.guardianLinked ? "보호자 연락" : "초대 복사"}
            </button>
          </li>
        ))}
      </ul>
      {hasMore && (
        <PrimaryButton type="button" className="w-full" disabled={loadingMore} onClick={onLoadMore}>
          {loadingMore ? "불러오는 중…" : "더 보기 (30명)"}
        </PrimaryButton>
      )}
    </div>
  );
}
