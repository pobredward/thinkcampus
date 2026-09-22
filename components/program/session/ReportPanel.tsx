/**
 * 회차 화면 — 수업 리포트 탭 (끝난 회차에만 보임)
 * 선생님 한마디 → 참여도·과제 → 잘한 점 / 다음엔 이렇게 → 이 수업 평가
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ProgressBar } from '../../ui/ProgressBar';
import { getParticipationColor, getParticipationLabel } from '../../../data/dummyAttendance';
import { getGradeBg, getGradeColor, type ProgramReport } from '../../../data/dummyReport';
import type { DayItem } from '../../../data/programView';
import { Body, Bullets, Card, InfoList, InfoRow, Note, PanelTitle } from './parts';

export function ReportPanel({
  item,
  evaluation,
  onOpenFullReport,
}: {
  item: DayItem;
  /** 이 회차 과목의 평가 (없으면 숨김) */
  evaluation: ProgramReport | null;
  /** 종합 리포트가 발급됐을 때만 전달 */
  onOpenFullReport?: () => void;
}) {
  const { session, record, status } = item;

  if (!record) {
    return (
      <>
        <PanelTitle>{session.sessionNumber}회차 리포트</PanelTitle>
        <Note>리포트가 아직 올라오지 않았어요. 수업이 끝난 날 저녁에 올라와요.</Note>
      </>
    );
  }

  const absent = status === 'absent';
  const score = record.participationScore;

  return (
    <>
      <PanelTitle>{session.sessionNumber}회차 리포트</PanelTitle>

      {absent && <Note>결석한 회차라 참여도와 평가가 없어요.</Note>}

      {!!record.feedback && (
        <Card title={absent ? '선생님 안내' : '선생님 한마디'} icon="💬">
          <View style={styles.quote}>
            <Text style={styles.quoteBy}>{record.instructorName} 강사</Text>
            <Body style={styles.quoteText}>{record.feedback}</Body>
          </View>
        </Card>
      )}

      {!absent && (score != null || record.homeworkDone != null) && (
        <Card title="수업 참여" icon="🙌">
          <InfoList>
            {score != null && (
              <InfoRow label="참여도">
                <Text style={styles.value}>
                  <Text style={{ fontWeight: '700', color: getParticipationColor(score) }}>
                    {getParticipationLabel(score)}
                  </Text>
                  <Text style={styles.valueSub}> · {score}점</Text>
                </Text>
                <ProgressBar
                  value={score / 100}
                  height={10}
                  color={getParticipationColor(score)}
                  style={{ marginTop: 8 }}
                />
              </InfoRow>
            )}
            {record.homeworkDone != null && (
              <InfoRow label="과제">
                {record.homeworkDone ? (
                  <Text style={[styles.value, { fontWeight: '700', color: '#d4b06a' }]}>✓ 제출 완료</Text>
                ) : (
                  <Text style={[styles.value, { fontWeight: '700', color: '#f27d78' }]}>미제출</Text>
                )}
              </InfoRow>
            )}
          </InfoList>
        </Card>
      )}

      {record.highlights.length > 0 && (
        <Card title="잘한 점" icon="👍">
          <Bullets items={record.highlights} color="#d4b06a" />
        </Card>
      )}

      {record.improvements.length > 0 && (
        <Card title={absent ? '참고해 주세요' : '다음엔 이렇게'} icon="💡">
          <Bullets items={record.improvements} color="#7c8390" />
        </Card>
      )}

      {!absent && !!evaluation && (
        <Card title="이 수업 평가" icon="🏅">
          <View style={styles.gradeRow}>
            <View style={[styles.gradeBox, { backgroundColor: getGradeBg(evaluation.grade) }]}>
              <Text style={[styles.gradeText, { color: getGradeColor(evaluation.grade) }]}>{evaluation.grade}</Text>
            </View>
            <View>
              <Text style={styles.scoreLabel}>종합 점수</Text>
              <Text style={styles.score}>
                {evaluation.overallScore}
                <Text style={styles.scoreUnit}>점</Text>
              </Text>
            </View>
          </View>
          <View style={styles.compList}>
            {evaluation.competencies.map((c) => (
              <View key={c.label}>
                <View style={styles.compHead}>
                  <Text style={styles.compLabel}>{c.label}</Text>
                  <Text style={styles.compScore}>
                    {c.score}
                    <Text style={styles.compBench}> / 또래 {c.benchmark}</Text>
                  </Text>
                </View>
                <ProgressBar value={c.score / 100} height={8} />
              </View>
            ))}
          </View>
          {!!onOpenFullReport && (
            <TouchableOpacity style={styles.fullBtn} onPress={onOpenFullReport} activeOpacity={0.85}>
              <Text style={styles.fullBtnText}>종합 리포트 보기</Text>
            </TouchableOpacity>
          )}
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  quote: {
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#d4b06a',
    backgroundColor: '#1e232d',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  quoteBy: { marginBottom: 4, fontSize: 15, fontWeight: '700', color: '#d4b06a' },
  quoteText: { fontSize: 17, lineHeight: 27, color: '#f2f2f0' },
  value: { fontSize: 17, lineHeight: 25, color: '#f2f2f0' },
  valueSub: { color: '#9aa0ab' },
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  gradeBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  gradeText: { fontSize: 26, fontWeight: '800' },
  scoreLabel: { fontSize: 15, color: '#9aa0ab' },
  score: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: '#f2f2f0' },
  scoreUnit: { fontSize: 16, fontWeight: '600', color: '#9aa0ab' },
  compList: { marginTop: 20, gap: 16 },
  compHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  compLabel: { flexShrink: 1, fontSize: 16, fontWeight: '600', color: '#d4d7dd' },
  compScore: { fontSize: 16, fontWeight: '700', color: '#f2f2f0' },
  compBench: { fontSize: 14, fontWeight: '500', color: '#9aa0ab' },
  fullBtn: {
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262b36',
    paddingVertical: 16,
    alignItems: 'center',
  },
  fullBtnText: { fontSize: 16, fontWeight: '700', color: '#d4b06a' },
});
