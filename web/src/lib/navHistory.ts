/**
 * 앱 안에서 이동한 화면 기록 — 브라우저 방문 기록(history)의 "몇 번째 칸에 어느 화면이 있는지" 를 안다.
 *
 * - pushState / replaceState 를 감싸 각 기록 칸의 state 에 순번(__tcIdx)을 붙이고, 순번 → 경로를 적어 둔다.
 *   뒤로가기·앞으로가기로 칸을 옮겨도 history.state 의 순번으로 지금 위치를 정확히 알 수 있다
 *   (React 렌더·이벤트 순서와 상관없음).
 * - 쿼리스트링만 바뀌는 이동(회차 화면의 탭 전환 등)은 같은 경로라 그대로.
 * - 새로고침해도 이어지도록 순번 → 경로 표를 sessionStorage 에 둔다 (탭마다 따로, 창을 닫으면 사라짐).
 *   칸마다 "이 표의 이름"(__tcDoc)도 붙여, 다른 방문(주소를 새로 친 경우 등)의 순번과 섞이지 않게 한다.
 *
 * 쓰임
 * - "← 이전" 버튼이 외부 사이트로 나가거나 링크로 바로 들어온 페이지에서 아무 반응이 없는 문제를 막는다.
 * - 상단 경로(Breadcrumbs)를 누르면 방문 기록에 그 화면이 있으면 그만큼 뒤로 가고(기록이 쌓이지 않음),
 *   없으면(주소로 바로 들어온 경우) 그 화면으로 이동한다.
 *
 * NavigationTracker 가 설치(installHistoryWatch)와 화면마다의 확인(recordNavigation)을 맡는다.
 */

/** 순번 → 경로 (이 방문에서 앱이 만든 칸만) */
const paths: string[] = [];
/** 이 방문의 이름 — 새로고침하면 history.state 에서 이어받는다 */
let docId = "";

const STORE = "tc:nav:";
function save(): void {
  try {
    window.sessionStorage.setItem(STORE + docId, JSON.stringify(paths));
  } catch {
    /* 저장 못 해도 이 페이지 안에서는 그대로 동작 */
  }
}
function load(id: string): void {
  try {
    const saved: unknown = JSON.parse(window.sessionStorage.getItem(STORE + id) ?? "null");
    if (Array.isArray(saved)) saved.forEach((p, i) => { if (typeof p === "string") paths[i] = p; });
  } catch {
    /* 없거나 깨졌으면 새로 시작 */
  }
}

type Marked = { __tcIdx?: unknown; __tcDoc?: unknown };

function currentIndex(): number {
  if (typeof window === "undefined") return -1;
  const st = window.history.state as Marked | null;
  return st && typeof st.__tcIdx === "number" && st.__tcDoc === docId ? st.__tcIdx : -1;
}

function withIndex(data: unknown, idx: number): unknown {
  if (data === null || data === undefined) return { __tcIdx: idx, __tcDoc: docId };
  if (typeof data === "object") return { ...(data as object), __tcIdx: idx, __tcDoc: docId };
  return data; // 객체가 아닌 state 는 건드리지 않는다
}

/** history API 를 감싸 각 칸에 순번을 붙인다 (한 번만) */
export function installHistoryWatch(): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { __tcHistoryWatch?: boolean; __tcNavPaths?: string[] };
  if (w.__tcHistoryWatch) return;
  w.__tcHistoryWatch = true;
  w.__tcNavPaths = paths; // 점검용 (읽기만)

  const origPush = window.history.pushState;
  const origReplace = window.history.replaceState;

  // 새로고침·다른 사이트에서 뒤로 돌아온 경우: 그 칸에 붙어 있던 이름으로 표를 이어받는다
  const st = window.history.state as Marked | null;
  if (st && typeof st.__tcIdx === "number" && typeof st.__tcDoc === "string" && st.__tcDoc) {
    docId = st.__tcDoc;
    load(docId);
  } else {
    docId = Math.random().toString(36).slice(2, 10);
  }

  window.history.pushState = function (this: History, data: unknown, unused: string, url?: string | URL | null) {
    const idx = currentIndex() + 1;
    const result = origPush.call(this, withIndex(data, idx), unused, url);
    paths.length = idx; // 앞으로 가기 기록은 사라진다
    paths[idx] = window.location.pathname;
    save();
    return result;
  };
  window.history.replaceState = function (this: History, data: unknown, unused: string, url?: string | URL | null) {
    const idx = Math.max(currentIndex(), 0);
    const result = origReplace.call(this, withIndex(data, idx), unused, url);
    paths[idx] = window.location.pathname;
    save();
    return result;
  };

  // 첫 칸에도 순번을 붙인다
  if (currentIndex() < 0) {
    origReplace.call(window.history, withIndex(window.history.state, 0), "");
  }
  paths[Math.max(currentIndex(), 0)] = window.location.pathname;
  save();
}

/** 화면이 바뀔 때 한 번 더 확인 (감싸기 전에 일어난 이동 보정) */
export function recordNavigation(pathname: string): void {
  const idx = currentIndex();
  if (idx >= 0 && paths[idx] !== pathname) {
    paths[idx] = pathname;
    save();
  }
}

/** 이 방문에서 앱 내 이전 화면이 존재하는지 */
export function hasInAppHistory(): boolean {
  const idx = currentIndex();
  return idx > 0 && paths[idx - 1] !== undefined;
}

/**
 * 바로 직전 화면의 pathname (없으면 null)
 * skip: 같은 계열 화면은 건너뛴다
 */
export function previousPath(skip?: RegExp): string | null {
  let i = currentIndex() - 1;
  if (skip) while (i >= 0 && paths[i] !== undefined && skip.test(paths[i])) i--;
  return i >= 0 && paths[i] !== undefined ? paths[i] : null;
}

/**
 * 상위 화면으로 이동 — 방문 기록에 그 화면이 있으면 그만큼 뒤로(기록이 쌓이지 않음), 없으면 이동.
 */
export function goUpTo(
  href: string,
  nav: { back: () => void; push: (href: string) => void },
): void {
  const path = href.split("?")[0];
  const cur = currentIndex();
  for (let i = cur - 1; i >= 0 && paths[i] !== undefined; i--) {
    if (paths[i] === path) {
      const steps = cur - i;
      if (steps === 1) nav.back();
      else window.history.go(-steps);
      return;
    }
  }
  nav.push(href);
}
