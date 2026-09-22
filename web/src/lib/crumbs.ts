/**
 * 상단 경로(Breadcrumbs) 만들기 — 화면 구조를 한곳에서 정한다 (모바일 lib/crumbs.ts 와 같은 구조)
 *
 *   홈
 *   ├─ 이전 수강 이력 ─ (지난 프로그램)
 *   ├─ 프로그램(짧은 이름)
 *   │   ├─ 수업 규정·지침 / 일시 및 장소 / 목적 및 내용 / 공지사항 / 자주 묻는 질문
 *   │   ├─ N회차 (출결 · 일정 · 내용 · Q&A · 리포트 탭)
 *   │   └─ 종합 리포트
 *   └─ 고객 지원 (회차 Q&A · 자주 묻는 질문에서 오면 그 아래에 붙는다)
 *   내 정보 ─ 회원 탈퇴
 *
 * 프로그램 쪽 쿼리: studentName · programTitle · sid · via(history 면 "이전 수강 이력" 아래)
 */

import type { Crumb } from "@/components/ui/Breadcrumbs";
import { guideSection, shortProgramTitle, type GuideSection } from "@/data/programGuide";

type Params = { get(name: string): string | null };

const KEEP = ["studentName", "programTitle", "sid", "via"] as const;

/** 프로그램 화면 사이에 넘길 쿼리만 골라낸다 (탭·from 등은 뺀다) */
export function programQs(sp: Params): string {
  const p = new URLSearchParams();
  for (const k of KEEP) {
    const v = sp.get(k);
    if (v) p.set(k, v);
  }
  return p.toString();
}

export const HOME_CRUMB: Crumb = { label: "홈", href: "/main" };

/** 홈 (› 이전 수강 이력) › 프로그램 — current 이면 프로그램이 마지막(지금 화면) */
export function programCrumbs(opts: {
  programId: string;
  programTitle: string;
  sp: Params;
  current?: boolean;
}): Crumb[] {
  const qs = programQs(opts.sp);
  const out: Crumb[] = [HOME_CRUMB];
  if (opts.sp.get("via") === "history") out.push({ label: "이전 수강 이력", href: "/main/history" });
  out.push({
    label: shortProgramTitle(opts.programTitle),
    href: opts.current ? undefined : `/main/program/${opts.programId}${qs ? `?${qs}` : ""}`,
  });
  return out;
}

export function guideCrumbs(opts: { programId: string; programTitle: string; sp: Params; section: GuideSection }): Crumb[] {
  return [...programCrumbs(opts), { label: guideSection(opts.section).label }];
}

export function sessionCrumbs(opts: { programId: string; programTitle: string; sp: Params; sessionNumber: number }): Crumb[] {
  return [...programCrumbs(opts), { label: `${opts.sessionNumber}회차` }];
}

/**
 * 고객 지원(FAQ·챗봇)으로 가는 주소 — 들어온 곳을 경로에 남긴다
 *   from=session : 홈 › 프로그램 › N회차 › 고객 지원
 *   from=program : 홈 › 프로그램 › 자주 묻는 질문 › 고객 지원
 */
export function faqHref(opts: {
  from: "session" | "program";
  programId: string;
  sp: Params;
  sessionId?: string;
  sessionNumber?: number;
}): string {
  const p = new URLSearchParams(programQs(opts.sp));
  p.set("tab", "chatbot");
  p.set("from", opts.from);
  p.set("programId", opts.programId);
  if (opts.sessionId) p.set("sessionId", opts.sessionId);
  if (opts.sessionNumber != null) p.set("sn", String(opts.sessionNumber));
  return `/main/faq?${p.toString()}`;
}

export function faqCrumbs(sp: Params, fallbackProgramTitle: (id: string) => string): Crumb[] {
  const from = sp.get("from");
  const programId = sp.get("programId");
  const current: Crumb = { label: "고객 지원" };
  if (!programId || (from !== "session" && from !== "program")) return [HOME_CRUMB, current];

  const programTitle = sp.get("programTitle") ?? fallbackProgramTitle(programId);
  const base = programCrumbs({ programId, programTitle, sp });
  const qs = programQs(sp);
  if (from === "session") {
    const sessionId = sp.get("sessionId");
    const sn = sp.get("sn");
    if (sessionId && sn) {
      const p = new URLSearchParams(qs);
      p.set("tab", "qna");
      base.push({ label: `${sn}회차`, href: `/main/program/${programId}/session/${sessionId}?${p.toString()}` });
    }
  } else {
    base.push({ label: guideSection("qna").label, href: `/main/program/${programId}/guide/qna${qs ? `?${qs}` : ""}` });
  }
  return [...base, current];
}
