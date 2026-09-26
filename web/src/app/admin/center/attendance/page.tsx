"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { StudentAttendanceCard, type AttendanceChoice } from "@/components/students/StudentAttendanceCard";
import { Spinner } from "@/components/ui/Spinner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import {
  DEMO_CENTER_RUNS,
  DEMO_CENTER_SESSIONS,
  DEMO_CENTER_STUDENTS,
} from "@/lib/demoPortal";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { getDb, getFns } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { useCenterRun } from "@/providers/CenterRunProvider";

interface ProgramRunOption {
  id: string;
  contractCode: string;
  campusId: string;
  municipalityName: string;
}

type AttendanceStatus = "present" | "late" | "absent";

interface SheetStudent {
  studentId: string;
  name: string;
  photoUrl?: string;
  status?: AttendanceStatus;
  lateMinutes?: number;
  participationScore?: number;
}

interface SheetSession {
  id: string;
  sessionNumber: number;
  topic: string;
  scheduledDate: string;
  sectionLabel?: string;
  startTime?: string;
}

export default function CenterAttendancePage() {
  usePageTitle("센터 출결");
  const searchParams = useSearchParams();
  const sessionFromUrl = searchParams.get("session");
  const { user } = useAuth();
  const { role: demoRole, active: demoActive } = useDemoPortal();
  const centerDemo = demoActive && demoRole === "center";
  const { access } = useStaffAccess(user?.uid ?? null);
  const { selectedRun: assignedRun, runs: assignedRuns } = useCenterRun();

  const [runs, setRuns] = useState<ProgramRunOption[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [programRunId, setProgramRunId] = useState("");
  const [runSessionId, setRunSessionId] = useState("");
  const [sessions, setSessions] = useState<SheetSession[]>([]);
  const [students, setStudents] = useState<SheetStudent[]>([]);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    if (centerDemo) {
      const list = assignedRuns.length > 0 ? assignedRuns : [...DEMO_CENTER_RUNS];
      setRuns(list);
      setRunsLoading(false);
      return;
    }
    if (!user) {
      setRuns([]);
      setRunsLoading(false);
      return;
    }
    setRunsLoading(true);
    try {
      const db = getDb();
      const snap = access.companyAdmin
        ? await getDocs(collection(db, "programRuns"))
        : access.campusIds.length === 0
          ? { docs: [] as Awaited<ReturnType<typeof getDocs>>["docs"] }
          : await getDocs(
              query(
                collection(db, "programRuns"),
                where("campusId", "in", access.campusIds.slice(0, 10)),
              ),
            );
      const list: ProgramRunOption[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          contractCode: (data.contractCode as string) ?? d.id,
          campusId: (data.campusId as string) ?? "",
          municipalityName: (data.municipalityName as string) ?? "",
        };
      });
      list.sort((a, b) => a.contractCode.localeCompare(b.contractCode, "ko"));
      setRuns(list);
    } catch (e) {
      setError((e as Error).message);
      setRuns([]);
    } finally {
      setRunsLoading(false);
    }
  }, [user, access.companyAdmin, access.campusIds, centerDemo, assignedRuns]);

  useEffect(() => {
    if (centerDemo && assignedRun) {
      setProgramRunId(assignedRun.id);
      setRunSessionId(sessionFromUrl ?? "");
    }
  }, [centerDemo, assignedRun, sessionFromUrl]);

  useEffect(() => {
    if (sessionFromUrl) setRunSessionId(sessionFromUrl);
  }, [sessionFromUrl]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    if (!programRunId) {
      setSessions([]);
      setStudents([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      setSheetLoading(true);
      setError(null);
      try {
        if (centerDemo) {
          const sessions = [...DEMO_CENTER_SESSIONS];
          setSessions(sessions);
          const sid = runSessionId || sessions[0]?.id || "";
          if (!runSessionId && sessions[0]) setRunSessionId(sessions[0].id);
          setStudents(
            sid
              ? DEMO_CENTER_STUDENTS.map((s) => ({
                  studentId: s.studentId,
                  name: s.name,
                  status: s.status,
                  lateMinutes: "lateMinutes" in s ? s.lateMinutes : undefined,
                }))
              : [],
          );
          if (!cancelled) setSheetLoading(false);
          return;
        }
        const fn = httpsCallable<
          { programRunId: string; runSessionId?: string },
          { sessions: SheetSession[]; students: SheetStudent[] }
        >(getFns(), "getProgramRunAttendanceSheet");
        const res = await fn({
          programRunId,
          ...(runSessionId ? { runSessionId } : {}),
        });
        if (cancelled) return;
        setSessions(res.data.sessions);
        if (!runSessionId && res.data.sessions[0]) {
          setRunSessionId(res.data.sessions[0].id);
          setStudents([]);
        } else {
          setStudents(res.data.students);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setSheetLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [programRunId, runSessionId, centerDemo]);

  const selectedRun = useMemo(() => runs.find((r) => r.id === programRunId), [runs, programRunId]);

  function setStudentField(studentId: string, patch: Partial<SheetStudent>) {
    setStudents((prev) => prev.map((s) => (s.studentId === studentId ? { ...s, ...patch } : s)));
  }

  async function saveStudent(st: SheetStudent) {
    if (!runSessionId || !st.status) return;
    if (centerDemo) return;
    setSavingId(st.studentId);
    setError(null);
    try {
      const fn = httpsCallable(getFns(), "recordSessionAttendance");
      await fn({
        runSessionId,
        studentId: st.studentId,
        status: st.status,
        lateMinutes: st.status === "late" ? st.lateMinutes ?? 5 : undefined,
        participationScore: st.participationScore,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-bold">출결 입력</h1>
      <p className="text-sm text-fg2 leading-relaxed">
        <strong className="font-semibold text-fg">반(섹션) 단위</strong> 시트입니다. 로테이션으로 같은 시간에 여러 반이
        있으면 수업 탭에서 해당 반 카드를 선택하세요. 학부모 앱에는{" "}
        <code className="text-fg">sessionAttendance</code> 로 반영됩니다.
      </p>

      {runsLoading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {!runsLoading && runs.length === 0 && (
        <p className="rounded-lg border border-line bg-elev px-4 py-3 text-sm text-fg2">
          접근 가능한 운영 건이 없습니다. 캠퍼스 claim 또는 명단 import 후 수강 등록이 필요합니다.
        </p>
      )}

      {runs.length > 0 && (
        <div className="space-y-3">
          {centerDemo && assignedRuns.length > 1 ? (
            <p className="text-sm text-sub">
              운영 건 <span className="font-semibold text-fg">{assignedRun?.contractCode}</span> — 상단에서 전환
            </p>
          ) : (
            <>
              <label className="block text-sm font-semibold text-fg">운영 건 (contractCode)</label>
              <select
                className="w-full rounded-lg border border-line bg-elev px-3 py-2 text-sm"
                value={programRunId}
                onChange={(e) => {
                  setProgramRunId(e.target.value);
                  setRunSessionId("");
                }}
              >
                <option value="">선택…</option>
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.contractCode} · {r.municipalityName} ({r.campusId})
                  </option>
                ))}
              </select>
            </>
          )}

          {selectedRun && sessions.length > 0 && (
            <>
              <label className="block text-sm font-semibold text-fg">회차</label>
              <select
                className="w-full rounded-lg border border-line bg-elev px-3 py-2 text-sm"
                value={runSessionId}
                onChange={(e) => setRunSessionId(e.target.value)}
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sectionLabel ? `${s.sectionLabel} · ` : ""}
                    {s.sessionNumber}회 · {s.scheduledDate}
                    {s.startTime ? ` ${s.startTime}` : ""} · {s.topic}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {sheetLoading && programRunId && runSessionId && (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      )}

      {!sheetLoading && students.length > 0 && runSessionId && (
        <div className="grid grid-cols-2 gap-3">
          {students.map((st) => (
            <StudentAttendanceCard
              key={st.studentId}
              student={{
                studentId: st.studentId,
                name: st.name,
                photoUrl: st.photoUrl,
                status: st.status as AttendanceChoice | undefined,
                lateMinutes: st.lateMinutes,
                participationScore: st.participationScore,
              }}
              onStatus={(status) => setStudentField(st.studentId, { status })}
              onLateMinutes={(m) => setStudentField(st.studentId, { lateMinutes: m })}
              onParticipationScore={(score) => setStudentField(st.studentId, { participationScore: score })}
              onSave={() => void saveStudent(st)}
              saving={savingId === st.studentId}
              showParticipation
              showSave={!centerDemo}
            />
          ))}
        </div>
      )}

      {!sheetLoading && programRunId && runSessionId && students.length === 0 && (
        <p className="text-sm text-fg2">이 운영 건에 수강 등록된 학생이 없습니다. 명단 import를 먼저 실행하세요.</p>
      )}
    </div>
  );
}
