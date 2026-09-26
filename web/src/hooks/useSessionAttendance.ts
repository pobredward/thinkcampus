"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import type { Program } from "@/data/dummyProgram";
import type { StudentAttendance } from "@/data/dummyAttendance";
import { useGuardianDemoData } from "@/hooks/useDemoExperience";
import { getDb } from "@/lib/firebase";
import {
  mapFirestoreAttendanceToStudentAttendance,
  type FirestoreSessionAttendance,
} from "@/lib/mapSessionAttendance";

export function useSessionAttendance(
  studentId: string | null | undefined,
  programRunId: string | null | undefined,
  program: Program | null,
  studentName: string,
  enabled: boolean,
) {
  const guardianDemo = useGuardianDemoData();
  const [attendance, setAttendance] = useState<StudentAttendance | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!enabled || !studentId || !programRunId || !program || guardianDemo) {
      setAttendance(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const db = getDb();
      const snap = await getDocs(
        query(
          collection(db, "sessionAttendance"),
          where("studentId", "==", studentId),
          where("programRunId", "==", programRunId),
        ),
      );
      const records = snap.docs.map((d) => d.data() as FirestoreSessionAttendance);
      setAttendance(mapFirestoreAttendanceToStudentAttendance(program, studentId, studentName, records));
    } catch {
      setAttendance(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, studentId, programRunId, program, studentName, guardianDemo]);

  useEffect(() => {
    void load();
  }, [load]);

  return { attendance, loading, refetch: load };
}
