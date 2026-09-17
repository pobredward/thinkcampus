/**
 * 프로그램 화면 (수강 중) — 스크롤 없이 한눈에 (웹 app/main/program/[programId]/page.tsx 와 같은 구성)
 *
 *   [파란 헤더]   학생 · 프로그램명 · 요일/시간 · 기간 · 장소 (날짜는 여기 한 번만)
 *   [수업 안내]   수업 규정·지침 · 공지사항 · 자주 묻는 질문 · 프로그램 목적 (각각 독립 페이지)
 *   [회차별 수업] 1회차 ~ 6회차 버튼 (한 줄에 3개) — 끝난 회차는 회색, 다음 수업은 파란색. 출결은 눌러서 회차 화면에서
 *   [종합 리포트] 모든 회차가 끝나면 열림
 *
 * 회차 버튼을 누르면 → /main/program/[programId]/session/[sessionId]
 *   (출결 · 일정 · 내용 · Q&A · 끝난 회차는 리포트)
 *
 * 수강 예정 프로그램(status: upcoming)은 요약 + 안내 버튼 화면(UpcomingProgram)을 보여 준다.
 *
 * params: programId · studentName · programTitle · sid(학생 id)
 */

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { GuideMenu } from '../../../../components/program/GuideMenu';
import { ProgramHeader } from '../../../../components/program/ProgramHeader';
import { UpcomingProgram } from '../../../../components/program/UpcomingProgram';
import { openGuide } from '../../../../components/program/GuideScreen';
import { periodLine, scheduleLine, type GuideSection } from '../../../../data/programGuide';
import {
  buildDayItems,
  getDummyProgram,
  isDone,
  isProgramFinished,
  isUpcomingProgram,
  nextUpcoming,
  pickDummyAttendance,
  summarize,
  type DayItem,
} from '../../../../data/programView';
import { formatShortDate } from '../../../../lib/dates';

type Params = { programId: string; studentName?: string; programTitle?: string; sid?: string };

export default function ProgramSessionsScreen() {
  const params = useLocalSearchParams<Params>();
  const { programId, studentName = '', sid } = params;

  // TODO: Firestore 에서 programId / studentId 기준 조회
  const program = getDummyProgram(programId);
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

  const goHome = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/main');
  };

  const passParams: Record<string, string> = { studentName, programTitle, ...(sid ? { sid } : {}) };

  // 수강 예정 — 요약 + 안내 버튼
  if (isUpcomingProgram(program)) {
    return (
      <UpcomingProgram
        program={program}
        studentName={studentName}
        programTitle={programTitle}
        passParams={passParams}
        onBack={goHome}
      />
    );
  }

  const summary = summarize(items, program.totalSessions);
  const next = nextUpcoming(items);
  const finished = isProgramFinished(items);

  const openSession = (d: DayItem) =>
    router.push({
      pathname: '/main/program/[programId]/session/[sessionId]',
      params: { programId, sessionId: d.session.id, ...passParams },
    });
  const openReport = () =>
    router.push({ pathname: '/main/program/[programId]/report', params: { programId, ...passParams } });
  const onOpenGuide = (section: GuideSection) => openGuide(programId, section, passParams);

  // 운영 요일·시간 / 기간 / 장소 — 날짜는 여기서 한 번만
  const meta = [
    scheduleLine(program),
    `${periodLine(program)} · 총 ${program.totalSessions}회`,
    `📍 ${program.location}`,
  ].join('\n');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ProgramHeader mode="overview" studentName={studentName} programTitle={programTitle} meta={meta} onBack={goHome} />

      {/* ── 수업 안내 ─────────────────────────── */}
      <Text style={styles.sectionTitle} accessibilityRole="header">
        수업 안내
      </Text>
      <View style={styles.section}>
        <GuideMenu
          sections={['rules', 'notices', 'qna', 'purpose']}
          noticeCount={program.notices?.length}
          onOpen={onOpenGuide}
        />
      </View>

      {/* ── 회차별 수업 ───────────────────────── */}
      <View style={styles.sessionsHead}>
        <Text style={styles.sectionTitleInline} accessibilityRole="header">
          회차별 수업
        </Text>
        <Text style={styles.progress}>
          진행 {summary.done}
          <Text style={styles.progressTotal}> / {summary.total}회</Text>
        </Text>
      </View>
      <Text style={styles.hint} lineBreakStrategyIOS="hangul-word">
        회차를 누르면 출결·내용·Q&amp;A를 볼 수 있어요.
      </Text>
      <View style={[styles.section, styles.grid]}>
        {items.map((d) => (
          <SessionButton key={d.key} item={d} isNext={d === next} onOpen={() => openSession(d)} />
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

// ── 회차 버튼 하나 ─────────────────────────────────────────
// 출결(출석·지각·결석)은 여기서 보이지 않는다 — 눌러서 회차 화면에서 확인
// 상태는 색으로만 구분: 끝난 회차 = 회색(차분하게) · 다음 수업 = 파란색 채움 · 남은 회차 = 흰 바탕 파란 테두리

function SessionButton({ item, isNext, onOpen }: { item: DayItem; isNext: boolean; onOpen: () => void }) {
  const { session, status } = item;
  const cancelled = status === 'cancelled';
  const done = isDone(status);
  const stateLabel = isNext ? ' · 다음 수업' : done ? ' · 완료' : '';

  return (
    <TouchableOpacity
      onPress={onOpen}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${session.sessionNumber}회차 ${session.topic}${stateLabel}`}
      style={[styles.sessionBtn, isNext ? styles.sessionBtnNext : done && styles.sessionBtnDone]}
    >
      <Text style={[styles.sessionNum, isNext ? { color: '#ffffff' } : done && styles.textDone]}>
        {session.sessionNumber}회차
      </Text>
      <Text style={[styles.sessionDate, isNext ? { color: '#dbeafe' } : done && styles.textDone]}>
        {formatShortDate(item.key)}
      </Text>
      {isNext && <Text style={styles.sessionTag}>다음 수업</Text>}
      {done && <Text style={styles.sessionDoneTag}>✓ 완료</Text>}
      {cancelled && <Text style={styles.sessionCancelled}>휴강</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 40 },

  sectionTitle: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  section: { paddingHorizontal: 16 },

  sessionsHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: 12,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitleInline: { fontSize: 20, fontWeight: '800', color: '#111827' },
  progress: { fontSize: 16, fontWeight: '700', color: '#374151' },
  progressTotal: { fontWeight: '500', color: '#6b7280' },
  hint: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, fontSize: 16, color: '#4b5563' },

  // 한 줄에 3개: (전체 - 간격 12×2) / 3
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sessionBtn: {
    flexBasis: '30%',
    flexGrow: 1,
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#bfdbfe',
    backgroundColor: '#ffffff',
    // 버튼처럼 보이도록 아래 그림자
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 0,
    elevation: 3,
  },
  sessionBtnNext: { borderColor: '#1d4ed8', backgroundColor: '#1d4ed8', shadowOpacity: 0.35 },
  // 끝난 회차: 회색 바탕·테두리, 그림자 약하게
  sessionBtnDone: {
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    elevation: 1,
  },
  textDone: { color: '#6b7280' },
  sessionNum: { fontSize: 20, lineHeight: 26, fontWeight: '800', color: '#1d4ed8' },
  sessionDate: { marginTop: 4, fontSize: 15, lineHeight: 20, fontWeight: '600', color: '#374151' },
  sessionTag: { marginTop: 4, fontSize: 14, lineHeight: 18, fontWeight: '700', color: '#ffffff' },
  sessionDoneTag: { marginTop: 4, fontSize: 14, lineHeight: 18, fontWeight: '700', color: '#6b7280' },
  sessionCancelled: { marginTop: 4, fontSize: 14, lineHeight: 18, fontWeight: '600', color: '#6b7280' },

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
