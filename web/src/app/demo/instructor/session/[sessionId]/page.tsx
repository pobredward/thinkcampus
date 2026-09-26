"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { InstructorAttendanceEditor } from "@/components/demo/InstructorAttendanceEditor";
import { InstructorMaterialLinks } from "@/components/demo/InstructorMaterialLinks";
import { InstructorSessionReportForm } from "@/components/demo/InstructorSessionReportForm";
import { usePageTitle } from "@/hooks/usePageTitle";
import { DUMMY_PROGRAM } from "@/data/dummyProgram";
import { buildDemoInstructorSessionRoster } from "@/lib/demoCenterFamilies";
import {
  DEMO_INSTRUCTOR_CLASS,
  DEMO_INSTRUCTOR_SESSIONS,
  lessonMaterialsForSession,
  sessionMetaForReport,
  type InstructorRosterRow,
} from "@/lib/demoInstructor";
import { DEMO_PORTAL_BLOCKED, DEMO_ROLE_PATH } from "@/lib/demoPortal";
import { useToast } from "@/providers/ToastProvider";

type SectionTab = "plan" | "materials" | "attendance" | "reports";

export default function InstructorSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const toast = useToast();
  const session = useMemo(
    () => DEMO_INSTRUCTOR_SESSIONS.find((s) => s.id === sessionId) ?? DEMO_INSTRUCTOR_SESSIONS[2],
    [sessionId],
  );
  const detail = DUMMY_PROGRAM.sessions.find((s) => s.id === session.id);
  const materials = useMemo(() => lessonMaterialsForSession(detail), [detail]);
  const meta = useMemo(() => sessionMetaForReport(detail), [detail]);

  const [tab, setTab] = useState<SectionTab>("plan");
  const [roster, setRoster] = useState<InstructorRosterRow[]>(() =>
    buildDemoInstructorSessionRoster().map((r) => ({ ...r, attendance: "unset" as const })),
  );

  const patchStudent = useCallback((studentId: string, patch: Partial<InstructorRosterRow>) => {
    setRoster((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, ...patch } : r)));
  }, []);

  usePageTitle(`${session.sessionNumber}회차`);

  const saveDraft = () => {
    toast.show("체험판: 출결·리포트 초안이 저장된 것처럼 보입니다 (실제 저장 없음)");
  };

  return (
    <div className="flex flex-1 flex-col pb-6">
      <div className="border-b border-line px-5 py-4" style={{ paddingTop: "calc(var(--sat) + 8px)" }}>
        <Link href={DEMO_ROLE_PATH.instructor} className="text-sm text-gold underline">← 오늘</Link>
        <p className="mt-2 text-[13px] text-sub">
          {DEMO_INSTRUCTOR_CLASS.contractCode}
          {detail?.programCode ? ` · ${detail.programCode}` : ""}
        </p>
        <h1 className="text-[22px] font-bold text-fg">{session.sessionNumber}회차 · {session.topic}</h1>
        <p className="mt-1 text-[15px] text-sub">{session.date} · {session.location}</p>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 py-3">
        {(
          [
            ["plan", "교수 방안"],
            ["materials", "수업 자료"],
            ["attendance", "출결"],
            ["reports", "회차 리포트"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`tap shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold ${
              tab === id ? "bg-gold text-bg" : "border border-line text-sub"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 px-5 pb-4">
        {tab === "plan" && (
          <div className="space-y-5">
            {detail?.description && (
              <section>
                <h2 className="text-[15px] font-bold text-fg">회차 개요</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-fg2">{detail.description}</p>
              </section>
            )}
            {meta?.objectives && meta.objectives.length > 0 && (
              <section>
                <h2 className="text-[15px] font-bold text-fg">학습 목표</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-fg2">
                  {meta.objectives.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </section>
            )}
            {meta?.teachingMethod && (
              <section>
                <h2 className="text-[15px] font-bold text-fg">교수·학습 방법</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-fg2">{meta.teachingMethod}</p>
              </section>
            )}
            {meta?.curriculum && meta.curriculum.length > 0 && (
              <section>
                <h2 className="text-[15px] font-bold text-fg">진행 순서</h2>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-[15px] text-fg2">
                  {meta.curriculum.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ol>
              </section>
            )}
            {meta?.rotationNote && (
              <p className="rounded-lg border border-line bg-elev px-3 py-2 text-sm text-sub">{meta.rotationNote}</p>
            )}
            {meta?.materials && meta.materials.length > 0 && (
              <section>
                <h2 className="text-[15px] font-bold text-fg">준비물</h2>
                <p className="mt-2 text-[15px] text-fg2">{meta.materials.join(" · ")}</p>
              </section>
            )}
          </div>
        )}

        {tab === "materials" && (
          <section>
            <h2 className="text-[15px] font-bold text-fg">회차별 수업 자료 (Canva)</h2>
            <p className="mt-1 text-sm text-sub">코드 · 제목 · 계획서 · PPT 공개/템플릿 · 활동지</p>
            <div className="mt-4">
              <InstructorMaterialLinks materials={materials} />
            </div>
          </section>
        )}

        {tab === "attendance" && (
          <section>
            <h2 className="text-[15px] font-bold text-fg">학생 출결</h2>
            <p className="mt-1 text-sm text-sub">강사 선택 → 이후 자동 출결(체크인)로 대체 예정</p>
            <div className="mt-4">
              <InstructorAttendanceEditor rows={roster} onChange={patchStudent} />
            </div>
          </section>
        )}

        {tab === "reports" && (
          <section>
            <h2 className="text-[15px] font-bold text-fg">학생별 회차 리포트 초안</h2>
            <p className="mt-1 text-sm text-sub">
              participationScore · homeworkDone · feedback · highlights — DATA_MODEL sessionAttendance / sessionReports
            </p>
            <div className="mt-4">
              <InstructorSessionReportForm rows={roster} onChange={patchStudent} />
            </div>
          </section>
        )}
      </div>

      <div className="border-t border-line px-5 py-4">
        <button
          type="button"
          onClick={saveDraft}
          className="tap w-full rounded-xl bg-gold py-3 text-[16px] font-bold text-bg"
        >
          초안 저장 (체험)
        </button>
        <p className="mt-2 text-center text-[11px] text-faint">{DEMO_PORTAL_BLOCKED.adminSave}</p>
      </div>
    </div>
  );
}
