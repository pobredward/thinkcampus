/**
 * 예시 종합 리포트 만들기
 *   data/dummyReport.ts 의 DUMMY_REPORT(김민준 · 토요 창의융합) 를 바탕으로
 *   학생 이름 · 프로그램 · 기간 · 캠퍼스 · 회차(날짜·강사) 만 바꿔 끼운다.
 *
 * 쓰는 곳
 *   - 체험판 세계(지난 프로그램의 발급된 리포트 — 신민준 · 신서연)
 *   - 진행 중 프로그램의 "샘플 미리보기" (실서비스 · 체험판 공통)
 *
 * 문장 속 이름은 "민준이" 로 통일돼 있어서 받침에 따라 "서연이" · "지우" 처럼 바꾼다.
 */

import { DUMMY_REPORT, type ProgramReport, type SessionNote, type StudentReport } from "@/data/dummyReport";

/** 성 뺀 이름 — 3글자 이상이면 첫 글자를 성으로 본다 (외자·두 글자는 그대로) */
export function givenName(fullName: string): string {
  const n = fullName.trim();
  return n.length >= 3 ? n.slice(1) : n;
}

/** 마지막 글자에 받침이 있으면 true (한글이 아니면 false) */
export function hasBatchim(word: string): boolean {
  const ch = word.charCodeAt(word.length - 1);
  if (ch < 0xac00 || ch > 0xd7a3) return false;
  return (ch - 0xac00) % 28 !== 0;
}

/** "민준이" 꼴로 쓰인 이름을 다른 이름으로 — 받침이 없으면 "이" 를 뺀다 (지우는 · 서연이는) */
export function replaceSampleName(text: string, name: string): string {
  const g = givenName(name);
  const withI = hasBatchim(g) ? `${g}이` : g;
  return text.replace(/민준이/g, withI).replace(/민준/g, g);
}

export interface SampleSessionInfo {
  sessionNumber: number;
  date: string; // 'YYYY.MM.DD' (뒤에 요일이 붙어 있어도 됨)
  topic?: string;
  instructorName?: string;
  instructorTitle?: string;
}

export interface SampleReportOptions {
  reportId: string;
  studentId: string;
  studentName: string;
  programTitle?: string;
  campusName?: string;
  campPeriod?: string;
  issueDate?: string;
  issuedBy?: string;
  /** 회차 정보가 있으면 과목별 날짜·강사·(과목명)을 그 회차에 맞춘다 */
  sessions?: SampleSessionInfo[];
  /** 다음 프로그램 안내 (없으면 예시 그대로, null 이면 뺀다) */
  nextProgram?: StudentReport["nextProgram"] | null;
  /** 점수·문장을 조금 다르게 (두 번째 자녀용) */
  variant?: "default" | "presenter";
}

const dateOnly = (d: string) => d.replace(/\s*\(.*\)\s*$/, "").trim();

export function buildSampleReport(opts: SampleReportOptions): StudentReport {
  const base = DUMMY_REPORT;
  const name = opts.studentName.trim();
  const t = (s: string) => replaceSampleName(s, name);

  const programs: ProgramReport[] = base.programs.map((p) => {
    const s = opts.sessions?.find((x) => x.sessionNumber === p.sessionNumber);
    return {
      ...p,
      date: s ? dateOnly(s.date) : p.date,
      programName: s?.topic ? s.topic.replace(/\s+—.*$/, "") : p.programName,
      instructorName: s?.instructorName ?? p.instructorName,
      instructorTitle: s ? s.instructorTitle : p.instructorTitle,
      instructorComment: t(p.instructorComment),
      highlights: p.highlights.map(t),
      nextSteps: p.nextSteps.map(t),
    };
  });

  const sessionNotes: SessionNote[] = base.sessionNotes.map((n) => {
    const s = opts.sessions?.find((x) => x.sessionNumber === n.sessionNumber);
    return {
      ...n,
      date: s ? dateOnly(s.date) : n.date,
      topic: s?.topic ? s.topic.replace(/\s+—.*$/, "") : n.topic,
      instructorName: s?.instructorName ?? n.instructorName,
      note: t(n.note),
    };
  });

  const report: StudentReport = {
    ...base,
    reportId: opts.reportId,
    studentId: opts.studentId,
    studentName: name,
    programTitle: opts.programTitle ?? base.programTitle,
    campusName: opts.campusName ?? base.campusName,
    campPeriod: opts.campPeriod ?? base.campPeriod,
    issueDate: opts.issueDate ?? base.issueDate,
    issuedBy: opts.issuedBy ?? base.issuedBy,
    personalityDesc: t(base.personalityDesc),
    overallComment: t(base.overallComment),
    closingMessage: t(base.closingMessage),
    programs,
    sessionNotes,
    nextProgram: opts.nextProgram === null ? undefined : (opts.nextProgram ?? base.nextProgram),
  };

  if (opts.variant === "presenter") return presenterVariant(report, name);
  return report;
}

/** 두 번째 자녀용 — 발표·표현이 강점인 아이. 점수·총평·과목별 코멘트·회차별 한마디를 그 아이 이야기로 바꾼다 */
const PRESENTER_SUBJECTS: Array<Pick<ProgramReport, "instructorComment" | "highlights" | "nextSteps">> = [
  {
    instructorComment:
      "첫 시간부터 영어로 자기소개를 또렷하게 해서 반 분위기를 열어 주었습니다. 발음이 좋고 표정과 손짓까지 써 가며 말해서 듣는 친구들이 잘 이해합니다. 문장을 길게 이어 말할 때 문법이 흔들리는 때가 있으니 짧은 문장을 정확히 말하는 연습을 더하면 좋겠습니다.",
    highlights: ["영어 자기소개를 가장 먼저 자원해서 발표", "소그룹 토론에서 말이 막힌 친구를 영어로 도와줌"],
    nextSteps: ["오늘 배운 표현으로 두 문장짜리 영어 일기 쓰기", "좋아하는 영어 노래 가사를 따라 부르며 발음 다듬기"],
  },
  {
    instructorComment:
      "실크로드 모둠 활동에서 역할을 나누고 발표 순서를 정하는 일을 자연스럽게 맡았습니다. 이야기를 재미있게 전달하는 재주가 있어 발표가 늘 생생합니다. 다만 근거 자료를 꼼꼼히 읽는 단계는 서두르는 편이라, 발표 전에 자료를 한 번 더 읽는 습관을 권합니다.",
    highlights: ["몽골 제국 이야기를 연극처럼 꾸며 발표", "모둠 역할 분담을 스스로 정리"],
    nextSteps: ["세계사 그림책 한 권 읽고 가족에게 이야기해 주기", "지도에서 오늘 배운 길을 손으로 따라 그려 보기"],
  },
  {
    instructorComment:
      "역사 인물 카드 게임에서 인물의 마음을 상상해 말하는 표현이 풍부했습니다. 조선 시대 발표에서는 그림보다 말로 설명하는 걸 택했는데, 듣는 친구들이 웃으며 집중했습니다. 사료를 읽고 근거를 찾는 활동은 조금 더 차분히 해 보면 좋겠습니다.",
    highlights: ["역사 인물의 마음을 1인칭으로 발표", "모둠 발표 진행을 맡아 매끄럽게 이끔"],
    nextSteps: ["어린이 역사책에서 인물 한 명 골라 편지 써 보기", "박물관에 가서 유물 하나를 정해 이야기 만들어 보기"],
  },
  {
    instructorComment:
      "이번 학기 디베이트에서 가장 빛난 학생입니다. 주장 → 이유 → 예시 순서를 금방 익혔고, 상대 팀 반박에도 당황하지 않고 웃으며 되물었습니다. 목소리가 크고 시선을 고루 나누어서 설득력이 높습니다. 반박할 때 근거를 한 가지 더 준비하면 완성도가 올라갑니다.",
    highlights: ["팀 디베이트 최우수 토론자", "반박 시간에 침착하게 되묻는 태도"],
    nextSteps: ["저녁 식탁에서 오늘의 찬반 한 가지 정해 세 문장으로 말하기", "뉴스 한 꼭지 골라 근거 두 개 찾아 적어 보기"],
  },
  {
    instructorComment:
      "종이 다리 만들기에서 실험 결과를 정리해 발표하는 역할을 맡았고, 왜 무너졌는지를 차근차근 설명해 모둠이 다음 시도를 잘 이어 갔습니다. 실험 기록지를 쓰는 일은 자주 잊어버리니, 실험 중간중간 한 줄씩 적는 습관을 함께 만들어 주세요.",
    highlights: ["실험 결과 발표자로 친구들이 먼저 추천", "발명 아이디어를 그림과 말로 함께 설명"],
    nextSteps: ["집에서 실험 하나 하고 '무엇을 · 어떻게 · 결과' 세 줄 기록하기", "어린이 과학 잡지에서 실험 한 가지 따라 해 보기"],
  },
  {
    instructorComment:
      "혼자 차분히 코드를 고치는 활동에서는 집중이 흐트러질 때가 있었지만, 마지막 미니 게임은 끝까지 스스로 완성했습니다. 만든 게임을 친구들 앞에서 소개하는 시간에는 역시 가장 재미있게 설명했습니다. 짧은 목표를 정해 하나씩 끝내는 방식이 잘 맞는 아이입니다.",
    highlights: ["미니 게임 소개 발표에서 반 전체 웃음", "막히는 부분을 친구에게 물어 끝까지 완성"],
    nextSteps: ["엔트리·스크래치로 10분짜리 작은 목표 하나씩 끝내 보기", "만든 게임을 가족에게 설명하는 영상 찍어 두기"],
  },
];

function presenterVariant(r: StudentReport, name: string): StudentReport {
  const g = givenName(name);
  const gi = hasBatchim(g) ? `${g}이` : g;
  const programs = r.programs.map((p, i) => {
    const delta = i === 0 || i === 3 ? 10 : i === 5 ? -14 : -4; // 영어·토론은 오르고, 코딩은 내려간다
    const overallScore = Math.max(60, Math.min(96, p.overallScore + delta));
    const grade = overallScore >= 90 ? "S" : overallScore >= 75 ? "A" : overallScore >= 60 ? "B" : "C";
    return {
      ...p,
      ...PRESENTER_SUBJECTS[i],
      overallScore,
      postScore: overallScore,
      growthIndex: overallScore - p.preScore,
      grade: grade as ProgramReport["grade"],
      competencies: p.competencies.map((c) => ({ ...c, score: Math.max(55, Math.min(98, c.score + delta)) })),
    };
  });
  const total = Math.round(programs.reduce((s, p) => s + p.overallScore, 0) / programs.length);
  const notes = [
    "영어 자기소개를 가장 먼저 자원했어요. 발음이 좋고 표정이 살아 있습니다.",
    "몽골 제국 이야기를 연극처럼 발표해 반 전체가 집중했습니다.",
    "인물의 마음을 1인칭으로 말하는 발표가 인상적이었어요. 자료는 조금 더 꼼꼼히!",
    "오늘 디베이트 최우수 토론자였습니다. 침착하게 되묻는 태도가 훌륭해요.",
    "실험 결과 발표를 맡아 모둠을 잘 이끌었어요. 기록지는 중간중간 채워 봐요.",
    "미니 게임을 끝까지 스스로 완성했습니다. 소개 발표는 역시 최고였어요.",
  ];
  return {
    ...r,
    programs,
    totalScore: total,
    totalGrade: total >= 90 ? "S" : total >= 75 ? "A" : total >= 60 ? "B" : "C",
    personalityType: "표현형 창의인재 (PRESENTER)",
    personalityDesc: `생각을 말과 그림으로 표현하는 것을 즐기고, 친구들 앞에서 발표하는 데 거리낌이 없습니다. 새로운 활동에 먼저 손을 드는 적극성이 돋보이고, 모둠에서는 자연스럽게 분위기를 이끄는 아이입니다.`,
    overallComment: `${gi}는 6회 내내 밝은 에너지로 모둠을 이끌었습니다. 영어 시간의 개인 발표와 디베이트의 팀 발표에서 특히 두각을 보였고, 과학 실험 결과를 정리해 발표하는 활동에서는 친구들이 먼저 발표자로 추천할 만큼 신뢰를 얻었습니다. 코딩처럼 혼자 차분히 파고드는 활동에서는 집중이 흐트러질 때가 있었지만, 마지막 시간에는 스스로 끝까지 완성해 냈습니다. 표현력이라는 큰 강점 위에 차분히 생각을 정리하는 습관이 더해지면 한층 단단해질 것입니다.`,
    strengthAreas: ["발표·표현력", "사고·창의력 디베이트", "모둠 협력"],
    growthAreas: ["차분하게 끝까지 해내기", "기록·정리 습관"],
    attendanceSummary: { total: 6, present: 6, late: 0, absent: 0, homeworkDone: 6, homeworkTotal: 6 },
    sessionNotes: r.sessionNotes.map((n, i) => ({ ...n, status: "present" as const, note: notes[i] ?? n.note })),
    closingMessage: `6회 동안 ${gi}와 함께해서 즐거웠습니다. 궁금한 점은 앱의 문의하기나 캠퍼스로 언제든 연락 주세요.`,
  };
}
