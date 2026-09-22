/**
 * 보호자(학부모) 이름 — 계정의 표시 이름(Firebase Auth displayName)에 저장한다.
 *
 * - 가입(자녀 정보 확인 화면)에서 받는다.
 * - 이름이 없는 계정(예전에 가입했거나 초대받아 로그인한 보호자)은 홈에서 한 번 물어본다.
 * - 내 정보에서 언제든 바꿀 수 있다.
 * - 홈 인사말: '환영합니다, 신선웅 학부모님' (이름이 없으면 '환영합니다, 학부모님')
 *
 * (웹 web/src/lib/guardianName.ts 와 같은 내용)
 */

export const GUARDIAN_NAME_MAX = 20;

/** 앞뒤 공백 제거 · 공백 여러 개는 하나로 · 최대 20자 */
export function normalizeGuardianName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, GUARDIAN_NAME_MAX);
}

/** 입력 확인 — 문제가 없으면 null, 있으면 화면에 보여 줄 문구 */
export function guardianNameError(raw: string): string | null {
  const name = normalizeGuardianName(raw);
  if (name.length < 2) return '이름을 2자 이상 입력해 주세요.';
  if (/[0-9!@#$%^&*()_+=[\]{};:"\\|,.<>/?~`]/.test(name)) return '이름에는 숫자나 기호를 넣을 수 없어요.';
  return null;
}

/** 인사말에 넣는 호칭 — '신선웅 학부모님' / 이름이 없으면 '학부모님' */
export function guardianTitle(name: string | null | undefined): string {
  const n = name ? normalizeGuardianName(name) : '';
  return n ? `${n} 학부모님` : '학부모님';
}
