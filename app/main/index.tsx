/**
 * 홈 화면 (학부모 허브)
 *
 * 구조:
 *   1. 환영 인사 + (자녀 2명 이상이면) 오른쪽 위 자녀 전환 버튼
 *   2. 수강 중 / 예정 프로그램 카드 (탭하면 → 프로그램 회차 목록)
 *   3. 수강 이력 (완료된 프로그램)
 *   4. FAQ 진입 카드
 *
 * 프로그램 카드를 누르면 /main/program/[programId] (회차 목록)
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
import { ChildSwitcher } from '../../components/ChildSwitcher';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { calcSummary } from '../../data/dummyAttendance';
import { DUMMY_PROGRAM } from '../../data/dummyProgram';
import { pickDummyAttendance } from '../../data/programView';
import { useChildren, type Child } from '../../hooks/useChildren';
import { useSelectedChild } from '../../hooks/useSelectedChild';
import { daysBetween, dDayLabel, dotDateToKey, formatShortDate, todayKey } from '../../lib/dates';

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
}

// ── 더미: 선택된 자녀의 프로그램 목록 시뮬레이션 ────────
// (나중에 Firestore 에서 studentId 기준으로 조회)

function buildDummyProgramCards(child: Child | null): {
  active: ProgramCard[];
  past: ProgramCard[];
} {
  if (!child) return { active: [], past: [] };

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

  // 이력 (더미: 지난 캠프 2개). 완료된 과정은 다음 수업 정보가 없으므로 null / 빈 값
  const pastBase = {
    nextSessionDate: null,
    nextSessionTopic: null,
    nextSessionStartTime: null,
    nextSessionEndTime: null,
    nextSessionLocation: null,
    fixedDay: '',
    frequency: '',
    status: 'completed' as const,
  };
  const past: ProgramCard[] = [
    {
      ...pastBase,
      programId: 'past-prog-001',
      studentId: child.studentId,
      studentName: child.studentName,
      title: '2026 ThinkCampus 여름학기',
      subtitle: '수학·과학 집중 캠프',
      totalSessions: 6,
      totalHours: 12,
      completedSessions: 6,
    },
    {
      ...pastBase,
      programId: 'past-prog-002',
      studentId: child.studentId,
      studentName: child.studentName,
      title: '2026 영어 스피킹 특강',
      subtitle: '원어민 회화 집중 과정',
      totalSessions: 4,
      totalHours: 8,
      completedSessions: 4,
    },
  ];

  return { active, past };
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

  const { active, past } = buildDummyProgramCards(selected);

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

      {/* ── 수강 중 / 예정 프로그램 ─────────────── */}
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

      {/* ── 수강 이력 ───────────────────────────── */}
      {!loading && past.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📂 이전 수강 이력</Text>
          </View>
          {past.map((card) => (
            <PastProgramCard
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

// ── 서브 컴포넌트: 이전 수강 카드 ────────────────────────

function PastProgramCard({ card, onPress }: { card: ProgramCard; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.pastCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.pastCardLeft}>
        <View style={styles.pastIconWrap}>
          <Text style={styles.pastIcon}>✅</Text>
        </View>
        <View style={styles.pastCardInfo}>
          <Text style={styles.pastCardStudent}>{card.studentName} 학생</Text>
          <Text style={styles.pastCardTitle} numberOfLines={1}>
            {card.title}
          </Text>
          <Text style={styles.pastCardMeta}>총 {card.totalSessions}회차 · 수료 완료</Text>
        </View>
      </View>
      <View style={styles.pastCardRight}>
        <View style={styles.completedBadge}>
          <Text style={styles.completedBadgeText}>완료</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </View>
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
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },

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

  // 이전 수강 카드
  pastCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pastCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  pastIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastIcon: { fontSize: 22 },
  pastCardInfo: { flex: 1 },
  pastCardStudent: { fontSize: 14, color: '#6b7280', marginBottom: 2 },
  pastCardTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 2 },
  pastCardMeta: { fontSize: 14, color: '#6b7280' },
  pastCardRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  completedBadge: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  completedBadgeText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },

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
