/**
 * ThinkCampus 디자인 토큰 — 미드나잇: 완전 다크 바탕 + 골드 가는 선 (2026-09-21 시안 E)
 * (웹 web/src/app/globals.css 의 @theme 와 같은 값)
 *
 *   바탕(bg) → 카드(card) → 카드 안 면(elev) 순으로 조금씩 밝아진다. 카드는 그림자 대신 1px 선.
 *   골드: 강조 글자·다음 수업·활성 상태·주요 버튼(잉크 글자) — 아껴서
 *   빨강(결석·필수 규정·삭제) · 주황(지각)은 의미가 있는 곳에만
 */

export const C = {
  bg: '#0c0e13', // 화면 바탕
  card: '#161a22', // 카드
  card2: '#11141a', // 카드보다 가라앉은 면 (끝난 회차, 잠긴 리포트)
  elev: '#1e232d', // 카드 안에서 살짝 올라온 면 (배지, 선택지, 입력)
  line: '#262b36', // 기본 선
  line2: '#343a47', // 조금 더 진한 선 · 진행 막대 바탕 · 비활성 면

  fg: '#f2f2f0', // 본문 글자
  fg2: '#d4d7dd', // 본문 (조금 옅게)
  sub: '#9aa0ab', // 보조 글자
  faint: '#7c8390', // 가장 옅은 글자 (14px 에서도 4.5:1 이상)
  onGold: '#0c0e13', // 골드 위 글자

  gold: '#d4b06a',
  goldSoft: '#d4b06a',
  goldLight: '#2a2417', // 골드 틴트 면
  goldBorder: '#4a3e22',
  goldDim: '#6e5b34', // 골드 가는 테두리

  danger: '#f27d78',
  dangerBg: '#2a1719',
  dangerBorder: '#4a2326',
  late: '#f2a65a',
  lateBg: '#2a2015',

  // 예전 이름 (호환) — 새 코드는 위 이름을 쓴다
  ink: '#0c0e13',
  inkDeep: '#0c0e13',
  inkLight: '#1e232d',
  inkBorder: '#343a47',
  inkDisabled: '#3a3f4b',
  paper: '#0c0e13',
  doneBg: '#11141a',
  track: '#262b36',
  text: '#f2f2f0',
  text2: '#d4d7dd',
  white: '#f2f2f0',
  onInk: '#9aa0ab',
} as const;

/** 카드 그림자 — 다크 바탕에서는 그림자 대신 선을 쓴다 (호환용, 효과 없음) */
export const cardShadow = {
  shadowOpacity: 0,
  elevation: 0,
} as const;
