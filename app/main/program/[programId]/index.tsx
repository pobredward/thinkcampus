/**
 * 프로그램 상세 — 회차 목록만 보여 주는 단순한 화면
 *
 *   [파란 헤더]   학생 · 프로그램명 · 요일/시간 · 장소
 *   [진행]        진행 3 / 6회 · 출석/지각/결석
 *   [회차 목록]   1회차 … 6회차 (날짜 · 주제 · 출결 상태, 다음 수업 강조)
 *   [종합 리포트] 모든 회차가 끝나면 열림
 *
 * 회차를 누르면 → /main/program/[programId]/session/[sessionId]
 *   (출결 · 프로그램 일정 · 프로그램 내용 · 프로그램 Q&A · 끝난 회차는 리포트)
 *
 * params: programId · studentName · programTitle · sid(학생 id)
 */

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ProgramHeader } from '../../../../components/program/ProgramHeader';
import { ProgressBar } from '../../../../components/ui/ProgressBar';
import { DUMMY_PROGRAM } from '../../../../data/dummyProgram';
import {
  buildDayItems,
  isDone,
  isProgramFinished,
  nextUpcoming,
  pickDummyAttendance,
  STATUS_LABEL,
  summarize,
  type DayItem,
} from '../../../../data/programView';
import { STATUS_BADGE } from '../../../../components/program/statusColors';
import { daysBetween, dDayLabel, formatKoreanDate, todayKey } from '../../../../lib/dates';

type Params = { programId: string; studentName?: string; programTitle?: string; sid?: string };

export default function ProgramSessionsScreen() {
  const params = useLocalSearchParams<Params>();
  const { programId, studentName = '', sid } = params;

  // TODO: Firestore 에서 programId / studentId 기준 조회
  const program = DUMMY_PROGRAM;
  const programTitle = params.programTitle ?? program.title;

  const attendance = useMemo(() => pickDummyAttendance(sid), [sid]);
  const items = useMemo(() => buildDayItems(program, attendance), [program, attendance]);

  // 예전 회차 상세 주소(/main/program/sess-01)로 들어온 경우 → 회차 화면 "내용" 탭
  if (programId?.startsWith('sess-')) {
    return (
      <Redirect
        href={{
          pathname: '/main/program/[programId]/session/[sessionId]',
          params: { programId: program.id, sessionId: programId, tab: 'content' },
        }}
      />
    );
  }

  const summary = summarize(items, program.totalSessions);
  const next = nextUpcoming(items);
  const finished = isProgramFinished(items);
  const today = todayKey();

  const passParams = { studentName, programTitle, ...(sid ? { sid } : {}) };
  const openSession = (d: DayItem) =>
    router.push({
      pathname: '/main/program/[programId]/session/[sessionId]',
      params: { programId, sessionId: d.session.id, ...passParams },
    });
  const openReport = () =>
    router.push({ pathname: '/main/program/[programId]/report', params: { programId, ...passParams } });

  const goHome = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/main');
  };

  // 두 줄: 운영 요일·시간 / 장소
  const meta = [
    `${program.frequency === 'biweekly' ? '격주' : '매주'} ${program.fixedDay}요일 ${program.startTime}–${program.endTime}`,
    `📍 ${program.location}`,
  ].join('\n');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ProgramHeader mode="overview" studentName={studentName} programTitle={programTitle} meta={meta} onBack={goHome} />

      {/* ── 진행 ─────────────────────────────── */}
      <View style={styles.progressCard}>
        <View style={styles.progressHead}>
          <Text style={styles.progressTitle}>
            진행 {summary.done}
            <Text style={styles.progressTotal}> / {summary.total}회</Text>
          </Text>
          <Text style={styles.progressCounts}>
            출석 <Text style={{ fontWeight: '700', color: '#15803d' }}>{summary.present}</Text> · 지각{' '}
            <Text style={{ fontWeight: '700', color: '#b45309' }}>{summary.late}</Text> · 결석{' '}
            <Text style={{ fontWeight: '700', color: '#dc2626' }}>{summary.absent}</Text>
          </Text>
        </View>
        <ProgressBar value={summary.total ? summary.done / summary.total : 0} height={10} />
      </View>

      {/* ── 회차 목록 ─────────────────────────── */}
      <Text style={styles.sectionTitle} accessibilityRole="header">
        회차별 수업
      </Text>
      <Text style={styles.sectionHint}>회차를 누르면 출결·일정·내용·Q&amp;A를 볼 수 있어요.</Text>
      <View style={styles.list}>
        {items.map((d) => (
          <SessionRow key={d.key} item={d} isNext={d === next} today={today} onOpen={() => openSession(d)} />
        ))}
      </View>

      {/* ── 종합 리포트 ───────────────────────── */}
      <View style={styles.reportWrap}>
        {finished ? (
          <TouchableOpacity style={styles.reportBtn} onPress={openReport} activeOpacity={0.85}>
            <Text style={styles.reportBtnText}>📊 종합 리포트 보기</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.reportLocked}>
            <Text style={styles.reportLockedTitle}>📊 종합 리포트</Text>
            <Text style={styles.reportLockedDesc} lineBreakStrategyIOS="hangul-word">
              {summary.total}회 수업이 모두 끝나면 발급돼요. 회차별 리포트는 각 회차에서 볼 수 있어요.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ── 회차 한 줄 ─────────────────────────────────────────────

function SessionRow({
  item,
  isNext,
  today,
  onOpen,
}: {
  item: DayItem;
  isNext: boolean;
  today: string;
  onOpen: () => void;
}) {
  const { session, status } = item;
  const done = isDone(status);
  const dDay = isNext ? dDayLabel(daysBetween(today, item.key)) : '';
  const badge = STATUS_BADGE[status];

  return (
    <TouchableOpacity
      onPress={onOpen}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${session.sessionNumber}회차 ${session.topic} · ${isNext ? '다음 수업' : STATUS_LABEL[status]}`}
      style={[styles.row, isNext && styles.rowNext]}
    >
      <View style={[styles.numBox, isNext ? styles.numNext : done ? styles.numDone : styles.numLater]}>
        <Text style={[styles.numText, { color: isNext ? '#ffffff' : done ? '#374151' : '#6b7280' }]}>
          {session.sessionNumber}
        </Text>
        <Text style={[styles.numUnit, { color: isNext ? '#ffffff' : done ? '#374151' : '#6b7280' }]}>회차</Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.dateLine}>
          <Text style={[styles.date, isNext && styles.dateNext]}>{formatKoreanDate(item.key)}</Text>
          {isNext && <Text style={styles.nextLabel}>{dDay ? `다음 수업 · ${dDay}` : '다음 수업'}</Text>}
        </View>
        <Text style={styles.topic} lineBreakStrategyIOS="hangul-word">
          {session.topic}
        </Text>
      </View>

      <View style={styles.rowRight}>
        {!isNext && (
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{STATUS_LABEL[status]}</Text>
          </View>
        )}
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 40 },

  progressCard: {
    marginHorizontal: 16,
    marginTop: -12,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  progressHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: 12,
    marginBottom: 8,
  },
  progressTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  progressTotal: { fontWeight: '500', color: '#6b7280' },
  progressCounts: { fontSize: 16, color: '#4b5563' },

  sectionTitle: { paddingHorizontal: 20, paddingTop: 28, fontSize: 20, fontWeight: '800', color: '#111827' },
  sectionHint: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, fontSize: 16, color: '#4b5563' },
  list: { paddingHorizontal: 16, gap: 12 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowNext: {
    borderColor: '#1d4ed8',
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  numBox: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  numNext: { backgroundColor: '#1d4ed8' },
  numDone: { backgroundColor: '#f3f4f6' },
  numLater: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb' },
  numText: { fontSize: 20, lineHeight: 22, fontWeight: '800' },
  numUnit: { fontSize: 14, lineHeight: 17, fontWeight: '600' },

  dateLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 },
  date: { fontSize: 16, color: '#4b5563' },
  dateNext: { fontWeight: '700', color: '#1d4ed8' },
  nextLabel: { fontSize: 15, fontWeight: '700', color: '#1d4ed8' },
  topic: { marginTop: 2, fontSize: 18, lineHeight: 26, fontWeight: '700', color: '#111827' },

  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 15, fontWeight: '700' },
  chevron: { fontSize: 24, color: '#9ca3af' },

  reportWrap: { marginHorizontal: 16, marginTop: 24 },
  reportBtn: { backgroundColor: '#1d4ed8', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  reportBtnText: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  reportLocked: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  reportLockedTitle: { fontSize: 17, fontWeight: '700', color: '#374151' },
  reportLockedDesc: { marginTop: 4, fontSize: 16, lineHeight: 24, color: '#4b5563' },
});
