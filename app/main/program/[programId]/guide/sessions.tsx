/**
 * 프로그램 안내 — 회차별 내용 (시간·기간은 위에 한 번, 회차마다 날짜 · 주제 · 강사)
 * 회차를 누르면 회차 화면 (웹 app/main/program/[programId]/guide/sessions/page.tsx)
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { GuideScreen } from '../../../../../components/program/GuideScreen';
import { Body } from '../../../../../components/program/session/parts';
import type { Program } from '../../../../../data/dummyProgram';
import { periodLine, scheduleLine } from '../../../../../data/programGuide';
import { buildTimeline } from '../../../../../data/programView';
import { formatKoreanDate } from '../../../../../lib/dates';

export default function GuideSessionsScreen() {
  return (
    <GuideScreen section="sessions">
      {({ program, programId, passParams }) => (
        <SessionsSection
          program={program}
          onOpen={(sessionId) =>
            router.push({
              pathname: '/main/program/[programId]/session/[sessionId]',
              params: { programId, sessionId, ...passParams },
            })
          }
        />
      )}
    </GuideScreen>
  );
}

function SessionsSection({ program, onOpen }: { program: Program; onOpen: (sessionId: string) => void }) {
  const timeline = buildTimeline(program);
  return (
    <>
      {/* 시간·기간은 위에 한 번만 */}
      <View style={styles.scheduleBox}>
        <Text style={styles.scheduleMain}>{scheduleLine(program)}</Text>
        <Text style={styles.scheduleSub}>
          {periodLine(program)} · 총 {program.totalSessions}회
        </Text>
      </View>
      <Body style={styles.hint}>회차를 누르면 수업 내용·강사·준비물을 볼 수 있어요.</Body>
      {timeline.map((e) =>
        e.kind === 'session' ? (
          <TouchableOpacity
            key={e.session.id}
            onPress={() => onOpen(e.session.id)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${e.session.sessionNumber}회차 ${e.session.topic}`}
            style={styles.sessionRow}
          >
            <View style={styles.numBox}>
              <Text style={styles.numText}>{e.session.sessionNumber}</Text>
              <Text style={styles.numUnit}>회차</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionDate}>{formatKoreanDate(e.key)}</Text>
              <Body style={styles.sessionTopic}>{e.session.topic}</Body>
              <Text style={styles.sessionTeacher}>{e.session.instructor.name} 강사</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ) : (
          <View key={`break-${e.key}`} style={styles.breakRow}>
            <Text style={styles.breakText}>
              ⏸ {formatKoreanDate(e.key)} · {e.reason}
            </Text>
          </View>
        ),
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scheduleBox: { borderRadius: 16, backgroundColor: '#eff6ff', paddingHorizontal: 16, paddingVertical: 12 },
  scheduleMain: { fontSize: 17, lineHeight: 26, fontWeight: '700', color: '#1d4ed8' },
  scheduleSub: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: '#374151' },
  hint: { paddingHorizontal: 4, fontSize: 16, color: '#4b5563' },
  sessionRow: {
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
  numBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontSize: 20, lineHeight: 22, fontWeight: '800', color: '#1d4ed8' },
  numUnit: { fontSize: 14, lineHeight: 17, fontWeight: '600', color: '#1d4ed8' },
  sessionDate: { fontSize: 16, fontWeight: '700', color: '#1d4ed8' },
  sessionTopic: { marginTop: 2, fontSize: 18, lineHeight: 26, fontWeight: '700', color: '#111827' },
  sessionTeacher: { fontSize: 15, color: '#4b5563' },
  chevron: { fontSize: 24, color: '#9ca3af' },
  breakRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  breakText: { fontSize: 16, fontWeight: '600', color: '#92400e' },
});
