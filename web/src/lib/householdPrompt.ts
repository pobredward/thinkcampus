/** 등록 직후 홈에서 형제 연동 모달을 자동으로 띄울지 (sessionStorage, 탭 닫으면 사라짐) */
const KEY = "tc.householdPrompt";

export function setHouseholdPromptFlag(): void {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* noop */
  }
}

export function consumeHouseholdPromptFlag(): boolean {
  try {
    if (sessionStorage.getItem(KEY) === "1") {
      sessionStorage.removeItem(KEY);
      return true;
    }
  } catch {
    /* noop */
  }
  return false;
}
