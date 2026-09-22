/**
 * 회차 화면 — 회차 하나를 누르면 들어오는 곳 (웹 /main/program/[programId]/session/[sessionId] 와 같은 구성)
 *
 *   (수강 예정 프로그램: 출결 탭 없이 일정·내용·Q&A)
 *   [헤더]      상단 경로(홈 › 프로그램 › N회차) · 학생 · N회차 · 주제 · 상태 · 날짜
 *   [탭]        출결 | 일정 | 내용 | Q&A | 리포트(끝난 회차만) — 글자만, 선택된 탭은 골드 밑줄 · 스크롤해도 위에 고정
 *   [탭 내용]
 *   [‹ 이전 회차 | 다음 회차 ›]  (좌우로 밀어도 이동)
 *
 * 선택한 탭은 params.tab 에 담는다. 탭 전환은 setParams, 회차 이동은 replace 라서
 * 뒤로가기 한 번(또는 상단 경로의 프로그램)이면 회차 목록으로 돌아간다.
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
  matchProgramReport,
  pickDummyAttendance,
  pickDummyReport,
  SESSION_TABS,
  STATUS_LABEL,
  summarize,
  type DayItem,
  type SessionTab,
} from '../../../../../data/programView';
import { Breadcrumbs } from '../../../../../components/ui/Breadcrumbs';
import { faqHref, programHref, programParams, sessionCrumbs } from '../../../../../lib/crumbs';
import { daysBetween, dDayLabel, formatKoreanDate, formatShortDate, todayKey } from '../../../../../lib/dates';
import { C } from '../../../../../lib/theme';

type Params = {
  programId: string;
  sessionId: string;
  tab?: string;
  studentName?: string;
  programTitle?: string;
  sid?: string;
  via?: string;
};

export default function SessionScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<Params>();
  const { programId, sessionId, studentName, sid } = params;

  // 화면 사이에 그대로 넘길 값 (탭 제외)
  const passParams = programParams(params);

  const program = getDummyProgram(programId);
  const listLabel = '회차 목록';
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
    router.dismissTo(programHref(programId, params));
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
        style={[styles.header, { paddingTop: insets.top + 4 }]}
        onLayout={(e) => {
          headerH.current = e.nativeEvent.layout.height;
        }}
      >
        <Breadcrumbs
          items={sessionCrumbs({
            programId,
            programTitle: params.programTitle ?? program.title,
            params,
            sessionNumber: session.sessionNumber,
          })}
        />
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
            <View style={[styles.badge, { backgroundColor: C.elev }]}>
              <Text style={[styles.badgeText, { color: C.goldSoft }]}>{dDay}</Text>
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
              aria-selected={active}
              accessibilityLabel={t.title}
              onPress={() => selectTab(t.id)}
              style={[styles.tab, active && styles.tabActive]}
            >
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
        {tab === 'qna' && (
          <QnaPanel
            key={session.id}
            session={session}
            chatbotHref={faqHref({ from: 'session', programId, params, sessionId: session.id, sessionNumber: session.sessionNumber })}
          />
        )}
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
  container: { flex: 1, backgroundColor: C.paper },
  content: { paddingBottom: 40 },

  header: { backgroundColor: C.bg, paddingHorizontal: 20, paddingBottom: 16 },
  headerSub: { marginTop: 4, fontSize: 16, color: C.onInk },
  headerSubStrong: { fontWeight: '700', color: C.white },
  headerTitle: { marginTop: 4, fontSize: 24, lineHeight: 32, fontWeight: '800', color: C.white },
  headerMeta: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  headerDate: { fontSize: 16, color: C.onInk },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 15, fontWeight: '700' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 13,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: C.gold },
  tabText: { fontSize: 17, fontWeight: '600', color: C.sub },
  tabTextActive: { fontWeight: '800', color: C.gold },

  panel: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },

  nav: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 24 },
  navBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  navBtnRight: { alignItems: 'flex-end' },
  navDisabled: { opacity: 0.4 },
  navLabel: { fontSize: 15, fontWeight: '700', color: '#9aa0ab' },
  navValue: { fontSize: 16, color: C.text },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: C.paper },
  notFoundText: { fontSize: 17, color: C.text2 },
  notFoundLink: { fontSize: 17, fontWeight: '700', color: C.gold },
});
