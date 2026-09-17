/**
 * 아코디언 펼침/접힘 — RN LayoutAnimation 대체 (CSS grid 트랜지션)
 */
export function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className="collapse-anim" data-open={open ? "true" : "false"} aria-hidden={!open}>
      <div>{children}</div>
    </div>
  );
}
