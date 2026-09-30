/**
 * 사진을 브라우저에서 줄여 JPEG data URL 로 — 채팅 · 민원 사진 첨부 공통
 *   긴 변 1280px · 품질 0.8 → 보통 150~300KB (Callable 한 번에 3장까지 보낸다)
 *   HEIC 등 브라우저가 못 읽는 형식은 오류로 알려 준다
 */

export const MAX_CHAT_PHOTOS = 3;

export async function resizeImageToDataUrl(file: File, maxSide = 1280, quality = 0.8): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("사진 파일만 보낼 수 있어요.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("이 사진은 열 수 없어요. 다른 사진을 골라 주세요."));
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("사진을 줄이지 못했어요.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
