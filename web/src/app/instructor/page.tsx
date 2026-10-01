"use client";

/**
 * 강사 · 오늘 — 오늘 수업이 맨 위, 그다음 다음 수업 2개 (나머지는 [내 수업])
 */

import { InstructorSessionCard } from "@/components/staff/InstructorSessionCard";
import { Button, Empty, ErrorBox, fmtDate, Loading, PageTitle, SectionLabel } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useApi, useQuery } from "@/services";

export default function InstructorHomePage() {
  usePageTitle("오늘");
  const api = useApi();
  const { data, loading, error, refetch } = useQuery(() => api.instructor.getHome(), [api]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={() => void refetch()} />;
  if (!data) return null;

  const pending = data.todaySessions.filter((s) => s.status !== "cancelled" && s.recordedCount < s.enrolledCount);

  return (
    <div>
      <PageTitle
        eyebrow={fmtDate(data.today)}
        title={`${data.displayName} 선생님, ${data.todaySessions.length > 0 ? `오늘 수업 ${data.todaySessions.length}개` : "오늘은 수업이 없어요"}`}
        desc={pending.length > 0 ? `출결이 아직 안 들어간 반 ${pending.length}개` : data.todaySessions.length > 0 ? "오늘 출결이 모두 입력됐어요" : undefined}
      />

      {data.todaySessions.length > 0 && (
        <ul className="grid gap-2 md:grid-cols-2">
          {data.todaySessions.map((s) => (
            <li key={s.id}>
              <InstructorSessionCard s={s} showDate={false} />
            </li>
          ))}
        </ul>
      )}

      <SectionLabel right={<Button href="/instructor/sessions" variant="ghost" size="sm">전체 보기</Button>}>다음 수업</SectionLabel>
      {data.upcoming.length === 0 ? (
        <Empty title="예정된 수업이 없어요" />
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {data.upcoming.slice(0, 2).map((s) => (
            <li key={s.id}>
              <InstructorSessionCard s={s} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
