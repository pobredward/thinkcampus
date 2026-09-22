/**
 * 회차 버튼 — 한 줄에 3개, "N회차" 만 (날짜·시간·출결은 눌러서 회차 화면에서)
 * 상태는 색으로만: 끝난 회차 = 가라앉은 면 + ✓ · 다음 수업 = 골드 채움(잉크 글자) · 남은 회차 = 카드
 * (웹 components/program/SessionGrid.tsx 와 같은 모양)
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { isDone, STATUS_LABEL, type DayItem } from '../../data/programView';
import { C } from '../../lib/theme';

export function SessionGrid({
  items,
  next,
  onOpen,
}: {
  items: DayItem[];
  next: DayItem | null;
  onOpen: (item: DayItem) => void;
}) {
  return (
    <View style={styles.grid}>
      {items.map((d) => (
        <SessionButton key={d.key} item={d} isNext={d === next} onOpen={() => onOpen(d)} />
      ))}
    </View>
  );
}

function SessionButton({ item, isNext, onOpen }: { item: DayItem; isNext: boolean; onOpen: () => void }) {
  const { session, status } = item;
  const done = isDone(status);
  const cancelled = status === 'cancelled';
  const stateLabel = isNext ? ' · 다음 수업' : done ? ' · 완료' : '';

  return (
    <TouchableOpacity
      onPress={onOpen}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${session.sessionNumber}회차 ${session.topic}${stateLabel}`}
      style={[styles.btn, isNext ? styles.btnNext : done ? styles.btnDone : styles.btnLater]}
    >
      <Text style={[styles.num, isNext ? { color: C.onGold } : done && { color: C.sub }]}>
        {session.sessionNumber}회차
      </Text>
      {isNext ? (
        <Text style={[styles.tag, { color: 'rgba(12,14,19,0.75)' }]}>다음 수업</Text>
      ) : done ? (
        <Text style={[styles.tag, { color: C.faint }]}>✓</Text>
      ) : cancelled ? (
        <Text style={[styles.tag, { color: C.faint, fontWeight: '600' }]}>{STATUS_LABEL.cancelled}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // 한 줄에 3개: (전체 - 간격 10×2) / 3
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  btn: {
    flexBasis: '30%',
    flexGrow: 1,
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  btnLater: {
    borderColor: C.line,
    backgroundColor: C.card,
  },
  btnNext: {
    borderColor: C.gold,
    backgroundColor: C.gold,
  },
  btnDone: { borderColor: C.line, backgroundColor: C.doneBg },
  num: { fontSize: 19, lineHeight: 26, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
  tag: { marginTop: 3, fontSize: 14, lineHeight: 18, fontWeight: '700' },
});
