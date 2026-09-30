"use client";

/**
 * 종합 리포트 본문 — 학부모 앱(/main/program/[id]/report) · 공유 페이지(/r/[token]) · 샘플 미리보기가 같이 쓴다
 *
 *   표지 → (버튼 자리) → 종합 → 출석 → 과목별 평가(접기/펼치기) → 회차별 선생님 한마디 → 다음 프로그램 · 마무리
 *   PDF(lib/reportPdf.tsx) 도 같은 순서·같은 문구다.
 */

import { useState } from "react";
import { Collapse } from "@/components/ui/Collapse";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getGradeBg, getGradeColor, GRADE_LABEL, type ProgramReport, type ReportGrade, type StudentReport } from "@/data/dummyReport";

export function GradeBadge({ grade, size = 52 }: { grade: ReportGrade; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[14px] border border-gold-dim"
      style={{ width: size, height: size, backgroundColor: getGradeBg(grade) }}
      aria-label={`등급 ${grade} ${GRADE_LABEL[grade]}`}
    >
      <span
        className="font-black"
        style={{
          color: getGradeColor(grade),
          fontSize: Math.round(size * 0.55),
        }}
      >
        {grade}
      </span>
    </span>
  );
}

function Section({ id, title, right, children }: { id: string; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-7 px-4">
      <div className="mb-2 flex items-end justify-between">
        <h2 id={id} className="text-[15px] font-bold uppercase tracking-[0.4px] text-sub">
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

const STATUS_LABEL = { present: "출석", late: "지각", absent: "결석" } as const;
const STATUS_CLASS = {
  present: "text-gold",
  late: "text-late",
  absent: "text-danger",
} as const;

export function SampleBanner() {
  return (
    <div role="note" className="mx-4 mb-3 rounded-[14px] border border-gold-dim bg-gold-light px-4 py-3" data-testid="report-sample-banner">
      <p className="text-[15px] font-bold text-gold">샘플 리포트예요</p>
      <p className="mt-[2px] text-[14px] leading-[21px] text-fg2">마지막 수업이 끝나면 영업일 3~5일 안에 우리 아이의 실제 리포트가 발급돼요. 아래 내용은 리포트가 어떤 모습인지 보여 주는 예시예요.</p>
    </div>
  );
}

export function FinalReportView({
  report,
  sample = false,
  actions,
  cover = "full",
  defaultExpanded = "first",
}: {
  report: StudentReport;
  /** 샘플이면 배너 + 리포트 번호 대신 '샘플' */
  sample?: boolean;
  /** 표지 아래 버튼 줄 (공유 · PDF) */
  actions?: React.ReactNode;
  /** 앱 화면은 상단 헤더가 이미 학생·프로그램을 보여 주므로 표지에 기간·캠퍼스·발급 정보만 ("meta") */
  cover?: "full" | "meta";
  defaultExpanded?: "first" | "all" | "none";
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (defaultExpanded === "all") return new Set(report.programs.map((p) => p.programId));
    if (defaultExpanded === "first" && report.programs[0]) return new Set([report.programs[0].programId]);
    return new Set();
  });
  const allOpen = expanded.size === report.programs.length;
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setExpanded(allOpen ? new Set() : new Set(report.programs.map((p) => p.programId)));

  const a = report.attendanceSummary;

  return (
    <article className="pb-8" data-testid="final-report" data-sample={sample ? "true" : "false"}>
      {sample && <SampleBanner />}

      {/* ── 표지 ─────────────────────────────── */}
      <div className={`mx-4 rounded-[20px] border border-gold-dim bg-card ${cover === "full" ? "p-5" : "px-5 py-4"}`}>
        {cover === "full" && (
          <>
            <p className="text-[14px] font-bold uppercase tracking-[0.6px] text-gold">종합 학습 리포트</p>
            <h1 className="mt-2 text-[22px] font-extrabold leading-[30px] tracking-[-0.01em] text-fg">{report.programTitle}</h1>
            <p className="mt-1 text-[18px] font-bold text-fg2">{report.studentName} 학생</p>
          </>
        )}
        <dl className={`grid grid-cols-[auto_1fr] gap-x-4 gap-y-[6px] text-[14px] ${cover === "full" ? "mt-4" : ""}`}>
          <dt className="text-sub">기간</dt>
          <dd className="text-fg2">{report.campPeriod}</dd>
          <dt className="text-sub">캠퍼스</dt>
          <dd className="text-fg2">{report.campusName}</dd>
          <dt className="text-sub">발급일</dt>
          <dd className="text-fg2">{sample ? "마지막 수업 뒤 영업일 3~5일" : report.issueDate}</dd>
          <dt className="text-sub">발급처</dt>
          <dd className="text-fg2">{report.issuedBy}</dd>
        </dl>
      </div>

      {actions && <div className="mx-4 mt-3">{actions}</div>}

      {/* ── 종합 ─────────────────────────────── */}
      <Section id="rp-summary" title="종합">
        <div className="rounded-[20px] border border-line bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] text-sub">종합 점수</p>
              <p className="mt-[2px] flex items-baseline gap-1">
                <span className="text-[40px] font-extrabold leading-[1.15] text-fg" data-testid="report-total-score">
                  {report.totalScore}
                </span>
                <span className="text-[16px] text-sub">/ 100</span>
              </p>
              <p className="mt-[2px] text-[14px] font-bold text-gold">
                {report.totalGrade} · {GRADE_LABEL[report.totalGrade]}
              </p>
            </div>
            <GradeBadge grade={report.totalGrade} />
          </div>

          {report.personalityType && (
            <div className="mt-4 rounded-[12px] bg-elev p-[14px]">
              <p className="text-[14px] font-bold text-sub">학습 성향</p>
              <p className="mt-1 text-[17px] font-bold text-fg">{report.personalityType}</p>
              <p className="mt-1 text-[15px] leading-[23px] text-fg2">{report.personalityDesc}</p>
            </div>
          )}

          {(report.strengthAreas.length > 0 || report.growthAreas.length > 0) && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-[12px] border border-gold-dim bg-gold-light p-[12px]">
                <p className="mb-1 text-[14px] font-bold text-gold">강점 분야</p>
                <ul className="flex flex-col gap-[3px]">
                  {report.strengthAreas.map((s) => (
                    <li key={s} className="text-[15px] font-medium leading-[22px] text-fg">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[12px] border border-line bg-elev p-[12px]">
                <p className="mb-1 text-[14px] font-bold text-sub">발전 분야</p>
                <ul className="flex flex-col gap-[3px]">
                  {report.growthAreas.map((s) => (
                    <li key={s} className="text-[15px] font-medium leading-[22px] text-fg2">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {report.overallComment && (
            <div className="mt-3 rounded-[12px] border-l-[3px] border-gold bg-elev p-[14px]">
              <p className="mb-[6px] text-[14px] font-bold text-sub">담임 총평</p>
              <p className="text-[15px] leading-[24px] text-fg2">{report.overallComment}</p>
            </div>
          )}
        </div>
      </Section>

      {/* ── 출석 ─────────────────────────────── */}
      {a.total > 0 && (
        <Section id="rp-attendance" title="출석">
          <div className="grid grid-cols-4 gap-2" data-testid="report-attendance">
            {[
              { k: "출석", v: `${a.present}회`, tone: "text-gold" },
              {
                k: "지각",
                v: `${a.late}회`,
                tone: a.late > 0 ? "text-late" : "text-fg",
              },
              {
                k: "결석",
                v: `${a.absent}회`,
                tone: a.absent > 0 ? "text-danger" : "text-fg",
              },
              {
                k: "과제",
                v: `${a.homeworkDone}/${a.homeworkTotal}`,
                tone: "text-fg",
              },
            ].map((s) => (
              <div key={s.k} className="rounded-[14px] border border-line bg-card px-2 py-3 text-center">
                <p className="text-[14px] text-sub">{s.k}</p>
                <p className={`mt-[2px] text-[20px] font-extrabold ${s.tone}`}>{s.v}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[14px] text-sub">전체 {a.total}회 · 과제는 제출 횟수 / 과제가 있던 회차</p>
        </Section>
      )}

      {/* ── 과목별 평가 ───────────────────────── */}
      {report.programs.length > 0 && (
        <Section
          id="rp-subjects"
          title="과목별 평가"
          right={
            <button type="button" onClick={toggleAll} className="tap rounded-lg border border-line bg-elev px-3 py-[6px] text-[14px] font-bold text-fg2">
              {allOpen ? "모두 접기" : "모두 펼치기"}
            </button>
          }
        >
          <ul className="flex flex-col gap-2">
            {report.programs.map((p) => (
              <li key={p.programId}>
                <SubjectCard program={p} expanded={expanded.has(p.programId)} onToggle={() => toggle(p.programId)} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── 회차별 선생님 한마디 ───────────────── */}
      {report.sessionNotes.length > 0 && (
        <Section id="rp-notes" title="회차별 선생님 한마디">
          <ol className="rounded-[20px] border border-line bg-card px-4 py-1">
            {report.sessionNotes.map((n, i) => (
              <li key={n.sessionNumber} className={`flex gap-3 py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                <span className="mt-[2px] flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-elev text-[14px] font-bold text-gold">{n.sessionNumber}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-[14px] text-sub">
                    <span>{n.date}</span>
                    <span className="font-bold text-fg2">{n.topic}</span>
                    <span>{n.instructorName} 선생님</span>
                    <span className={`font-bold ${STATUS_CLASS[n.status]}`}>{STATUS_LABEL[n.status]}</span>
                  </p>
                  <p className="mt-1 text-[15px] leading-[23px] text-fg">{n.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* ── 다음 프로그램 · 마무리 ───────────── */}
      <Section id="rp-next" title={report.nextProgram || report.closingMessage ? "다음 이야기" : "발급 정보"}>
        {report.nextProgram && (
          <div className="rounded-[20px] border border-gold-dim bg-card p-5">
            <p className="text-[14px] font-bold text-gold">다음 프로그램 안내</p>
            <p className="mt-1 text-[18px] font-bold text-fg">{report.nextProgram.title}</p>
            <p className="mt-[2px] text-[14px] text-sub">{report.nextProgram.period}</p>
            <p className="mt-2 text-[15px] leading-[23px] text-fg2">{report.nextProgram.note}</p>
          </div>
        )}
        {report.closingMessage && <p className="mt-4 px-1 text-[15px] leading-[24px] text-fg2">{report.closingMessage}</p>}
        <p className="mt-5 border-t border-line pt-4 text-[14px] leading-[21px] text-faint">
          {report.issuedBy} · ThinkCampus 공식 학습 리포트
          <br />
          {sample ? "샘플 리포트 · 실제 리포트에는 리포트 번호가 붙어요" : `리포트 번호 ${report.reportId}`}
        </p>
      </Section>
    </article>
  );
}

// ── 과목 카드 ─────────────────────────────────────────────

function SubjectCard({ program: p, expanded, onToggle }: { program: ProgramReport; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-line bg-card" data-testid="report-subject">
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="tap flex w-full items-center gap-3 p-4 text-left">
        <span className="block min-w-0 flex-1">
          <span className="block text-[14px] text-sub">
            {p.sessionNumber}회차 · {p.date}
          </span>
          <span className="mt-[2px] block truncate text-[17px] font-bold text-fg">{p.programName}</span>
          <span className="mt-[2px] block text-[14px] text-sub">
            {p.instructorName} 선생님
            {p.instructorTitle ? ` · ${p.instructorTitle}` : ""}
          </span>
        </span>
        <span className="flex flex-col items-end gap-1">
          <GradeBadge grade={p.grade} size={40} />
          <span className="text-[14px] font-bold text-fg2">{p.overallScore}점</span>
        </span>
        <span className="ml-1 text-[14px] text-sub" aria-hidden="true">
          {expanded ? "∧" : "∨"}
        </span>
      </button>

      <Collapse open={expanded}>
        <div className="flex flex-col gap-4 border-t border-line p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[24px] font-extrabold text-fg">{p.overallScore}점</span>
            <span className="text-[14px] text-sub">{GRADE_LABEL[p.grade]}</span>
            <span className="rounded-lg border border-gold-dim bg-gold-light px-2 py-[3px] text-[14px] font-bold text-gold">
              {p.growthIndex >= 0 ? "+" : ""}
              {p.growthIndex}점 성장
            </span>
            <span className="text-[14px] text-sub">
              첫 시간 {p.preScore} → 마지막 {p.postScore}
            </span>
          </div>

          <div>
            <ul className="flex flex-col gap-[10px]">
              {p.competencies.map((c) => (
                <li key={c.label} className="flex items-center gap-2">
                  <span className="w-[92px] shrink-0 text-[14px] leading-[18px] text-fg2" title={c.description}>
                    {c.label}
                  </span>
                  <span className="relative flex-1">
                    <span className="absolute top-[-3px] z-[1] h-[14px] w-[2px] rounded-[1px] bg-fg2" style={{ left: `${c.benchmark}%` }} aria-label={`또래 평균 ${c.benchmark}`} />
                    <ProgressBar value={c.score / 100} height={8} color={getGradeColor(p.grade)} />
                  </span>
                  <span className="w-8 shrink-0 text-right text-[14px] font-bold text-fg2">{c.score}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-right text-[14px] text-sub">세로선 = 또래 평균</p>
          </div>

          <div className="rounded-[12px] border-l-[3px] border-line2 bg-elev p-3">
            <p className="mb-[6px] text-[14px] font-bold text-sub">강사 코멘트</p>
            <p className="text-[15px] leading-[23px] text-fg2">{p.instructorComment}</p>
          </div>

          {p.highlights.length > 0 && (
            <div>
              <p className="mb-[6px] text-[14px] font-bold text-fg2">인상적이었던 점</p>
              <ul className="flex flex-col gap-[6px]">
                {p.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2">
                    <span className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-gold" aria-hidden="true" />
                    <span className="flex-1 text-[15px] leading-[22px] text-fg2">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.nextSteps.length > 0 && (
            <div className="rounded-[12px] bg-elev p-3">
              <p className="mb-2 text-[14px] font-bold text-gold">집에서 이렇게 이어 가요</p>
              <ol className="flex flex-col gap-2">
                {p.nextSteps.map((s, i) => (
                  <li key={s} className="flex items-start gap-2">
                    <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-gold text-[14px] font-bold leading-none text-ink">{i + 1}</span>
                    <span className="flex-1 text-[15px] leading-[22px] text-fg">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </Collapse>
    </div>
  );
}
