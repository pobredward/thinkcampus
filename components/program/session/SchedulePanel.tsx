/**
 * 회차 화면 — 프로그램 일정 탭 (언제 · 어디서 · 무엇을 챙기고 · 어떤 순서로)
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DayItem } from '../../../data/programView';
import { daysBetween, dDayLabel, formatKoreanDate } from '../../../lib/dates';
import { Card, InfoList, InfoRow, InfoValue, Note, Numbered, PanelTitle, panelStyles } from './parts';

export function SchedulePanel({ item, today }: { item: DayItem; today: string }) {
  const { session, status } = item;
  const dDay = status === 'upcoming' ? dDayLabel(daysBetween(today, item.key)) : '';

  return (
    <>
      <PanelTitle>프로그램 일정</PanelTitle>
      {status === 'cancelled' && (
        <Note tone="amber">
          이 회차는 휴강이에요{session.cancelReason ? ` (${session.cancelReason})` : ''}.
          {session.makeUpDate ? ` 보강은 ${session.makeUpDate}에 진행돼요.` : ''}
        </Note>
      )}

      <Card title="수업 일정" icon="📅">
        <InfoList>
          <InfoRow label="날짜">
            <View style={styles.dateRow}>
              <InfoValue style={panelStyles.bold}>{formatKoreanDate(item.key)}</InfoValue>
              {!!dDay && (
                <View style={styles.dday}>
                  <Text style={styles.ddayText}>{dDay}</Text>
                </View>
              )}
            </View>
          </InfoRow>
          <InfoRow label="시간">
            <InfoValue style={panelStyles.bold}>
              {session.startTime}–{session.endTime}
            </InfoValue>
            <Text style={panelStyles.sub}>
              {session.durationMinutes}분 · {session.sessionHours}차시
            </Text>
          </InfoRow>
          <InfoRow label="장소">
            <InfoValue>{session.location}</InfoValue>
          </InfoRow>
          <InfoRow label="강사">
            <InfoValue>{session.instructor.name} 강사</InfoValue>
          </InfoRow>
        </InfoList>
      </Card>

      <Card title="준비물" icon="🎒">
        {session.materials.length > 0 ? (
          <View style={styles.chips}>
            {session.materials.map((m, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{m}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.none}>따로 챙길 준비물은 없어요.</Text>
        )}
      </Card>

      {session.curriculum.length > 0 && (
        <Card title="진행 순서" icon="⏱️">
          <Numbered items={session.curriculum} />
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  dday: { backgroundColor: '#1d4ed8', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  ddayText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  chipText: { fontSize: 16, fontWeight: '600', color: '#15803d' },
  none: { fontSize: 16, color: '#4b5563' },
});
