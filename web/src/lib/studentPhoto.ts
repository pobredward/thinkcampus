/** 실제 Storage URL만 사용. 없으면 UI에서 기본 프로필(이니셜) 표시 */

export function resolvePhotoUrl(photoUrl?: string | null): string | null {
  const t = photoUrl?.trim();
  return t ? t : null;
}
