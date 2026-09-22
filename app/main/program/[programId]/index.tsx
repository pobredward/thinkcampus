/**
 * 프로그램 화면 — 첫 화면은 최대한 깔끔하게 (웹 app/main/program/[programId]/page.tsx 와 같은 구성)
 *
 *   [헤더]          상단 경로(홈 › 프로그램) · 학생 · 프로그램명
 *   [수업 규정·지침] 필독 카드 하나 (맨 위, 골드 테두리)
 *   [수업 안내]     프로그램 일시 및 장소 · 프로그램 목적 및 내용 · 공지사항 · 자주 묻는 질문 — 한 줄에 하나씩
 *   [회차별 수업]  1회차 ~ 6회차 (회차만 — 날짜·시간·출결은 눌러서 회차 화면에서)
 *   [종합 리포트]  모든 회차가 끝나면 열림
 *
 * 회차 버튼을 누르면 → /main/program/[programId]/session/[sessionId]
 * 수강 예정 프로그램(status: upcoming)은 같은 구성의 UpcomingProgram 을 보여 준다.
 *
 * params: programId · studentName · programTitle · sid(학생 id) · via(history 면 경로에 "이전 수강 이력")
 */

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { GuideMenu, MenuCard } from '../../../../components/program/GuideMenu';
import { openGuide } from '../../../../components/program/GuideScreen';
import { ProgramHeader } from '../../../../components/program/ProgramHeader';
import { SectionHeading } from '../../../../components/program/SectionHeading';
import { SessionGrid } from '../../../../components/program/SessionGrid';
import { UpcomingProgram } from '../../../../components/program/UpcomingProgram';
import { GUIDE_MENU_SECTIONS, GUIDE_TOP_SECTION, guideSection, type GuideSection } from '../../../../data/programGuide';
import {
  buildDayItems,
  getDummyProgram,
  isProgramFinished,
  isUpcomingProgram,
  nextUpcoming,
  pickDummyAttendance,
  summarize,
  type DayItem,
} from '../../../../data/programView';
import { programCrumbs, programParams } from '../../../../lib/crumbs';
import { C } from '../../../../lib/theme';

type Params = { programId: string; studentName?: string; programTitle?: string; sid?: string; via?: string };

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

  const crumbs = programCrumbs({ programId, programTitle, params, current: true });
  const passParams: Record<string, string> = { ...programParams(params), programTitle };
  const onOpenGuide = (section: GuideSection) => openGuide(programId, section, passParams);
  const openSession = (d: DayItem) =>
    router.push({
      pathname: '/main/program/[programId]/session/[sessionId]',
      params: { programId, sessionId: d.session.id, ...passParams },
    });

  // 수강 예정 — 같은 구성 (진행·리포트 없이)
  if (isUpcomingProgram(program)) {
    return (
      <UpcomingProgram
        program={program}
        studentName={studentName}
        programTitle={programTitle}
        items={items}
        onOpenGuide={onOpenGuide}
        onOpenSession={openSession}
        crumbs={crumbs}
      />
    );
  }

  const summary = summarize(items, program.totalSessions);
  const next = nextUpcoming(items);
  const finished = isProgramFinished(items);
  const openReport = () =>
    router.push({ pathname: '/main/program/[programId]/report', params: { programId, ...passParams } });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ProgramHeader mode="overview" studentName={studentName} programTitle={programTitle} crumbs={crumbs} />

      {/* ── 수업 규정·지침 (필독) ──────────────── */}
      <View style={styles.lift}>
        <MenuCard
          label={guideSection(GUIDE_TOP_SECTION).label}
          badge={guideSection(GUIDE_TOP_SECTION).badge}
          onPress={() => onOpenGuide(GUIDE_TOP_SECTION)}
        />
      </View>

      {/* ── 수업 안내 ─────────────────────────── */}
      <View style={styles.section}>
        <SectionHeading>수업 안내</SectionHeading>
        <GuideMenu sections={GUIDE_MENU_SECTIONS} onOpen={onOpenGuide} />
      </View>

      {/* ── 회차별 수업 ───────────────────────── */}
      <View style={styles.section}>
        <SectionHeading right={`총 ${summary.total}회 · 진행 ${summary.done}회`}>회차별 수업</SectionHeading>
        <SessionGrid items={items} next={next} onOpen={openSession} />
      </View>

      {/* ── 종합 리포트 ───────────────────────── */}
      <View style={styles.reportWrap}>
        {finished ? (
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={openReport}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.reportBtnText}>종합 리포트 보기</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.reportLocked}>
            <Text style={styles.reportLockedTitle}>종합 리포트</Text>
            <Text style={styles.reportLockedDesc} lineBreakStrategyIOS="hangul-word">
              {summary.total}회 수업이 모두 끝나면 열려요. 회차별 리포트는 각 회차에서 볼 수 있어요.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.paper },
  content: { paddingBottom: 40 },
  lift: { paddingHorizontal: 16 },
  section: { paddingHorizontal: 16, paddingTop: 28 },

  reportWrap: { marginHorizontal: 16, marginTop: 28 },
  reportBtn: { backgroundColor: C.gold, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  reportBtnText: { fontSize: 17, fontWeight: '700', color: C.onGold, letterSpacing: 0.2 },
  reportLocked: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#343a47',
    backgroundColor: C.card2,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  reportLockedTitle: { fontSize: 17, fontWeight: '700', color: C.text2 },
  reportLockedDesc: { marginTop: 4, fontSize: 16, lineHeight: 24, color: C.sub },
});
