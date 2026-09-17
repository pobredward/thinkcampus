"use client";

/**
 * 홈 화면 (학부모 허브) (모바일 app/main/index.tsx)
 *
 * 구조 (40~50대 학부모 기준 — 첫 화면은 단순하게, 크게):
 *   1. 환영 인사 + 학부모 이름
 *   2. ⚠️ 프로그램 이수 규정·지침 버튼 ("반드시 지켜 주세요")
 *   3. 현재 수강 중 프로그램 카드 (탭하면 → 회차 번호 화면)
 *   4. 수강 예정 프로그램 카드 (탭하면 → 요약 + 안내 버튼)
 *   5. FAQ 진입 카드
 *   6. 이전 수강 이력 — 맨 아래 작은 버튼 (→ /main/history)
 *
 * 프로그램 카드를 누르면 /main/program/[programId]
 * → 회차 번호를 누르면 출결 / 일정 / 내용 / Q&A / 리포트 탭
 */

import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Spinner } from "@/components/ui/Spinner";
import { DUMMY_PROGRAM } from "@/data/dummyProgram";
import { DUMMY_UPCOMING_PROGRAM } from "@/data/dummyUpcomingProgram";
import { DUMMY_PAST_PROGRAMS } from "@/data/dummyHistory";
import { calcSummary } from "@/data/dummyAttendance";
import { pickDummyAttendance } from "@/data/programView";
import { daysBetween, dDayLabel, dotDateToKey, formatShortDate, todayKey } from "@/lib/dates";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { useChildren, type Child } from "@/hooks/useChildren";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSelectedChild } from "@/hooks/useSelectedChild";
import { useAuth } from "@/providers/AuthProvider";

// ── 타입 ────────────────────────────────────────────────

// 더미 프로그램 카드 데이터 (나중에 Firestore로 교체)
interface ProgramCard {
  programId: string;
  studentId: string;
  studentName: string;
  title: string;
  subtitle: string;
  totalSessions: number;
  totalHours: number;
  completedSessions: number;
  nextSessionDate: string | null;
  nextSessionTopic: string | null;
  nextSessionStartTime: string | null;
  nextSessionEndTime: string | null;
  nextSessionLocation: string | null;
  fixedDay: string;
  frequency: string;
  status: "active" | "upcoming" | "completed";
  /** 수강 예정 카드용 'YYYY.MM.DD' */
  startDate?: string;
  endDate?: string;
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
  const router = useRouter();
  const { user } = useAuth();
  const { children, loading } = useChildren({ activeOnly: true });
  const { selected, selectedIndex, select } = useSelectedChild(children, user?.uid);
  const hasMultiple = children.length >= 2;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "좋은 아침이에요 ☀️";
    if (h < 18) return "안녕하세요 👋";
    return "좋은 저녁이에요 🌙";
  };

  const { active, upcoming, pastCount } = buildDummyProgramCards(selected);

  const goToProgram = (card: ProgramCard) => {
    const qs = new URLSearchParams({
      studentName: card.studentName,
      programTitle: card.title,
      sid: card.studentId,
    });
    router.push(`/main/program/${card.programId}?${qs.toString()}`);
  };

  // 규정·지침 — 수강 중 프로그램의 규정 화면 (돌아올 때 "← 홈")
  const rulesCard = active[0] ?? null;
  const goToRules = (card: ProgramCard) => {
    const qs = new URLSearchParams({
      studentName: card.studentName,
      programTitle: card.title,
      sid: card.studentId,
      from: "home",
    });
    router.push(`/main/program/${card.programId}/guide/rules?${qs.toString()}`);
  };

  return (
    <div className="flex flex-1 flex-col bg-[#f8fafc] pb-8">
      {/* ── 상단 환영 헤더 ─────────────────────── */}
      <div className="bg-brand px-5 pb-7" style={{ paddingTop: "calc(var(--sat) + 28px)" }}>
        <div className="mb-[14px] flex min-h-9 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-[10px]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/20">
              <span className="text-[15px] font-extrabold text-white">TC</span>
            </div>
            <span className="truncate text-[16px] font-medium text-blue-100">{greeting()}</span>
          </div>
          {/* 자녀 2명 이상: 오른쪽 위에서 자녀 전환 */}
          {!loading && hasMultiple && (
            <ChildSwitcher items={children} selectedIndex={selectedIndex} onSelect={select} />
          )}
        </div>
        {selected && (
          <p className="text-[24px] font-semibold leading-[32px] text-white">
            환영합니다,{" "}
            <span className="font-extrabold text-white">{selected.studentName} 학부모님!</span>
          </p>
        )}
        {!loading && hasMultiple && (
          <p className="mt-1 text-[15px] text-blue-100">
            연결된 자녀 {children.length}명 · 오른쪽 위에서 전환할 수 있어요
          </p>
        )}
        {loading && (
          <div className="mt-2 flex justify-center">
            <Spinner color="#ffffff" />
          </div>
        )}
      </div>

      {/* ── 로딩 중 ────────────────────────────── */}
      {loading && (
        <div className="flex flex-col items-center gap-3 p-12">
          <Spinner color="#1d4ed8" size="large" />
          <p className="text-[16px] text-gray-500">자녀 정보를 불러오는 중...</p>
        </div>
      )}

      {/* ── 미등록 상태 ─────────────────────────── */}
      {!loading && children.length === 0 && (
        <div className="m-5 flex flex-col items-center rounded-[20px] border border-dashed border-gray-200 bg-white p-9">
          <span className="mb-3 text-[40px]">📋</span>
          <p className="mb-2 text-[18px] font-bold text-gray-700">연결된 자녀가 없습니다</p>
          <p className="text-center text-[16px] leading-[25px] text-gray-500">
            캠퍼스 담당자에게 받은 등록코드를 입력해
            <br />
            자녀를 등록해주세요.
          </p>
        </div>
      )}

      {/* ── 규정·지침 (반드시 지켜 주세요) ─────── */}
      {!loading && rulesCard && (
        <button
          type="button"
          aria-label="프로그램 이수 규정·지침 보기"
          onClick={() => goToRules(rulesCard)}
          className="tap mx-5 mt-5 flex items-center gap-3 rounded-[18px] border border-red-200 bg-red-50 px-4 py-4 text-left"
        >
          <span aria-hidden="true" className="text-[28px] leading-none">
            ⚠️
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[18px] font-extrabold leading-[26px] text-red-700">프로그램 이수 규정·지침</span>
            <span className="block text-[15px] font-semibold text-red-600">반드시 지켜 주세요 · 지각·결석 기준</span>
          </span>
          <span aria-hidden="true" className="text-[24px] text-red-300">
            ›
          </span>
        </button>
      )}

      {/* ── 현재 수강 중 ────────────────────────── */}
      {!loading && active.length > 0 && (
        <>
          <div className="px-5 pt-6 pb-3">
            <h2 className="text-[19px] font-extrabold text-gray-900">📌 현재 수강 중인 프로그램</h2>
          </div>
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
      {!loading && upcoming.length > 0 && (
        <>
          <div className="px-5 pt-6 pb-3">
            <h2 className="text-[19px] font-extrabold text-gray-900">🗓 수강 예정 프로그램</h2>
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

      {/* ── FAQ 진입 카드 ───────────────────────── */}
      {!loading && (
        <button
          type="button"
          className="tap mx-5 mt-5 flex items-center gap-3 rounded-[14px] border border-gray-200 bg-white p-4 text-left"
          onClick={() => router.push("/main/faq")}
        >
          <span className="text-[26px]">💬</span>
          <div className="min-w-0 flex-1">
            <p className="mb-[2px] text-[16px] font-bold text-gray-700">궁금하신 점이 있으신가요?</p>
            <p className="text-[14px] text-gray-500">FAQ · 자주 묻는 질문 보기</p>
          </div>
          <span className="text-[24px] font-light text-gray-300">›</span>
        </button>
      )}

      {/* ── 이전 수강 이력 (맨 아래 작은 버튼) ───── */}
      {!loading && pastCount > 0 && (
        <div className="mt-6 flex justify-center px-5">
          <button
            type="button"
            onClick={() => router.push("/main/history")}
            className="tap rounded-full border border-gray-200 bg-white px-5 py-[10px] text-[15px] font-semibold text-gray-600"
          >
            📂 이전 수강 이력 보기 ({pastCount}) ›
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
      className="tap mx-5 mb-3 flex flex-col rounded-[20px] border border-blue-100 bg-white p-5 text-left shadow-[0_2px_8px_rgba(29,78,216,0.08)]"
      onClick={onPress}
    >
      {/* 상태 + 이동 표시 */}
      <div className="mb-2 flex w-full items-center justify-between">
        <span className="flex items-center gap-[5px] rounded-[20px] border border-green-200 bg-green-50 px-[9px] py-[3px]">
          <span className="h-[6px] w-[6px] rounded-[3px] bg-green-500" />
          <span className="text-[14px] font-bold text-green-600">수강 중</span>
        </span>
        <span aria-hidden="true" className="text-[24px] leading-none text-gray-300">
          ›
        </span>
      </div>

      {/* 프로그램명 + 운영 요일/시간 */}
      <p className="text-[20px] font-extrabold leading-[30px] text-gray-900">{card.title}</p>
      <p className="mt-[2px] text-[15px] text-gray-500">
        {card.frequency} {card.fixedDay}요일
        {card.nextSessionStartTime && card.nextSessionEndTime
          ? ` · ${card.nextSessionStartTime}–${card.nextSessionEndTime}`
          : ""}
      </p>

      {/* 진도 */}
      <div className="mt-4 flex w-full items-center gap-3">
        <ProgressBar value={progress} height={6} className="flex-1" />
        <span className="shrink-0 text-[14px] font-semibold text-gray-500">
          {card.completedSessions}/{card.totalSessions}회
        </span>
      </div>

      {/* 다음 수업 한 줄 */}
      {nextKey && (
        <div className="mt-4 flex w-full items-center gap-2 rounded-xl bg-blue-50 px-3 py-[10px]">
          <span className="shrink-0 text-[14px] font-bold text-blue-600">다음 수업</span>
          <span className="shrink-0 text-[15px] font-bold text-brand">{formatShortDate(nextKey)}</span>
          {card.nextSessionTopic && (
            <span className="min-w-0 flex-1 truncate text-[15px] text-gray-700">{card.nextSessionTopic}</span>
          )}
          {dday && (
            <span className="shrink-0 rounded-md bg-brand px-[6px] py-[1px] text-[14px] font-bold text-white">
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
      className="tap mx-5 mb-3 flex flex-col rounded-[20px] border border-violet-200 bg-white p-5 text-left shadow-[0_2px_8px_rgba(124,58,237,0.08)]"
      onClick={onPress}
    >
      <div className="mb-2 flex w-full items-center justify-between">
        <span className="rounded-[20px] border border-violet-200 bg-violet-50 px-[9px] py-[3px] text-[14px] font-bold text-violet-700">
          수강 예정
        </span>
        <span aria-hidden="true" className="text-[24px] leading-none text-gray-300">
          ›
        </span>
      </div>

      <p className="text-[20px] font-extrabold leading-[30px] text-gray-900">{card.title}</p>
      <p className="mt-[2px] text-[15px] text-gray-500">
        {card.frequency} {card.fixedDay}요일
        {card.nextSessionStartTime && card.nextSessionEndTime
          ? ` · ${card.nextSessionStartTime}–${card.nextSessionEndTime}`
          : ""}
        {` · 총 ${card.totalSessions}회`}
      </p>

      {firstKey && (
        <div className="mt-4 flex w-full items-center gap-2 rounded-xl bg-violet-50 px-3 py-[10px]">
          <span className="shrink-0 text-[14px] font-bold text-violet-700">첫 수업</span>
          <span className="shrink-0 text-[15px] font-bold text-gray-900">{formatShortDate(firstKey)}</span>
          {card.endDate && (
            <span className="min-w-0 flex-1 truncate text-[15px] text-gray-700">
              ~ {formatShortDate(dotDateToKey(card.endDate))}
            </span>
          )}
          {dday && (
            <span className="ml-auto shrink-0 rounded-md bg-violet-600 px-[6px] py-[1px] text-[14px] font-bold text-white">
              {dday}
            </span>
          )}
        </div>
      )}
      <p className="mt-3 text-[15px] font-semibold text-violet-700">기간·장소·수업 안내 보기 ›</p>
    </button>
  );
}
