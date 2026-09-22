/**
 * 회차 화면 — 출결 탭
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DayItem, DayStatus, ProgressSummary } from '../../../data/programView';
import { formatKoreanDate } from '../../../lib/dates';
import { C } from '../../../lib/theme';
import { Card, InfoList, InfoRow, InfoValue, Note, PanelTitle } from './parts';

// 상태는 왼쪽 세로 막대 색 + 글자색으로 (이모지 없이) — 웹과 같은 값
const STATUS_LOOK: Record<DayStatus, { bar: string; text: string; title: string }> = {
  present: { bar: C.gold, text: C.text, title: '출석' },
  late: { bar: '#f59e0b', text: '#b45309', title: '지각' },
  absent: { bar: '#dc2626', text: '#b91c1c', title: '결석' },
  upcoming: { bar: C.line2, text: C.fg2, title: '수업 전' },
  cancelled: { bar: C.line2, text: C.sub, title: '휴강' },
};

export function AttendancePanel({ item, summary }: { item: DayItem; summary: ProgressSummary }) {
  const { session, record, status } = item;
  const look = STATUS_LOOK[status];

  const subline =
    status === 'present'
      ? record?.checkinTime
        ? `${record.checkinTime} 입실`
        : '수업에 참여했어요'
      : status === 'late'
        ? [record?.checkinTime && `${record.checkinTime} 입실`, record?.lateMinutes != null && `${record.lateMinutes}분 늦음`]
            .filter(Boolean)
            .join(' · ')
        : status === 'absent'
          ? '이 날은 수업에 참여하지 않았어요'
          : status === 'upcoming'
            ? '수업 당일 입실하면 기록돼요'
            : '이 날은 수업이 없어요';

  return (
    <>
      <PanelTitle>출결</PanelTitle>
      <Card>
        <View style={styles.statusRow}>
          <View style={[styles.statusBar, { backgroundColor: look.bar }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, { color: look.text }]}>{look.title}</Text>
            <Text style={styles.statusSub}>{subline}</Text>
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <InfoList>
            <InfoRow label="수업일">
              <InfoValue>
                {formatKoreanDate(item.key)} · {session.startTime}–{session.endTime}
              </InfoValue>
            </InfoRow>
            <InfoRow label="강사">
              <InfoValue>{session.instructor.name} 강사</InfoValue>
            </InfoRow>
            {status === 'cancelled' && !!session.cancelReason && (
              <InfoRow label="사유">
                <InfoValue>{session.cancelReason}</InfoValue>
              </InfoRow>
            )}
            {status === 'cancelled' && !!session.makeUpDate && (
              <InfoRow label="보강">
                <InfoValue>{session.makeUpDate}</InfoValue>
              </InfoRow>
            )}
          </InfoList>
        </View>
      </Card>

      {status === 'absent' && <Note>빠진 수업의 소개와 자료는 ‘내용’ 탭에서 볼 수 있어요.</Note>}

      <Card title="이 프로그램 출결">
        <Text style={styles.summaryLine}>
          지금까지 {summary.done}회 / 전체 {summary.total}회
        </Text>
        <View style={styles.countRow}>
          <Count label="출석" value={summary.present} bg={C.goldLight} color={C.gold} />
          <Count label="지각" value={summary.late} bg={C.lateBg} color={C.late} />
          <Count label="결석" value={summary.absent} bg={C.dangerBg} color={C.danger} />
        </View>
      </Card>
    </>
  );
}

function Count({ label, value, bg, color }: { label: string; value: number; bg: string; color: string }) {
  return (
    <View style={[styles.countBox, { backgroundColor: bg }]}>
      <Text style={[styles.countLabel, { color }]}>{label}</Text>
      <Text style={[styles.countValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statusBar: { width: 5, height: 56, borderRadius: 3 },
  statusTitle: { fontSize: 26, lineHeight: 34, fontWeight: '800' },
  statusSub: { fontSize: 17, color: '#d4d7dd' },
  summaryLine: { fontSize: 16, color: '#9aa0ab' },
  countRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  countBox: { flex: 1, borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  countLabel: { fontSize: 15, fontWeight: '600' },
  countValue: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
});
