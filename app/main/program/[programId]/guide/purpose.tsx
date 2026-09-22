/**
 * 프로그램 안내 — 프로그램 목적 (도입 취지 · 어떤 수업인지 · 대상)
 * (웹 app/main/program/[programId]/guide/purpose/page.tsx)
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GuideScreen } from '../../../../../components/program/GuideScreen';
import { Body, Bullets, Card, InfoList, InfoRow, InfoValue, panelStyles } from '../../../../../components/program/session/parts';
import type { Program } from '../../../../../data/dummyProgram';
import { instructorNames } from '../../../../../data/programView';

export default function GuidePurposeScreen() {
  return <GuideScreen section="purpose">{({ program }) => <PurposeSection program={program} />}</GuideScreen>;
}

function PurposeSection({ program }: { program: Program }) {
  const teachers = instructorNames(program);
  return (
    <>
      {!!program.purpose && (
        <Card title="왜 운영하나요?" icon="🏛">
          <Body style={styles.lead}>{program.purpose}</Body>
          {!!program.host && <Text style={[panelStyles.sub, { marginTop: 12 }]}>주최·운영 · {program.host}</Text>}
        </Card>
      )}
      {!!(program.overview || program.features?.length) && (
        <Card title="어떤 수업인가요?" icon="📖">
          {!!program.overview && <Body style={styles.lead}>{program.overview}</Body>}
          {!!program.features?.length && (
            <View style={styles.features}>
              <Text style={styles.featuresTitle}>이런 점이 좋아요</Text>
              <Bullets items={program.features} color="#d4b06a" />
            </View>
          )}
        </Card>
      )}
      <Card title="누가 듣나요?" icon="👧">
        <InfoList>
          <InfoRow label="대상">
            <InfoValue>
              {program.targetGrade} · 정원 {program.maxStudents}명
            </InfoValue>
          </InfoRow>
          <InfoRow label="수업">
            <InfoValue>
              총 {program.totalSessions}회 · {program.totalHours}차시
            </InfoValue>
            <Text style={panelStyles.sub}>회당 {program.sessionHours}차시 (120분)</Text>
          </InfoRow>
          {teachers.length > 0 && (
            <InfoRow label="강사">
              <InfoValue>{teachers.join(', ')}</InfoValue>
              <Text style={panelStyles.sub}>회차마다 담당 강사가 달라요</Text>
            </InfoRow>
          )}
        </InfoList>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 17, lineHeight: 27, color: '#d4d7dd' },
  features: { marginTop: 16, borderRadius: 16, backgroundColor: '#1e232d', padding: 16 },
  featuresTitle: { marginBottom: 8, fontSize: 16, fontWeight: '700', color: '#d4b06a' },
});
