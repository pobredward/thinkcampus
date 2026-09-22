"use client";

/**
 * 하단 토스트 — "링크가 복사되었습니다" 등 짧은 피드백.
 *   const toast = useToast(); toast.show('복사되었습니다');
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

interface ToastApi {
  show: (message: string, opts?: { durationMs?: number }) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback<ToastApi["show"]>((msg, opts) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    timerRef.current = setTimeout(() => setMessage(null), opts?.durationMs ?? 2200);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {message && (
        <div
          role="status"
          aria-live="polite"
          className="no-print pointer-events-none fixed inset-x-0 z-[1100] flex justify-center px-6"
          style={{ bottom: "calc(var(--tabbar-h) + var(--sab) + 20px)" }}
        >
          <div className="tc-fade-up max-w-[420px] rounded-full bg-elev px-4 py-[10px] text-center text-[15px] font-medium text-fg">
            {message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
