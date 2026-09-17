/**
 * 공유 — RN Share.share 대체
 * 1) Web Share API (모바일 브라우저 대부분 지원, 카카오톡/문자/메일 시트)
 * 2) 미지원·차단 시 클립보드 복사
 * 3) 클립보드도 차단되면 "blocked" — 호출 측(useShare)이 링크를 보여주고 버튼으로 복사하게 한다
 *
 * iOS Safari 는 사용자 탭 직후에만 공유 시트/클립보드를 허용한다.
 * 공유 URL 을 서버에서 받아오느라 시간이 걸리면 두 API 모두 NotAllowedError 로 막힐 수 있어서
 * 3단계 폴백을 둔다. 이 함수는 throw 하지 않는다.
 */
export type ShareResult = "shared" | "copied" | "cancelled" | "blocked";

export interface ShareInput {
  title: string;
  message: string;
  url?: string;
}

/** 클립보드/수동 복사에 쓸 전체 텍스트 (message 에 URL 이 없으면 덧붙임) */
export function composeShareText({ message, url }: ShareInput): string {
  return url && !message.includes(url) ? `${message}\n${url}` : message;
}

export async function shareText(input: ShareInput): Promise<ShareResult> {
  const { title, message, url } = input;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    // message 에 URL 이 이미 있으면 url 을 따로 넘기지 않는다 (카카오톡 등에서 링크 중복 방지)
    const data: ShareData =
      url && !message.includes(url) ? { title, text: message, url } : { title, text: message };
    try {
      await navigator.share(data);
      return "shared";
    } catch (e) {
      // 사용자가 공유 시트를 닫은 경우
      if ((e as { name?: string })?.name === "AbortError") return "cancelled";
      // NotAllowedError / TypeError 등 → 클립보드 폴백
    }
  }

  try {
    await copyToClipboard(composeShareText(input));
    return "copied";
  } catch {
    return "blocked";
  }
}

export async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // 권한/제스처 문제 → 아래 execCommand 폴백 시도
    }
  }
  // 구형 브라우저 / 인앱 브라우저 폴백
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "0";
  ta.style.left = "0";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } finally {
    document.body.removeChild(ta);
  }
  if (!ok) throw new Error("클립보드에 복사할 수 없습니다.");
}
