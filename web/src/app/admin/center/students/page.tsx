"use client";

/**
 * 센터 · 학생 — 반 칩 · 검색 · 보호자 연결 필터 → 학생 행 → 자세히(시트)
 *   자세히: 형제 · 등록코드(복사) · 보호자 연락 · 출결 합계
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Photo } from "@/components/staff/Photo";
import { Badge, Button, ChipRow, Empty, ErrorBox, inputClass, KeyValue, Loading, PageTitle } from "@/components/staff/ui";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { usePageTitle } from "@/hooks/usePageTitle";
import { e164ToLocal } from "@/lib/phone";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { useToast } from "@/providers/ToastProvider";
import { useApi, useQuery, type CenterRosterRow, type RosterGuardianFilter } from "@/services";

const GUARDIAN_FILTERS: Array<{ id: RosterGuardianFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "linked", label: "보호자 연결" },
  { id: "unlinked", label: "미연결" },
];

function useDebounced(value: string, ms: number): string {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function CenterStudentsPage() {
  usePageTitle("학생");
  const api = useApi();
  const toast = useToast();
  const router = useRouter();
  const sp = useSearchParams();
  const { selectedRun, runsLoading } = useCenterRun();
  const runId = selectedRun?.id ?? null;

  const section = sp.get("section") ?? "all";
  const guardian = (sp.get("guardian") as RosterGuardianFilter | null) ?? "all";
  const [q, setQ] = useState("");
  const dq = useDebounced(q.trim(), 200);
  const [detail, setDetail] = useState<CenterRosterRow | null>(null);

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(sp.toString());
    if (value === "all") p.delete(key);
    else p.set(key, value);
    router.replace(`/admin/center/students${p.size ? `?${p}` : ""}`, { scroll: false });
  };

  const { data, loading, error, refetch } = useQuery(
    () => (runId ? api.center.listRoster({ programRunId: runId, sectionId: section === "all" ? undefined : section, q: dq || undefined, guardianFilter: guardian }) : null),
    [api, runId, section, dq, guardian],
  );

  const sectionChips = useMemo(
    () => [{ id: "all", label: "전체", count: selectedRun?.studentCount }, ...(selectedRun?.sections ?? []).map((s) => ({ id: s.id, label: s.label, count: s.studentCount }))],
    [selectedRun],
  );

  if (runsLoading) return <Loading />;
  if (!selectedRun) return <Empty title="운영 건을 먼저 골라 주세요" />;

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.show(`${what}를 복사했어요`);
    } catch {
      toast.show("복사하지 못했어요");
    }
  }

  return (
    <div>
      <PageTitle title="학생" desc={`${selectedRun.title} · ${selectedRun.studentCount}명`} />

      <ChipRow label="반" items={sectionChips} value={section} onChange={(v) => setParam("section", v)} />
      <div className="mt-2 flex gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름으로 찾기"
          aria-label="학생 이름 검색"
          className={`${inputClass} flex-1`}
        />
      </div>
      <div className="mt-2">
        <ChipRow label="보호자 연결" items={GUARDIAN_FILTERS} value={guardian} onChange={(v) => setParam("guardian", v)} />
      </div>

      {error ? (
        <ErrorBox message={error} onRetry={() => void refetch()} />
      ) : loading && !data ? (
        <Loading />
      ) : !data || data.rows.length === 0 ? (
        <div className="mt-3">
          <Empty title="조건에 맞는 학생이 없어요" />
        </div>
      ) : (
        <>
          <p className="mt-3 text-[14px] text-sub" data-testid="roster-count">
            {data.total}명
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {data.rows.map((r) => (
              <li key={r.enrollmentId}>
                <button
                  type="button"
                  onClick={() => setDetail(r)}
                  className="tap flex w-full items-center gap-3 rounded-[16px] border border-line bg-card px-4 py-3 text-left hover:border-gold-dim"
                >
                  <Photo id={r.studentId} name={r.name} photoUrl={r.photoUrl} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[17px] font-bold text-fg">{r.name}</span>
                      <span className="text-[14px] text-sub">{r.sectionLabel}</span>
                    </span>
                    <span className="mt-[2px] block text-[14px] text-sub">
                      출석 {r.attendance.present} · 지각 {r.attendance.late} · 결석 {r.attendance.absent}
                      {r.siblingNames.length > 0 ? ` · 형제 ${r.siblingNames.join(", ")}` : ""}
                    </span>
                  </span>
                  <Badge tone={r.guardianLinked ? "gold" : "late"}>{r.guardianLinked ? "연결" : "미연결"}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <BottomSheet open={!!detail} onClose={() => setDetail(null)} title={detail?.name}>
        {detail && (
          <div className="flex flex-col gap-4 pb-2">
            <div className="flex items-center gap-3">
              <Photo id={detail.studentId} name={detail.name} photoUrl={detail.photoUrl} size={56} />
              <div>
                <p className="text-[16px] text-fg2">
                  {detail.sectionLabel} · {detail.guardianSummary}
                </p>
                <p className="text-[14px] text-sub">
                  출석 {detail.attendance.present} · 지각 {detail.attendance.late} · 결석 {detail.attendance.absent}
                </p>
              </div>
            </div>
            <KeyValue
              items={[
                { k: "형제", v: detail.siblingNames.length > 0 ? detail.siblingNames.join(", ") : "없음" },
                {
                  k: "등록코드",
                  v: detail.enrollmentCodeStatus === "used" ? "사용 완료" : detail.enrollmentCode ? <span className="font-mono text-[16px] text-gold">{detail.enrollmentCode}</span> : "없음",
                },
                { k: "보호자 연락처", v: detail.guardianPhone ? e164ToLocal(detail.guardianPhone) : "연결된 보호자 없음" },
              ]}
            />
            <div className="grid grid-cols-2 gap-2">
              {detail.enrollmentCode && detail.enrollmentCodeStatus === "unused" && (
                <Button onClick={() => void copy(`[ThinkCampus] ${detail.name} 학생 등록코드: ${detail.enrollmentCode}\n앱에서 등록코드를 입력하면 자녀가 연결돼요.`, "초대 안내")} size="lg">
                  초대 안내 복사
                </Button>
              )}
              {detail.guardianPhone && (
                <a href={`tel:${detail.guardianPhone}`} className="tap inline-flex min-h-[52px] items-center justify-center rounded-xl border border-line2 bg-elev px-5 text-[17px] font-bold text-fg2">
                  보호자에게 전화
                </a>
              )}
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
