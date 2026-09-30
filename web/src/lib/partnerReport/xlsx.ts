/**
 * 보고서 → 엑셀(XLSX) — exceljs, 브라우저에서 만든다
 *   문서가 아니라 "자료 묶음": 고른 장에 맞춰 시트를 만든다 (숫자는 숫자로 넣어 담당자가 합계 · 그래프를 바로 쓸 수 있게)
 *   개요 · 회차 · 학생별 출결 · 반별 출석 · 민원 · 문의 기록 · 학부모 공지 · 만족도 · 후기 · 강사진
 */

import ExcelJS from "exceljs";
import { INQUIRY_CATEGORY_LABEL, INQUIRY_CHANNEL_LABEL, INQUIRY_STATUS_LABEL, type PartnerReportData } from "@/services/types";
import { autoSummary, dotDate, dotDateIso, periodLine, type ReportOptions } from "./model";

const HEAD_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7E6E6" } };
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF999999" } },
  bottom: { style: "thin", color: { argb: "FF999999" } },
  left: { style: "thin", color: { argb: "FF999999" } },
  right: { style: "thin", color: { argb: "FF999999" } },
};
const FONT = { name: "맑은 고딕", size: 10 };

function sheet(wb: ExcelJS.Workbook, name: string, columns: Array<{ header: string; width: number; key?: string }>, rows: Array<Array<string | number | null>>): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns.map((c) => ({ header: c.header, width: c.width }));
  for (const r of rows) ws.addRow(r);
  ws.eachRow((row, i) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { ...FONT, bold: i === 1 };
      cell.border = BORDER;
      cell.alignment = { vertical: "middle", wrapText: true, horizontal: i === 1 ? "center" : undefined };
      if (i === 1) cell.fill = HEAD_FILL;
    });
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return ws;
}

export async function renderXlsx(d: PartnerReportData, opts: ReportOptions): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ThinkCampus";
  wb.created = new Date();
  const has = (id: ReportOptions["sections"][number]) => opts.sections.includes(id);
  const r = d.run;
  const st = d.inquiries.stats;

  // 개요 — 항목 / 내용
  const overview: Array<[string, string | number]> = [
    ["보고서", opts.title],
    ["사업명", r.title],
    ["계약 번호", r.contractCode],
    ["발주 · 주최", [r.municipalityName, r.host].filter(Boolean).join(" · ")],
    ["운영 기관", `씽크캠퍼스 ${r.campusName}`],
    ["장소", r.location],
    ["대상", r.targetGrade],
    ["기간", periodLine(d)],
    ["일정", r.scheduleLine],
    ["총 회차", r.totalSessions],
    ["회당 차시", r.lessonsPerSession],
    ["수강생 (명)", d.participation.students.length],
    ["전체 출석률 (%)", d.overallAttendanceRate ?? "-"],
    ["민원 접수 (건)", st.complaints.received],
    ["민원 처리 완료 (건)", st.complaints.resolved],
    ["민원 처리 중 (건)", st.complaints.inProgress],
    ["학부모 문의 (건)", st.questions.received],
    ["문의 답변 (건)", st.questions.answered],
    ["평균 첫 답변 (분)", st.questions.avgFirstReplyMinutes ?? "-"],
  ];
  if (d.survey) {
    overview.push(["만족도 응답 (명)", d.survey.responses], ["만족도 대상 (명)", d.survey.eligible], ["만족도 평균 (5점)", d.survey.overallAvg ?? "-"]);
  }
  if (d.finalReports) overview.push(["종합 리포트 발급 (명)", d.finalReports.issued]);
  if (has("purpose")) {
    if (r.purpose) overview.push(["목적", r.purpose]);
    if (r.overview) overview.push(["소개", r.overview]);
    if (r.features.length) overview.push(["특징", r.features.join("\n")]);
  }
  if (has("summary")) overview.push(["종합 의견 (자동 요약)", autoSummary(d).join("\n")]);
  overview.push(["작성", `${opts.preparedBy} · ${dotDateIso(d.generatedAt)}`]);
  sheet(wb, "개요", [{ header: "항목", width: 22 }, { header: "내용", width: 90 }], overview);

  if (has("schedule") || has("lessons")) {
    sheet(
      wb,
      "회차",
      [
        { header: "회차", width: 7 },
        { header: "날짜", width: 16 },
        { header: "시간 (반)", width: 26 },
        { header: "주제", width: 30 },
        { header: "학습 목표", width: 40 },
        { header: "준비물", width: 24 },
        { header: "강사", width: 28 },
        { header: "대상", width: 8 },
        { header: "출석", width: 8 },
        { header: "지각", width: 8 },
        { header: "결석", width: 8 },
        { header: "출석률 (%)", width: 11 },
      ],
      d.lessons.map((l) => {
        const a = l.attendance;
        const rec = a.present + a.late + a.absent;
        return [
          l.sessionNumber,
          dotDate(l.date),
          l.slots.join("\n"),
          l.topic,
          l.objectives.join("\n"),
          l.materials.join(", "),
          l.instructors.map((i) => `${i.name} (${i.sections.join("·")})`).join("\n"),
          a.enrolled,
          rec ? a.present : null,
          rec ? a.late : null,
          rec ? a.absent : null,
          a.rate,
        ];
      }),
    );
  }

  if (has("participation")) {
    const label = { present: "출석", late: "지각", absent: "결석" } as const;
    sheet(
      wb,
      "학생별 출결",
      [{ header: "학생", width: 12 }, { header: "반", width: 8 }, ...d.participation.sessions.map((s) => ({ header: `${s.sessionNumber}회 (${dotDate(s.date, false)})`, width: 14 })), { header: "출석 수", width: 9 }, { header: "지각 수", width: 9 }, { header: "결석 수", width: 9 }],
      d.participation.students.map((s) => [s.name, s.sectionLabel, ...s.statuses.map((x) => (x ? label[x] : "")), s.present, s.late, s.absent]),
    );
    sheet(
      wb,
      "반별 출석",
      [{ header: "반", width: 10 }, { header: "인원", width: 10 }, { header: "출석률 (%)", width: 12 }],
      d.participation.sections.map((s) => [s.label, s.studentCount, s.rate]),
    );
  }

  if (has("inquiries")) {
    sheet(
      wb,
      "민원",
      [
        { header: "접수일", width: 13 },
        { header: "분류", width: 11 },
        { header: "경로", width: 9 },
        { header: "학생", width: 14 },
        { header: "제목", width: 28 },
        { header: "내용", width: 48 },
        { header: "상태", width: 9 },
        { header: "처리 내용", width: 48 },
        { header: "처리일", width: 13 },
        { header: "발주처 의견", width: 30 },
      ],
      d.inquiries.complaints.map((q) => [
        dotDateIso(q.createdAt),
        INQUIRY_CATEGORY_LABEL[q.category],
        INQUIRY_CHANNEL_LABEL[q.channel],
        q.studentLabel,
        q.title,
        q.body,
        INQUIRY_STATUS_LABEL[q.status],
        q.resolution ?? "",
        q.resolvedAt ? dotDateIso(q.resolvedAt) : "",
        q.officerNote ?? "",
      ]),
    );
    sheet(
      wb,
      "문의 기록",
      [{ header: "접수일", width: 13 }, { header: "경로", width: 9 }, { header: "내용", width: 50 }, { header: "답변", width: 50 }],
      d.inquiries.loggedQuestions.map((q) => [dotDateIso(q.createdAt), INQUIRY_CHANNEL_LABEL[q.channel], q.body || q.title, q.resolution ?? ""]),
    );
    sheet(
      wb,
      "학부모 공지",
      [{ header: "보낸 날", width: 13 }, { header: "제목", width: 50 }, { header: "받은 보호자 (명)", width: 16 }],
      d.notices.map((n) => [dotDateIso(n.createdAt), n.title, n.recipients]),
    );
  }

  if (has("survey") && d.survey) {
    sheet(
      wb,
      "만족도",
      [{ header: "문항", width: 44 }, { header: "평균", width: 8 }, { header: "5점", width: 7 }, { header: "4점", width: 7 }, { header: "3점", width: 7 }, { header: "2점", width: 7 }, { header: "1점", width: 7 }],
      d.survey.items.map((it) => [it.question, it.avg, ...[4, 3, 2, 1, 0].map((k) => it.distribution[k] ?? 0)]),
    );
    sheet(
      wb,
      "후기",
      [{ header: "날짜", width: 13 }, { header: "학부모", width: 20 }, { header: "후기 (공개 동의분)", width: 80 }],
      d.survey.reviews.map((x) => [dotDateIso(x.submittedAt), x.studentLabel, x.text]),
    );
  }

  if (has("instructors")) {
    sheet(
      wb,
      "강사진",
      [{ header: "이름", width: 10 }, { header: "소속 · 직함", width: 26 }, { header: "전문 분야", width: 30 }, { header: "담당 회차", width: 50 }],
      d.instructors.map((i) => [i.name, i.title ?? "", i.specialties.join(", "), i.sessions.map((s) => `${s.sessionNumber}회 ${s.sectionLabel}`).join(", ")]),
    );
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
