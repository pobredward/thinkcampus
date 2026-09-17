/**
 * 홈 화면 (학부모 허브)
 *
 * 구조 (40~50대 학부모 기준 — 첫 화면은 단순하게, 크게. 웹 app/main/page.tsx 와 동일):
 *   1. 환영 인사 + (자녀 2명 이상이면) 오른쪽 위 자녀 전환 버튼
 *   2. ⚠️ 프로그램 이수 규정·지침 버튼 ("반드시 지켜 주세요")
 *   3. 현재 수강 중 프로그램 카드 (탭하면 → 회차 번호 화면)
 *   4. 수강 예정 프로그램 카드 (탭하면 → 요약 + 안내 버튼) — 지금은 숨김 (SHOW_UPCOMING_ON_HOME)
 *   5. FAQ 진입 카드
 *   6. 이전 수강 이력 — 맨 아래 작은 버튼 (→ /main/history)
 *
 * 프로그램 카드를 누르면 /main/program/[programId]
 * → 회차 번호를 누르면 출결 / 일정 / 내용 / Q&A / 리포트 탭
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
import { openGuide } from '../../../components/program/GuideScreen';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { calcSummary } from '../../../data/dummyAttendance';
import { DUMMY_PROGRAM } from '../../../data/dummyProgram';
import { DUMMY_UPCOMING_PROGRAM } from '../../../data/dummyUpcomingProgram';
import { DUMMY_PAST_PROGRAMS } from '../../../data/dummyHistory';
import { pickDummyAttendance, SHOW_UPCOMING_ON_HOME } from '../../../data/programView';
import { useChildren, type Child } from '../../../hooks/useChildren';
import { useSelectedChild } from '../../../hooks/useSelectedChild';
import { daysBetween, dDayLabel, dotDateToKey, formatShortDate, todayKey } from '../../../lib/dates';

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

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return '좋은 아침이에요 ☀️';
    if (h < 18) return '안녕하세요 👋';
    return '좋은 저녁이에요 🌙';
  };

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

  // 규정·지침 — 수강 중 프로그램의 규정 화면 (돌아올 때 "← 홈")
  const rulesCard = active[0] ?? null;
  const goToRules = (card: ProgramCard) =>
    openGuide(card.programId, 'rules', {
      studentName: card.studentName,
      programTitle: card.title,
      sid: card.studentId,
      from: 'home',
    });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor="#1d4ed8" />
      }
    >
      {/* ── 상단 환영 헤더 ─────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>TC</Text>
            </View>
            <Text style={styles.greetingText} numberOfLines={1}>
              {greeting()}
            </Text>
          </View>
          {/* 자녀 2명 이상: 오른쪽 위에서 자녀 전환 */}
          {!loading && hasMultiple && (
            <ChildSwitcher items={children} selectedIndex={selectedIndex} onSelect={select} />
          )}
        </View>
        {selected && (
          <Text style={styles.welcomeTitle}>
            환영합니다, <Text style={styles.welcomeName}>{selected.studentName} 학부모님!</Text>
          </Text>
        )}
        {!loading && hasMultiple && (
          <Text style={styles.switchHint}>
            연결된 자녀 {children.length}명 · 오른쪽 위에서 전환할 수 있어요
          </Text>
        )}
        {loading && <ActivityIndicator color="#ffffff" style={{ marginTop: 8 }} />}
      </View>

      {/* ── 로딩 중 ────────────────────────────── */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#1d4ed8" size="large" />
          <Text style={styles.loadingText}>자녀 정보를 불러오는 중...</Text>
        </View>
      )}

      {/* ── 미등록 상태 ─────────────────────────── */}
      {!loading && children.length === 0 && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>연결된 자녀가 없습니다</Text>
          <Text style={styles.emptyDesc}>
            캠퍼스 담당자에게 받은 등록코드를 입력해{'\n'}자녀를 등록해주세요.
          </Text>
        </View>
      )}

      {/* ── 규정·지침 (반드시 지켜 주세요) ─────── */}
      {!loading && rulesCard && (
        <TouchableOpacity
          style={styles.rulesBtn}
          onPress={() => goToRules(rulesCard)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="프로그램 이수 규정·지침 보기"
        >
          <Text style={styles.rulesIcon}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.rulesTitle}>프로그램 이수 규정·지침</Text>
            <Text style={styles.rulesDesc}>반드시 지켜 주세요 · 지각·결석 기준</Text>
          </View>
          <Text style={[styles.arrow, { color: '#fca5a5' }]}>›</Text>
        </TouchableOpacity>
      )}

      {/* ── 현재 수강 중 ────────────────────────── */}
      {!loading && active.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📌 현재 수강 중인 프로그램</Text>
          </View>
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🗓 수강 예정 프로그램</Text>
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

      {/* ── FAQ 진입 카드 ───────────────────────── */}
      {!loading && (
        <TouchableOpacity
          style={styles.faqCard}
          onPress={() => router.push('/main/faq')}
          activeOpacity={0.8}
        >
          <Text style={styles.faqEmoji}>💬</Text>
          <View style={styles.faqTextWrap}>
            <Text style={styles.faqTitle}>궁금하신 점이 있으신가요?</Text>
            <Text style={styles.faqDesc}>FAQ · 자주 묻는 질문 보기</Text>
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
          <Text style={styles.historyText}>📂 이전 수강 이력 보기 ({pastCount}) ›</Text>
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
        <View style={styles.activeBadge}>
          <View style={styles.activeDot} />
          <Text style={styles.activeBadgeText}>수강 중</Text>
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

// ── 서브 컴포넌트: 수강 예정 카드 ────────────────────────
// 개강일 · D-day · 요일/시간 · 기간 — 누르면 요약 + 안내 버튼

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
        <View style={styles.upcomingRow}>
          <Text style={styles.upcomingLabel}>첫 수업</Text>
          <Text style={styles.upcomingDate}>{formatShortDate(firstKey)}</Text>
          {!!card.endDate && (
            <Text style={styles.nextTopic} numberOfLines={1}>
              ~ {formatShortDate(dotDateToKey(card.endDate))}
            </Text>
          )}
          {!!dday && (
            <View style={styles.upcomingDday}>
              <Text style={styles.ddayText}>{dday}</Text>
            </View>
          )}
        </View>
      )}
      <Text style={styles.upcomingCta}>기간·장소·수업 안내 보기 ›</Text>
    </TouchableOpacity>
  );
}

// ── 스타일 ────────────────────────────────────────────────
// 학부모용 글자 크기: 최소 14 · 본문 16 이상 · 제목 18~24

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 32 },

  // 헤더
  header: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 36,
    marginBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  greetingText: { fontSize: 16, color: '#dbeafe', fontWeight: '500', flexShrink: 1 },
  welcomeTitle: { fontSize: 24, fontWeight: '600', color: '#ffffff', lineHeight: 32 },
  welcomeName: { fontWeight: '800', color: '#ffffff' },
  switchHint: { marginTop: 4, fontSize: 15, color: '#dbeafe' },

  // 로딩
  loadingBox: { padding: 48, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16, color: '#6b7280' },

  // 미등록
  emptyWrap: {
    margin: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptyDesc: { fontSize: 16, color: '#6b7280', textAlign: 'center', lineHeight: 25 },

  // 섹션 헤더
  sectionHeader: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: '#111827' },

  arrow: { fontSize: 24, color: '#d1d5db', fontWeight: '300' },

  // 수강 중 카드
  activeCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#dbeafe',
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  activeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0fdf4',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  activeBadgeText: { fontSize: 14, color: '#16a34a', fontWeight: '700' },
  activeCardTitle: { fontSize: 20, fontWeight: '800', color: '#111827', lineHeight: 30 },
  activeCardMeta: { marginTop: 2, fontSize: 15, color: '#6b7280' },

  // 진도
  progressRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },

  // 다음 수업 한 줄
  nextRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  nextLabel: { fontSize: 14, color: '#2563eb', fontWeight: '700' },
  nextDate: { fontSize: 15, color: '#1d4ed8', fontWeight: '700' },
  nextTopic: { flex: 1, fontSize: 15, color: '#374151' },
  ddayBadge: { backgroundColor: '#1d4ed8', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  ddayText: { fontSize: 14, color: '#ffffff', fontWeight: '700' },

  // 수강 예정 카드
  upcomingCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  upcomingBadge: {
    backgroundColor: '#f5f3ff',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  upcomingBadgeText: { fontSize: 14, color: '#6d28d9', fontWeight: '700' },
  upcomingRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f5f3ff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  upcomingLabel: { fontSize: 14, color: '#6d28d9', fontWeight: '700' },
  upcomingDate: { fontSize: 15, color: '#111827', fontWeight: '700' },
  upcomingDday: { backgroundColor: '#7c3aed', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  upcomingCta: { marginTop: 12, fontSize: 15, fontWeight: '600', color: '#6d28d9' },

  // 규정·지침 버튼
  rulesBtn: {
    marginHorizontal: 20,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rulesIcon: { fontSize: 28 },
  rulesTitle: { fontSize: 18, lineHeight: 26, fontWeight: '800', color: '#b91c1c' },
  rulesDesc: { fontSize: 15, fontWeight: '600', color: '#dc2626' },

  // 이전 수강 이력 버튼 (작게)
  historyBtn: {
    alignSelf: 'center',
    marginTop: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  historyText: { fontSize: 15, fontWeight: '600', color: '#4b5563' },

  // FAQ 카드
  faqCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  faqEmoji: { fontSize: 26 },
  faqTextWrap: { flex: 1 },
  faqTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 2 },
  faqDesc: { fontSize: 14, color: '#6b7280' },
});
