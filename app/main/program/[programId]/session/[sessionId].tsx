/**
 * 회차 화면 — 회차 하나를 누르면 들어오는 곳 (웹 /main/program/[programId]/session/[sessionId] 와 같은 구성)
 *
 *   (수강 예정 프로그램: 회차별 내용 → 회차. 출결 탭 없이 일정·내용·Q&A, ← 회차별 내용)
 *   [파란 헤더]  ← 회차 목록 · 학생 · N회차 · 주제 · 상태 · 날짜
 *   [탭]        출결 | 일정 | 내용 | Q&A | 리포트(끝난 회차만)   ← 스크롤해도 위에 고정
 *   [탭 내용]
 *   [‹ 이전 회차 | 다음 회차 ›]  (좌우로 밀어도 이동)
 *
 * 선택한 탭은 params.tab 에 담는다. 탭 전환은 setParams, 회차 이동은 replace 라서
 * 뒤로가기 한 번이면 회차 목록으로 돌아간다.
 */

import React, { useMemo, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AttendancePanel } from '../../../../../components/program/session/AttendancePanel';
import { ContentPanel } from '../../../../../components/program/session/ContentPanel';
import { QnaPanel } from '../../../../../components/program/session/QnaPanel';
import { ReportPanel } from '../../../../../components/program/session/ReportPanel';
import { SchedulePanel } from '../../../../../components/program/session/SchedulePanel';
import { STATUS_BADGE } from '../../../../../components/program/statusColors';
import {
  availableTabs,
  buildDayItems,
  defaultTab,
  getDummyProgram,
  isDone,
  isProgramFinished,
  isSessionTab,
  isUpcomingProgram,
  matchProgramReport,
  pickDummyAttendance,
  pickDummyReport,
  SESSION_TABS,
  STATUS_LABEL,
  summarize,
  type DayItem,
  type SessionTab,
} from '../../../../../data/programView';
import { daysBetween, dDayLabel, formatKoreanDate, formatShortDate, todayKey } from '../../../../../lib/dates';

type Params = {
  programId: string;
  sessionId: string;
  tab?: string;
  studentName?: string;
  programTitle?: string;
  sid?: string;
};

export default function SessionScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<Params>();
  const { programId, sessionId, studentName, sid } = params;

  // 화면 사이에 그대로 넘길 값 (탭 제외)
  const passParams = {
    ...(studentName ? { studentName } : {}),
    ...(params.programTitle ? { programTitle: params.programTitle } : {}),
    ...(sid ? { sid } : {}),
  };

  const program = getDummyProgram(programId);
  // 수강 예정 프로그램은 "회차별 내용" 안내 화면에서 들어온다 (출결 탭 없음)
  const upcomingProgram = isUpcomingProgram(program);
  const listLabel = upcomingProgram ? '회차별 내용' : '회차 목록';
  const attendance = useMemo(() => pickDummyAttendance(sid), [sid]);
  const items = useMemo(() => buildDayItems(program, attendance), [program, attendance]);
  const index = items.findIndex((d) => d.session.id === sessionId);
  const item = index >= 0 ? items[index] : null;
  const prev = index > 0 ? items[index - 1] : null;
  const next = index >= 0 && index < items.length - 1 ? items[index + 1] : null;
  const today = todayKey();

  const tabs = item ? availableTabs(item, program) : [];
  const tabParam = params.tab ?? null;
  const tab: SessionTab | null = item
    ? isSessionTab(tabParam) && tabs.includes(tabParam)
      ? tabParam
      : defaultTab(item)
    : null;

  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const headerH = useRef(0);

  function goList() {
    if (router.canGoBack()) router.back();
    else if (upcomingProgram)
      router.replace({ pathname: '/main/program/[programId]/guide/sessions', params: { programId, ...passParams } });
    else router.replace({ pathname: '/main/program/[programId]', params: { programId, ...passParams } });
  }

  // 탭을 바꾸면 내용이 탭 바로 아래부터 보이도록
  function selectTab(t: SessionTab) {
    if (t === tab) return;
    router.setParams({ tab: t });
    if (scrollY.current > headerH.current) {
      scrollRef.current?.scrollTo({ y: headerH.current, animated: false });
    }
  }

  // 다른 회차로: 보던 탭이 그 회차에도 있으면 유지
  function goSession(target: DayItem) {
    const keep = tab && availableTabs(target, program).includes(tab) ? tab : undefined;
    router.replace({
      pathname: '/main/program/[programId]/session/[sessionId]',
      params: { programId, sessionId: target.session.id, ...passParams, ...(keep ? { tab: keep } : {}) },
    });
  }

  // 좌우로 밀어서 회차 이동
  const touch = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: GestureResponderEvent) {
    touch.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
  }
  function onTouchEnd(e: GestureResponderEvent) {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = e.nativeEvent.pageX - start.x;
    const dy = e.nativeEvent.pageY - start.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx > 0 && prev) goSession(prev);
    if (dx < 0 && next) goSession(next);
  }

  if (!item || !tab) {
    return (
      <View style={[styles.notFound, { paddingTop: insets.top }]}>
        <Text style={styles.notFoundText}>회차 정보를 찾을 수 없습니다.</Text>
        <TouchableOpacity onPress={goList}>
          <Text style={styles.notFoundLink}>← {listLabel}으로</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { session, status } = item;
  const dDay = status === 'upcoming' ? dDayLabel(daysBetween(today, item.key)) : '';
  const finished = isProgramFinished(items);
  const badge = STATUS_BADGE[status];
  const openFullReport = () =>
    router.push({ pathname: '/main/program/[programId]/report', params: { programId, ...passParams } });

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      stickyHeaderIndices={[1]}
      onScroll={(e) => {
        scrollY.current = e.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={32}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* 0: 헤더 */}
      <View
        style={[styles.header, { paddingTop: insets.top + 10 }]}
        onLayout={(e) => {
          headerH.current = e.nativeEvent.layout.height;
        }}
      >
        <TouchableOpacity onPress={goList} style={styles.backBtn} hitSlop={8} accessibilityRole="button">
          <Text style={styles.backText}>← {listLabel}</Text>
        </TouchableOpacity>
        <Text style={styles.headerSub}>
          {studentName ? `${studentName} 학생 · ` : ''}
          <Text style={styles.headerSubStrong}>{session.sessionNumber}회차</Text>
        </Text>
        <Text style={styles.headerTitle} lineBreakStrategyIOS="hangul-word">
          {session.topic}
        </Text>
        <View style={styles.headerMeta}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{STATUS_LABEL[status]}</Text>
          </View>
          {!!dDay && (
            <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={[styles.badgeText, { color: '#ffffff' }]}>{dDay}</Text>
            </View>
          )}
          <Text style={styles.headerDate}>
            {formatKoreanDate(item.key)} · {session.startTime}–{session.endTime}
          </Text>
        </View>
      </View>

      {/* 1: 탭 (스크롤해도 위에 고정) */}
      <View style={styles.tabBar} accessibilityRole="tablist">
        {SESSION_TABS.filter((t) => tabs.includes(t.id)).map((t) => {
          const active = t.id === tab;
          return (
            <Pressable
              key={t.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t.title}
              onPress={() => selectTab(t.id)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={styles.tabIcon}>{t.icon}</Text>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* 2: 탭 내용 */}
      <View style={styles.panel}>
        {tab === 'attendance' && <AttendancePanel item={item} summary={summarize(items, program.totalSessions)} />}
        {tab === 'schedule' && <SchedulePanel item={item} today={today} />}
        {tab === 'content' && <ContentPanel session={session} />}
        {tab === 'qna' && <QnaPanel key={session.id} session={session} />}
        {tab === 'report' && isDone(status) && (
          <ReportPanel
            item={item}
            evaluation={matchProgramReport(session.topic, pickDummyReport())}
            onOpenFullReport={finished ? openFullReport : undefined}
          />
        )}
      </View>

      {/* 3: 회차 넘기기 */}
      <View style={styles.nav}>
        <TouchableOpacity
          disabled={!prev}
          onPress={() => prev && goSession(prev)}
          style={[styles.navBtn, !prev && styles.navDisabled]}
          accessibilityRole="button"
        >
          <Text style={styles.navLabel}>‹ 이전 회차</Text>
          <Text style={styles.navValue} numberOfLines={1}>
            {prev ? `${prev.session.sessionNumber}회차 · ${formatShortDate(prev.key)}` : '첫 수업'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={!next}
          onPress={() => next && goSession(next)}
          style={[styles.navBtn, styles.navBtnRight, !next && styles.navDisabled]}
          accessibilityRole="button"
        >
          <Text style={styles.navLabel}>다음 회차 ›</Text>
          <Text style={styles.navValue} numberOfLines={1}>
            {next ? `${next.session.sessionNumber}회차 · ${formatShortDate(next.key)}` : '마지막 수업'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 40 },

  header: { backgroundColor: '#1d4ed8', paddingHorizontal: 20, paddingBottom: 20 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 4, paddingRight: 8 },
  backText: { fontSize: 16, fontWeight: '500', color: '#dbeafe' },
  headerSub: { marginTop: 8, fontSize: 16, color: '#dbeafe' },
  headerSubStrong: { fontWeight: '700', color: '#ffffff' },
  headerTitle: { marginTop: 4, fontSize: 24, lineHeight: 32, fontWeight: '800', color: '#ffffff' },
  headerMeta: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  headerDate: { fontSize: 16, color: '#dbeafe' },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 15, fontWeight: '700' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#1d4ed8', backgroundColor: '#eff6ff' },
  tabIcon: { fontSize: 22, lineHeight: 26 },
  tabText: { fontSize: 17, fontWeight: '600', color: '#4b5563' },
  tabTextActive: { fontWeight: '800', color: '#1d4ed8' },

  panel: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },

  nav: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 24 },
  navBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  navBtnRight: { alignItems: 'flex-end' },
  navDisabled: { opacity: 0.4 },
  navLabel: { fontSize: 15, fontWeight: '700', color: '#4b5563' },
  navValue: { fontSize: 16, color: '#111827' },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#f8fafc' },
  notFoundText: { fontSize: 17, color: '#374151' },
  notFoundLink: { fontSize: 17, fontWeight: '700', color: '#1d4ed8' },
});
