"use client";

import { useCallback, useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import type { CenterRosterRow, RosterGuardianFilter } from "@/lib/centerRoster";
import { buildDemoRoster, filterDemoRoster } from "@/lib/demoCenterScale";
import { getFns } from "@/lib/firebase";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { useAuth } from "@/providers/AuthProvider";

const PAGE = 30;

export function useCenterRoster(
  programRunId: string | null | undefined,
  opts: { sectionId: string; q: string; guardianFilter: RosterGuardianFilter },
) {
  const { active, role } = useDemoPortal();
  const { user } = useAuth();
  const isDemo = active && role === "center";

  const [rows, setRows] = useState<CenterRosterRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [demoOffset, setDemoOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const reset = useCallback(() => {
    setRows([]);
    setCursor(null);
    setDemoOffset(0);
    setHasMore(false);
  }, []);

  const loadPage = useCallback(
    async (mode: "initial" | "more") => {
      if (!programRunId) return;
      const isMore = mode === "more";
      if (isMore) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        if (isDemo) {
          const all = buildDemoRoster(72);
          const offset = isMore ? demoOffset : 0;
          const { rows: chunk, nextOffset } = filterDemoRoster(all, {
            sectionId: opts.sectionId,
            q: opts.q,
            guardianFilter: opts.guardianFilter,
            offset,
            limit: PAGE,
          });
          setRows((prev) => (isMore ? [...prev, ...chunk] : chunk));
          setDemoOffset(nextOffset ?? offset);
          setHasMore(nextOffset !== null);
        } else if (!user) {
          setRows([]);
          setHasMore(false);
        } else {
        const fn = httpsCallable<
          {
            programRunId: string;
            sectionId?: string;
            q?: string;
            guardianFilter?: RosterGuardianFilter;
            pageSize?: number;
            cursor?: string;
          },
          { rows: CenterRosterRow[]; nextCursor: string | null }
        >(getFns(), "listCenterRoster");
        const res = await fn({
          programRunId,
          sectionId: opts.sectionId !== "all" ? opts.sectionId : undefined,
          q: opts.q || undefined,
          guardianFilter: opts.guardianFilter,
          pageSize: PAGE,
          cursor: isMore ? cursor ?? undefined : undefined,
        });
        setRows((prev) => (isMore ? [...prev, ...res.data.rows] : res.data.rows));
        setCursor(res.data.nextCursor);
        setHasMore(Boolean(res.data.nextCursor));
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [programRunId, isDemo, user, opts.sectionId, opts.q, opts.guardianFilter, cursor, demoOffset],
  );

  useEffect(() => {
    reset();
    void loadPage("initial");
  }, [programRunId, opts.sectionId, opts.q, opts.guardianFilter, isDemo, user]);

  return {
    rows,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore: () => void loadPage("more"),
    reload: () => {
      reset();
      void loadPage("initial");
    },
  };
}
