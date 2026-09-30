/**
 * 보고서 → 워드(DOCX) — docx 라이브러리, 브라우저에서 만든다
 *   A4 세로 · 여백 좌우 15mm · 맑은 고딕 · 장/절/항은 Word 제목 1~3 스타일(탐색 창에 보인다)
 *   표는 머리 행 반복 · 회색 바탕, 쪽 번호 아래 가운데
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type { Align, Block, ReportDoc } from "./model";

const FONT = { ascii: "맑은 고딕", eastAsia: "맑은 고딕", hAnsi: "맑은 고딕", cs: "맑은 고딕" };
const TEXT_WIDTH = 11906 - 850 * 2; // A4 폭 - 좌우 여백 (twip)
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

function align(a: Align | undefined) {
  return a === "C" ? AlignmentType.CENTER : a === "R" ? AlignmentType.RIGHT : AlignmentType.LEFT;
}

function run(text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) {
  return new TextRun({ text, font: FONT, bold: opts.bold, size: opts.size, color: opts.color });
}

function cellParas(text: string, a: Align | undefined, head: boolean, small: boolean): Paragraph[] {
  return (text ?? "").split("\n").map(
    (l) =>
      new Paragraph({
        alignment: head ? AlignmentType.CENTER : align(a),
        spacing: { before: 0, after: 0, line: 276 },
        children: [run(l, { bold: head, size: small ? 16 : 19 })],
      }),
  );
}

function table(head: string[] | null, rows: string[][], weights: number[], aligns: Align[] | undefined, opts: { small?: boolean; firstColHead?: boolean } = {}): Table {
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const widths = weights.map((w) => Math.floor((TEXT_WIDTH * w) / total));
  const mk = (cells: string[], isHead: boolean) =>
    new TableRow({
      tableHeader: isHead,
      cantSplit: true,
      children: widths.map((w, ci) => {
        const h = isHead || (!!opts.firstColHead && ci === 0);
        return new TableCell({
          width: { size: w, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          borders: BORDERS,
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          shading: h ? { type: ShadingType.CLEAR, color: "auto", fill: "E7E6E6" } : undefined,
          children: cellParas(cells[ci] ?? "", isHead ? "C" : aligns?.[ci], h, !!opts.small),
        });
      }),
    });
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: TEXT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [...(head ? [mk(head, true)] : []), ...rows.map((r) => mk(r, false))],
  });
}

function blocks(b: Block): Array<Paragraph | Table> {
  switch (b.t) {
    case "h1":
      return [new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run(b.text)] })];
    case "h2":
      return [new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(b.text)] })];
    case "h3":
      return [new Paragraph({ heading: HeadingLevel.HEADING_3, children: [run(b.text)] })];
    case "p":
      return b.text.split("\n").map(
        (l) =>
          new Paragraph({
            alignment: b.tone === "muted" ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
            spacing: { after: 80, line: b.tone === "muted" ? 300 : 360 },
            children: [run(l, b.tone === "muted" ? { size: 18, color: "666666" } : {})],
          }),
      );
    case "bullets":
      return b.items.map((it) => new Paragraph({ indent: { left: 280, hanging: 200 }, spacing: { after: 40, line: 336 }, children: [run(`• ${it}`)] }));
    case "table":
      return [table(b.head, b.rows, b.widths, b.align, { small: b.small }), new Paragraph({ spacing: { after: 80 }, children: [] })];
    case "kv":
      return [table(null, b.rows, [24, 76], ["C", "L"], { firstColHead: true }), new Paragraph({ spacing: { after: 80 }, children: [] })];
    case "pageBreak":
      return [new Paragraph({ pageBreakBefore: true, children: [] })];
  }
}

export function buildDocx(doc: ReportDoc): Document {
  const heading = (id: string, name: string, size: number, before: number, after: number) => ({
    id,
    name,
    basedOn: "Normal",
    next: "Normal",
    quickFormat: true,
    run: { font: FONT, size, bold: true, color: "000000" },
    paragraph: { spacing: { before, after }, keepNext: true },
  });
  return new Document({
    creator: "ThinkCampus",
    title: doc.title,
    styles: {
      default: { document: { run: { font: FONT, size: 21 } } },
      paragraphStyles: [heading("Heading1", "Heading 1", 28, 320, 120), heading("Heading2", "Heading 2", 24, 200, 80), heading("Heading3", "Heading 3", 22, 160, 60)],
    },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1020, left: 850, right: 850 } } },
        footers: {
          default: new Footer({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ font: FONT, size: 18, children: ["- ", PageNumber.CURRENT, " -"] })] })],
          }),
        },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [run(doc.title, { bold: true, size: 40 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [run(doc.subtitle, { size: 22, color: "555555" })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 }, children: [run(doc.preparedLine, { size: 18, color: "666666" })] }),
          ...doc.blocks.flatMap(blocks),
        ],
      },
    ],
  });
}

export async function renderDocx(doc: ReportDoc): Promise<Blob> {
  return Packer.toBlob(buildDocx(doc));
}
