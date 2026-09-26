"use client";

/**
 * 회차 화면 — 회차 번호를 누르면 들어오는 곳
 * (수강 예정 프로그램: 출결 탭 없이 일정·내용·Q&A)
 *
 *   [헤더]      상단 경로(홈 › 프로그램 › N회차) · 학생 · N회차 · 주제 · 날짜 · 상태
 *   [탭]        출결 | 일정 | 내용 | Q&A | 리포트(끝난 회차만)   ← 스크롤해도 위에 고정
 *   [탭 내용]
 *   [‹ 이전 회차 | 다음 회차 ›]  (좌우 스와이프도 가능)
 *
 * 선택한 탭은 ?tab= 에 담는다(새로고침·공유해도 유지). 탭 전환과 회차 이동은 replace 라서
 * 뒤로가기 한 번이면 회차 목록으로 돌아간다.
 */

import { useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AttendancePanel } from "@/components/program/session/AttendancePanel";
import { ContentPanel } from "@/components/program/session/ContentPanel";
import { QnaPanel } from "@/components/program/session/QnaPanel";
import { ReportPanel } from "@/components/program/session/ReportPanel";
import { SchedulePanel } from "@/components/program/session/SchedulePanel";
import {
  availableTabs,
  buildDayItems,
  defaultTab,
  getDummyProgram,
  isDone,
  isProgramFinished,
  isSessionTab,
  matchProgramReport,
  pickDummyAttendance,
  pickDummyReport,
  SESSION_TABS,
  STATUS_BADGE,
  STATUS_LABEL,
  summarize,
  type DayItem,
  type SessionTab,
} from "@/data/programView";
import { useUpTo } from "@/hooks/useBack";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { faqHref, sessionCrumbs } from "@/lib/crumbs";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useProgramBundle } from "@/hooks/useProgramBundle";
import { useSessionAttendance } from "@/hooks/useSessionAttendance";
import { daysBetween, dDayLabel, formatKoreanDate, formatShortDate, todayKey } from "@/lib/dates";

// 회차 사이 이동(replace)과 Q&A 에서 다녀온 FAQ 는 건너뛰고 목록을 찾는다
const SESSION_PATH = /^\/main\/(program\/[^/]+\/session\/|faq$)/;

export default function SessionPage() {
  const { programId, sessionId } = useParams<{ programId: string; sessionId: string }>();
  const sp = useSearchParams();
  const router = useRouter();

  // tab 을 뺀 나머지 쿼리(studentName · programTitle · sid)는 화면 사이에 그대로 전달
  const baseQs = useMemo(() => {
    const p = new URLSearchParams(sp.toString());
    p.delete("tab");
    return p.toString();
  }, [sp]);
  const sid = sp.get("sid");
  const { program: loaded, fromFirestore } = useProgramBundle(programId, sid);
  const program = loaded ?? getDummyProgram(programId);
  const studentName = sp.get("studentName") ?? "";
  const { attendance: firestoreAttendance } = useSessionAttendance(
    sid,
    programId,
    loaded,
    studentName,
    fromFirestore,
  );
  const listUrl = `/main/program/${programId}${baseQs ? `?${baseQs}` : ""}`;
  const goList = useUpTo(listUrl, { skip: SESSION_PATH });
  const listLabel = "회차 목록";

  const attendance = useMemo(() => {
    if (fromFirestore && firestoreAttendance) return firestoreAttendance;
    return pickDummyAttendance(sid);
  }, [fromFirestore, firestoreAttendance, sid]);
  const items = useMemo(() => buildDayItems(program, attendance), [program, attendance]);
  const index = items.findIndex((d) => d.session.id === sessionId);
  const item = index >= 0 ? items[index] : null;
  const prev = index > 0 ? items[index - 1] : null;
  const next = index >= 0 && index < items.length - 1 ? items[index + 1] : null;
  const today = todayKey();

  const tabs = item ? availableTabs(item, program) : [];
  const tabParam = sp.get("tab");
  const tab: SessionTab | null = item
    ? isSessionTab(tabParam) && tabs.includes(tabParam)
      ? tabParam
      : defaultTab(item)
    : null;

  usePageTitle(item ? `${item.session.sessionNumber}회차 · ${item.session.topic}` : "회차");

  const hrefFor = (target: string, t?: SessionTab | null) => {
    const p = new URLSearchParams(baseQs);
    if (t) p.set("tab", t);
    const q = p.toString();
    return `/main/program/${programId}/session/${target}${q ? `?${q}` : ""}`;
  };

  // 탭을 바꾸면 내용이 탭 바로 아래부터 보이도록
  const headerRef = useRef<HTMLElement>(null);
  function selectTab(t: SessionTab) {
    if (t === tab) return;
    router.replace(hrefFor(sessionId, t), { scroll: false });
    const h = headerRef.current;
    if (h) {
      const top = h.offsetTop + h.offsetHeight;
      if (window.scrollY > top) window.scrollTo({ top });
    }
  }

  // 다른 회차로: 보던 탭이 그 회차에도 있으면 유지
  function goSession(target: DayItem) {
    const keep = tab && availableTabs(target, program).includes(tab) ? tab : null;
    router.replace(hrefFor(target.session.id, keep));
  }

  // 좌우 스와이프로 회차 이동
  const touch = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touch.current = t ? { x: t.clientX, y: t.clientY } : null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touch.current;
    const t = e.changedTouches[0];
    touch.current = null;
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx > 0 && prev) goSession(prev);
    if (dx < 0 && next) goSession(next);
  }

  // 탭 키보드 이동 (← →)
  function onTabKey(e: React.KeyboardEvent) {
    if (!tab || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    const i = tabs.indexOf(tab);
    const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    selectTab(n);
    document.getElementById(`tab-${n}`)?.focus();
  }

  if (!item || !tab) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-20">
        <p className="text-[17px] text-fg2">회차 정보를 찾을 수 없습니다.</p>
        <button type="button" onClick={goList} className="tap text-[17px] font-bold text-gold">
          ← {listLabel}으로
        </button>
      </div>
    );
  }

  const { session, status } = item;
  const dDay = status === "upcoming" ? dDayLabel(daysBetween(today, item.key)) : "";
  const finished = isProgramFinished(items);
  const report = pickDummyReport();
  const openFullReport = () =>
    router.push(`/main/program/${programId}/report${baseQs ? `?${baseQs}` : ""}`);

  return (
    <div className="flex flex-1 flex-col bg-paper pb-10" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header ref={headerRef} className="no-print px-5 pb-4" style={{ paddingTop: "calc(var(--sat) + 4px)" }}>
        <Breadcrumbs
          items={sessionCrumbs({
            programId,
            programTitle: sp.get("programTitle") ?? program.title,
            sp,
            sessionNumber: session.sessionNumber,
          })}
        />
        <p className="mt-1 text-[16px] text-sub">
          {studentName ? `${studentName} 학생 · ` : ""}
          <b className="text-fg">{session.sessionNumber}회차</b>
        </p>
        <h1 className="mt-1 text-[24px] font-extrabold leading-[32px] text-fg">{session.topic}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-lg px-[10px] py-[3px] text-[15px] font-bold ${STATUS_BADGE[status]}`}>
            {STATUS_LABEL[status]}
          </span>
          {dDay && (
            <span className="rounded-lg bg-elev px-[10px] py-[3px] text-[15px] font-bold text-fg">{dDay}</span>
          )}
          <span className="text-[16px] text-sub">
            {formatKoreanDate(item.key)} · {session.startTime}–{session.endTime}
          </span>
        </div>
      </header>

      {/* 탭 — 스크롤해도 위에 고정 */}
      <div className="no-print sticky top-0 z-20 border-b border-line bg-paper">
        <div role="tablist" aria-label="회차 정보" className="flex" onKeyDown={onTabKey}>
          {SESSION_TABS.filter((t) => tabs.includes(t.id)).map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="session-panel"
                tabIndex={active ? 0 : -1}
                onClick={() => selectTab(t.id)}
                className={`tap flex-1 border-b-[3px] pt-[16px] pb-[13px] text-center text-[17px] ${
                  active ? "border-gold font-extrabold text-gold" : "border-transparent font-semibold text-sub"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id="session-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="flex flex-col gap-3 px-4 pt-5"
      >
        {tab === "attendance" && <AttendancePanel item={item} summary={summarize(items, program.totalSessions)} />}
        {tab === "schedule" && <SchedulePanel item={item} today={today} />}
        {tab === "content" && <ContentPanel session={session} />}
        {tab === "qna" && (
          <QnaPanel
            key={session.id}
            session={session}
            chatbotHref={faqHref({ from: "session", programId, sp, sessionId: session.id, sessionNumber: session.sessionNumber })}
          />
        )}
        {tab === "report" && isDone(status) && (
          <ReportPanel
            item={item}
            evaluation={matchProgramReport(session.topic, report)}
            onOpenFullReport={finished ? openFullReport : undefined}
          />
        )}
      </div>

      {/* 회차 넘기기 */}
      <nav aria-label="회차 이동" className="no-print mx-4 mt-6 flex gap-3">
        <button
          type="button"
          disabled={!prev}
          onClick={() => prev && goSession(prev)}
          className="tap flex-1 rounded-2xl border border-line bg-card px-4 py-4 text-left disabled:opacity-40"
        >
          <span className="block text-[15px] font-bold text-sub">‹ 이전 회차</span>
          <span className="block truncate text-[16px] text-fg">
            {prev ? `${prev.session.sessionNumber}회차 · ${formatShortDate(prev.key)}` : "첫 수업"}
          </span>
        </button>
        <button
          type="button"
          disabled={!next}
          onClick={() => next && goSession(next)}
          className="tap flex-1 rounded-2xl border border-line bg-card px-4 py-4 text-right disabled:opacity-40"
        >
          <span className="block text-[15px] font-bold text-sub">다음 회차 ›</span>
          <span className="block truncate text-[16px] text-fg">
            {next ? `${next.session.sessionNumber}회차 · ${formatShortDate(next.key)}` : "마지막 수업"}
          </span>
        </button>
      </nav>
    </div>
  );
}
