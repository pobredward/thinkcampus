"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useGuardianDemoData } from "@/hooks/useDemoExperience";
import { getDb } from "@/lib/firebase";
import type { FirestoreSessionAttendance } from "@/lib/mapSessionAttendance";

/** 학생의 전체 sessionAttendance — programRunId별 그룹 */
export function useAllSessionAttendance(studentId: string | null | undefined, enabled: boolean) {
  const guardianDemo = useGuardianDemoData();
  const [byProgramRunId, setByProgramRunId] = useState<Record<string, FirestoreSessionAttendance[]>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!enabled || !studentId || guardianDemo) {
      setByProgramRunId({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const db = getDb();
      const snap = await getDocs(
        query(collection(db, "sessionAttendance"), where("studentId", "==", studentId)),
      );
      const grouped: Record<string, FirestoreSessionAttendance[]> = {};
      for (const doc of snap.docs) {
        const data = doc.data() as FirestoreSessionAttendance;
        const runId = data.programRunId;
        if (!runId) continue;
        if (!grouped[runId]) grouped[runId] = [];
        grouped[runId].push(data);
      }
      setByProgramRunId(grouped);
    } catch {
      setByProgramRunId({});
    } finally {
      setLoading(false);
    }
  }, [enabled, studentId, guardianDemo]);

  useEffect(() => {
    void load();
  }, [load]);

  return { byProgramRunId, loading, refetch: load };
}
