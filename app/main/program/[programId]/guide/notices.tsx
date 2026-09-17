/**
 * 프로그램 안내 — 공지사항 (+ 매번 챙길 준비물)
 * (웹 app/main/program/[programId]/guide/notices/page.tsx)
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GuideScreen } from '../../../../../components/program/GuideScreen';
import { Body, Card } from '../../../../../components/program/session/parts';
import type { Program } from '../../../../../data/dummyProgram';

export default function GuideNoticesScreen() {
  return <GuideScreen section="notices">{({ program }) => <NoticesSection program={program} />}</GuideScreen>;
}

function NoticesSection({ program }: { program: Program }) {
  const notices = program.notices ?? [];
  return (
    <>
      {notices.length === 0 ? (
        <Card>
          <Text style={styles.lead}>아직 올라온 공지가 없어요.</Text>
        </Card>
      ) : (
        notices.map((n, i) => (
          <View key={i} style={styles.noticeRow}>
            <View style={styles.noticeNum}>
              <Text style={styles.noticeNumText}>{i + 1}</Text>
            </View>
            <Body style={styles.noticeText}>{n}</Body>
          </View>
        ))
      )}
      {!!program.commonMaterials?.length && (
        <Card title="매번 챙길 준비물" icon="🎒">
          <View style={styles.chips}>
            {program.commonMaterials.map((m) => (
              <View key={m} style={styles.chip}>
                <Text style={styles.chipText}>{m}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 17, lineHeight: 27, color: '#1f2937' },
  noticeRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
  },
  noticeNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeNumText: { fontSize: 16, fontWeight: '800', color: '#92400e' },
  noticeText: { flex: 1, paddingTop: 2, fontSize: 17, lineHeight: 26, color: '#111827' },
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
});
