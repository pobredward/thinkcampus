"use client";

/**
 * RN Alert.alert 대체 — 모바일과 같은 시그니처로 쓸 수 있는 다이얼로그.
 *
 *   const dialog = useDialog();
 *   dialog.alert('오류', '메시지');                       // 확인 버튼 하나
 *   dialog.alert('로그아웃', '정말?', [                    // RN 스타일 버튼 배열
 *     { text: '취소', style: 'cancel' },
 *     { text: '로그아웃', style: 'destructive', onPress: () => ... },
 *   ]);
 *   const ok = await dialog.confirm('제목', '메시지', { confirmText: '삭제', destructive: true });
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface DialogButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void | Promise<void>;
}

interface DialogRequest {
  id: number;
  title: string;
  message?: string;
  buttons: DialogButton[];
  resolve: (index: number) => void;
}

interface DialogApi {
  /** RN Alert.alert 와 동일한 시그니처. 눌린 버튼 index 를 resolve. */
  alert: (title: string, message?: string, buttons?: DialogButton[]) => Promise<number>;
  confirm: (
    title: string,
    message?: string,
    opts?: { confirmText?: string; cancelText?: string; destructive?: boolean },
  ) => Promise<boolean>;
}

const DialogContext = createContext<DialogApi | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  const idRef = useRef(0);

  const alert = useCallback<DialogApi["alert"]>((title, message, buttons) => {
    return new Promise<number>((resolve) => {
      const id = ++idRef.current;
      const btns: DialogButton[] =
        buttons && buttons.length > 0 ? buttons : [{ text: "확인", style: "default" }];
      setQueue((q) => [...q, { id, title, message, buttons: btns, resolve }]);
    });
  }, []);

  const confirm = useCallback<DialogApi["confirm"]>(
    async (title, message, opts) => {
      const idx = await alert(title, message, [
        { text: opts?.cancelText ?? "취소", style: "cancel" },
        { text: opts?.confirmText ?? "확인", style: opts?.destructive ? "destructive" : "default" },
      ]);
      return idx === 1;
    },
    [alert],
  );

  const api = useMemo(() => ({ alert, confirm }), [alert, confirm]);
  const current = queue[0];

  function handlePress(index: number) {
    if (!current) return;
    const btn = current.buttons[index];
    setQueue((q) => q.slice(1));
    current.resolve(index);
    // RN 과 동일하게 onPress 는 닫힌 뒤 실행
    void btn?.onPress?.();
  }

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current && <DialogView key={current.id} req={current} onPress={handlePress} />}
    </DialogContext.Provider>
  );
}

function DialogView({
  req,
  onPress,
}: {
  req: DialogRequest;
  onPress: (index: number) => void;
}) {
  // ESC → cancel 버튼(있으면) / 없으면 첫 버튼
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const cancelIdx = req.buttons.findIndex((b) => b.style === "cancel");
      onPress(cancelIdx >= 0 ? cancelIdx : 0);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [req, onPress]);

  // 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const vertical = req.buttons.length > 2;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={`dlg-title-${req.id}`}
      className="no-print fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-8"
    >
      <div className="tc-fade-up w-full max-w-[300px] overflow-hidden rounded-[14px] bg-card">
        <div className="px-5 pb-4 pt-5 text-center">
          <p id={`dlg-title-${req.id}`} className="text-[18px] font-bold text-fg">
            {req.title}
          </p>
          {req.message && (
            <p className="mt-2 whitespace-pre-line text-[16px] leading-[24px] text-sub [overflow-wrap:anywhere] select-text">
              {req.message}
            </p>
          )}
        </div>
        <div className={`flex border-t border-line ${vertical ? "flex-col" : "flex-row"}`}>
          {req.buttons.map((b, i) => {
            const color =
              b.style === "destructive"
                ? "text-danger"
                : b.style === "cancel"
                  ? "text-sub"
                  : "text-gold";
            const weight = b.style === "cancel" ? "font-medium" : "font-bold";
            const border = vertical
              ? i > 0
                ? "border-t border-line"
                : ""
              : i > 0
                ? "border-l border-line"
                : "";
            return (
              <button
                key={i}
                type="button"
                autoFocus={i === req.buttons.length - 1}
                onClick={() => onPress(i)}
                className={`tap flex-1 py-[13px] text-center text-[16px] ${color} ${weight} ${border} active:bg-elev`}
              >
                {b.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within DialogProvider");
  return ctx;
}
