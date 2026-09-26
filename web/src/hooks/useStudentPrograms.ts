"use client";

import { useCallback, useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { useGuardianDemoData } from "@/hooks/useDemoExperience";
import { getFns } from "@/lib/firebase";
import {
  dtoToStudentProgramBundle,
  type StudentProgramBundleDto,
} from "@/lib/studentProgramBundlesApi";
import type { Program } from "@/data/dummyProgram";

export interface StudentProgramBundle {
  enrollmentId: string;
  programRunId: string;
  status: string;
  program: Program;
}

export function useStudentPrograms(studentId: string | null | undefined) {
  const guardianDemo = useGuardianDemoData();
  const [bundles, setBundles] = useState<StudentProgramBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrograms = useCallback(async () => {
    if (!studentId) {
      setBundles([]);
      setLoading(false);
      return;
    }
    if (guardianDemo) {
      setBundles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<{ studentId: string }, { bundles: StudentProgramBundleDto[] }>(
        getFns(),
        "listStudentProgramBundles",
      );
      const res = await fn({ studentId });
      const list = (res.data.bundles ?? []).map(dtoToStudentProgramBundle);
      setBundles(list);
    } catch (e) {
      setError((e as Error).message);
      setBundles([]);
    } finally {
      setLoading(false);
    }
  }, [studentId, guardianDemo]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const completed = bundles.filter((b) => b.status === "completed");

  return { bundles, completed, loading, error, refetch: fetchPrograms };
}
