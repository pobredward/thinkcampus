/**
 * 리포트 상세 화면
 * - 종합 요약 (성향 분석 / 종합 등급 / 강점·발전 영역)
 * - 6개 프로그램별 상세 평가 (역량 점수 + 바 차트 + 강사 코멘트)
 * - PDF 다운로드 / 공유
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// expo-print / expo-sharing 은 네이티브 모듈이므로
// 새 빌드에 포함되기 전까지는 버튼 클릭 시점에 dynamic import 처리
// → 화면 진입 자체는 항상 정상 동작
import {
  DUMMY_REPORT,
  getGradeColor,
  getGradeBg,
  type ProgramReport,
  type CompetencyScore,
} from '../../../data/dummyReport';

// ── PDF HTML 생성 ──────────────────────────────────────────

function buildPdfHtml(report: typeof DUMMY_REPORT): string {
  const gradeColor: Record<string, string> = {
    S: '#0f1218', A: '#141a24', B: '#4a5263', C: '#6b7280',
  };

  const programRows = report.programs.map((p) => {
    const competencyRows = p.competencies.map((c) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;">${c.label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;background:#f3f4f6;border-radius:4px;height:8px;">
              <div style="width:${c.score}%;background:${gradeColor[p.grade]};height:8px;border-radius:4px;"></div>
            </div>
            <span style="font-weight:700;color:${gradeColor[p.grade]};min-width:30px;">${c.score}</span>
          </div>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:12px;">${c.benchmark} (또래평균)</td>
      </tr>`).join('');

    return `
      <div style="margin-bottom:32px;break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;">
          <span style="font-size:22px;">${p.programIcon}</span>
          <div>
            <div style="font-size:16px;font-weight:700;color:#111827;">${p.programName}</div>
            <div style="font-size:12px;color:#6b7280;">강사: ${p.instructorName} · 출석률 ${p.attendance}%</div>
          </div>
          <div style="margin-left:auto;display:flex;align-items:center;gap:8px;">
            <div style="background:${getGradeBg(p.grade)};border-radius:8px;padding:4px 12px;">
              <span style="font-weight:900;font-size:20px;color:${gradeColor[p.grade]};">${p.grade}</span>
            </div>
            <div style="font-size:22px;font-weight:700;color:${gradeColor[p.grade]};">${p.overallScore}점</div>
          </div>
        </div>
        <div style="margin-bottom:12px;">
          <div style="font-size:13px;color:#6b7280;margin-bottom:4px;">성장지수: 캠프 전 ${p.preScore}점 → 캠프 후 ${p.postScore}점 (+${p.growthIndex}점 향상)</div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
          <thead>
            <tr style="background:#f6f6f4;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">역량 항목</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">점수</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">비교</th>
            </tr>
          </thead>
          <tbody>${competencyRows}</tbody>
        </table>
        <div style="background:#f6f6f4;border-radius:8px;padding:14px;margin-bottom:10px;">
          <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:6px;">강사 총평</div>
          <div style="font-size:13px;color:#374151;line-height:1.7;">${p.instructorComment}</div>
        </div>
        <div>
          <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:6px;">향후 발전 방향</div>
          ${p.nextSteps.map((s, i) => `<div style="font-size:13px;color:#6b7280;margin-bottom:4px;">${i + 1}. ${s}</div>`).join('')}
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #111827; background: #fff; }
  @media print { body { -webkit-print-color-adjust: exact; } }
</style>
</head>
<body style="padding:32px;max-width:800px;margin:0 auto;">

  <!-- 헤더 -->
  <div style="background:#141a24;border-radius:16px;padding:28px 32px;margin-bottom:28px;color:#fff;">
    <div style="font-size:13px;color:#d9dbe0;margin-bottom:6px;">ThinkCampus 학습 리포트</div>
    <div style="font-size:28px;font-weight:900;margin-bottom:6px;">${report.studentName} 학생</div>
    <div style="font-size:14px;color:#d9dbe0;">${report.campusName} · ${report.campPeriod}</div>
    <div style="display:flex;align-items:center;gap:16px;margin-top:20px;">
      <div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:12px 24px;text-align:center;">
        <div style="font-size:36px;font-weight:900;">${report.totalGrade}</div>
        <div style="font-size:12px;color:#d9dbe0;margin-top:2px;">종합 등급</div>
      </div>
      <div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:12px 24px;text-align:center;">
        <div style="font-size:36px;font-weight:900;">${report.totalScore}</div>
        <div style="font-size:12px;color:#d9dbe0;margin-top:2px;">종합 점수</div>
      </div>
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:700;margin-bottom:4px;">${report.personalityType}</div>
        <div style="font-size:12px;color:#d9dbe0;line-height:1.6;">${report.personalityDesc.slice(0, 80)}...</div>
      </div>
    </div>
  </div>

  <!-- 강점 & 발전 영역 -->
  <div style="display:flex;gap:12px;margin-bottom:28px;">
    <div style="flex:1;background:#f2f3f5;border-radius:12px;padding:16px;border:1px solid #d9dbe0;">
      <div style="font-size:13px;font-weight:700;color:#0f1218;margin-bottom:10px;">강점 분야</div>
      ${report.strengthAreas.map((s) => `<div style="font-size:13px;color:#141a24;margin-bottom:4px;">✓ ${s}</div>`).join('')}
    </div>
    <div style="flex:1;background:#f2f3f5;border-radius:12px;padding:16px;border:1px solid #d9dbe0;">
      <div style="font-size:13px;font-weight:700;color:#0f1218;margin-bottom:10px;">발전 권장 영역</div>
      ${report.growthAreas.map((s) => `<div style="font-size:13px;color:#141a24;margin-bottom:4px;">→ ${s}</div>`).join('')}
    </div>
  </div>

  <!-- 담임 총평 -->
  <div style="background:#fafafa;border-radius:12px;padding:18px;margin-bottom:32px;border:1px solid #e5e7eb;">
    <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:8px;">담임 강사 종합 총평</div>
    <div style="font-size:14px;color:#374151;line-height:1.8;">${report.overallComment}</div>
  </div>

  <!-- 프로그램별 상세 -->
  <div style="font-size:18px;font-weight:700;color:#111827;margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid #141a24;">프로그램별 상세 평가</div>
  ${programRows}

  <!-- 발급 정보 -->
  <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:12px;">
    발급일: ${report.issueDate} · ThinkCampus · 본 리포트는 공식 발급 문서입니다.
  </div>
</body>
</html>`;
}

// ── 메인 컴포넌트 ──────────────────────────────────────────

export default function ReportDetailScreen() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const insets = useSafeAreaInsets();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);

  // TODO: reportId로 Firestore 조회 (현재는 더미)
  const report = DUMMY_REPORT;

  async function handleDownloadPdf() {
    setPdfLoading(true);
    try {
      // dynamic import — 빌드에 포함된 경우에만 실행됨
      const Print = await import('expo-print').catch(() => null);
      const Sharing = await import('expo-sharing').catch(() => null);

      if (!Print) {
        Alert.alert(
          'PDF 기능 준비 중',
          '이 기능은 앱 업데이트 후 이용 가능합니다.\n현재 개발 빌드에서는 지원되지 않습니다.'
        );
        return;
      }

      const html = buildPdfHtml(report);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      const canShare = Sharing && await Sharing.isAvailableAsync();
      if (canShare && Sharing) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${report.studentName} 학습 리포트`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF 저장 완료', `파일이 저장되었습니다.\n${uri}`);
      }
    } catch (e: any) {
      Alert.alert('오류', 'PDF 생성 중 오류가 발생했습니다.\n' + e.message);
    } finally {
      setPdfLoading(false);
    }
  }

  async function handlePrint() {
    try {
      const Print = await import('expo-print').catch(() => null);
      if (!Print) {
        Alert.alert('인쇄 기능 준비 중', '앱 업데이트 후 이용 가능합니다.');
        return;
      }
      const html = buildPdfHtml(report);
      await Print.printAsync({ html });
    } catch (e: any) {
      Alert.alert('오류', '인쇄 중 오류가 발생했습니다.');
    }
  }

  const gradeColor = getGradeColor(report.totalGrade);
  const gradeBg = getGradeBg(report.totalGrade);

  return (
    <View style={{ flex: 1, backgroundColor: '#0c0e13' }}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* ── 상단 네비 ── */}
        <View style={[styles.navBar, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← 목록</Text>
          </TouchableOpacity>
          <View style={styles.navActions}>
            {Platform.OS !== 'web' && (
              <TouchableOpacity style={styles.navBtn} onPress={handlePrint}>
                <Text style={styles.navBtnText}>인쇄</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnPrimary, pdfLoading && { opacity: 0.6 }]}
              onPress={handleDownloadPdf}
              disabled={pdfLoading}
            >
              {pdfLoading
                ? <ActivityIndicator color="#0c0e13" size="small" />
                : <Text style={styles.navBtnPrimaryText}>PDF 저장·공유</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 종합 헤더 카드 ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>{report.studentName.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName}>{report.studentName} 학생</Text>
              <Text style={styles.heroCampus}>{report.campusName}</Text>
              <Text style={styles.heroPeriod}>{report.campPeriod}</Text>
            </View>
            <View style={[styles.heroGrade, { backgroundColor: gradeBg }]}>
              <Text style={[styles.heroGradeText, { color: gradeColor }]}>
                {report.totalGrade}
              </Text>
            </View>
          </View>

          {/* 종합 점수 */}
          <View style={styles.totalScoreRow}>
            <Text style={styles.totalScoreLabel}>종합 점수</Text>
            <Text style={[styles.totalScoreValue, { color: gradeColor }]}>
              {report.totalScore}점
            </Text>
          </View>
          <View style={styles.totalBarBg}>
            <View
              style={[styles.totalBarFill, {
                width: `${report.totalScore}%`,
                backgroundColor: gradeColor,
              }]}
            />
          </View>

          {/* 성향 유형 */}
          <View style={styles.personalityBox}>
            <Text style={styles.personalityType}>{report.personalityType}</Text>
            <Text style={styles.personalityDesc}>{report.personalityDesc}</Text>
          </View>
        </View>

        {/* ── 강점 / 발전 영역 ── */}
        <View style={styles.twoColRow}>
          <View style={[styles.twoColCard, styles.strengthCard]}>
            <Text style={styles.twoColTitle}>강점 분야</Text>
            {report.strengthAreas.map((s, i) => (
              <View key={i} style={styles.twoColItem}>
                <View style={styles.checkDot} />
                <Text style={styles.strengthText}>{s}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.twoColCard, styles.growthCard]}>
            <Text style={[styles.twoColTitle, { color: '#d4b06a' }]}>발전 권장</Text>
            {report.growthAreas.map((s, i) => (
              <View key={i} style={styles.twoColItem}>
                <View style={styles.arrowDot} />
                <Text style={styles.growthText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── 담임 총평 ── */}
        <View style={styles.overallCommentCard}>
          <Text style={styles.sectionLabel}>담임 강사 종합 총평</Text>
          <Text style={styles.overallCommentText}>{report.overallComment}</Text>
        </View>

        {/* ── 프로그램별 상세 ── */}
        <Text style={styles.programSectionTitle}>프로그램별 상세 평가</Text>

        {report.programs.map((prog) => (
          <ProgramCard
            key={prog.programId}
            prog={prog}
            expanded={expandedProgram === prog.programId}
            onToggle={() =>
              setExpandedProgram((prev) =>
                prev === prog.programId ? null : prog.programId
              )
            }
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ── 프로그램 카드 컴포넌트 ────────────────────────────────

function ProgramCard({
  prog,
  expanded,
  onToggle,
}: {
  prog: ProgramReport;
  expanded: boolean;
  onToggle: () => void;
}) {
  const gradeColor = getGradeColor(prog.grade);
  const gradeBg = getGradeBg(prog.grade);

  return (
    <View style={styles.progCard}>
      {/* 헤더 (항상 표시) */}
      <TouchableOpacity style={styles.progCardHeader} onPress={onToggle} activeOpacity={0.7}>
        <Text style={styles.progIcon}>{prog.programIcon}</Text>
        <View style={styles.progTitleWrap}>
          <Text style={styles.progName}>{prog.programName}</Text>
          <Text style={styles.progMeta}>
            강사 {prog.instructorName} · 출석 {prog.attendance}%
          </Text>
        </View>
        <View style={[styles.progGradeBadge, { backgroundColor: gradeBg }]}>
          <Text style={[styles.progGradeText, { color: gradeColor }]}>{prog.grade}</Text>
        </View>
        <View style={styles.progScoreWrap}>
          <Text style={[styles.progScore, { color: gradeColor }]}>{prog.overallScore}</Text>
        </View>
        <Text style={[styles.expandArrow, expanded && styles.expandArrowOpen]}>›</Text>
      </TouchableOpacity>

      {/* 점수 바 (항상 표시) */}
      <View style={styles.progBarSection}>
        <View style={styles.progBarBg}>
          <View
            style={[
              styles.progBarFill,
              { width: `${prog.overallScore}%`, backgroundColor: gradeColor },
            ]}
          />
        </View>
        <View style={styles.growthChip}>
          <Text style={styles.growthChipText}>+{prog.growthIndex}↑ 성장</Text>
        </View>
      </View>

      {/* 확장 영역 */}
      {expanded && (
        <View style={styles.progExpanded}>
          {/* 성장 지수 */}
          <View style={styles.growthRow}>
            <GrowthBar label="캠프 전" score={prog.preScore} color="#7c8390" />
            <View style={styles.growthArrow}><Text style={styles.growthArrowText}>→</Text></View>
            <GrowthBar label="캠프 후" score={prog.postScore} color={gradeColor} />
          </View>

          {/* 역량별 점수 */}
          <Text style={styles.subSectionTitle}>역량별 평가</Text>
          {prog.competencies.map((c, i) => (
            <CompetencyRow key={i} comp={c} gradeColor={gradeColor} />
          ))}

          {/* 강사 총평 */}
          <View style={styles.commentBox}>
            <Text style={styles.commentLabel}>강사 총평</Text>
            <Text style={styles.commentText}>{prog.instructorComment}</Text>
          </View>

          {/* 인상적이었던 점 */}
          {prog.highlights.length > 0 && (
            <View style={styles.highlightBox}>
              <Text style={styles.highlightLabel}>인상적이었던 점</Text>
              {prog.highlights.map((h, i) => (
                <View key={i} style={styles.highlightRow}>
                  <Text style={styles.highlightStar}>★</Text>
                  <Text style={styles.highlightText}>{h}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 향후 발전 방향 */}
          <View style={styles.nextStepsBox}>
            <Text style={styles.nextStepsLabel}>향후 발전 방향</Text>
            {prog.nextSteps.map((s, i) => (
              <View key={i} style={styles.nextStepRow}>
                <View style={styles.nextStepNum}>
                  <Text style={styles.nextStepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.nextStepText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function GrowthBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <View style={styles.growthBarWrap}>
      <Text style={styles.growthBarLabel}>{label}</Text>
      <Text style={[styles.growthBarScore, { color }]}>{score}점</Text>
      <View style={styles.growthBarBg}>
        <View style={[styles.growthBarFill, { height: `${score}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function CompetencyRow({ comp, gradeColor }: { comp: CompetencyScore; gradeColor: string }) {
  const diff = comp.score - comp.benchmark;
  return (
    <View style={styles.compRow}>
      <View style={styles.compLabelWrap}>
        <Text style={styles.compLabel}>{comp.label}</Text>
        <Text style={styles.compDesc}>{comp.description}</Text>
      </View>
      <View style={styles.compRight}>
        <View style={styles.compBarBg}>
          {/* 또래 평균 */}
          <View style={[styles.compBenchmarkLine, { left: `${comp.benchmark}%` }]} />
          {/* 점수 바 */}
          <View style={[styles.compBarFill, { width: `${comp.score}%`, backgroundColor: gradeColor }]} />
        </View>
        <View style={styles.compScoreRow}>
          <Text style={[styles.compScore, { color: gradeColor }]}>{comp.score}</Text>
          <Text style={[styles.compDiff, { color: diff >= 0 ? '#141a24' : '#dc2626' }]}>
            {diff >= 0 ? `+${diff}` : diff}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── 스타일 ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: { flexGrow: 1 },

  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#161a22',
    borderBottomWidth: 1,
    borderBottomColor: '#262b36',
  },
  backBtn: {},
  backText: { fontSize: 16, color: '#d4b06a', fontWeight: '500' },
  navActions: { flexDirection: 'row', gap: 8 },
  navBtn: {
    borderWidth: 1, borderColor: '#262b36', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  navBtnText: { fontSize: 15, color: '#d4d7dd', fontWeight: '500' },
  navBtnPrimary: { backgroundColor: '#d4b06a', borderColor: '#d4b06a' },
  navBtnPrimaryText: { fontSize: 15, color: '#0c0e13', fontWeight: '700' },

  // 종합 헤더 카드
  heroCard: {
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: '#161a22', borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: '#262b36',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  heroAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#1e232d', alignItems: 'center', justifyContent: 'center',
  },
  heroAvatarText: { fontSize: 22, fontWeight: '700', color: '#d4b06a' },
  heroName: { fontSize: 18, fontWeight: '700', color: '#f2f2f0' },
  heroCampus: { fontSize: 14, color: '#9aa0ab', marginTop: 1 },
  heroPeriod: { fontSize: 14, color: '#9aa0ab', marginTop: 1 },
  heroGrade: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  heroGradeText: { fontSize: 26, fontWeight: '900' },
  totalScoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalScoreLabel: { fontSize: 15, color: '#9aa0ab', fontWeight: '500' },
  totalScoreValue: { fontSize: 16, fontWeight: '700' },
  totalBarBg: { height: 8, backgroundColor: '#1e232d', borderRadius: 4, overflow: 'hidden', marginBottom: 16 },
  totalBarFill: { height: 8, borderRadius: 4 },
  personalityBox: {
    backgroundColor: '#0c0e13', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#262b36',
  },
  personalityType: { fontSize: 16, fontWeight: '700', color: '#f2f2f0', marginBottom: 6 },
  personalityDesc: { fontSize: 15, color: '#d4d7dd', lineHeight: 23 },

  // 강점 / 발전
  twoColRow: { flexDirection: 'row', marginHorizontal: 20, marginTop: 12, gap: 10 },
  twoColCard: { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1 },
  strengthCard: { backgroundColor: '#1e232d', borderColor: '#343a47' },
  growthCard: { backgroundColor: '#1e232d', borderColor: '#343a47' },
  twoColTitle: { fontSize: 14, fontWeight: '700', color: '#d4b06a', marginBottom: 10 },
  twoColItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  checkDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d4b06a' },
  arrowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7c8390' },
  strengthText: { fontSize: 14, color: '#d4b06a', flex: 1 },
  growthText: { fontSize: 14, color: '#d4b06a', flex: 1 },

  // 담임 총평
  overallCommentCard: {
    marginHorizontal: 20, marginTop: 12,
    backgroundColor: '#161a22', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: '#262b36',
  },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#9aa0ab', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  overallCommentText: { fontSize: 16, color: '#d4d7dd', lineHeight: 25 },

  // 프로그램별
  programSectionTitle: {
    fontSize: 16, fontWeight: '700', color: '#f2f2f0',
    marginHorizontal: 20, marginTop: 24, marginBottom: 10,
  },
  progCard: {
    marginHorizontal: 20, marginBottom: 10,
    backgroundColor: '#161a22', borderRadius: 14,
    borderWidth: 1, borderColor: '#262b36', overflow: 'hidden',
  },
  progCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
  },
  progIcon: { fontSize: 24 },
  progTitleWrap: { flex: 1 },
  progName: { fontSize: 16, fontWeight: '700', color: '#f2f2f0' },
  progMeta: { fontSize: 14, color: '#9aa0ab', marginTop: 2 },
  progGradeBadge: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  progGradeText: { fontSize: 17, fontWeight: '900' },
  progScoreWrap: { alignItems: 'flex-end' },
  progScore: { fontSize: 20, fontWeight: '800' },
  expandArrow: { fontSize: 20, color: '#7c8390', transform: [{ rotate: '0deg' }] },
  expandArrowOpen: { transform: [{ rotate: '90deg' }], color: '#d4b06a' },

  progBarSection: {
    paddingHorizontal: 14, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  progBarBg: { flex: 1, height: 6, backgroundColor: '#1e232d', borderRadius: 3, overflow: 'hidden' },
  progBarFill: { height: 6, borderRadius: 3 },
  growthChip: {
    backgroundColor: '#1e232d', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  growthChipText: { fontSize: 14, color: '#d4b06a', fontWeight: '700' },

  // 확장 영역
  progExpanded: {
    borderTopWidth: 1, borderTopColor: '#262b36',
    padding: 14,
  },
  growthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, height: 80 },
  growthBarWrap: { flex: 1, alignItems: 'center' },
  growthBarLabel: { fontSize: 14, color: '#9aa0ab', marginBottom: 4 },
  growthBarScore: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  growthBarBg: { width: '70%', height: 40, backgroundColor: '#1e232d', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  growthBarFill: { width: '100%', borderRadius: 4 },
  growthArrow: { paddingHorizontal: 12 },
  growthArrowText: { fontSize: 20, color: '#9aa0ab' },

  subSectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#9aa0ab',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 10,
  },
  compRow: { marginBottom: 12 },
  compLabelWrap: { marginBottom: 4 },
  compLabel: { fontSize: 15, fontWeight: '600', color: '#d4d7dd' },
  compDesc: { fontSize: 14, color: '#9aa0ab' },
  compRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compBarBg: {
    flex: 1, height: 8, backgroundColor: '#1e232d',
    borderRadius: 4, overflow: 'visible', position: 'relative',
  },
  compBarFill: { height: 8, borderRadius: 4 },
  compBenchmarkLine: {
    position: 'absolute', top: -2, bottom: -2,
    width: 2, backgroundColor: '#343a47', zIndex: 1,
  },
  compScoreRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  compScore: { fontSize: 16, fontWeight: '800', minWidth: 28 },
  compDiff: { fontSize: 14, fontWeight: '600' },

  commentBox: {
    backgroundColor: '#0c0e13', borderRadius: 10, padding: 12,
    marginTop: 14, marginBottom: 10,
  },
  commentLabel: { fontSize: 14, fontWeight: '700', color: '#d4d7dd', marginBottom: 6 },
  commentText: { fontSize: 15, color: '#d4d7dd', lineHeight: 23 },

  highlightBox: {
    backgroundColor: '#1e232d', borderRadius: 10, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: '#4a3a1e',
  },
  highlightLabel: { fontSize: 14, fontWeight: '700', color: '#d4d7dd', marginBottom: 8 },
  highlightRow: { flexDirection: 'row', gap: 6, marginBottom: 5 },
  highlightStar: { fontSize: 14, color: '#7c8390' },
  highlightText: { flex: 1, fontSize: 15, color: '#f2a65a', lineHeight: 21 },

  nextStepsBox: {
    backgroundColor: '#1e232d', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#343a47',
  },
  nextStepsLabel: { fontSize: 14, fontWeight: '700', color: '#d4b06a', marginBottom: 8 },
  nextStepRow: { flexDirection: 'row', gap: 8, marginBottom: 6, alignItems: 'flex-start' },
  nextStepNum: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#d4b06a', alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  nextStepNumText: { fontSize: 14, fontWeight: '700', color: '#0c0e13' },
  nextStepText: { flex: 1, fontSize: 15, color: '#d4d7dd', lineHeight: 21 },
});
