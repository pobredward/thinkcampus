"use client";

/**
 * 채팅 입력줄 — 학부모 · 센터 공통 (화면 맨 아래에 붙는다)
 *   [위쪽 슬롯: 빠른 질문 · 불편·요청 접수 등]
 *   [사진 미리보기 (최대 3장, ✕ 로 빼기)]
 *   [사진] [글 입력 (줄 수에 맞춰 늘어남)] [보내기]
 * 엔터는 줄바꿈 (휴대폰 기준). 컴퓨터에서는 Ctrl/⌘ + Enter 로 보낸다.
 * 값은 화면이 들고 있다 (빠른 질문이 글을 채울 수 있도록).
 */

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { MAX_CHAT_PHOTOS, resizeImageToDataUrl } from "@/lib/imageResize";
import { Spinner } from "@/components/ui/Spinner";

export function ChatComposer({
  text,
  onTextChange,
  photos,
  onPhotosChange,
  onSend,
  sending,
  sendLabel = "보내기",
  placeholder = "메시지를 입력하세요",
  above,
  error,
  textareaRef,
  allowPhotos = true,
  aboveTabBar = false,
}: {
  text: string;
  onTextChange: (v: string) => void;
  photos: string[];
  onPhotosChange: (v: string[]) => void;
  onSend: () => void;
  sending: boolean;
  sendLabel?: string;
  placeholder?: string;
  above?: ReactNode;
  error?: string | null;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  allowPhotos?: boolean;
  /** 직원 앱처럼 아래 탭이 보이는 화면 — 탭 위에 붙인다 */
  aboveTabBar?: boolean;
}) {
  const ownRef = useRef<HTMLTextAreaElement>(null);
  const ta = textareaRef ?? ownRef;
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  // 줄 수에 맞춰 높이 (최대 6줄쯤)
  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(152, Math.max(46, el.scrollHeight))}px`;
  }, [text, ta]);

  async function pickPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhotoError(null);
    const room = MAX_CHAT_PHOTOS - photos.length;
    if (room <= 0) {
      setPhotoError(`사진은 ${MAX_CHAT_PHOTOS}장까지 보낼 수 있어요.`);
      return;
    }
    setReading(true);
    try {
      const picked = Array.from(files).slice(0, room);
      const urls: string[] = [];
      for (const f of picked) urls.push(await resizeImageToDataUrl(f));
      onPhotosChange([...photos, ...urls]);
      if (files.length > room) setPhotoError(`사진은 ${MAX_CHAT_PHOTOS}장까지 보낼 수 있어요.`);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "사진을 읽지 못했어요.");
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const canSend = !sending && !reading && (text.trim().length > 0 || photos.length > 0);
  const msg = error ?? photoError;

  return (
    <div
      className={`no-print sticky z-30 border-t border-line bg-paper pt-2 ${aboveTabBar ? "-mx-4 px-4" : "px-3"}`}
      style={aboveTabBar ? { bottom: "calc(var(--tabbar-h) + var(--sab))", paddingBottom: 10 } : { bottom: 0, paddingBottom: "calc(var(--sab) + 10px)" }}
    >
      {above}
      {photos.length > 0 && (
        <div className="mb-2 flex gap-2 px-1">
          {photos.map((p, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt={`첨부 사진 ${i + 1}`} className="h-[64px] w-[64px] rounded-[10px] border border-line object-cover" />
              <button
                type="button"
                onClick={() => onPhotosChange(photos.filter((_, j) => j !== i))}
                aria-label={`사진 ${i + 1} 빼기`}
                className="tap absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-line2 bg-elev text-[14px] text-fg"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      {msg && <p className="mb-2 px-1 text-[14px] text-danger" role="alert">{msg}</p>}
      <div className="flex items-end gap-2">
        {allowPhotos && (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={reading || photos.length >= MAX_CHAT_PHOTOS}
              aria-label="사진 첨부"
              className="tap flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border border-line bg-card text-sub disabled:opacity-40"
            >
              {reading ? (
                <Spinner size="small" />
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
                  <circle cx="9" cy="10" r="1.7" />
                  <path d="m20.5 16-4.8-4.6L7 19" />
                </svg>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void pickPhotos(e.target.files)} data-testid="chat-photo-input" />
          </>
        )}
        <label className="sr-only" htmlFor="chat-input">
          메시지
        </label>
        <textarea
          id="chat-input"
          ref={ta}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSend) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={1}
          maxLength={1000}
          placeholder={placeholder}
          className="block min-h-[46px] flex-1 resize-none rounded-[22px] border-[1.5px] border-line2 bg-elev px-4 py-[11px] text-[16px] leading-[22px] text-fg placeholder:text-faint focus:border-gold"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="tap flex h-[46px] shrink-0 items-center justify-center rounded-full bg-gold px-4 text-[16px] font-bold text-ink disabled:bg-brand-disabled disabled:text-faint"
        >
          {sending ? <Spinner size="small" color="#0c0e13" /> : sendLabel}
        </button>
      </div>
    </div>
  );
}
