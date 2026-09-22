/**
 * 프로그램 안내 — 프로그램 일시 및 장소 (웹 app/main/program/[programId]/guide/schedule/page.tsx)
 *
 *   [일시]              요일·시간 (크게) · 기간 · 총 회차 · 휴강일 · 대상/정원
 *   [장소 · 오시는 길]  장소 (크게) · 지도에서 길찾기 · 주차 · 도착하면 · 데려갈 때 …
 *   (회차별 날짜는 두지 않는다 — 날짜는 회차 버튼을 눌러 회차 화면에서)
 */

import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { GuideScreen } from '../../../../../components/program/GuideScreen';
import { Card, InfoList, InfoRow, InfoValue } from '../../../../../components/program/session/parts';
import type { Program } from '../../../../../data/dummyProgram';
import { mapSearchUrl, periodLine, scheduleLine } from '../../../../../data/programGuide';
import { buildTimeline } from '../../../../../data/programView';
import { formatKoreanDate } from '../../../../../lib/dates';
import { C } from '../../../../../lib/theme';

export default function GuideScheduleScreen() {
  return <GuideScreen section="schedule">{({ program }) => <ScheduleSection program={program} />}</GuideScreen>;
}

function ScheduleSection({ program }: { program: Program }) {
  const breaks = buildTimeline(program).filter((e) => e.kind === 'break');
  const directions = program.directions ?? [];

  return (
    <>
      <Card title="일시">
        <Text style={styles.main}>{scheduleLine(program)}</Text>
        <Text style={styles.sub}>
          {periodLine(program)} · 총 {program.totalSessions}회
        </Text>
        {breaks.map((b) => (
          <View key={`break-${b.key}`} style={styles.breakBox}>
            <Text style={styles.breakText}>
              {formatKoreanDate(b.key)} · {b.kind === 'break' ? b.reason : ''}
            </Text>
          </View>
        ))}
        <View style={{ marginTop: 16 }}>
          <InfoList>
            <InfoRow label="대상">
              <InfoValue>
                {program.targetGrade} · 정원 {program.maxStudents}명
              </InfoValue>
            </InfoRow>
          </InfoList>
        </View>
      </Card>

      <Card title="장소 · 오시는 길">
        <Text style={styles.place}>{program.location}</Text>
        <TouchableOpacity
          onPress={() => Linking.openURL(mapSearchUrl(program))}
          activeOpacity={0.7}
          accessibilityRole="link"
          accessibilityLabel="지도에서 길찾기"
          accessibilityHint="지도 앱이나 브라우저에서 수업 장소를 열어요"
          style={styles.mapBtn}
        >
          <Feather name="map-pin" size={19} color={C.gold} />
          <Text style={styles.mapText}>지도에서 길찾기</Text>
        </TouchableOpacity>
        {directions.length > 0 && (
          <View style={styles.dirList}>
            {directions.map((d, i) => (
              <View
                key={d.label}
                style={[styles.dir, i > 0 && styles.dirDivider, i === 0 && { paddingTop: 0 }, i === directions.length - 1 && { paddingBottom: 0 }]}
              >
                <Text style={styles.dirLabel}>{d.label}</Text>
                <Text style={styles.dirText} lineBreakStrategyIOS="hangul-word">
                  {d.text}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  main: { fontSize: 22, lineHeight: 30, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
  sub: { marginTop: 4, fontSize: 17, lineHeight: 25, color: C.sub },
  breakBox: { marginTop: 12, borderRadius: 12, backgroundColor: C.elev, paddingHorizontal: 16, paddingVertical: 12 },
  breakText: { fontSize: 16, fontWeight: '600', color: C.text2 },
  place: { fontSize: 19, lineHeight: 28, fontWeight: '700', color: C.text },
  mapBtn: {
    marginTop: 16,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.goldDim,
    backgroundColor: C.goldLight,
    paddingVertical: 14,
  },
  mapText: { fontSize: 17, fontWeight: '700', color: C.gold },
  dirList: { marginTop: 20 },
  dir: { paddingVertical: 16 },
  dirDivider: { borderTopWidth: 1, borderTopColor: C.line },
  dirLabel: { fontSize: 15, fontWeight: '700', color: C.gold },
  dirText: { marginTop: 4, fontSize: 17, lineHeight: 26, color: C.text2 },
});
