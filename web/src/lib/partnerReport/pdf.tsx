/**
 * 보고서 → PDF — @react-pdf/renderer + Pretendard (public/fonts, 한글 11,172자 포함)
 *   A4 · 흰 바탕 · 인쇄용 검정 글자, 표 행은 쪽 사이에서 잘리지 않게, 쪽 번호 아래 가운데
 *   무거우므로 화면에서는 버튼을 누를 때 import 한다
 */

import { Document, Font, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { Align, Block, ReportDoc } from "./model";

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
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

const S = StyleSheet.create({
  page: { fontFamily: "Pretendard", fontSize: 10.5, color: "#111111", paddingTop: 48, paddingBottom: 48, paddingHorizontal: 44, lineHeight: 1.55 },
  title: { fontSize: 20, fontWeight: 700, textAlign: "center", marginBottom: 6 },
  subtitle: { fontSize: 11, color: "#555555", textAlign: "center" },
  prepared: { fontSize: 9, color: "#666666", textAlign: "center", marginTop: 2, marginBottom: 18 },
  h1: { fontSize: 14, fontWeight: 700, marginTop: 14, marginBottom: 6 },
  h2: { fontSize: 12, fontWeight: 700, marginTop: 8, marginBottom: 4 },
  h3: { fontSize: 11, fontWeight: 700, marginTop: 6, marginBottom: 3 },
  p: { marginBottom: 4, textAlign: "justify" },
  muted: { fontSize: 9, color: "#666666", marginBottom: 4 },
  bullet: { flexDirection: "row", marginBottom: 2, paddingLeft: 4 },
  bulletDot: { width: 10 },
  bulletText: { flex: 1 },
  table: { borderTopWidth: 0.6, borderLeftWidth: 0.6, borderColor: "#808080", marginBottom: 8 },
  tr: { flexDirection: "row" },
  td: { borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: "#808080", paddingVertical: 3, paddingHorizontal: 4, fontSize: 9, lineHeight: 1.4, justifyContent: "center" },
  th: { backgroundColor: "#E7E6E6", fontWeight: 700 },
  footer: { position: "absolute", bottom: 22, left: 0, right: 0, textAlign: "center", fontSize: 9, color: "#666666" },
});

function alignStyle(a: Align | undefined) {
  return { textAlign: a === "C" ? ("center" as const) : a === "R" ? ("right" as const) : ("left" as const) };
}

function Table({ head, rows, widths, align, small, firstColHead }: { head: string[] | null; rows: string[][]; widths: number[]; align?: Align[]; small?: boolean; firstColHead?: boolean }) {
  const total = widths.reduce((a, b) => a + b, 0) || 1;
  const pctW = widths.map((w) => `${(w / total) * 100}%`);
  const row = (cells: string[], isHead: boolean, key: string) => (
    <View key={key} style={S.tr} wrap={false}>
      {pctW.map((w, ci) => {
        const h = isHead || (!!firstColHead && ci === 0);
        return (
          <View key={ci} style={[S.td, h ? S.th : {}, { width: w }]}>
            <Text style={[isHead ? { textAlign: "center" } : alignStyle(align?.[ci]), small && !h ? { fontSize: 8 } : {}]}>{cells[ci] ?? ""}</Text>
          </View>
        );
      })}
    </View>
  );
  return (
    <View style={S.table}>
      {head && row(head, true, "h")}
      {rows.map((r, i) => row(r, false, String(i)))}
    </View>
  );
}

function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case "h1":
      return (
        <Text style={S.h1} minPresenceAhead={60}>
          {b.text}
        </Text>
      );
    case "h2":
      return (
        <Text style={S.h2} minPresenceAhead={40}>
          {b.text}
        </Text>
      );
    case "h3":
      return (
        <Text style={S.h3} minPresenceAhead={30}>
          {b.text}
        </Text>
      );
    case "p":
      return <Text style={b.tone === "muted" ? S.muted : S.p}>{b.text}</Text>;
    case "bullets":
      return (
        <View>
          {b.items.map((it, i) => (
            <View key={i} style={S.bullet} wrap={false}>
              <Text style={S.bulletDot}>•</Text>
              <Text style={S.bulletText}>{it}</Text>
            </View>
          ))}
        </View>
      );
    case "table":
      return <Table head={b.head} rows={b.rows} widths={b.widths} align={b.align} small={b.small} />;
    case "kv":
      return <Table head={null} rows={b.rows} widths={[24, 76]} align={["C", "L"]} firstColHead />;
    case "pageBreak":
      return <View break />;
  }
}

function ReportPdf({ doc }: { doc: ReportDoc }) {
  return (
    <Document title={doc.title} author="ThinkCampus" creator="ThinkCampus" language="ko">
      <Page size="A4" style={S.page}>
        <Text style={S.title}>{doc.title}</Text>
        <Text style={S.subtitle}>{doc.subtitle}</Text>
        <Text style={S.prepared}>{doc.preparedLine}</Text>
        {doc.blocks.map((b, i) => (
          <BlockView key={i} b={b} />
        ))}
        <Text style={S.footer} render={({ pageNumber }) => `- ${pageNumber} -`} fixed />
      </Page>
    </Document>
  );
}

export async function renderPartnerReportPdf(doc: ReportDoc): Promise<Blob> {
  ensureFonts();
  return pdf(<ReportPdf doc={doc} />).toBlob();
}
