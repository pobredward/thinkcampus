"use client";

/**
 * 공유 + 결과 피드백을 한 번에 처리.
 *   const share = useShare();
 *   await share({ title, message, url });
 *
 * - 공유 시트 성공 / 사용자가 닫음 → 아무것도 안 함
 * - 클립보드 복사 → 토스트 "링크가 복사되었습니다"
 * - 둘 다 차단 → 링크를 보여주는 다이얼로그 + [링크 복사] 버튼 (버튼 탭은 새 사용자 제스처라 복사가 허용됨)
 */

import { useCallback } from "react";
import { composeShareText, copyToClipboard, shareText, type ShareInput, type ShareResult } from "@/lib/share";
import { useDialog } from "@/providers/DialogProvider";
import { useToast } from "@/providers/ToastProvider";

export function useShare() {
  const dialog = useDialog();
  const toast = useToast();

  return useCallback(
    async (input: ShareInput): Promise<ShareResult> => {
      const result = await shareText(input);
      if (result === "copied") {
        toast.show("링크가 복사되었습니다");
      } else if (result === "blocked") {
        const text = composeShareText(input);
        await dialog.alert(input.title, text, [
          { text: "닫기", style: "cancel" },
          {
            text: "링크 복사",
            onPress: async () => {
              try {
                await copyToClipboard(text);
                toast.show("링크가 복사되었습니다");
              } catch {
                toast.show("복사하지 못했습니다. 링크를 길게 눌러 복사해주세요.", { durationMs: 3500 });
              }
            },
          },
        ]);
      }
      return result;
    },
    [dialog, toast],
  );
}
