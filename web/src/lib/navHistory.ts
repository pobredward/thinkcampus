/**
 * 앱 안에서 이동한 경로 기록 — "← 이전" 버튼이 외부 사이트로 나가거나
 * 링크로 바로 들어온 페이지에서 아무 반응이 없는 문제를 막는다.
 *
 * NavigationTracker 가 경로(pathname)가 바뀔 때마다 기록한다.
 * (쿼리스트링만 바뀌는 이동 — 예: 회차 화면의 탭 전환 — 은 기록하지 않는다)
 */

const visited: string[] = [];

export function recordNavigation(pathname: string): void {
  if (visited[visited.length - 1] !== pathname) visited.push(pathname);
  if (visited.length > 50) visited.shift();
}

/** 이 페이지 수명 안에서 앱 내 이전 화면이 존재하는지 */
export function hasInAppHistory(): boolean {
  return visited.length > 1;
}

/**
 * 바로 직전 화면의 pathname (없으면 null)
 * skip: 같은 계열 화면(예: 회차 기록 사이 이동 — replace 로 이동해 브라우저 기록이 쌓이지 않음)은 건너뛴다
 */
export function previousPath(skip?: RegExp): string | null {
  let i = visited.length - 2;
  if (skip) while (i >= 0 && skip.test(visited[i])) i--;
  return i >= 0 ? visited[i] : null;
}
