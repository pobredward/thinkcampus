/**
 * 회차 화면 탭 패널에서 함께 쓰는 작은 조각들 (웹 components/program/session/parts.tsx 대응)
 * 글자 크기: 최소 14, 본문 16~17 (학부모용)
 */

import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

/** 한글이 단어 중간에서 끊기지 않게 (iOS) */
export function Body({ style, children }: { style?: StyleProp<TextStyle>; children: React.ReactNode }) {
  return (
    <Text style={style} lineBreakStrategyIOS="hangul-word">
      {children}
    </Text>
  );
}

export function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text style={s.panelTitle} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Card({
  title,
  icon,
  children,
  style,
}: {
  title?: string;
  icon?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[s.card, style]}>
      {!!title && (
        <View style={s.cardTitleRow}>
          {!!icon && <Text style={s.cardIcon}>{icon}</Text>}
          <Text style={s.cardTitle} accessibilityRole="header">
            {title}
          </Text>
        </View>
      )}
      {children}
    </View>
  );
}

/** InfoRow 묶음 — 줄 사이에만 구분선 */
export function InfoList({ children }: { children: React.ReactNode }) {
  const rows = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<{
    first?: boolean;
  }>[];
  return (
    <View style={{ marginVertical: -12 }}>
      {rows.map((row, i) => React.cloneElement(row, { first: i === 0 }))}
    </View>
  );
}

export function InfoRow({
  label,
  children,
  first,
}: {
  label: string;
  children: React.ReactNode;
  /** InfoList 가 채워 줌 — 첫 줄이면 위 구분선 없음 */
  first?: boolean;
}) {
  return (
    <View style={[s.infoRow, !first && s.infoRowDivider]}>
      <Text style={s.infoLabel}>{label}</Text>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

/** InfoRow 안의 기본 값 글자 */
export function InfoValue({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Body style={[s.infoValue, style]}>{children}</Body>;
}

export function Bullets({ items, color }: { items: string[]; color: string }) {
  return (
    <View style={{ gap: 8 }}>
      {items.map((t, i) => (
        <View key={i} style={s.bulletRow}>
          <View style={[s.bulletDot, { backgroundColor: color }]} />
          <Body style={s.bulletText}>{t}</Body>
        </View>
      ))}
    </View>
  );
}

export function Numbered({ items }: { items: string[] }) {
  return (
    <View style={{ gap: 12 }}>
      {items.map((t, i) => (
        <View key={i} style={s.numRow}>
          <View style={s.numBadge}>
            <Text style={s.numText}>{i + 1}</Text>
          </View>
          <Body style={s.numBody}>{t}</Body>
        </View>
      ))}
    </View>
  );
}

export function Note({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray' | 'blue' | 'amber' }) {
  const bg = tone === 'blue' ? '#eff6ff' : tone === 'amber' ? '#fffbeb' : '#f9fafb';
  const color = tone === 'gray' ? '#374151' : '#1f2937';
  return (
    <View style={[s.note, { backgroundColor: bg }]}>
      <Body style={[s.noteText, { color }]}>{children}</Body>
    </View>
  );
}

export const panelStyles = StyleSheet.create({
  bold: { fontWeight: '700' },
  sub: { fontSize: 15, color: '#4b5563' },
});

const s = StyleSheet.create({
  panelTitle: { paddingHorizontal: 4, paddingBottom: 4, fontSize: 20, fontWeight: '800', color: '#111827' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardIcon: { fontSize: 18 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  infoRow: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  infoRowDivider: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  infoLabel: { width: 64, paddingTop: 1, fontSize: 16, color: '#6b7280' },
  infoValue: { fontSize: 17, lineHeight: 25, color: '#111827' },
  bulletRow: { flexDirection: 'row', gap: 10 },
  bulletDot: { width: 8, height: 8, borderRadius: 4, marginTop: 9 },
  bulletText: { flex: 1, fontSize: 16, lineHeight: 25, color: '#1f2937' },
  numRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  numBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontSize: 15, fontWeight: '700', color: '#1d4ed8' },
  numBody: { flex: 1, paddingTop: 1, fontSize: 16, lineHeight: 25, color: '#1f2937' },
  note: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16 },
  noteText: { fontSize: 16, lineHeight: 25 },
});
