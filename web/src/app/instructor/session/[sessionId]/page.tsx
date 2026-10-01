"use client";

/**
 * 강사 · 회차 화면 — 출결 / 리포트 / 수업 안내(교수 방안 · 자료) 탭
 *   위: 날짜 · 시간 · 반 · 회차 · 주제, 이전/다음 회차
 *   처음 열면 할 일 순서대로: 출결이 다 안 들어갔으면 출결, 들어갔으면 리포트
 */

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AttendanceEditor } from "@/components/staff/AttendanceEditor";
import { ReportEditor } from "@/components/staff/ReportEditor";
import { Badge, Card, Empty, ErrorBox, fmtDate, Loading } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useApi, useQuery } from "@/services";

type Tab = "attendance" | "report" | "guide";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "attendance", label: "출결" },
  { id: "report", label: "리포트" },
  { id: "guide", label: "수업 안내" },
];

function parseTab(v: string | null): Tab | null {
  if (v === "plan" || v === "materials") return "guide"; // 예전 주소
  return TABS.some((t) => t.id === v) ? (v as Tab) : null;
}

export default function InstructorSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const api = useApi();
  const router = useRouter();
  const sp = useSearchParams();
  const { data, loading, error, refetch } = useQuery(() => (sessionId ? api.instructor.getSessionWorkspace(sessionId) : null), [api, sessionId]);
  usePageTitle(data ? `${data.session.sectionLabel} ${data.session.sessionNumber}회차` : "회차");

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={() => void refetch()} />;
  if (!data) return <Empty title="회차를 찾을 수 없어요" />;

  const s = data.session;
  const defaultTab: Tab = s.recordedCount >= s.enrolledCount && s.enrolledCount > 0 ? "report" : "attendance";
  const tab: Tab = parseTab(sp.get("tab")) ?? defaultTab;
  const setTab = (t: Tab) => router.replace(`/instructor/session/${encodeURIComponent(sessionId)}?tab=${t}`, { scroll: false });
  const hrefOf = (id: string | null) => (id ? `/instructor/session/${encodeURIComponent(id)}?tab=${tab}` : null);
  const prev = hrefOf(data.prevSessionId);
  const next = hrefOf(data.nextSessionId);

  return (
    <div>
      <Link href="/instructor/sessions" className="tap -mt-2 inline-flex h-10 items-center text-[15px] font-semibold text-sub">
        ‹ 내 수업
      </Link>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-gold">
            {fmtDate(s.scheduledDate)} · {s.startTime}–{s.endTime}
          </p>
          <h1 className="mt-1 text-[24px] font-extrabold leading-[32px] text-fg">
            {s.sectionLabel} · {s.sessionNumber}회차
          </h1>
          <p className="mt-1 text-[15px] text-sub">{s.topic}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {s.status === "cancelled" && <Badge tone="dim">휴강</Badge>}
          <StepLink href={prev} label="이전 회차" dir="prev" />
          <StepLink href={next} label="다음 회차" dir="next" />
        </div>
      </div>

      <div role="tablist" aria-label="회차 메뉴" className="sticky z-20 -mx-4 mb-4 flex border-b border-line bg-paper px-4 md:-mx-6 md:px-6" style={{ top: "calc(var(--sat) + 56px)" }}>
        {TABS.map((t) => {
          const on = t.id === tab;
          const count = t.id === "attendance" ? `${s.recordedCount}/${s.enrolledCount}` : t.id === "report" ? `${s.reportedCount}/${s.enrolledCount}` : null;
          return (
            <button key={t.id} type="button" role="tab" aria-selected={on} onClick={() => setTab(t.id)} className={`tap relative flex h-12 flex-1 items-center justify-center gap-1 text-[16px] md:flex-none md:px-6 ${on ? "font-bold text-gold" : "font-medium text-sub"}`}>
              {t.label}
              {count && <span className="text-[14px]">{count}</span>}
              {on && <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-gold" />}
            </button>
          );
        })}
      </div>

      {tab === "guide" && (
        <div className="flex flex-col gap-3">
          <p className="text-[15px] text-sub">장소 · {s.location}</p>
          <Card>
            <p className="text-[16px] leading-[25px] text-fg">{data.plan.description || "이 회차의 설명이 아직 없어요."}</p>
          </Card>
          {data.plan.objectives.length > 0 && (
            <Card>
              <p className="mb-2 text-[15px] font-bold text-gold">학습 목표</p>
              <ul className="list-disc pl-5 text-[15px] leading-[23px] text-fg2">
                {data.plan.objectives.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </Card>
          )}
          {data.plan.teachingMethod && (
            <Card>
              <p className="mb-2 text-[15px] font-bold text-gold">교수 방법</p>
              <p className="text-[15px] leading-[23px] text-fg2">{data.plan.teachingMethod}</p>
            </Card>
          )}
          {data.plan.curriculum.length > 0 && (
            <Card>
              <p className="mb-2 text-[15px] font-bold text-gold">수업 흐름</p>
              <ol className="list-decimal pl-5 text-[15px] leading-[23px] text-fg2">
                {data.plan.curriculum.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ol>
            </Card>
          )}
          {(data.plan.materials.length > 0 || data.plan.rotationNote) && (
            <Card>
              {data.plan.materials.length > 0 && (
                <p className="text-[15px] text-fg2">
                  <b className="text-fg">준비물</b> · {data.plan.materials.join(", ")}
                </p>
              )}
              {data.plan.rotationNote && <p className="mt-1 text-[15px] text-fg2">{data.plan.rotationNote}</p>}
            </Card>
          )}
          <p className="mt-3 text-[16px] font-bold text-fg">수업 자료</p>
          {data.lessonMaterials.length === 0 ? (
            <Empty title="등록된 수업 자료가 없어요" desc="회사에서 프로그램 템플릿에 자료 링크를 넣으면 여기에 보여요." />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.lessonMaterials.map((m) => (
                <li key={m.lessonCode} className="rounded-[16px] border border-line bg-card p-4">
                  <p className="text-[16px] font-bold text-fg">{m.title}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      { url: m.slideViewUrl, label: "슬라이드 보기" },
                      { url: m.activityUrl, label: "활동지" },
                      { url: m.planUrl, label: "교수 방안" },
                    ]
                      .filter((x) => x.url)
                      .map((x) => (
                        <a key={x.label} href={x.url} target="_blank" rel="noreferrer" className="tap inline-flex min-h-[44px] items-center rounded-lg border border-line bg-elev px-4 text-[15px] font-semibold text-fg2">
                          {x.label}
                        </a>
                      ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "attendance" && (
        <AttendanceEditor
          runSessionId={s.id}
          readOnly={s.status === "cancelled"}
          students={data.roster.map((r) => ({ studentId: r.studentId, name: r.name, photoUrl: r.photoUrl, status: r.attendance, lateMinutes: r.lateMinutes }))}
          onSave={(inputs) => api.instructor.recordAttendance(inputs)}
        />
      )}

      {tab === "report" && (
        <ReportEditor runSessionId={s.id} roster={data.roster} onSave={(inputs) => api.instructor.saveReportDrafts(inputs)} onSubmit={() => api.instructor.submitReports(s.id)} />
      )}
    </div>
  );
}

function StepLink({ href, label, dir }: { href: string | null; label: string; dir: "prev" | "next" }) {
  const cls = "tap flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-elev text-[20px] text-fg2";
  const icon = dir === "prev" ? "‹" : "›";
  if (!href) {
    return (
      <span aria-label={label} aria-disabled="true" className={`${cls} opacity-40`}>
        {icon}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} title={label} className={cls}>
      {icon}
    </Link>
  );
}
