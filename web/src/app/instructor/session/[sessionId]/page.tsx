"use client";

/**
 * 강사 · 회차 화면 — 교수 방안 / 자료 / 출결 / 리포트 탭
 *   위: 날짜 · 반 · 회차 · 주제 · 장소, 이전/다음 회차
 */

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AttendanceEditor } from "@/components/staff/AttendanceEditor";
import { ReportEditor } from "@/components/staff/ReportEditor";
import { Badge, Button, Card, Empty, ErrorBox, fmtDate, Loading, PageTitle } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useApi, useQuery } from "@/services";

type Tab = "plan" | "materials" | "attendance" | "report";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "plan", label: "교수 방안" },
  { id: "materials", label: "자료" },
  { id: "attendance", label: "출결" },
  { id: "report", label: "리포트" },
];

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
  const tabParam = sp.get("tab") as Tab | null;
  const defaultTab: Tab = s.recordedCount >= s.enrolledCount && s.enrolledCount > 0 ? "report" : "attendance";
  const tab: Tab = tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : defaultTab;
  const setTab = (t: Tab) => router.replace(`/instructor/session/${encodeURIComponent(sessionId)}?tab=${t}`, { scroll: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link href="/instructor/sessions" className="tap inline-flex h-11 items-center text-[15px] font-semibold text-sub">
          ‹ 내 수업
        </Link>
        <div className="flex gap-1">
          <Button href={data.prevSessionId ? `/instructor/session/${encodeURIComponent(data.prevSessionId)}?tab=${tab}` : undefined} variant="secondary" size="sm" disabled={!data.prevSessionId}>
            이전 회차
          </Button>
          <Button href={data.nextSessionId ? `/instructor/session/${encodeURIComponent(data.nextSessionId)}?tab=${tab}` : undefined} variant="secondary" size="sm" disabled={!data.nextSessionId}>
            다음 회차
          </Button>
        </div>
      </div>
      <PageTitle
        eyebrow={`${fmtDate(s.scheduledDate)} · ${s.startTime}–${s.endTime}`}
        title={`${s.sectionLabel} · ${s.sessionNumber}회차`}
        desc={`${s.topic} · ${s.location}`}
        right={s.status === "cancelled" ? <Badge tone="dim">휴강</Badge> : <Badge tone="neutral">{s.enrolledCount}명</Badge>}
      />

      <div role="tablist" aria-label="회차 메뉴" className="sticky top-12 z-20 -mx-4 mb-4 flex border-b border-line bg-paper px-4">
        {TABS.map((t) => {
          const on = t.id === tab;
          const count = t.id === "attendance" ? `${s.recordedCount}/${s.enrolledCount}` : t.id === "report" ? `${s.reportedCount}/${s.enrolledCount}` : null;
          return (
            <button key={t.id} type="button" role="tab" aria-selected={on} onClick={() => setTab(t.id)} className={`tap relative flex h-12 flex-1 items-center justify-center gap-1 text-[15px] ${on ? "font-bold text-gold" : "font-medium text-sub"}`}>
              {t.label}
              {count && <span className="text-[14px]">{count}</span>}
              {on && <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-gold" />}
            </button>
          );
        })}
      </div>

      {tab === "plan" && (
        <div className="flex flex-col gap-3">
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
        </div>
      )}

      {tab === "materials" &&
        (data.lessonMaterials.length === 0 ? (
          <Empty title="등록된 수업 자료가 없어요" desc="회사에서 프로그램 템플릿에 자료 링크를 넣으면 여기에 보여요." />
        ) : (
          <ul className="flex flex-col gap-2">
            {data.lessonMaterials.map((m) => (
              <li key={m.lessonCode} className="rounded-[16px] border border-line bg-card p-4">
                <p className="text-[14px] font-bold text-gold">{m.lessonCode}</p>
                <p className="mt-[2px] text-[16px] font-bold text-fg">{m.title}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.slideViewUrl && (
                    <a href={m.slideViewUrl} target="_blank" rel="noreferrer" className="tap inline-flex min-h-[40px] items-center rounded-lg border border-line bg-elev px-3 text-[14px] font-semibold text-fg2">
                      슬라이드 보기
                    </a>
                  )}
                  {m.activityUrl && (
                    <a href={m.activityUrl} target="_blank" rel="noreferrer" className="tap inline-flex min-h-[40px] items-center rounded-lg border border-line bg-elev px-3 text-[14px] font-semibold text-fg2">
                      활동지
                    </a>
                  )}
                  {m.planUrl && (
                    <a href={m.planUrl} target="_blank" rel="noreferrer" className="tap inline-flex min-h-[40px] items-center rounded-lg border border-line bg-elev px-3 text-[14px] font-semibold text-fg2">
                      교수 방안
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ))}

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
