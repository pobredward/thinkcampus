/**
 * 화면 사이를 오갈 때(같은 페이지의 다른 회차 등) 다시 마운트돼도 깜빡이지 않도록 마지막 조회 결과를 잠깐 기억한다.
 * 저장(useMutation)이나 체험 세계가 바뀌면 전부 비운다 (hooks.ts 의 bumpDataVersion).
 */

const store = new Map<string, unknown>();

export function cacheGet<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function cacheSet<T>(key: string, value: T): void {
  store.set(key, value);
}

export function cacheClear(): void {
  store.clear();
}
