/**
 * 회차 화면 — 프로그램 내용 탭 (수업 소개 · 목표 · 교수 방법 · 강사 · 수업자료)
 * (예전 /main/program/[sessionId] 회차 상세 화면의 내용)
 */

import React from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Session } from '../../../data/dummyProgram';
import { Body, Bullets, Card, PanelTitle } from './parts';

async function openUrl(url: string) {
  try {
    if (/^https?:\/\//i.test(url) && (await Linking.canOpenURL(url))) {
      await Linking.openURL(url);
    } else {
      Alert.alert('오류', '링크를 열 수 없습니다.');
    }
  } catch {
    Alert.alert('오류', '링크를 여는 중 문제가 발생했습니다.');
  }
}

export function ContentPanel({ session }: { session: Session }) {
  const hasMaterials = (session.lessonPlans?.length ?? 0) > 0 || !!session.planUrl;

  return (
    <>
      <PanelTitle>프로그램 내용</PanelTitle>

      <Card title="수업 소개" icon="📖">
        {!!session.programCode && (
          <View style={styles.codeBadge}>
            <Text style={styles.codeText}>{session.programCode}</Text>
          </View>
        )}
        <Body style={styles.desc}>{session.description}</Body>
        {!!session.rotationNote && <Body style={styles.rotation}>{session.rotationNote}</Body>}
      </Card>

      {!!session.objectives?.length && (
        <Card title="수업 목표" icon="🎯">
          <Bullets items={session.objectives} color="#1d4ed8" />
        </Card>
      )}

      {!!session.teachingMethod && (
        <Card title="이렇게 가르쳐요" icon="🧩">
          <Body style={styles.body}>{session.teachingMethod}</Body>
        </Card>
      )}

      <Card title="강사 소개" icon="🧑‍🏫">
        <View style={styles.instructorRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{session.instructor.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.instructorName}>{session.instructor.name} 강사</Text>
            <Body style={styles.instructorTitle}>{session.instructor.title}</Body>
          </View>
        </View>
        <Body style={[styles.body, { marginTop: 12 }]}>{session.instructor.bio}</Body>
      </Card>

      {hasMaterials && (
        <Card title="수업 자료" icon="📂">
          {!!session.planUrl && (
            <View style={styles.linkRow}>
              <LinkButton tone="blue" label="📋 전체 수업 계획서" onPress={() => void openUrl(session.planUrl!)} />
            </View>
          )}
          {session.lessonPlans?.map(({ lessonNumber, topic, slideUrl, activityUrl }, i) => (
            <View
              key={lessonNumber}
              style={i === 0 && !session.planUrl ? undefined : styles.lessonDivider}
            >
              <Text style={styles.lessonNo}>{lessonNumber}차시</Text>
              <Body style={styles.lessonTopic}>{topic}</Body>
              <View style={styles.linkRow}>
                {!!slideUrl && <LinkButton tone="blue" label="🖥 수업 PPT" onPress={() => void openUrl(slideUrl)} />}
                {!!activityUrl && (
                  <LinkButton tone="green" label="📝 활동지" onPress={() => void openUrl(activityUrl)} />
                )}
              </View>
            </View>
          ))}
        </Card>
      )}
    </>
  );
}

function LinkButton({ label, tone, onPress }: { label: string; tone: 'blue' | 'green'; onPress: () => void }) {
  const blue = tone === 'blue';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="link"
      style={[
        styles.linkBtn,
        blue ? { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' } : { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
      ]}
    >
      <Text style={[styles.linkText, { color: blue ? '#1d4ed8' : '#15803d' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  codeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  codeText: { fontSize: 15, fontWeight: '700', color: '#1d4ed8' },
  desc: { fontSize: 17, lineHeight: 27, color: '#1f2937' },
  rotation: { marginTop: 12, fontSize: 15, lineHeight: 23, color: '#4b5563' },
  body: { fontSize: 16, lineHeight: 26, color: '#1f2937' },
  instructorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#1d4ed8' },
  instructorName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  instructorTitle: { fontSize: 15, color: '#4b5563' },
  lessonDivider: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  lessonNo: { fontSize: 15, fontWeight: '700', color: '#1d4ed8' },
  lessonTopic: { marginBottom: 8, fontSize: 17, fontWeight: '600', color: '#111827' },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  linkBtn: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 9 },
  linkText: { fontSize: 16, fontWeight: '600' },
});
