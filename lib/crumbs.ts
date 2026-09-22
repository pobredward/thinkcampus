/**
 * 상단 경로(Breadcrumbs) 만들기 — 화면 구조를 한곳에서 정한다 (웹 web/src/lib/crumbs.ts 와 같은 구조)
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
 * 프로그램 쪽 params: studentName · programTitle · sid · via(history 면 "이전 수강 이력" 아래)
 */

import type { Href } from 'expo-router';
import type { Crumb } from '../components/ui/Breadcrumbs';
import { guideSection, shortProgramTitle, type GuideSection } from '../data/programGuide';

type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const KEEP = ['studentName', 'programTitle', 'sid', 'via'] as const;

/** 프로그램 화면 사이에 넘길 값만 골라낸다 (탭·from 등은 뺀다) */
export function programParams(p: Params): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of KEEP) {
    const v = one(p[k]);
    if (v) out[k] = v;
  }
  return out;
}

export const HOME_CRUMB: Crumb = { label: '홈', href: '/main' };

export function programHref(programId: string, params: Params): Href {
  return { pathname: '/main/program/[programId]', params: { ...programParams(params), programId } };
}

/** 홈 (› 이전 수강 이력) › 프로그램 — current 이면 프로그램이 마지막(지금 화면) */
export function programCrumbs(opts: {
  programId: string;
  programTitle: string;
  params: Params;
  current?: boolean;
}): Crumb[] {
  const out: Crumb[] = [HOME_CRUMB];
  if (one(opts.params.via) === 'history') out.push({ label: '이전 수강 이력', href: '/main/history' });
  out.push({
    label: shortProgramTitle(opts.programTitle),
    href: opts.current ? undefined : programHref(opts.programId, opts.params),
  });
  return out;
}

export function guideCrumbs(opts: { programId: string; programTitle: string; params: Params; section: GuideSection }): Crumb[] {
  return [...programCrumbs(opts), { label: guideSection(opts.section).label }];
}

export function sessionCrumbs(opts: { programId: string; programTitle: string; params: Params; sessionNumber: number }): Crumb[] {
  return [...programCrumbs(opts), { label: `${opts.sessionNumber}회차` }];
}

/**
 * 고객 지원(FAQ·챗봇)으로 가는 주소 — 들어온 곳을 경로에 남긴다
 *   from=session : 홈 › 프로그램 › N회차 › 고객 지원
 *   from=program : 홈 › 프로그램 › 자주 묻는 질문 › 고객 지원
 */
export function faqHref(opts: {
  from: 'session' | 'program';
  programId: string;
  params: Params;
  sessionId?: string;
  sessionNumber?: number;
}): Href {
  return {
    pathname: '/main/faq',
    params: {
      ...programParams(opts.params),
      tab: 'chatbot',
      from: opts.from,
      programId: opts.programId,
      ...(opts.sessionId ? { sessionId: opts.sessionId } : {}),
      ...(opts.sessionNumber != null ? { sn: String(opts.sessionNumber) } : {}),
    },
  };
}

export function faqCrumbs(params: Params, fallbackProgramTitle: (id: string) => string): Crumb[] {
  const from = one(params.from);
  const programId = one(params.programId);
  const current: Crumb = { label: '고객 지원' };
  if (!programId || (from !== 'session' && from !== 'program')) return [HOME_CRUMB, current];

  const programTitle = one(params.programTitle) ?? fallbackProgramTitle(programId);
  const base = programCrumbs({ programId, programTitle, params });
  const pp = programParams(params);
  if (from === 'session') {
    const sessionId = one(params.sessionId);
    const sn = one(params.sn);
    if (sessionId && sn) {
      base.push({
        label: `${sn}회차`,
        href: { pathname: '/main/program/[programId]/session/[sessionId]', params: { ...pp, programId, sessionId, tab: 'qna' } },
      });
    }
  } else {
    base.push({ label: guideSection('qna').label, href: { pathname: '/main/program/[programId]/guide/qna', params: { ...pp, programId } } });
  }
  return [...base, current];
}
