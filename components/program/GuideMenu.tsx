/**
 * 프로그램 안내 버튼 묶음 (2열) — 수강 예정 첫 화면 · 수강 중 프로그램 화면에서 사용
 * 버튼 하나 = 독립된 안내 페이지 하나 (/main/program/[programId]/guide/<항목>)
 * (웹 components/program/GuideMenu.tsx 와 같은 구성)
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GUIDE_SECTIONS, type GuideSection } from '../../data/programGuide';

export function GuideMenu({
  sections,
  onOpen,
  noticeCount,
  onContact,
}: {
  sections: GuideSection[];
  onOpen: (section: GuideSection) => void;
  /** 공지사항 버튼에 "공지 N건" 표시 */
  noticeCount?: number;
  /** 있으면 마지막 칸에 "문의하기" 버튼 */
  onContact?: () => void;
}) {
  const items = GUIDE_SECTIONS.filter((s) => sections.includes(s.id));

  return (
    <View style={styles.grid}>
      {items.map((s) => (
        <Tile
          key={s.id}
          icon={s.icon}
          label={s.label}
          desc={s.id === 'notices' && noticeCount ? `공지 ${noticeCount}건` : s.desc}
          warn={s.id === 'rules'}
          onPress={() => onOpen(s.id)}
        />
      ))}
      {onContact && <Tile icon="🙋" label="문의하기" desc="챗봇·전화 상담" onPress={onContact} />}
    </View>
  );
}

function Tile({
  icon,
  label,
  desc,
  warn,
  onPress,
}: {
  icon: string;
  label: string;
  desc: string;
  warn?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.tile, warn && styles.tileWarn]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, warn && { color: '#b91c1c' }]} lineBreakStrategyIOS="hangul-word">
          {label}
        </Text>
        <Text style={[styles.desc, warn && styles.descWarn]} lineBreakStrategyIOS="hangul-word">
          {desc}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    // 2열: (전체 - 간격 12) / 2
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 12,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tileWarn: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  icon: { fontSize: 24 },
  label: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: '#111827' },
  desc: { marginTop: 2, fontSize: 14, lineHeight: 19, color: '#6b7280' },
  descWarn: { fontWeight: '600', color: '#dc2626' },
});
