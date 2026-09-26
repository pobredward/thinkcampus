"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { PrimaryButton } from "@/components/ui/Button";
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
  status?: AttendanceStatus;
  lateMinutes?: number;
  participationScore?: number;
}

interface SheetSession {
  id: string;
  sessionNumber: number;
  topic: string;
  scheduledDate: string;
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
        운영 건과 회차를 고른 뒤 학생별 출결을 저장합니다. 학부모 앱에는{" "}
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
                    {s.sessionNumber}회 · {s.scheduledDate} · {s.topic}
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
        <ul className="space-y-4">
          {students.map((st) => (
            <li key={st.studentId} className="rounded-lg border border-line bg-elev p-4">
              <p className="font-semibold text-fg">{st.name}</p>
              <p className="text-xs text-sub">{st.studentId}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["present", "late", "absent"] as AttendanceStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-sm ${
                      st.status === status ? "bg-gold text-bg font-semibold" : "border border-line"
                    }`}
                    onClick={() => setStudentField(st.studentId, { status })}
                  >
                    {status === "present" ? "출석" : status === "late" ? "지각" : "결석"}
                  </button>
                ))}
              </div>
              {st.status === "late" && (
                <label className="mt-2 block text-sm text-fg2">
                  지각 (분)
                  <input
                    type="number"
                    min={1}
                    max={120}
                    className="ml-2 w-20 rounded border border-line bg-bg px-2 py-1"
                    value={st.lateMinutes ?? 5}
                    onChange={(e) =>
                      setStudentField(st.studentId, { lateMinutes: Number(e.target.value) || 5 })
                    }
                  />
                </label>
              )}
              <label className="mt-2 block text-sm text-fg2">
                참여도 (0–100)
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="ml-2 w-20 rounded border border-line bg-bg px-2 py-1"
                  value={st.participationScore ?? ""}
                  placeholder="—"
                  onChange={(e) => {
                    const v = e.target.value;
                    setStudentField(st.studentId, {
                      participationScore: v === "" ? undefined : Number(v),
                    });
                  }}
                />
              </label>
              <PrimaryButton
                type="button"
                className="mt-3"
                loading={savingId === st.studentId}
                disabled={!st.status || savingId !== null}
                onClick={() => void saveStudent(st)}
              >
                저장
              </PrimaryButton>
            </li>
          ))}
        </ul>
      )}

      {!sheetLoading && programRunId && runSessionId && students.length === 0 && (
        <p className="text-sm text-fg2">이 운영 건에 수강 등록된 학생이 없습니다. 명단 import를 먼저 실행하세요.</p>
      )}
    </div>
  );
}
