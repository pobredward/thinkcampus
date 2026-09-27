"use client";

/**
 * 자녀 한 명 · 프로그램 하나의 출결 — api.guardian.listAttendance → 화면용 StudentAttendance
 * 회차 사이를 오갈 때 깜빡이지 않도록 마지막 결과를 services/cache 에 둔다.
 */

import { useCallback, useEffect, useState } from "react";
import type { Program } from "@/data/dummyProgram";
import type { StudentAttendance } from "@/data/dummyAttendance";
import { mapFirestoreAttendanceToStudentAttendance } from "@/lib/mapSessionAttendance";
import { useApi, type AttendanceRecordDto } from "@/services";
import { cacheGet, cacheSet } from "@/services/cache";

export function useSessionAttendance(
  studentId: string | null | undefined,
  programRunId: string | null | undefined,
  program: Program | null,
  studentName: string,
  enabled: boolean,
) {
  const api = useApi();
  const key = `attendance|${studentId ?? ""}|${programRunId ?? ""}`;
  const ready = enabled && !!studentId && !!programRunId && !!program;
  const cachedRecords = ready ? cacheGet<AttendanceRecordDto[]>(key) : undefined;
  const [records, setRecords] = useState<AttendanceRecordDto[] | null>(cachedRecords ?? null);
  const [loading, setLoading] = useState(ready && !cachedRecords);

  const load = useCallback(async () => {
    if (!enabled || !studentId || !programRunId || !program) {
      setRecords(null);
      setLoading(false);
      return;
    }
    if (!cacheGet(key)) setLoading(true);
    try {
      const list = await api.guardian.listAttendance(studentId, programRunId);
      cacheSet(key, list);
      setRecords(list);
    } catch {
      setRecords(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, studentId, programRunId, program, api, key]);

  useEffect(() => {
    void load();
  }, [load]);

  const attendance: StudentAttendance | null =
    records && program && studentId ? mapFirestoreAttendanceToStudentAttendance(program, studentId, studentName, records) : null;

  return { attendance, loading, refetch: load };
}
