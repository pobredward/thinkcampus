/**
 * 프로그램 안내 카테고리 — 안내 버튼(GuideMenu)과 안내 페이지 제목에 쓰인다
 *
 *   목적 · 회차별 내용 · 공지사항 · 수업 규정·지침 · 자주 묻는 질문
 *   페이지는 서로 독립: /main/program/[id]/guide/<id> (웹 guide/<id>/page.tsx · 모바일 guide/<id>.tsx)
 *   새 안내 추가 → 아래 목록에 한 줄 + 페이지 파일 하나
 *
 * 규정·Q&A 는 기본 예시를 두고, 프로그램(지자체)마다 program.rules / program.faq 로 바꾼다.
 * (웹·모바일 동일 파일)
 */

import type { Program, ProgramQnA, ProgramRule } from './dummyProgram';

export type GuideSection = 'purpose' | 'sessions' | 'notices' | 'rules' | 'qna';

export const GUIDE_SECTIONS: {
  id: GuideSection;
  icon: string;
  /** 버튼·화면 제목 */
  label: string;
  /** 버튼 아래 작은 설명 (한 줄) */
  desc: string;
}[] = [
  { id: 'purpose', icon: '🎯', label: '프로그램 목적', desc: '도입 취지·소개' },
  { id: 'sessions', icon: '📚', label: '회차별 내용', desc: '날짜·주제·강사' },
  { id: 'notices', icon: '📢', label: '공지사항', desc: '꼭 읽어 주세요' },
  { id: 'rules', icon: '⚠️', label: '수업 규정·지침', desc: '꼭 지켜 주세요' },
  { id: 'qna', icon: '💬', label: '자주 묻는 질문', desc: '준비물·픽업·간식' },
];

export function guideSection(id: GuideSection) {
  return GUIDE_SECTIONS.find((s) => s.id === id)!;
}

/** 기본 수업 규정 (지자체 기준 예시) */
export const DEFAULT_PROGRAM_RULES: ProgramRule[] = [
  {
    title: '지각 2회 이상이면 수강 취소',
    body: '수업 시작 10분 뒤부터 지각이에요. 지각이 2회 이상이면 수강이 자동으로 취소되고, 다음 모집 때 지원이 제한될 수 있어요.',
    important: true,
  },
  {
    title: '전체 회차의 80% 이상 출석해야 수료',
    body: '결석이 많으면 수료증이 발급되지 않아요. 질병·경조사로 빠질 때는 증빙서류를 내면 출석으로 인정돼요.',
    important: true,
  },
  {
    title: '결석·지각은 전날까지 연락',
    body: '수업 전날 오후 6시까지 캠퍼스로 알려 주세요. 당일에는 전화로 연락해 주세요.',
  },
  {
    title: '수업 중 휴대폰은 가방에',
    body: '수업이 시작되면 휴대폰은 무음으로 해서 가방에 넣어요. 급한 연락은 캠퍼스 전화로 해 주세요.',
  },
  {
    title: '보호자에게만 인계',
    body: '수업 중에는 혼자 건물 밖으로 나갈 수 없어요. 끝나면 보호자 또는 미리 알려 주신 분께만 아이를 인계해요.',
  },
  {
    title: '사진·영상 촬영 안내',
    body: '활동 사진은 리포트와 발표회 자료에만 쓰여요. 원하지 않으시면 캠퍼스로 알려 주세요.',
  },
];

/** 기본 Q&A (준비물 · 지각·결석 · 모임·픽업 · 간식·음료 · 점심) */
export const DEFAULT_PROGRAM_FAQ: ProgramQnA[] = [
  {
    topic: '준비물',
    q: '준비물은 무엇인가요?',
    a: '필기도구와 개인 물병만 챙겨 주세요. 회차마다 더 필요한 준비물은 ‘회차별 내용’과 수업 전날 알림으로 알려 드려요.',
  },
  {
    topic: '지각·결석',
    q: '늦거나 못 가게 되면 어떻게 하나요?',
    a: '수업 전날 오후 6시까지 캠퍼스로 연락해 주세요. 당일에는 전화로 알려 주세요. 지각이 2회 이상이면 수강이 취소될 수 있어요.',
  },
  {
    topic: '모임·픽업',
    q: '아이를 어디에 데려다주면 되나요?',
    a: '수업 10분 전까지 교실 앞으로 와 주세요. 선생님이 교실 앞에서 출석을 확인하고 맞이해요.',
  },
  {
    topic: '모임·픽업',
    q: '수업이 끝나면 어디서 데려가나요?',
    a: '선생님이 1층 로비까지 함께 내려가 보호자께 인계해요. 다른 분이 데리러 오시면 미리 알려 주세요.',
  },
  {
    topic: '간식·음료',
    q: '간식이나 음료를 챙겨야 하나요?',
    a: '물은 꼭 챙겨 주세요. 간식은 따로 나오지 않고, 쉬는 시간에 간단히 먹을 수 있어요. 견과류처럼 다른 친구에게 알레르기가 있을 수 있는 음식은 피해 주세요.',
  },
  {
    topic: '점심',
    q: '수업 후 점심은 어떻게 하나요?',
    a: '수업은 12시에 끝나고 점심은 따로 제공하지 않아요. 도시락을 싸 오면 수련관 1층 휴게실에서 먹을 수 있어요.',
  },
];

export function programRules(program: Program): ProgramRule[] {
  return program.rules?.length ? program.rules : DEFAULT_PROGRAM_RULES;
}

/** 프로그램만의 Q&A 를 앞에, 기본 Q&A 를 뒤에 */
export function programFaq(program: Program): ProgramQnA[] {
  const own = program.faq ?? [];
  return [...own, ...DEFAULT_PROGRAM_FAQ.filter((d) => !own.some((o) => o.q === d.q))];
}

/** 한 줄 일정: '매주 토 10:00–12:00' */
export function scheduleLine(program: Program): string {
  const freq = program.frequency === 'biweekly' ? '격주' : '매주';
  return `${freq} ${program.fixedDay}요일 ${program.startTime}–${program.endTime}`;
}

/** 기간: '2026.12.05 ~ 2027.01.16' → '12월 5일 ~ 1월 16일' */
export function periodLine(program: Program): string {
  const md = (d: string) => {
    const m = d.match(/\d{4}\.(\d{2})\.(\d{2})/);
    return m ? `${Number(m[1])}월 ${Number(m[2])}일` : d;
  };
  return `${md(program.startDate)} ~ ${md(program.endDate)}`;
}
