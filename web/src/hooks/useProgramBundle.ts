"use client";

import { useCallback, useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { useGuardianDemoData } from "@/hooks/useDemoExperience";
import { getFns } from "@/lib/firebase";
import { dtoToProgram, type StudentProgramBundleDto } from "@/lib/studentProgramBundlesApi";
import type { Program } from "@/data/dummyProgram";
import { getDummyProgram } from "@/data/programView";

export function useProgramBundle(programRunId: string | null | undefined, studentId?: string | null) {
  const guardianDemo = useGuardianDemoData();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromFirestore, setFromFirestore] = useState(false);

  const load = useCallback(async () => {
    if (!programRunId) {
      setProgram(null);
      setLoading(false);
      return;
    }
    if (guardianDemo) {
      setProgram(getDummyProgram(programRunId));
      setFromFirestore(false);
      setLoading(false);
      return;
    }
    if (!studentId) {
      setProgram(getDummyProgram(programRunId));
      setFromFirestore(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const fn = httpsCallable<
        { studentId: string; programRunId: string },
        { bundles: StudentProgramBundleDto[] }
      >(getFns(), "listStudentProgramBundles");
      const res = await fn({ studentId, programRunId });
      const dto = res.data.bundles?.[0];
      if (!dto) {
        setProgram(getDummyProgram(programRunId));
        setFromFirestore(false);
        return;
      }
      setProgram(dtoToProgram(dto));
      setFromFirestore(true);
    } catch {
      setProgram(getDummyProgram(programRunId));
      setFromFirestore(false);
    } finally {
      setLoading(false);
    }
  }, [programRunId, studentId, guardianDemo]);

  useEffect(() => {
    load();
  }, [load]);

  return { program, loading, fromFirestore, refetch: load };
}
