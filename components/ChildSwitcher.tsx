/**
 * 홈 상단 오른쪽 "자녀 전환" 버튼 + 선택 시트 (자녀 2명 이상일 때만 사용)
 *
 * 형제자매는 성이 같은 경우가 많아서 아바타에는 이름(성 제외) 첫 글자를 쓰고,
 * 자녀마다 색을 달리해 한눈에 구분되게 한다.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheet } from './ui/BottomSheet';
import type { Child } from '../hooks/useChildren';

const AVATAR_COLORS = ['#141a24', '#2b3342', '#0f1218', '#4a5263', '#737b8c'];

export function childAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

/** 김민준 → 민, 이서 → 서, 민 → 민 */
export function childInitial(name: string): string {
  const n = name.trim();
  if (n.length >= 2) return n.charAt(1);
  return n.charAt(0);
}

export function ChildSwitcher({
  items,
  selectedIndex,
  onSelect,
}: {
  items: Child[];
  selectedIndex: number;
  onSelect: (studentId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = items[selectedIndex];
  if (!current || items.length < 2) return null;

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`자녀 전환, 현재 ${current.studentName}`}
      >
        <View style={styles.triggerAvatar}>
          <Text style={[styles.triggerInitial, { color: childAvatarColor(selectedIndex) }]}>
            {childInitial(current.studentName)}
          </Text>
        </View>
        <Text style={styles.triggerName} numberOfLines={1}>
          {current.studentName}
        </Text>
        <Text style={styles.triggerChevron}>▾</Text>
      </TouchableOpacity>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="자녀 선택">
        <Text style={styles.sheetDesc}>
          연결된 자녀 {items.length}명 · 홈에 표시할 자녀를 선택하세요.
        </Text>
        <View style={styles.list}>
          {items.map((c, i) => {
            const isSel = i === selectedIndex;
            const meta = [c.campusName, c.relation].filter(Boolean).join(' · ');
            return (
              <Pressable
                key={c.studentId}
                accessibilityRole="radio"
                aria-selected={isSel}
                onPress={() => {
                  onSelect(c.studentId);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.option,
                  isSel && styles.optionSelected,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={[styles.optionAvatar, { backgroundColor: childAvatarColor(i) }]}>
                  <Text style={styles.optionInitial}>{childInitial(c.studentName)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionName} numberOfLines={1}>
                    {c.studentName} <Text style={styles.optionSuffix}>학생</Text>
                  </Text>
                  {!!meta && (
                    <Text style={styles.optionMeta} numberOfLines={1}>
                      {meta}
                    </Text>
                  )}
                </View>
                {isSel ? (
                  <View style={styles.checkOn}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                ) : (
                  <View style={styles.checkOff} />
                )}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#343a47',
    backgroundColor: '#161a22',
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 10,
  },
  triggerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#161a22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerInitial: { fontSize: 15, fontWeight: '800' },
  triggerName: { maxWidth: 84, fontSize: 15, fontWeight: '700', color: '#f2f2f0' },
  triggerChevron: { fontSize: 14, color: '#9aa0ab' },

  sheetDesc: { fontSize: 15, color: '#9aa0ab', marginBottom: 16, marginTop: -4 },
  list: { gap: 8, paddingBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#262b36',
    backgroundColor: '#161a22',
    padding: 14,
  },
  optionSelected: { borderColor: '#d4b06a', backgroundColor: '#1e232d' },
  optionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInitial: { fontSize: 18, fontWeight: '800', color: '#f2f2f0' },
  optionName: { fontSize: 17, fontWeight: '700', color: '#f2f2f0' },
  optionSuffix: { fontSize: 15, fontWeight: '500', color: '#9aa0ab' },
  optionMeta: { fontSize: 14, color: '#9aa0ab', marginTop: 2 },
  checkOn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#d4b06a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { fontSize: 14, fontWeight: '800', color: '#0c0e13', lineHeight: 18 },
  checkOff: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#343a47' },
});
