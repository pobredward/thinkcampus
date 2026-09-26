"use client";

import { useCallback, useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import type { CenterRunOps } from "@/lib/centerRunOps";
import { getFns } from "@/lib/firebase";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { useAuth } from "@/providers/AuthProvider";

export function useCenterRunOps(programRunId: string | null | undefined) {
  const { active, role } = useDemoPortal();
  const { user } = useAuth();
  const centerDemo = active && role === "center";

  const [data, setData] = useState<CenterRunOps | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (centerDemo || !programRunId || !user) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<{ programRunId: string }, CenterRunOps>(getFns(), "getCenterRunOps");
      const res = await fn({ programRunId });
      setData(res.data);
    } catch (e) {
      setData(null);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [centerDemo, programRunId, user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload, isDemo: centerDemo };
}
