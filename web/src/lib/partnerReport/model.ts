/**
 * 발주처 사업 보고서 — 공통 문서 모델
 *
 *   PartnerReportData (getPartnerReportData) → ReportDoc (제목 · 블록 목록) → HWPX · DOCX · PDF 로 그린다
 *   엑셀(XLSX)은 표 위주라 data 에서 바로 시트를 만든다 (xlsx.ts)
 *
 *   [양식 만들기]  넣을 장(섹션)을 고르고 제목을 정한다 → ReportOptions
 *   [개요 정리하기] 장마다 핵심 숫자 한두 줄 → 담당자가 자기 보고서(한글 양식)에 붙여 넣을 개요 텍스트
 *
 * 번호는 공문서 관례: 1. → 가. → 1)
 */

import {
  INQUIRY_CATEGORY_LABEL,
  INQUIRY_CHANNEL_LABEL,
  INQUIRY_STATUS_LABEL,
  type InquiryCategory,
  type PartnerReportData,
} from "@/services/types";

export type ReportSectionId =
  | "overview"
  | "purpose"
  | "schedule"
  | "lessons"
  | "instructors"
  | "participation"
  | "inquiries"
  | "survey"
  | "finalReports"
  | "summary";

export const REPORT_SECTIONS: Array<{ id: ReportSectionId; label: string; desc: string }> = [
  { id: "overview", label: "사업 개요", desc: "사업명 · 기간 · 대상 · 장소 · 회차 · 반" },
  { id: "purpose", label: "목적 · 취지", desc: "프로그램 목적 · 소개 · 특징" },
  { id: "schedule", label: "운영 일정", desc: "회차별 날짜 · 시간 · 주제 · 강사" },
  { id: "lessons", label: "회차별 운영 내용", desc: "회차마다 목표 · 수업 흐름 · 준비물 · 출석" },
  { id: "instructors", label: "강사진", desc: "강사 소속 · 전문 분야 · 담당 회차" },
  { id: "participation", label: "참여 현황", desc: "회차별 · 반별 출석률 (학생별 출결표 선택)" },
  { id: "inquiries", label: "민원 · 문의", desc: "민원 원문 요약 · 처리 결과 · 문의 응대 · 학부모 공지" },
  { id: "survey", label: "학부모 만족도", desc: "응답률 · 문항별 평균 · 공개 동의 후기" },
  { id: "finalReports", label: "학생 종합 평가 요약", desc: "종합 리포트 발급 · 등급 분포 · 강점 영역" },
  { id: "summary", label: "종합 의견 (자동 요약)", desc: "숫자로 정리한 성과와 개선할 점" },
];

export interface ReportOptions {
  title: string;
  sections: ReportSectionId[];
  /** 참여 현황에 학생 × 회차 출결표 넣기 (이름은 운영 건 설정대로 가려진다) */
  includeStudentTable: boolean;
  /** 작성 기관 (표지 아래 한 줄) */
  preparedBy: string;
}

export type Align = "L" | "C" | "R";

export type Block =
  | { t: "h1" | "h2" | "h3"; text: string }
  | { t: "p"; text: string; tone?: "muted" }
  | { t: "bullets"; items: string[] }
  | { t: "table"; head: string[]; rows: string[][]; widths: number[]; align?: Align[]; small?: boolean }
  | { t: "kv"; rows: Array<[string, string]> }
  | { t: "pageBreak" };

export interface ReportDoc {
  title: string;
  subtitle: string;
  preparedLine: string;
  blocks: Block[];
}

// ── 숫자 · 날짜 ─────────────────────────────────────────

const WD = ["일", "월", "화", "수", "목", "금", "토"];

/** 'YYYY-MM-DD' → '2026.09.05.(토)' */
export function dotDate(key: string | null | undefined, weekday = true): string {
  if (!key) return "";
  const [y, m, d] = key.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return key;
  const w = WD[new Date(y, m - 1, d).getDay()];
  return `${y}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")}.${weekday ? `(${w})` : ""}`;
}

/** ISO → '2026.09.30.' (한국 시간) */
export function dotDateIso(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const k = new Date(d.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
  return dotDate(k, false);
}

export function pct(v: number | null | undefined): string {
  if (v == null) return "-";
  return `${Number.isInteger(v) ? v : v.toFixed(1)}%`;
}

function num(v: number | null | undefined, digits = 2): string {
  return v == null ? "-" : v.toFixed(digits);
}

const HANGUL_ORDER = ["가", "나", "다", "라", "마", "바", "사", "아", "자", "차", "카", "타", "파", "하"];

// ── 문서 만들기 ──────────────────────────────────────────

export function defaultReportOptions(data: PartnerReportData): ReportOptions {
  return {
    title: `${data.run.title} 운영 결과 보고서`,
    sections: REPORT_SECTIONS.filter((s) => s.id !== "finalReports" || !!data.finalReports).map((s) => s.id),
    includeStudentTable: false,
    preparedBy: `씽크캠퍼스 ${data.contact.campusName}`,
  };
}

export function periodLine(data: PartnerReportData): string {
  return `${dotDate(data.run.startDate)} ~ ${data.run.endDate ? dotDate(data.run.endDate) : "진행 중"}`;
}

export function buildReportDoc(data: PartnerReportData, opts: ReportOptions): ReportDoc {
  const blocks: Block[] = [];
  const chosen = REPORT_SECTIONS.filter((s) => opts.sections.includes(s.id) && (s.id !== "finalReports" || data.finalReports));
  chosen.forEach((s, i) => {
    const n = i + 1;
    blocks.push({ t: "h1", text: `${n}. ${s.label.replace(" (자동 요약)", "")}` });
    blocks.push(...sectionBlocks(s.id, data, opts));
  });
  return {
    title: opts.title.trim() || `${data.run.title} 운영 결과 보고서`,
    subtitle: `${data.run.municipalityName} · ${periodLine(data)}`,
    preparedLine: `${opts.preparedBy} · ${dotDateIso(data.generatedAt)} 작성`,
    blocks,
  };
}

function sub(i: number, text: string): Block {
  return { t: "h2", text: `${HANGUL_ORDER[i] ?? "가"}. ${text}` };
}

function sectionBlocks(id: ReportSectionId, d: PartnerReportData, opts: ReportOptions): Block[] {
  const r = d.run;
  switch (id) {
    case "overview":
      return [
        {
          t: "kv",
          rows: [
            ["사업명", r.title],
            ["계약 번호", r.contractCode],
            ["발주 · 주최", [r.municipalityName, r.host].filter(Boolean).join(" · ")],
            ["운영 기관", `씽크캠퍼스 ${r.campusName}`],
            ["장소", r.location],
            ["대상", `${r.targetGrade || "초등학생"} ${r.studentCount}명 (${r.sections.length}개 반)`],
            ["기간", periodLine(d)],
            ["일정", r.scheduleLine],
            ["구성", `총 ${r.totalSessions}회 · 회당 ${r.lessonsPerSession}차시 (차시당 ${r.minutesPerLesson}분)`],
            ["반 편성", r.sections.map((s) => `${s.label} ${s.studentCount}명`).join(", ")],
          ],
        },
      ];

    case "purpose": {
      const out: Block[] = [];
      if (r.purpose) out.push(sub(0, "목적"), { t: "p", text: r.purpose });
      if (r.overview) out.push(sub(out.length ? 1 : 0, "프로그램 소개"), { t: "p", text: r.overview });
      if (r.features.length) out.push(sub(out.filter((b) => b.t === "h2").length, "특징"), { t: "bullets", items: r.features });
      return out.length ? out : [{ t: "p", text: "등록된 목적 · 소개가 없습니다.", tone: "muted" }];
    }

    case "schedule":
      return [
        {
          t: "table",
          head: ["회차", "날짜", "시간 (반)", "주제", "강사"],
          widths: [8, 17, 25, 28, 22],
          align: ["C", "C", "L", "L", "L"],
          rows: d.lessons.map((l) => [
            `${l.sessionNumber}회`,
            dotDate(l.date),
            l.slots.join("\n"),
            l.topic,
            l.instructors.map((i) => `${i.name} (${i.sections.join("·")})`).join("\n"),
          ]),
        },
      ];

    case "lessons": {
      const out: Block[] = [];
      d.lessons.forEach((l, i) => {
        out.push({ t: "h3", text: `${i + 1}) ${l.sessionNumber}회차 · ${dotDate(l.date)} · ${l.topic}` });
        if (l.description) out.push({ t: "p", text: l.description });
        const lines: string[] = [];
        if (l.objectives.length) lines.push(`학습 목표: ${l.objectives.join(" / ")}`);
        if (l.curriculum.length) lines.push(`수업 흐름 (${l.lessonCount}차시): ${l.curriculum.join(" → ")}`);
        if (l.materials.length) lines.push(`준비물: ${l.materials.join(", ")}`);
        lines.push(`강사: ${l.instructors.map((x) => `${x.name} (${x.sections.join("·")})`).join(", ")}`);
        const a = l.attendance;
        const rec = a.present + a.late + a.absent;
        lines.push(rec ? `출석: 대상 ${a.enrolled}명 중 출석 ${a.present} · 지각 ${a.late} · 결석 ${a.absent} (출석률 ${pct(a.rate)})` : `출석: ${l.status === "upcoming" ? "수업 전" : "기록 없음"} (대상 ${a.enrolled}명)`);
        out.push({ t: "bullets", items: lines });
      });
      return out;
    }

    case "instructors":
      return [
        {
          t: "table",
          head: ["이름", "소속 · 직함", "전문 분야", "담당"],
          widths: [16, 30, 34, 20],
          align: ["C", "L", "L", "L"],
          rows: d.instructors.map((i) => [
            i.name,
            i.title ?? "",
            i.specialties.join(", "),
            `${i.sessions.length}회 (${[...new Set(i.sessions.map((s) => `${s.sessionNumber}회`))].join("·")})`,
          ]),
        },
        { t: "p", text: `운영 담당: ${d.contact.campusName} ${d.contact.managerRole} ${d.contact.managerName}${d.contact.phone ? ` · ${d.contact.phone}` : ""}`, tone: "muted" },
      ];

    case "participation": {
      const out: Block[] = [
        { t: "p", text: `수강생 ${d.participation.students.length}명, 전체 출석률 ${pct(d.overallAttendanceRate)} (출석 + 지각 / 출결을 입력한 인원 기준).` },
        sub(0, "회차별 출석"),
        {
          t: "table",
          head: ["회차", "날짜", "대상", "출석", "지각", "결석", "출석률"],
          widths: [10, 22, 12, 12, 12, 12, 20],
          align: ["C", "C", "R", "R", "R", "R", "R"],
          rows: d.attendanceRows.map((a) => {
            const rec = a.present + a.late + a.absent;
            return [`${a.sessionNumber}회`, dotDate(a.date), String(a.enrolled), rec ? String(a.present) : "-", rec ? String(a.late) : "-", rec ? String(a.absent) : "-", rec ? pct(a.rate) : "수업 전"];
          }),
        },
        sub(1, "반별 출석률"),
        {
          t: "table",
          head: ["반", "인원", "출석률"],
          widths: [34, 33, 33],
          align: ["C", "R", "R"],
          rows: d.participation.sections.map((s) => [s.label, `${s.studentCount}명`, pct(s.rate)]),
        },
      ];
      if (opts.includeStudentTable) {
        const head = ["학생", "반", ...d.participation.sessions.map((s) => `${s.sessionNumber}회`), "출석"];
        const w = Math.max(5, Math.floor(56 / Math.max(1, d.participation.sessions.length)));
        const mark = { present: "○", late: "△", absent: "×" } as const;
        out.push(sub(2, `학생별 출결 (○ 출석 · △ 지각 · × 결석${d.participation.masked ? " · 이름 일부 가림" : ""})`), {
          t: "table",
          small: true,
          head,
          widths: [18, 14, ...d.participation.sessions.map(() => w), 12],
          align: ["L", "C", ...d.participation.sessions.map(() => "C" as Align), "R"],
          rows: d.participation.students.map((s) => [s.name, s.sectionLabel, ...s.statuses.map((x) => (x ? mark[x] : "")), `${s.present + s.late}/${s.present + s.late + s.absent}`]),
        });
      }
      return out;
    }

    case "inquiries": {
      const st = d.inquiries.stats;
      const out: Block[] = [
        {
          t: "kv",
          rows: [
            ["민원 접수", `${st.complaints.received}건 (처리 완료 ${st.complaints.resolved}건 · 처리 중 ${st.complaints.inProgress}건)`],
            ["학부모 문의", `${st.questions.received}건 (답변 ${st.questions.answered}건${st.questions.avgFirstReplyMinutes != null ? ` · 평균 첫 답변 ${st.questions.avgFirstReplyMinutes}분` : ""})`],
            ["접수 경로", "학부모 앱 채팅 · 전화 · 현장"],
          ],
        },
        sub(0, "민원 처리 내역"),
      ];
      if (d.inquiries.complaints.length === 0) out.push({ t: "p", text: "접수된 민원이 없습니다.", tone: "muted" });
      else
        out.push({
          t: "table",
          head: ["접수일", "분류 · 경로", "내용", "처리 결과", "상태"],
          widths: [13, 15, 31, 31, 10],
          align: ["C", "C", "L", "L", "C"],
          rows: d.inquiries.complaints.map((q) => [
            dotDateIso(q.createdAt),
            `${INQUIRY_CATEGORY_LABEL[q.category]}\n${INQUIRY_CHANNEL_LABEL[q.channel]}`,
            `${q.title}\n${q.body}`,
            q.resolution ? `${q.resolution}${q.resolvedAt ? `\n(${dotDateIso(q.resolvedAt)} 처리)` : ""}` : "처리 중",
            INQUIRY_STATUS_LABEL[q.status],
          ]),
        });
      if (d.inquiries.loggedQuestions.length) {
        out.push(sub(1, "전화 · 현장 문의"), {
          t: "table",
          head: ["접수일", "내용", "답변"],
          widths: [15, 45, 40],
          align: ["C", "L", "L"],
          rows: d.inquiries.loggedQuestions.map((q) => [dotDateIso(q.createdAt), q.body || q.title, q.resolution ?? ""]),
        });
      }
      if (d.notices.length) {
        out.push(sub(d.inquiries.loggedQuestions.length ? 2 : 1, "학부모 안내 (앱 공지)"), {
          t: "table",
          head: ["보낸 날", "제목", "받은 보호자"],
          widths: [18, 62, 20],
          align: ["C", "L", "R"],
          rows: d.notices.map((n) => [dotDateIso(n.createdAt), n.title, `${n.recipients}명`]),
        });
      }
      return out;
    }

    case "survey": {
      const s = d.survey;
      if (!s) return [{ t: "p", text: "만족도 조사를 하지 않았습니다.", tone: "muted" }];
      const rate = s.eligible ? Math.round((s.responses / s.eligible) * 1000) / 10 : null;
      const out: Block[] = [
        {
          t: "kv",
          rows: [
            ["조사", `${s.title} (${dotDateIso(s.opensAt)} ~ ${dotDateIso(s.closesAt)})`],
            ["응답", `${s.responses}명 / 대상 ${s.eligible}명 (응답률 ${pct(rate)})`],
            ["전체 평균", `${num(s.overallAvg)}점 (5점 만점)`],
          ],
        },
        sub(0, "문항별 결과"),
        {
          t: "table",
          head: ["문항", "평균", "5점", "4점", "3점", "2점", "1점"],
          widths: [40, 12, 9.6, 9.6, 9.6, 9.6, 9.6],
          align: ["L", "C", "R", "R", "R", "R", "R"],
          rows: s.items.map((it) => [it.question, num(it.avg), ...[4, 3, 2, 1, 0].map((k) => String(it.distribution[k] ?? 0))]),
        },
      ];
      if (s.reviews.length) out.push(sub(1, "학부모 후기 (공개 동의분, 이름 가림)"), { t: "bullets", items: s.reviews.map((x) => `${x.text} — ${x.studentLabel}`) });
      return out;
    }

    case "finalReports": {
      const f = d.finalReports;
      if (!f) return [{ t: "p", text: "아직 발급된 종합 리포트가 없습니다.", tone: "muted" }];
      return [
        {
          t: "kv",
          rows: [
            ["발급", `${f.issued}명 / 수강생 ${f.students}명`],
            ["등급 분포", `S ${f.grades.S}명 · A ${f.grades.A}명 · B ${f.grades.B}명 · C ${f.grades.C}명`],
            ["많이 나온 강점", f.topStrengths.map((s) => `${s.label}(${s.count})`).join(", ") || "-"],
          ],
        },
        { t: "p", text: "종합 리포트는 회차별 강사 평가 · 출결을 모아 학생마다 발급하며, 학부모 앱에서 확인 · 공유할 수 있습니다.", tone: "muted" },
      ];
    }

    case "summary":
      return autoSummary(d).map((text) => ({ t: "p" as const, text }));
  }
}

// ── 종합 의견 (자동 요약) ────────────────────────────────

const IMPROVE: Record<string, string> = {
  overall: "프로그램 전반의 만족도를 높이기 위해 회차별 피드백을 더 자주 학부모와 공유하겠습니다.",
  content: "수업 내용의 난이도를 학년별로 나눠 준비하겠습니다.",
  teacher: "강사 교육과 수업 참관을 늘려 수업 질을 고르게 하겠습니다.",
  operation: "공지 · 장소 · 시간 안내를 수업 전날 한 번 더 보내겠습니다.",
  again: "다음 학기 연계 과정을 안내해 재참여를 돕겠습니다.",
};

export function autoSummary(d: PartnerReportData): string[] {
  const r = d.run;
  const out: string[] = [];
  const done = d.attendanceRows.filter((a) => a.present + a.late + a.absent > 0);
  out.push(
    `${periodLine(d)} 동안 ${r.campusName}에서 총 ${r.totalSessions}회(회당 ${r.lessonsPerSession}차시) 중 ${done.length}회를 운영했으며, 수강생 ${d.participation.students.length}명의 전체 출석률은 ${pct(d.overallAttendanceRate)}입니다.`,
  );
  const rated = done.filter((a) => a.rate != null);
  if (rated.length >= 2) {
    const hi = rated.reduce((a, b) => ((b.rate ?? 0) > (a.rate ?? 0) ? b : a));
    const lo = rated.reduce((a, b) => ((b.rate ?? 100) < (a.rate ?? 100) ? b : a));
    if (hi.sessionNumber !== lo.sessionNumber) out.push(`회차별 출석률은 ${hi.sessionNumber}회차가 ${pct(hi.rate)}로 가장 높았고, ${lo.sessionNumber}회차가 ${pct(lo.rate)}로 가장 낮았습니다.`);
  }
  const st = d.inquiries.stats;
  if (st.complaints.received > 0) {
    const counts = new Map<InquiryCategory, number>();
    for (const q of d.inquiries.complaints) counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    out.push(
      `학부모 민원은 ${st.complaints.received}건 접수되어 ${st.complaints.resolved}건을 처리 완료했고${st.complaints.inProgress ? ` ${st.complaints.inProgress}건은 처리 중` : ""}입니다. 가장 많은 분류는 ‘${INQUIRY_CATEGORY_LABEL[top[0]]}’(${top[1]}건)입니다.`,
    );
  } else out.push("운영 기간 중 접수된 학부모 민원은 없습니다.");
  if (st.questions.received > 0) {
    out.push(`학부모 문의 ${st.questions.received}건 중 ${st.questions.answered}건에 답했으며${st.questions.avgFirstReplyMinutes != null ? `, 평균 첫 답변 시간은 ${st.questions.avgFirstReplyMinutes}분` : ""}입니다.`);
  }
  const s = d.survey;
  if (s && s.responses > 0) {
    const items = s.items.filter((i) => i.avg != null);
    const hi = items.reduce((a, b) => ((b.avg ?? 0) > (a.avg ?? 0) ? b : a), items[0]);
    const lo = items.reduce((a, b) => ((b.avg ?? 5) < (a.avg ?? 5) ? b : a), items[0]);
    const rate = s.eligible ? Math.round((s.responses / s.eligible) * 1000) / 10 : null;
    out.push(
      `학부모 만족도 조사(응답률 ${pct(rate)})의 전체 평균은 5점 만점에 ${num(s.overallAvg)}점이며, ‘${hi.label}’ 항목이 ${num(hi.avg)}점으로 가장 높고 ‘${lo.label}’ 항목이 ${num(lo.avg)}점으로 가장 낮았습니다.`,
    );
    if (lo && IMPROVE[lo.id] && (lo.avg ?? 5) < 4.6) out.push(`개선: ${IMPROVE[lo.id]}`);
  }
  if (d.finalReports) {
    out.push(
      `학생 ${d.finalReports.issued}명에게 종합 리포트를 발급했습니다${d.finalReports.topStrengths.length ? `. 많이 나타난 강점은 ${d.finalReports.topStrengths.slice(0, 3).map((t) => t.label).join(", ")}입니다` : ""}.`,
    );
  }
  return out;
}

// ── 개요 정리하기 ─────────────────────────────────────────

/** 장마다 핵심 한두 줄 — 담당자가 자기 보고서 양식에 옮겨 적기 좋게 */
export function buildOutline(d: PartnerReportData, opts: ReportOptions): string {
  const lines: string[] = [opts.title.trim() || `${d.run.title} 운영 결과 보고서`, ""];
  const chosen = REPORT_SECTIONS.filter((s) => opts.sections.includes(s.id) && (s.id !== "finalReports" || d.finalReports));
  chosen.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.label.replace(" (자동 요약)", "")}`);
    for (const t of outlineFor(s.id, d)) lines.push(`  - ${t}`);
    lines.push("");
  });
  return lines.join("\n").trim();
}

function outlineFor(id: ReportSectionId, d: PartnerReportData): string[] {
  const r = d.run;
  const st = d.inquiries.stats;
  switch (id) {
    case "overview":
      return [
        `사업명: ${r.title} (${r.contractCode})`,
        `기간 · 일정: ${periodLine(d)}, ${r.scheduleLine}`,
        `대상 · 장소: ${r.targetGrade || "초등학생"} ${r.studentCount}명 (${r.sections.length}개 반), ${r.location}`,
        `구성: 총 ${r.totalSessions}회 × ${r.lessonsPerSession}차시`,
      ];
    case "purpose":
      return [r.purpose || r.overview || "목적 · 소개 미등록", ...(r.features.length ? [`특징: ${r.features.join(" / ")}`] : [])];
    case "schedule":
      return d.lessons.map((l) => `${l.sessionNumber}회 ${dotDate(l.date)} ${l.topic}`);
    case "lessons":
      return d.lessons.map((l) => `${l.sessionNumber}회 ${l.topic}: ${l.objectives[0] ?? l.description.slice(0, 40)}`);
    case "instructors":
      return [`강사 ${d.instructors.length}명: ${d.instructors.map((i) => `${i.name}(${i.specialties[0] ?? i.title ?? "강사"})`).join(", ")}`];
    case "participation":
      return [
        `수강생 ${d.participation.students.length}명, 전체 출석률 ${pct(d.overallAttendanceRate)}`,
        `회차별 출석: ${d.attendanceRows.filter((a) => a.present + a.late + a.absent > 0).map((a) => `${a.sessionNumber}회 ${a.present + a.late}/${a.enrolled}명`).join(", ") || "수업 전"}`,
      ];
    case "inquiries":
      return [
        `민원 ${st.complaints.received}건 접수 · ${st.complaints.resolved}건 처리 완료${st.complaints.inProgress ? ` · ${st.complaints.inProgress}건 처리 중` : ""}`,
        `학부모 문의 ${st.questions.received}건 · 답변 ${st.questions.answered}건${st.questions.avgFirstReplyMinutes != null ? ` · 평균 첫 답변 ${st.questions.avgFirstReplyMinutes}분` : ""}`,
        ...d.inquiries.complaints.slice(0, 5).map((q) => `${INQUIRY_CATEGORY_LABEL[q.category]}: ${q.title} → ${q.resolution ?? "처리 중"}`),
      ];
    case "survey": {
      const s = d.survey;
      if (!s) return ["만족도 조사 미실시"];
      return [`응답 ${s.responses}/${s.eligible}명, 전체 평균 ${num(s.overallAvg)}점`, s.items.map((i) => `${i.label} ${num(i.avg)}`).join(" · ")];
    }
    case "finalReports":
      return d.finalReports ? [`종합 리포트 ${d.finalReports.issued}명 발급`, `등급: S ${d.finalReports.grades.S} · A ${d.finalReports.grades.A} · B ${d.finalReports.grades.B} · C ${d.finalReports.grades.C}`] : [];
    case "summary":
      return autoSummary(d);
  }
}

export function reportFileName(doc: ReportDoc, ext: string): string {
  const base = doc.title.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
  return `${base}.${ext}`;
}
