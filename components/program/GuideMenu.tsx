/**
 * 수업 안내 목록 — 한 줄에 하나씩, 제목만 (부제·아이콘 없이 깔끔하게)
 * 줄 하나 = 독립된 안내 페이지 하나 (/main/program/[programId]/guide/<항목>)
 * 규정·지침에는 "필독" 배지가 붙는다.
 * (웹 components/program/GuideMenu.tsx 와 같은 구성)
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GUIDE_SECTIONS, type GuideSection } from '../../data/programGuide';
import { C } from '../../lib/theme';

export function GuideMenu({
  sections,
  onOpen,
}: {
  sections: GuideSection[];
  onOpen: (section: GuideSection) => void;
}) {
  const items = GUIDE_SECTIONS.filter((s) => sections.includes(s.id));

  return (
    <View style={styles.list}>
      {items.map((s, i) => (
        <View key={s.id} style={i > 0 && styles.divider}>
          <MenuRow label={s.label} badge={s.badge} onPress={() => onOpen(s.id)} />
        </View>
      ))}
    </View>
  );
}

/** 안내 한 줄 (버튼) — 다른 곳에서도 같은 모양으로 쓴다 */
export function MenuRow({ label, badge, onPress }: { label: string; badge?: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label} · ${badge}` : label}
      style={styles.row}
    >
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {!!badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

/** 카드 한 장에 한 줄 — 골드 테두리로 따로 눈에 띄게 (예: 수업 규정·지침 · 필독) */
export function MenuCard({ label, badge, onPress }: { label: string; badge?: string; onPress: () => void }) {
  return (
    <View style={styles.card}>
      <MenuRow label={label} badge={badge} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    overflow: 'hidden',
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
  },
  divider: { borderTopWidth: 1, borderTopColor: C.line },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  label: { flex: 1, fontSize: 18, lineHeight: 26, fontWeight: '700', color: C.text },
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.goldBorder,
    backgroundColor: C.goldLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 14, fontWeight: '700', color: C.gold, letterSpacing: 0.3 },
  chevron: { fontSize: 22, lineHeight: 24, color: C.gold },
  card: {
    overflow: 'hidden',
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.goldDim,
  },
});
