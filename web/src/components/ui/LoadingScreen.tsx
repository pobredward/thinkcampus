/**
 * 앱 초기 로딩 화면 — Auth 상태 확인 중 표시 (모바일 LoadingScreen 과 동일 구성)
 */
export function LoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-12 bg-paper">
      <div className="tc-fade-up flex flex-col items-center gap-3">
        <div className="mb-1 flex h-20 w-20 items-center justify-center rounded-[22px] bg-gold">
          <span className="text-[30px] font-extrabold tracking-[-1px] text-ink">TC</span>
        </div>
        <p className="text-[28px] font-bold tracking-[-0.5px] text-fg">ThinkCampus</p>
        <p className="text-[16px] text-sub">학부모 전용 서비스</p>
      </div>
      <div className="flex gap-2" aria-hidden="true">
        <span className="tc-dot h-2 w-2 rounded-full bg-brand" />
        <span className="tc-dot h-2 w-2 rounded-full bg-brand" />
        <span className="tc-dot h-2 w-2 rounded-full bg-brand" />
      </div>
    </div>
  );
}
