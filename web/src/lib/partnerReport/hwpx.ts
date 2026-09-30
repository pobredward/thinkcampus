/**
 * 보고서 → 한글(HWPX) — 브라우저에서 JSZip 으로 묶는다
 *
 *   글자 · 문단 · 테두리 모양은 public/hwpx/header.xml (python-hwpx 로 만든 정의표) 의 번호를 쓴다
 *     글자(charPr)  7 제목 20pt · 8 부제 11pt 회색 · 9 장 14pt 굵게 · 10 절 12pt 굵게 · 11 항 11pt 굵게
 *                   12 본문 10.5pt · 13 작은 글씨 9pt 회색 · 14 표 머리 9.5pt 굵게 · 15 표 9.5pt   (모두 맑은 고딕)
 *     문단(paraPr)  20 제목(가운데) · 21 부제(가운데) · 22~24 장·절·항(다음 문단과 함께) · 25 본문(양쪽, 160%)
 *                   26 글머리 · 27 작은 글씨 · 28/29/30 표 칸 왼쪽/가운데/오른쪽
 *     테두리(borderFill) 3 표 칸 · 4 표 머리(회색 바탕)
 *   A4 세로, 쪽 번호 아래 가운데. 표는 쪽을 넘어가면 나뉘고 머리 행이 반복된다.
 *   검증: hwpx-validate / hwpx-validate-package (python-hwpx) — scripts 에서 확인
 */

import JSZip from "jszip";
import type { Align, Block, ReportDoc } from "./model";

const CP = { title: 7, sub: 8, h1: 9, h2: 10, h3: 11, body: 12, small: 13, th: 14, td: 15 } as const;
const PP = { title: 20, sub: 21, h1: 22, h2: 23, h3: 24, body: 25, bullet: 26, small: 27, cellL: 28, cellC: 29, cellR: 30 } as const;
const BF = { cell: 3, head: 4 } as const;
const TEXT_WIDTH = 42520; // A4 59528 - 좌우 여백 8504 × 2

const NS =
  'xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history" xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf/" xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart" xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar" xmlns:epub="http://www.idpf.org/2007/ops" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"';

const SEC_PR =
  '<hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" tabStopVal="4000" tabStopUnit="HWPUNIT" outlineShapeIDRef="1" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0"><hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/><hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/><hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/><hp:lineNumberShape restartType="0" countBy="0" distance="0" startNumber="0"/><hp:pagePr landscape="WIDELY" width="59528" height="84186" gutterType="LEFT_ONLY"><hp:margin header="4252" footer="4252" gutter="0" left="8504" right="8504" top="5668" bottom="4252"/></hp:pagePr><hp:footNotePr><hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/><hp:noteLine length="-1" type="SOLID" width="0.12 mm" color="#000000"/><hp:noteSpacing betweenNotes="283" belowLine="567" aboveLine="850"/><hp:numbering type="CONTINUOUS" newNum="1"/><hp:placement place="EACH_COLUMN" beneathText="0"/></hp:footNotePr><hp:endNotePr><hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/><hp:noteLine length="14692344" type="SOLID" width="0.12 mm" color="#000000"/><hp:noteSpacing betweenNotes="0" belowLine="567" aboveLine="850"/><hp:numbering type="CONTINUOUS" newNum="1"/><hp:placement place="END_OF_DOCUMENT" beneathText="0"/></hp:endNotePr><hp:pageBorderFill type="BOTH" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"><hp:offset left="1417" right="1417" top="1417" bottom="1417"/></hp:pageBorderFill><hp:pageBorderFill type="EVEN" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"><hp:offset left="1417" right="1417" top="1417" bottom="1417"/></hp:pageBorderFill><hp:pageBorderFill type="ODD" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"><hp:offset left="1417" right="1417" top="1417" bottom="1417"/></hp:pageBorderFill></hp:secPr>';

function esc(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

class Ids {
  private n = 1_000_000;
  next(): number {
    return ++this.n;
  }
}

function para(ids: Ids, pp: number, cp: number, text: string, pageBreak = false): string {
  const t = text ? `<hp:t>${esc(text)}</hp:t>` : "<hp:t/>";
  return `<hp:p id="${ids.next()}" paraPrIDRef="${pp}" styleIDRef="0" pageBreak="${pageBreak ? 1 : 0}" columnBreak="0" merged="0"><hp:run charPrIDRef="${cp}">${t}</hp:run></hp:p>`;
}

function colWidths(weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const out = weights.map((w) => Math.floor((TEXT_WIDTH * w) / total));
  out[out.length - 1] += TEXT_WIDTH - out.reduce((a, b) => a + b, 0);
  return out;
}

function cell(ids: Ids, text: string, col: number, row: number, width: number, head: boolean, align: Align, small: boolean): string {
  const pp = align === "C" ? PP.cellC : align === "R" ? PP.cellR : PP.cellL;
  const cp = head ? CP.th : small ? CP.small : CP.td;
  const lines = (text ?? "").split("\n");
  const paras = lines.map((l) => para(ids, head ? PP.cellC : pp, cp, l)).join("");
  return (
    `<hp:tc name="" header="${head ? 1 : 0}" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="${head ? BF.head : BF.cell}">` +
    `<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">${paras}</hp:subList>` +
    `<hp:cellAddr colAddr="${col}" rowAddr="${row}"/><hp:cellSpan colSpan="1" rowSpan="1"/><hp:cellSz width="${width}" height="282"/><hp:cellMargin left="510" right="510" top="141" bottom="141"/></hp:tc>`
  );
}

function table(ids: Ids, head: string[] | null, rows: string[][], weights: number[], align: Align[] | undefined, opts: { small?: boolean; firstColHead?: boolean } = {}): string {
  const widths = colWidths(weights);
  const all = head ? [head, ...rows] : rows;
  const trs = all
    .map((r, ri) => {
      const isHead = !!head && ri === 0;
      const tds = widths.map((w, ci) => cell(ids, r[ci] ?? "", ci, ri, w, isHead || (!!opts.firstColHead && ci === 0), isHead ? "C" : (align?.[ci] ?? "L"), !!opts.small)).join("");
      return `<hp:tr>${tds}</hp:tr>`;
    })
    .join("");
  const tbl =
    `<hp:tbl id="${ids.next()}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="${head ? 1 : 0}" rowCnt="${all.length}" colCnt="${widths.length}" cellSpacing="0" borderFillIDRef="${BF.cell}" noAdjust="0">` +
    `<hp:sz width="${TEXT_WIDTH}" widthRelTo="ABSOLUTE" height="${all.length * 282}" heightRelTo="ABSOLUTE" protect="0"/>` +
    `<hp:pos treatAsChar="0" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>` +
    `<hp:outMargin left="0" right="0" top="0" bottom="283"/><hp:inMargin left="510" right="510" top="141" bottom="141"/>${trs}</hp:tbl>`;
  return `<hp:p id="${ids.next()}" paraPrIDRef="${PP.small}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="${CP.td}">${tbl}<hp:t/></hp:run></hp:p>`;
}

function blockXml(ids: Ids, b: Block): string {
  switch (b.t) {
    case "h1":
      return para(ids, PP.h1, CP.h1, b.text);
    case "h2":
      return para(ids, PP.h2, CP.h2, b.text);
    case "h3":
      return para(ids, PP.h3, CP.h3, b.text);
    case "p":
      return b.text
        .split("\n")
        .map((l) => (b.tone === "muted" ? para(ids, PP.small, CP.small, l) : para(ids, PP.body, CP.body, l)))
        .join("");
    case "bullets":
      return b.items.map((it) => para(ids, PP.bullet, CP.body, `• ${it}`)).join("");
    case "table":
      return table(ids, b.head, b.rows, b.widths, b.align, { small: b.small });
    case "kv":
      return table(ids, null, b.rows.map(([k, v]) => [k, v]), [24, 76], ["C", "L"], { firstColHead: true });
    case "pageBreak":
      return para(ids, PP.body, CP.body, "", true);
  }
}

export function buildSectionXml(doc: ReportDoc): string {
  const ids = new Ids();
  const first =
    `<hp:p id="0" paraPrIDRef="${PP.title}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">` +
    `<hp:run charPrIDRef="0">${SEC_PR}<hp:ctrl><hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/></hp:ctrl>` +
    `<hp:ctrl><hp:pageNum pos="BOTTOM_CENTER" formatType="DIGIT" sideChar="-"/></hp:ctrl></hp:run>` +
    `<hp:run charPrIDRef="${CP.title}"><hp:t>${esc(doc.title)}</hp:t></hp:run></hp:p>`;
  const body = [para(ids, PP.sub, CP.sub, doc.subtitle), para(ids, PP.sub, CP.small, doc.preparedLine), ...doc.blocks.map((b) => blockXml(ids, b))].join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><hs:sec ${NS}>${first}${body}</hs:sec>`;
}

function plainText(doc: ReportDoc): string {
  const out: string[] = [doc.title, doc.subtitle];
  for (const b of doc.blocks) {
    if (b.t === "h1" || b.t === "h2" || b.t === "h3" || b.t === "p") out.push(b.text);
    else if (b.t === "bullets") out.push(...b.items);
    if (out.join("\n").length > 1000) break;
  }
  return out.join("\r\n").slice(0, 1000);
}

function contentHpf(title: string): string {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><opf:package ${NS} version="" unique-identifier="" id="">` +
    `<opf:metadata><opf:title>${esc(title)}</opf:title><opf:language>ko</opf:language><opf:meta name="creator" content="text">ThinkCampus</opf:meta><opf:meta name="subject" content="text"/><opf:meta name="description" content="text"/><opf:meta name="lastsaveby" content="text">ThinkCampus</opf:meta><opf:meta name="CreatedDate" content="text">${now}</opf:meta><opf:meta name="ModifiedDate" content="text">${now}</opf:meta><opf:meta name="keyword" content="text"/></opf:metadata>` +
    `<opf:manifest><opf:item id="header" href="Contents/header.xml" media-type="application/xml"/><opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/><opf:item id="settings" href="settings.xml" media-type="application/xml"/></opf:manifest>` +
    `<opf:spine><opf:itemref idref="header" linear="yes"/><opf:itemref idref="section0" linear="yes"/></opf:spine></opf:package>`
  );
}

const VERSION_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="WORDPROCESSOR" major="5" minor="1" micro="1" buildNumber="0" os="1" xmlVersion="1.5" application="Hancom Office Hangul" appVersion="13, 0, 0, 1408 WIN32LEWindows_10"/>';
const SETTINGS_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"><ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/></ha:HWPApplicationSetting>';
const CONTAINER_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf"><ocf:rootfiles><ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/><ocf:rootfile full-path="Preview/PrvText.txt" media-type="text/plain"/><ocf:rootfile full-path="META-INF/container.rdf" media-type="application/rdf+xml"/></ocf:rootfiles></ocf:container>';
const MANIFEST_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>';
const CONTAINER_RDF =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about=""><ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" rdf:resource="Contents/header.xml"/></rdf:Description><rdf:Description rdf:about="Contents/header.xml"><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#HeaderFile"/></rdf:Description><rdf:Description rdf:about=""><ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" rdf:resource="Contents/section0.xml"/></rdf:Description><rdf:Description rdf:about="Contents/section0.xml"><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#SectionFile"/></rdf:Description><rdf:Description rdf:about=""><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#Document"/></rdf:Description></rdf:RDF>';

/** headerXml: public/hwpx/header.xml 내용 (브라우저는 fetch, 검증 스크립트는 파일에서) */
export async function renderHwpx(doc: ReportDoc, headerXml: string): Promise<Uint8Array> {
  const zip = new JSZip();
  // mimetype 은 맨 처음 · 압축하지 않음 (OCF 규칙)
  zip.file("mimetype", "application/hwp+zip", { compression: "STORE" });
  zip.file("version.xml", VERSION_XML);
  zip.file("Contents/header.xml", headerXml);
  zip.file("Contents/section0.xml", buildSectionXml(doc));
  zip.file("Contents/content.hpf", contentHpf(doc.title));
  zip.file("Preview/PrvText.txt", plainText(doc));
  zip.file("settings.xml", SETTINGS_XML);
  zip.file("META-INF/container.rdf", CONTAINER_RDF);
  zip.file("META-INF/container.xml", CONTAINER_XML);
  zip.file("META-INF/manifest.xml", MANIFEST_XML);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

export async function loadHwpxHeader(): Promise<string> {
  const res = await fetch("/hwpx/header.xml");
  if (!res.ok) throw new Error("한글 양식 파일을 불러오지 못했어요.");
  return res.text();
}
