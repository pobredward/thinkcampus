"use client";

/**
 * 강사 · 내 수업 — 앞으로 / 지난 회차
 */

import { useMemo, useState } from "react";
import { InstructorSessionCard } from "@/components/staff/InstructorSessionCard";
import { ChipRow, Empty, ErrorBox, Loading, PageTitle } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { todayKey } from "@/lib/dates";
import { useApi, useQuery } from "@/services";

type Filter = "upcoming" | "past" | "all";

export default function InstructorSessionsPage() {
  usePageTitle("내 수업");
  const api = useApi();
  const { data, loading, error, refetch } = useQuery(() => api.instructor.listSessions(), [api]);
  const [filter, setFilter] = useState<Filter>("upcoming");
  const today = todayKey();

  const list = useMemo(() => {
    const all = data ?? [];
    if (filter === "upcoming") return all.filter((s) => s.scheduledDate >= today);
    if (filter === "past") return all.filter((s) => s.scheduledDate < today).reverse();
    return all;
  }, [data, filter, today]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={() => void refetch()} />;

  const counts = {
    upcoming: (data ?? []).filter((s) => s.scheduledDate >= today).length,
    past: (data ?? []).filter((s) => s.scheduledDate < today).length,
    all: data?.length ?? 0,
  };

  return (
    <div>
      <PageTitle title="내 수업" desc="회차를 누르면 교수 방안 · 자료 · 출결 · 리포트를 볼 수 있어요." />
      <ChipRow
        label="기간"
        value={filter}
        onChange={setFilter}
        items={[
          { id: "upcoming", label: "앞으로", count: counts.upcoming },
          { id: "past", label: "지난 수업", count: counts.past },
          { id: "all", label: "전체", count: counts.all },
        ]}
      />
      {list.length === 0 ? (
        <div className="mt-3">
          <Empty title="해당하는 수업이 없어요" />
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {list.map((s) => (
            <li key={s.id}>
              <InstructorSessionCard s={s} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
