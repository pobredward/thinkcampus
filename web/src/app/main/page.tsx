"use client";

/**
 * 홈 화면 (학부모 허브) (모바일 app/main/(tabs)/index.tsx)
 *
 * 구조 (40~50대 학부모 기준 — 첫 화면은 단순하게, 크게):
 *   0. 상단 경로 "홈" (다른 화면과 같은 줄) — 자녀 2명 이상이면 같은 줄 오른쪽에 자녀 전환
 *   1. 환영 인사 한 줄 "환영합니다, OOO 학부모님" — 보호자 이름(lib/guardianName.ts). 자녀 이름은 전환 버튼·카드에 있으니 넣지 않는다
 *      보호자 이름이 없는 계정이면 "학부모님" + 이름을 묻는 카드(GuardianNamePrompt) 한 번
 *   2. 현재 수강 중 프로그램 카드 (탭하면 → 프로그램 화면: 일시·장소 / 수업 안내 / 회차별 수업)
 *   3. 수강 예정 프로그램 카드 — 지금은 숨김 (SHOW_UPCOMING_ON_HOME)
 *   4. FAQ 진입
 *   5. 이전 수강 이력 — 맨 아래 작은 버튼 (→ /main/history)
 * 규정·지침은 프로그램 화면의 수업 안내 안에 "필독"으로 있다 (홈에 따로 두지 않음)
 *
 * 프로그램 카드를 누르면 /main/program/[programId]
 * → 회차를 누르면 출결 / 일정 / 내용 / Q&A / 리포트 탭
 */

import { useEffect, useMemo, useState } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Spinner } from "@/components/ui/Spinner";
import { DUMMY_PROGRAM } from "@/data/dummyProgram";
import { DUMMY_UPCOMING_PROGRAM } from "@/data/dummyUpcomingProgram";
import { DUMMY_PAST_PROGRAMS } from "@/data/dummyHistory";
import { calcSummary } from "@/data/dummyAttendance";
import { pickDummyAttendance, SHOW_UPCOMING_ON_HOME } from "@/data/programView";
import { useAllSessionAttendance } from "@/hooks/useAllSessionAttendance";
import { useStudentPrograms } from "@/hooks/useStudentPrograms";
import { buildProgramCardsFromBundles, type ProgramCard } from "@/lib/programCards";
import { daysBetween, dDayLabel, dotDateToKey, formatShortDate, todayKey } from "@/lib/dates";
import { useGuardianDemoData } from "@/hooks/useDemoExperience";
import { useMainRouter } from "@/hooks/useMainRouter";
import { guardianTitle } from "@/lib/guardianName";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { GuardianNamePrompt } from "@/components/GuardianNamePrompt";
import { HouseholdLinkPrompt } from "@/components/HouseholdLinkPrompt";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useChildren, type Child } from "@/hooks/useChildren";
import { usePendingHousehold } from "@/hooks/usePendingHousehold";
import { consumeHouseholdPromptFlag } from "@/lib/householdPrompt";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSelectedChild } from "@/hooks/useSelectedChild";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

// ── 기기에 남기는 작은 표시 (없거나 막혀 있어도 화면은 그대로) ──

function readFlag(key: string | null): boolean {
  if (!key || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string | null): void {
  if (!key) return;
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* 저장이 막혀 있으면 이번에만 숨김 (laterNow) */
  }
}

// ── 더미: 선택된 자녀의 프로그램 목록 시뮬레이션 ────────
// (나중에 Firestore 에서 studentId 기준으로 조회)

function buildDummyProgramCards(child: Child | null): {
  active: ProgramCard[];
  upcoming: ProgramCard[];
  pastCount: number;
} {
  if (!child) return { active: [], upcoming: [], pastCount: 0 };

  // 자녀마다 진도가 다르게 보이도록 더미 출결 선택 (프로그램 상세와 같은 규칙)
  const attendance = pickDummyAttendance(child.studentId);
  const summary = calcSummary(attendance);
  const doneCount = summary.doneCount;
  const nextSession = DUMMY_PROGRAM.sessions[doneCount] ?? null;

  const active: ProgramCard[] = [child].map((child) => ({
    programId: DUMMY_PROGRAM.id,
    studentId: child.studentId,
    studentName: child.studentName,
    title: DUMMY_PROGRAM.title,
    subtitle: DUMMY_PROGRAM.subtitle,
    totalSessions: DUMMY_PROGRAM.totalSessions,
    totalHours: DUMMY_PROGRAM.totalHours,
    completedSessions: doneCount,
    nextSessionDate: nextSession?.date ?? null,
    nextSessionTopic: nextSession?.topic ?? null,
    nextSessionStartTime: nextSession?.startTime ?? null,
    nextSessionEndTime: nextSession?.endTime ?? null,
    nextSessionLocation: nextSession?.location ?? null,
    fixedDay: DUMMY_PROGRAM.fixedDay,
    frequency: DUMMY_PROGRAM.frequency === "biweekly" ? "격주" : "매주",
    status: "active" as const,
  }));

  // 수강 예정 (더미: 겨울방학 특강 — 수강 확정, 아직 시작 전)
  const up = DUMMY_UPCOMING_PROGRAM;
  const firstSession = up.sessions[0] ?? null;
  const upcoming: ProgramCard[] = [
    {
      programId: up.id,
      studentId: child.studentId,
      studentName: child.studentName,
      title: up.title,
      subtitle: up.subtitle,
      totalSessions: up.totalSessions,
      totalHours: up.totalHours,
      completedSessions: 0,
      nextSessionDate: firstSession?.date ?? null,
      nextSessionTopic: firstSession?.topic ?? null,
      nextSessionStartTime: firstSession?.startTime ?? null,
      nextSessionEndTime: firstSession?.endTime ?? null,
      nextSessionLocation: up.location,
      fixedDay: up.fixedDay,
      frequency: up.frequency === "biweekly" ? "격주" : "매주",
      status: "upcoming",
      startDate: up.startDate,
      endDate: up.endDate,
    },
  ];

  return { active, upcoming, pastCount: DUMMY_PAST_PROGRAMS.length };
}

// ── 메인 컴포넌트 ────────────────────────────────────────

export default function HomeScreen() {
  usePageTitle("홈");
  const { pushMain } = useMainRouter();
  const toast = useToast();
  const guardianDemo = useGuardianDemoData();
  const { user, guardianName, saveGuardianName } = useAuth();
  // 이름을 묻는 카드: 이름이 없는 계정에만, [나중에]를 누른 기기에서는 다시 묻지 않음
  const laterKey = user ? `tc.namePrompt.later.${user.uid}` : null;
  const [laterNow, setLaterNow] = useState<string | null>(null); // 저장이 막힌 브라우저에서도 이번에는 숨김
  const promptLater = useMemo(() => laterNow === laterKey || readFlag(laterKey), [laterKey, laterNow]);
  const showNamePrompt = !!user && !guardianDemo && !guardianName && !promptLater;
  const { children, loading, refresh: refreshChildren } = useChildren({ activeOnly: true });
  const { pending: pendingHousehold, refetch: refetchHousehold } = usePendingHousehold(!!user && !guardianDemo);
  const hhLaterKey = user ? `tc.householdBanner.later.${user.uid}` : null;
  const [hhLaterNow, setHhLaterNow] = useState<string | null>(null);
  const hhBannerLater = useMemo(
    () => hhLaterNow === hhLaterKey || readFlag(hhLaterKey),
    [hhLaterKey, hhLaterNow],
  );
  const [autoHouseholdOpen, setAutoHouseholdOpen] = useState(false);
  useEffect(() => {
    if (consumeHouseholdPromptFlag()) setAutoHouseholdOpen(true);
  }, []);
  const { selected, selectedIndex, select } = useSelectedChild(children, user?.uid);
  const hasMultiple = children.length >= 2;
  const { bundles, loading: programsLoading } = useStudentPrograms(selected?.studentId);
  const { byProgramRunId: attendanceByRunId } = useAllSessionAttendance(
    selected?.studentId,
    !guardianDemo && !!selected,
  );

  const firestoreCards = useMemo(() => {
    if (!selected || guardianDemo || bundles.length === 0) return null;
    return buildProgramCardsFromBundles(
      selected.studentId,
      selected.studentName,
      bundles,
      attendanceByRunId,
    );
  }, [selected, bundles, attendanceByRunId]);

  const dummyCards = useMemo(() => buildDummyProgramCards(selected), [selected]);
  const { active, upcoming, pastCount } = firestoreCards ?? dummyCards;
  const cardsLoading = !guardianDemo && programsLoading && !!selected;

  const goToProgram = (card: ProgramCard) => {
    const qs = new URLSearchParams({
      studentName: card.studentName,
      programTitle: card.title,
      sid: card.studentId,
    });
    pushMain(`/main/program/${card.programId}?${qs.toString()}`);
  };

  return (
    <div className="flex flex-1 flex-col bg-paper pb-8">
      {/* ── 상단: 경로(다른 화면과 같은 줄 · 지금 화면 "홈") + 오른쪽 자녀 전환 · 인사말 한 줄 ── */}
      <div className="px-5 pb-7" style={{ paddingTop: "calc(var(--sat) + 4px)" }}>
        <Breadcrumbs
          items={[{ label: "홈" }]}
          className="mb-3"
          trailing={
            // 자녀 2명 이상: 오른쪽 위에서 자녀 전환
            !loading && hasMultiple ? (
              <ChildSwitcher items={children} selectedIndex={selectedIndex} onSelect={select} />
            ) : undefined
          }
        />
        {user && (
          <p className="text-[24px] font-semibold leading-[33px] tracking-[-0.01em] text-fg">
            환영합니다, <span className="font-extrabold">{guardianTitle(guardianName)}</span>
          </p>
        )}
        {!loading && hasMultiple && (
          <p className="mt-2 text-[15px] text-sub">연결된 자녀 {children.length}명 · 오른쪽 위에서 전환할 수 있어요</p>
        )}
      </div>

      {/* ── 보호자 이름 묻기 (이름이 없는 계정만) ─── */}
      {!guardianDemo &&
        pendingHousehold.length > 0 &&
        !hhBannerLater &&
        user && (
          <HouseholdLinkPrompt
            pending={pendingHousehold}
            autoOpen={autoHouseholdOpen}
            onLinked={() => {
              void refetchHousehold();
              void refreshChildren();
            }}
            onDismissBanner={() => {
              writeFlag(hhLaterKey);
              setHhLaterNow(hhLaterKey);
            }}
          />
        )}

      {showNamePrompt && (
        <GuardianNamePrompt
          onSave={async (raw) => {
            const name = await saveGuardianName(raw);
            toast.show(`${name} 학부모님, 반가워요`);
          }}
          onLater={() => {
            writeFlag(laterKey);
            setLaterNow(laterKey);
          }}
        />
      )}

      {/* ── 로딩 중 ────────────────────────────── */}
      {loading && (
        <div className="flex flex-col items-center gap-3 p-12">
          <Spinner size="large" />
          <p className="text-[16px] text-sub">자녀 정보를 불러오는 중...</p>
        </div>
      )}

      {/* ── 미등록 상태 ─────────────────────────── */}
      {!loading && children.length === 0 && (
        <div className="m-5 flex flex-col items-center rounded-[20px] border border-dashed border-line bg-card p-9">
          <p className="mb-2 text-[18px] font-bold text-fg2">연결된 자녀가 없습니다</p>
          <p className="text-center text-[16px] leading-[25px] text-sub">
            캠퍼스 담당자에게 받은 등록코드를 입력해
            <br />
            자녀를 등록해주세요.
          </p>
        </div>
      )}

      {/* ── 현재 수강 중 ────────────────────────── */}
      {!loading && active.length > 0 && (
        <>
          <h2 className="sr-only">현재 수강 중인 프로그램</h2>
          {active.map((card) => (
            <ActiveProgramCard
              key={`${card.programId}-${card.studentId}`}
              card={card}
              onPress={() => goToProgram(card)}
            />
          ))}
        </>
      )}

      {/* ── 수강 예정 ───────────────────────────── */}
      {!loading && SHOW_UPCOMING_ON_HOME && upcoming.length > 0 && (
        <>
          <div className="px-5 pt-6 pb-3">
            <h2 className="text-[19px] font-extrabold text-fg">수강 예정 프로그램</h2>
          </div>
          {upcoming.map((card) => (
            <UpcomingProgramCard
              key={`${card.programId}-${card.studentId}`}
              card={card}
              onPress={() => goToProgram(card)}
            />
          ))}
        </>
      )}

      {/* ── FAQ 진입 ───────────────────────────── */}
      {!loading && (
        <button
          type="button"
          className="tap mx-5 mt-4 flex items-center gap-3 rounded-[18px] border border-line bg-card px-5 py-[18px] text-left"
          onClick={() => pushMain("/main/faq")}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-bold text-fg">궁금하신 점이 있으신가요?</p>
            <p className="mt-[2px] text-[15px] text-sub">자주 묻는 질문 · 챗봇 상담</p>
          </div>
          <span aria-hidden="true" className="text-[22px] leading-none text-gold">
            ›
          </span>
        </button>
      )}

      {/* ── 이전 수강 이력 (맨 아래 작은 버튼) ───── */}
      {!loading && pastCount > 0 && (
        <div className="mt-6 flex justify-center px-5">
          <button
            type="button"
            onClick={() => pushMain("/main/history")}
            className="tap rounded-full border border-line bg-card px-5 py-[10px] text-[15px] font-semibold text-sub"
          >
            이전 수강 이력 보기 ({pastCount}) ›
          </button>
        </div>
      )}

      <div className="h-6" />
    </div>
  );
}

// ── 서브 컴포넌트: 수강 중 프로그램 카드 ──────────────────
// 한눈에 볼 것만: 상태 · 프로그램명 · 운영 요일/시간 · 진도 · 다음 수업 한 줄
// (학생 이름은 상단 헤더, 장소·차시·출결·리포트는 프로그램 상세의 회차 화면에서)

function ActiveProgramCard({ card, onPress }: { card: ProgramCard; onPress: () => void }) {
  const progress = card.totalSessions > 0 ? card.completedSessions / card.totalSessions : 0;
  const nextKey = card.nextSessionDate ? dotDateToKey(card.nextSessionDate) : "";
  const days = nextKey ? daysBetween(todayKey(), nextKey) : -1;
  // D-day 는 2주 이내일 때만 (멀리 있는 일정은 날짜만으로 충분)
  const dday = days >= 0 && days <= 14 ? dDayLabel(days) : "";

  return (
    <button
      type="button"
      aria-label={`${card.title} 상세 보기`}
      className="tap mx-5 mb-3 flex flex-col rounded-[20px] border border-line border-t-2 border-t-gold bg-card p-6 text-left"
      onClick={onPress}
    >
      <div className="mb-3 flex w-full items-center justify-between">
        <span className="rounded-md border border-gold-border bg-gold-light px-2 py-[2px] text-[14px] font-bold text-gold">
          수강 중
        </span>
        <span aria-hidden="true" className="text-[22px] leading-none text-gold">
          ›
        </span>
      </div>

      <p className="text-[21px] font-extrabold leading-[30px] tracking-[-0.01em] text-fg">{card.title}</p>
      <p className="mt-1 text-[15px] text-sub">
        {card.frequency} {card.fixedDay}요일
        {card.nextSessionStartTime && card.nextSessionEndTime
          ? ` · ${card.nextSessionStartTime}–${card.nextSessionEndTime}`
          : ""}
      </p>

      <div className="mt-5 flex w-full items-center gap-3">
        <ProgressBar value={progress} height={6} className="flex-1" />
        <span className="shrink-0 text-[14px] font-semibold text-sub">
          {card.completedSessions}/{card.totalSessions}회
        </span>
      </div>

      {nextKey && (
        <div className="mt-5 flex w-full items-center gap-2 border-t border-line pt-4">
          <span className="shrink-0 text-[14px] font-bold text-gold">다음 수업</span>
          <span className="shrink-0 text-[15px] font-bold text-fg">{formatShortDate(nextKey)}</span>
          {card.nextSessionTopic && (
            <span className="min-w-0 flex-1 truncate text-[15px] text-sub">{card.nextSessionTopic}</span>
          )}
          {dday && (
            <span className="shrink-0 rounded-md bg-brand px-[6px] py-[1px] text-[14px] font-bold text-ink">
              {dday}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ── 서브 컴포넌트: 수강 예정 카드 ────────────────────────
// 개강일 · D-day · 요일/시간 · 기간 — 누르면 요약 + 안내 버튼

function UpcomingProgramCard({ card, onPress }: { card: ProgramCard; onPress: () => void }) {
  const firstKey = card.nextSessionDate ? dotDateToKey(card.nextSessionDate) : "";
  const days = firstKey ? daysBetween(todayKey(), firstKey) : -1;
  const dday = days >= 0 ? dDayLabel(days) : "";

  return (
    <button
      type="button"
      aria-label={`수강 예정 · ${card.title} 안내 보기`}
      className="tap mx-5 mb-3 flex flex-col rounded-[20px] border border-line bg-card p-5 text-left"
      onClick={onPress}
    >
      <div className="mb-2 flex w-full items-center justify-between">
        <span className="rounded-[20px] border border-line bg-elev px-[9px] py-[3px] text-[14px] font-bold text-gold">
          수강 예정
        </span>
        <span aria-hidden="true" className="text-[24px] leading-none text-faint">
          ›
        </span>
      </div>

      <p className="text-[20px] font-extrabold leading-[30px] text-fg">{card.title}</p>
      <p className="mt-[2px] text-[15px] text-sub">
        {card.frequency} {card.fixedDay}요일
        {card.nextSessionStartTime && card.nextSessionEndTime
          ? ` · ${card.nextSessionStartTime}–${card.nextSessionEndTime}`
          : ""}
        {` · 총 ${card.totalSessions}회`}
      </p>

      {firstKey && (
        <div className="mt-4 flex w-full items-center gap-2 rounded-xl bg-paper-light px-3 py-[10px]">
          <span className="shrink-0 text-[14px] font-bold text-gold">첫 수업</span>
          <span className="shrink-0 text-[15px] font-bold text-fg">{formatShortDate(firstKey)}</span>
          {card.endDate && (
            <span className="min-w-0 flex-1 truncate text-[15px] text-fg2">
              ~ {formatShortDate(dotDateToKey(card.endDate))}
            </span>
          )}
          {dday && (
            <span className="ml-auto shrink-0 rounded-md bg-brand px-[6px] py-[1px] text-[14px] font-bold text-ink">
              {dday}
            </span>
          )}
        </div>
      )}
      <p className="mt-3 text-[15px] font-semibold text-gold">기간·장소·수업 안내 보기 ›</p>
    </button>
  );
}
