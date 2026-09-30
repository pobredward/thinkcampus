/**
 * 종합 리포트 PDF — 브라우저에서 만든다 (@react-pdf/renderer)
 *   화면(FinalReportView)과 같은 순서·같은 문구, 인쇄용 흰 배경 + 골드 포인트
 *   이 모듈은 무거워서(약 1MB) 버튼을 누를 때만 `await import("@/lib/reportPdf")` 로 불러온다
 *
 * 폰트: public/fonts/Pretendard-*.subset.ttf (한글 전체 11,172자 + 라틴 · 기호, 각 2.1MB · gzip 전송 시 0.9MB)
 *        WOFF 는 fontkit 이 푸는 데 15초 넘게 걸려 TTF 를 쓴다 (서버·CDN 이 gzip/brotli 로 압축해 보낸다)
 */

import { Document, Font, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { GRADE_LABEL, type ProgramReport, type ReportGrade, type StudentReport } from "@/data/dummyReport";

// ── 폰트 ──────────────────────────────────────────────
let fontsReady = false;
function ensureFonts() {
  if (fontsReady) return;
  Font.register({
    family: "Pretendard",
    fonts: [
      { src: "/fonts/Pretendard-Regular.subset.ttf", fontWeight: 400 },
      { src: "/fonts/Pretendard-Bold.subset.ttf", fontWeight: 700 },
    ],
  });
  // 줄바꿈은 띄어쓰기 단위 (글자 단위로 쪼개면 줄 배치 계산이 수십 초 걸린다) — 한글 문장은 띄어쓰기가 잦아 충분하다
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

// ── 색 (인쇄용) ────────────────────────────────────────
const C = {
  ink: "#14161c",
  fg2: "#2f333c",
  sub: "#6b7280",
  faint: "#9aa0ab",
  line: "#e3e5ea",
  elev: "#f4f5f7",
  gold: "#9a7a35", // 흰 배경 위 글자용 (대비 4.5:1)
  goldFill: "#d4b06a",
  goldLight: "#f7f1e3",
  goldBorder: "#e2d3ad",
  late: "#b8641a",
  danger: "#b9413d",
};

const GRADE_FILL: Record<ReportGrade, string> = {
  S: "#d4b06a",
  A: "#e0c184",
  B: "#b4b9c3",
  C: "#9aa0ab",
};

const s = StyleSheet.create({
  page: {
    fontFamily: "Pretendard",
    fontSize: 10,
    color: C.ink,
    paddingTop: 44,
    paddingBottom: 50,
    paddingHorizontal: 40,
    lineHeight: 1.5,
  },
  header: {
    position: "absolute",
    top: 18,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: C.faint,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: C.faint,
    borderTopWidth: 0.5,
    borderTopColor: C.line,
    paddingTop: 6,
  },
  h1: { fontSize: 20, fontWeight: 700, lineHeight: 1.3 },
  h2: {
    fontSize: 11,
    fontWeight: 700,
    color: C.gold,
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 8,
  },
  cover: {
    borderWidth: 1,
    borderColor: C.goldBorder,
    borderRadius: 10,
    padding: 16,
    backgroundColor: "#fff",
  },
  eyebrow: { fontSize: 9, fontWeight: 700, color: C.gold, letterSpacing: 1 },
  metaRow: { flexDirection: "row", marginTop: 3 },
  metaKey: { width: 48, color: C.sub },
  metaVal: { color: C.fg2, flex: 1 },
  card: {
    borderWidth: 0.75,
    borderColor: C.line,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },
  tint: { backgroundColor: C.elev, borderRadius: 6, padding: 10 },
  goldTint: {
    backgroundColor: C.goldLight,
    borderWidth: 0.75,
    borderColor: C.goldBorder,
    borderRadius: 6,
    padding: 10,
  },
  label: { fontSize: 9, fontWeight: 700, color: C.sub, marginBottom: 3 },
  body: { fontSize: 10, color: C.fg2 },
  quote: {
    borderLeftWidth: 2.5,
    borderLeftColor: C.goldFill,
    backgroundColor: C.elev,
    padding: 10,
    borderRadius: 4,
  },
  row: { flexDirection: "row" },
  gradeBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.75,
    borderColor: C.goldBorder,
  },
  stat: {
    flex: 1,
    borderWidth: 0.75,
    borderColor: C.line,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.goldFill,
    marginTop: 5,
    marginRight: 6,
  },
  num: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.goldFill,
    color: "#fff",
    fontSize: 8,
    fontWeight: 700,
    textAlign: "center",
    lineHeight: 1.75,
    marginRight: 6,
  },
  noteNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.elev,
    color: C.gold,
    fontSize: 9,
    fontWeight: 700,
    textAlign: "center",
    lineHeight: 2,
    marginRight: 8,
  },
});

function GradeBox({ grade, size = 44 }: { grade: ReportGrade; size?: number }) {
  return (
    <View style={[s.gradeBox, { width: size, height: size, backgroundColor: C.goldLight }]}>
      <Text
        style={{
          fontSize: size * 0.5,
          fontWeight: 700,
          color: grade === "S" || grade === "A" ? C.gold : C.sub,
          lineHeight: 1,
        }}
      >
        {grade}
      </Text>
    </View>
  );
}

function Bar({ score, benchmark, fill }: { score: number; benchmark: number; fill: string }) {
  return (
    <View
      style={{
        flex: 1,
        height: 6,
        backgroundColor: C.elev,
        borderRadius: 3,
        position: "relative",
        marginTop: 4,
      }}
    >
      <View
        style={{
          width: `${score}%`,
          height: 6,
          backgroundColor: fill,
          borderRadius: 3,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: `${benchmark}%`,
          top: -2,
          width: 1.2,
          height: 10,
          backgroundColor: C.fg2,
        }}
      />
    </View>
  );
}

function Subject({ p }: { p: ProgramReport }) {
  return (
    <View style={[s.card, { marginBottom: 8, padding: 10 }]} wrap={false}>
      <View style={[s.row, { alignItems: "center" }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 8.5, color: C.sub }}>
            {p.sessionNumber}회차 · {p.date}
          </Text>
          <Text style={{ fontSize: 12.5, fontWeight: 700, marginTop: 1 }}>{p.programName}</Text>
          <Text style={{ fontSize: 8.5, color: C.sub, marginTop: 1 }}>
            {p.instructorName} 선생님
            {p.instructorTitle ? ` · ${p.instructorTitle}` : ""}
          </Text>
        </View>
        <View style={{ alignItems: "center", marginRight: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: 700 }}>{p.overallScore}점</Text>
          <Text style={{ fontSize: 8, color: C.gold, fontWeight: 700 }}>
            {p.growthIndex >= 0 ? "+" : ""}
            {p.growthIndex}점 성장
          </Text>
        </View>
        <GradeBox grade={p.grade} size={36} />
      </View>

      <View style={{ marginTop: 8 }}>
        {p.competencies.map((c) => (
          <View key={c.label} style={[s.row, { alignItems: "center", marginBottom: 1.5 }]}>
            <Text style={{ width: 78, fontSize: 8.5, color: C.fg2 }}>{c.label}</Text>
            <Bar score={c.score} benchmark={c.benchmark} fill={GRADE_FILL[p.grade]} />
            <Text
              style={{
                width: 22,
                textAlign: "right",
                fontSize: 8.5,
                fontWeight: 700,
                color: C.fg2,
              }}
            >
              {c.score}
            </Text>
          </View>
        ))}
        <Text style={{ fontSize: 7.5, color: C.faint, textAlign: "right" }}>
          세로선 = 또래 평균 · 첫 시간 {p.preScore} → 마지막 {p.postScore}
        </Text>
      </View>

      <View style={[s.quote, { marginTop: 5, padding: 8 }]}>
        <Text style={s.label}>강사 코멘트</Text>
        <Text style={[s.body, { fontSize: 9.5 }]}>{p.instructorComment}</Text>
      </View>

      <View style={[s.row, { marginTop: 5 }]}>
        {p.highlights.length > 0 && (
          <View style={{ flex: 1, marginRight: 6 }}>
            <Text style={s.label}>인상적이었던 점</Text>
            {p.highlights.map((h) => (
              <View key={h} style={s.row}>
                <View style={s.bullet} />
                <Text style={[s.body, { flex: 1, fontSize: 9 }]}>{h}</Text>
              </View>
            ))}
          </View>
        )}
        {p.nextSteps.length > 0 && (
          <View style={[s.tint, { flex: 1.15, padding: 8 }]}>
            <Text style={[s.label, { color: C.gold }]}>집에서 이렇게 이어 가요</Text>
            {p.nextSteps.map((n, i) => (
              <View key={n} style={[s.row, { marginBottom: 2 }]}>
                <Text style={s.num}>{i + 1}</Text>
                <Text style={[s.body, { flex: 1, fontSize: 9 }]}>{n}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function ReportDoc({ report: r, sample }: { report: StudentReport; sample: boolean }) {
  const a = r.attendanceSummary;
  const stat = (k: string, v: string, color = C.ink) => (
    <View style={s.stat} key={k}>
      <Text style={{ fontSize: 8.5, color: C.sub }}>{k}</Text>
      <Text style={{ fontSize: 14, fontWeight: 700, color }}>{v}</Text>
    </View>
  );
  return (
    <Document title={`${r.studentName} 종합 학습 리포트 — ${r.programTitle}`} author="ThinkCampus" language="ko">
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <Text>ThinkCampus 종합 학습 리포트{sample ? " · 샘플" : ""}</Text>
          <Text>
            {r.studentName} 학생 · {r.programTitle}
          </Text>
        </View>
        <View style={s.footer} fixed>
          <Text>
            {r.issuedBy} · {sample ? "샘플 리포트" : `리포트 번호 ${r.reportId}`}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

        {sample && (
          <View style={[s.goldTint, { marginBottom: 10 }]}>
            <Text style={{ fontSize: 10, fontWeight: 700, color: C.gold }}>샘플 리포트예요</Text>
            <Text style={[s.body, { fontSize: 9 }]}>마지막 수업이 끝나면 영업일 3~5일 안에 실제 리포트가 발급돼요. 아래 내용은 리포트가 어떤 모습인지 보여 주는 예시예요.</Text>
          </View>
        )}

        {/* 표지 */}
        <View style={s.cover}>
          <Text style={s.eyebrow}>종합 학습 리포트</Text>
          <Text style={[s.h1, { marginTop: 4 }]}>{r.programTitle}</Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.fg2,
              marginTop: 2,
            }}
          >
            {r.studentName} 학생
          </Text>
          <View style={{ marginTop: 10 }}>
            <View style={s.metaRow}>
              <Text style={s.metaKey}>기간</Text>
              <Text style={s.metaVal}>{r.campPeriod}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaKey}>캠퍼스</Text>
              <Text style={s.metaVal}>{r.campusName}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaKey}>발급일</Text>
              <Text style={s.metaVal}>{sample ? "마지막 수업 뒤 영업일 3~5일" : r.issueDate}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaKey}>발급처</Text>
              <Text style={s.metaVal}>{r.issuedBy}</Text>
            </View>
          </View>
        </View>

        {/* 종합 */}
        <Text style={s.h2} minPresenceAhead={160}>
          종합
        </Text>
        <View style={s.card}>
          <View style={[s.row, { alignItems: "center" }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, color: C.sub }}>종합 점수</Text>
              <View style={[s.row, { alignItems: "flex-end" }]}>
                <Text style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>{r.totalScore}</Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: C.sub,
                    marginLeft: 3,
                    marginBottom: 3,
                  }}
                >
                  / 100
                </Text>
              </View>
              <Text style={{ fontSize: 9.5, fontWeight: 700, color: C.gold }}>
                {r.totalGrade} · {GRADE_LABEL[r.totalGrade]}
              </Text>
            </View>
            <GradeBox grade={r.totalGrade} />
          </View>

          {r.personalityType ? (
            <View style={[s.tint, { marginTop: 10 }]}>
              <Text style={s.label}>학습 성향</Text>
              <Text style={{ fontSize: 11.5, fontWeight: 700 }}>{r.personalityType}</Text>
              <Text style={[s.body, { marginTop: 2 }]}>{r.personalityDesc}</Text>
            </View>
          ) : null}

          {r.strengthAreas.length + r.growthAreas.length > 0 ? (
            <View style={[s.row, { marginTop: 8 }]}>
              <View style={[s.goldTint, { flex: 1, marginRight: 6 }]}>
                <Text style={[s.label, { color: C.gold }]}>강점 분야</Text>
                {r.strengthAreas.map((x) => (
                  <Text key={x} style={{ fontSize: 10, fontWeight: 700 }}>
                    {x}
                  </Text>
                ))}
              </View>
              <View style={[s.tint, { flex: 1 }]}>
                <Text style={s.label}>발전 분야</Text>
                {r.growthAreas.map((x) => (
                  <Text key={x} style={[s.body, { fontWeight: 700 }]}>
                    {x}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}

          {r.overallComment ? (
            <View style={[s.quote, { marginTop: 8 }]}>
              <Text style={s.label}>담임 총평</Text>
              <Text style={s.body}>{r.overallComment}</Text>
            </View>
          ) : null}
        </View>

        {/* 출석 */}
        {a.total > 0 && (
          <View>
            <Text style={s.h2} minPresenceAhead={80}>
              출석
            </Text>
            <View style={[s.row, { gap: 6 }]}>
              {stat("출석", `${a.present}회`, C.gold)}
              {stat("지각", `${a.late}회`, a.late > 0 ? C.late : C.ink)}
              {stat("결석", `${a.absent}회`, a.absent > 0 ? C.danger : C.ink)}
              {stat("과제", `${a.homeworkDone}/${a.homeworkTotal}`)}
            </View>
            <Text style={{ fontSize: 8, color: C.faint, marginTop: 4 }}>전체 {a.total}회 · 과제는 제출 횟수 / 과제가 있던 회차</Text>
          </View>
        )}

        {/* 과목별 평가 */}
        {r.programs.length > 0 && (
          <Text style={s.h2} minPresenceAhead={220}>
            과목별 평가
          </Text>
        )}
        {r.programs.map((p) => (
          <Subject key={p.programId} p={p} />
        ))}

        {/* 회차별 한마디 */}
        {r.sessionNotes.length > 0 && (
          <View>
            <Text style={s.h2} minPresenceAhead={200}>
              회차별 선생님 한마디
            </Text>
            <View style={s.card} wrap={false}>
              {r.sessionNotes.map((n, i) => (
                <View
                  key={n.sessionNumber}
                  style={[
                    s.row,
                    {
                      paddingVertical: 6,
                      borderTopWidth: i > 0 ? 0.5 : 0,
                      borderTopColor: C.line,
                    },
                  ]}
                >
                  <Text style={s.noteNum}>{n.sessionNumber}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 8.5, color: C.sub }}>
                      {n.date} · <Text style={{ fontWeight: 700, color: C.fg2 }}>{n.topic}</Text> · {n.instructorName} 선생님 ·{" "}
                      <Text
                        style={{
                          fontWeight: 700,
                          color: n.status === "late" ? C.late : n.status === "absent" ? C.danger : C.gold,
                        }}
                      >
                        {n.status === "present" ? "출석" : n.status === "late" ? "지각" : "결석"}
                      </Text>
                    </Text>
                    <Text style={[s.body, { marginTop: 1 }]}>{n.note}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 다음 프로그램 · 마무리 */}
        {(r.nextProgram || r.closingMessage) && (
          <View wrap={false}>
            <Text style={s.h2}>다음 이야기</Text>
            {r.nextProgram && (
              <View style={[s.card, { borderColor: C.goldBorder }]}>
                <Text style={[s.label, { color: C.gold }]}>다음 프로그램 안내</Text>
                <Text style={{ fontSize: 12, fontWeight: 700 }}>{r.nextProgram.title}</Text>
                <Text style={{ fontSize: 8.5, color: C.sub }}>{r.nextProgram.period}</Text>
                <Text style={[s.body, { marginTop: 3 }]}>{r.nextProgram.note}</Text>
              </View>
            )}
            {r.closingMessage ? <Text style={[s.body, { marginTop: 10 }]}>{r.closingMessage}</Text> : null}
          </View>
        )}
      </Page>
    </Document>
  );
}

// ── 공개 API ───────────────────────────────────────────

export function reportPdfFileName(r: StudentReport, sample = false): string {
  const clean = (x: string) =>
    x
      .replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  return `${clean(r.studentName)}_${clean(r.programTitle)}_종합리포트${sample ? "(샘플)" : ""}.pdf`;
}

export async function renderReportPdfBlob(report: StudentReport, sample = false): Promise<Blob> {
  ensureFonts();
  return pdf(<ReportDoc report={report} sample={sample} />).toBlob();
}

export { saveBlob } from "./download";

/** 기기가 파일 공유 시트(카카오톡 · 문자 · 메일)를 지원하는지 */
export function canSharePdfFile(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  try {
    const probe = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "probe.pdf", { type: "application/pdf" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export async function sharePdfFile(blob: Blob, fileName: string, title: string): Promise<"shared" | "cancelled"> {
  const file = new File([blob], fileName, { type: "application/pdf" });
  try {
    await navigator.share({ files: [file], title });
    return "shared";
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") return "cancelled";
    throw e;
  }
}
