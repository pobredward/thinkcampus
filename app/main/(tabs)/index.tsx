/**
 * 홈 화면 (학부모 허브)
 *
 * 구조 (40~50대 학부모 기준 — 첫 화면은 단순하게, 크게. 웹 app/main/page.tsx 와 동일):
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

import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChildSwitcher } from '../../../components/ChildSwitcher';
import { GuardianNamePrompt } from '../../../components/GuardianNamePrompt';
import { Breadcrumbs } from '../../../components/ui/Breadcrumbs';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { calcSummary } from '../../../data/dummyAttendance';
import { DUMMY_PROGRAM } from '../../../data/dummyProgram';
import { DUMMY_UPCOMING_PROGRAM } from '../../../data/dummyUpcomingProgram';
import { DUMMY_PAST_PROGRAMS } from '../../../data/dummyHistory';
import { pickDummyAttendance, SHOW_UPCOMING_ON_HOME } from '../../../data/programView';
import { useChildren, type Child } from '../../../hooks/useChildren';
import { saveGuardianName, useGuardianName, useNamePromptLater } from '../../../hooks/useGuardianName';
import { useSelectedChild } from '../../../hooks/useSelectedChild';
import { daysBetween, dDayLabel, dotDateToKey, formatShortDate, todayKey } from '../../../lib/dates';
import { guardianTitle } from '../../../lib/guardianName';
import { C } from '../../../lib/theme';

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
  status: 'active' | 'upcoming' | 'completed';
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
  const doneCount = calcSummary(attendance).doneCount;
  const nextSession = DUMMY_PROGRAM.sessions[doneCount] ?? null;

  const active: ProgramCard[] = [
    {
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
      frequency: DUMMY_PROGRAM.frequency === 'biweekly' ? '격주' : '매주',
      status: 'active',
    },
  ];

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
      frequency: up.frequency === 'biweekly' ? '격주' : '매주',
      status: 'upcoming',
      startDate: up.startDate,
      endDate: up.endDate,
    },
  ];

  return { active, upcoming, pastCount: DUMMY_PAST_PROGRAMS.length };
}

// ── 메인 컴포넌트 ────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, children, loading, refreshing, refresh } = useChildren({ activeOnly: true });
  const { selected, selectedIndex, select } = useSelectedChild(children, user?.uid);
  const hasMultiple = children.length >= 2;
  // 인사말은 보호자 이름 — 이름이 없는 계정이면 "학부모님" + 이름을 묻는 카드 한 번
  const guardianName = useGuardianName();
  const [promptLater, dismissPrompt] = useNamePromptLater(user?.uid);
  const showNamePrompt = !!user && !guardianName && !promptLater;

  const { active, upcoming, pastCount } = buildDummyProgramCards(selected);

  const goToProgram = (card: ProgramCard) => {
    router.push({
      pathname: '/main/program/[programId]',
      params: {
        programId: card.programId,
        studentName: card.studentName,
        programTitle: card.title,
        sid: card.studentId,
      },
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={C.gold} />
      }
    >
      {/* ── 상단: 경로(다른 화면과 같은 줄 · 지금 화면 "홈") + 오른쪽 자녀 전환 · 인사말 한 줄 ── */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Breadcrumbs
          items={[{ label: '홈' }]}
          style={styles.crumbs}
          trailing={
            // 자녀 2명 이상: 오른쪽 위에서 자녀 전환
            !loading && hasMultiple ? (
              <ChildSwitcher items={children} selectedIndex={selectedIndex} onSelect={select} />
            ) : undefined
          }
        />
        {!!user && (
          <Text style={styles.welcomeTitle} accessibilityRole="header">
            환영합니다, <Text style={styles.welcomeName}>{guardianTitle(guardianName)}</Text>
          </Text>
        )}
        {!loading && hasMultiple && (
          <Text style={styles.switchHint}>
            연결된 자녀 {children.length}명 · 오른쪽 위에서 전환할 수 있어요
          </Text>
        )}
      </View>

      {/* ── 보호자 이름 묻기 (이름이 없는 계정만) ─── */}
      {showNamePrompt && (
        <GuardianNamePrompt
          onSave={async (raw) => {
            await saveGuardianName(raw);
          }}
          onLater={dismissPrompt}
        />
      )}

      {/* ── 로딩 중 ────────────────────────────── */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={C.gold} size="large" />
          <Text style={styles.loadingText}>자녀 정보를 불러오는 중...</Text>
        </View>
      )}

      {/* ── 미등록 상태 ─────────────────────────── */}
      {!loading && children.length === 0 && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>연결된 자녀가 없습니다</Text>
          <Text style={styles.emptyDesc}>
            캠퍼스 담당자에게 받은 등록코드를 입력해{'\n'}자녀를 등록해주세요.
          </Text>
        </View>
      )}

      {/* ── 현재 수강 중 (헤더 위로 살짝 겹침) ─── */}
      {!loading && active.length > 0 && (
        <View style={styles.lift} accessibilityLabel="현재 수강 중인 프로그램">
          {active.map((card) => (
            <ActiveProgramCard
              key={`${card.programId}-${card.studentId}`}
              card={card}
              onPress={() => goToProgram(card)}
            />
          ))}
        </View>
      )}

      {/* ── 수강 예정 ───────────────────────────── */}
      {!loading && SHOW_UPCOMING_ON_HOME && upcoming.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>수강 예정 프로그램</Text>
          </View>
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
        <TouchableOpacity
          style={styles.faqCard}
          onPress={() => router.push('/main/faq')}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <View style={styles.faqTextWrap}>
            <Text style={styles.faqTitle}>궁금하신 점이 있으신가요?</Text>
            <Text style={styles.faqDesc}>자주 묻는 질문 · 챗봇 상담</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* ── 이전 수강 이력 (맨 아래 작은 버튼) ───── */}
      {!loading && pastCount > 0 && (
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => router.push('/main/history')}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={styles.historyText}>이전 수강 이력 보기 ({pastCount}) ›</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ── 서브 컴포넌트: 수강 중 프로그램 카드 ──────────────────
// 한눈에 볼 것만: 상태 · 프로그램명 · 운영 요일/시간 · 진도 · 다음 수업 한 줄
// (학생 이름은 상단 헤더, 장소·차시·출결·리포트는 회차 화면에서)

function ActiveProgramCard({ card, onPress }: { card: ProgramCard; onPress: () => void }) {
  const progress = card.totalSessions > 0 ? card.completedSessions / card.totalSessions : 0;
  const nextKey = card.nextSessionDate ? dotDateToKey(card.nextSessionDate) : '';
  const days = nextKey ? daysBetween(todayKey(), nextKey) : -1;
  // D-day 는 2주 이내일 때만 (멀리 있는 일정은 날짜만으로 충분)
  const dday = days >= 0 && days <= 14 ? dDayLabel(days) : '';

  return (
    <TouchableOpacity
      style={styles.activeCard}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${card.title} 상세 보기`}
    >
      {/* 상태 + 이동 표시 */}
      <View style={styles.activeCardTop}>
        <View style={styles.goldBadge}>
          <Text style={styles.goldBadgeText}>수강 중</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </View>

      {/* 프로그램명 + 운영 요일/시간 */}
      <Text style={styles.activeCardTitle} lineBreakStrategyIOS="hangul-word">
        {card.title}
      </Text>
      <Text style={styles.activeCardMeta}>
        {card.frequency} {card.fixedDay}요일
        {card.nextSessionStartTime && card.nextSessionEndTime
          ? ` · ${card.nextSessionStartTime}–${card.nextSessionEndTime}`
          : ''}
      </Text>

      {/* 진도 */}
      <View style={styles.progressRow}>
        <ProgressBar value={progress} height={6} style={{ flex: 1 }} />
        <Text style={styles.progressText}>
          {card.completedSessions}/{card.totalSessions}회
        </Text>
      </View>

      {/* 다음 수업 한 줄 */}
      {!!nextKey && (
        <View style={styles.nextRow}>
          <Text style={styles.nextLabel}>다음 수업</Text>
          <Text style={styles.nextDate}>{formatShortDate(nextKey)}</Text>
          {card.nextSessionTopic && (
            <Text style={styles.nextTopic} numberOfLines={1}>
              {card.nextSessionTopic}
            </Text>
          )}
          {!!dday && (
            <View style={styles.ddayBadge}>
              <Text style={styles.ddayText}>{dday}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── 서브 컴포넌트: 수강 예정 카드 (지금은 홈에서 숨김) ─────
// 개강일 · D-day · 요일/시간 · 기간 — 누르면 프로그램 화면

function UpcomingProgramCard({ card, onPress }: { card: ProgramCard; onPress: () => void }) {
  const firstKey = card.nextSessionDate ? dotDateToKey(card.nextSessionDate) : '';
  const days = firstKey ? daysBetween(todayKey(), firstKey) : -1;
  const dday = days >= 0 ? dDayLabel(days) : '';

  return (
    <TouchableOpacity
      style={styles.upcomingCard}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`수강 예정 · ${card.title} 안내 보기`}
    >
      <View style={styles.activeCardTop}>
        <View style={styles.upcomingBadge}>
          <Text style={styles.upcomingBadgeText}>수강 예정</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </View>

      <Text style={styles.activeCardTitle} lineBreakStrategyIOS="hangul-word">
        {card.title}
      </Text>
      <Text style={styles.activeCardMeta}>
        {card.frequency} {card.fixedDay}요일
        {card.nextSessionStartTime && card.nextSessionEndTime
          ? ` · ${card.nextSessionStartTime}–${card.nextSessionEndTime}`
          : ''}
        {` · 총 ${card.totalSessions}회`}
      </Text>

      {!!firstKey && (
        <View style={styles.nextRow}>
          <Text style={styles.nextLabel}>첫 수업</Text>
          <Text style={styles.nextDate}>{formatShortDate(firstKey)}</Text>
          {!!card.endDate && (
            <Text style={styles.nextTopic} numberOfLines={1}>
              ~ {formatShortDate(dotDateToKey(card.endDate))}
            </Text>
          )}
          {!!dday && (
            <View style={styles.ddayBadge}>
              <Text style={styles.ddayText}>{dday}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── 스타일 ────────────────────────────────────────────────
// 학부모용 글자 크기: 최소 14 · 본문 16 이상 · 제목 18~24

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.paper },
  content: { paddingBottom: 32 },

  // 헤더 (잉크)
  header: {
    backgroundColor: C.bg,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  crumbs: { marginBottom: 12 },
  welcomeTitle: { fontSize: 24, fontWeight: '600', color: C.white, lineHeight: 33, letterSpacing: -0.2 },
  welcomeName: { fontWeight: '800', color: C.white },
  switchHint: { marginTop: 8, fontSize: 15, color: C.sub },

  // 로딩
  loadingBox: { padding: 48, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16, color: C.sub },

  // 미등록
  emptyWrap: {
    margin: 20,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262b36',
    borderStyle: 'dashed',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text2, marginBottom: 8 },
  emptyDesc: { fontSize: 16, color: C.sub, textAlign: 'center', lineHeight: 25 },

  // 수강 중 카드는 헤더 위로 살짝 겹친다
  lift: {},

  // 섹션 헤더 (수강 예정용)
  sectionHeader: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: C.text },

  arrow: { fontSize: 22, lineHeight: 24, color: C.gold },

  // 수강 중 카드
  activeCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: C.line,
    borderTopWidth: 2,
    borderTopColor: C.gold,
  },
  activeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  goldBadge: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.goldBorder,
    backgroundColor: C.goldLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  goldBadgeText: { fontSize: 14, color: C.gold, fontWeight: '700' },
  activeCardTitle: { fontSize: 21, fontWeight: '800', color: C.text, lineHeight: 30, letterSpacing: -0.2 },
  activeCardMeta: { marginTop: 4, fontSize: 15, color: C.sub },

  // 진도
  progressRow: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressText: { fontSize: 14, color: C.sub, fontWeight: '600' },

  // 다음 수업 한 줄 (위에 얇은 선)
  nextRow: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextLabel: { fontSize: 14, color: C.gold, fontWeight: '700' },
  nextDate: { fontSize: 15, color: C.text, fontWeight: '700' },
  nextTopic: { flex: 1, fontSize: 15, color: '#9aa0ab' },
  ddayBadge: { backgroundColor: C.gold, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  ddayText: { fontSize: 14, color: C.onGold, fontWeight: '700' },

  // 수강 예정 카드
  upcomingCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: C.line,
  },
  upcomingBadge: {
    backgroundColor: C.inkLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  upcomingBadgeText: { fontSize: 14, color: C.fg2, fontWeight: '700' },

  // 이전 수강 이력 버튼 (작게)
  historyBtn: {
    alignSelf: 'center',
    marginTop: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  historyText: { fontSize: 15, fontWeight: '600', color: '#9aa0ab' },

  // FAQ 카드
  faqCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: C.card,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.line,
    gap: 12,
  },
  faqTextWrap: { flex: 1 },
  faqTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 2 },
  faqDesc: { fontSize: 15, color: C.sub },
});
