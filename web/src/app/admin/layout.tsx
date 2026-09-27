/**
 * /admin — 회사 앱(/admin, /admin/runs …)과 센터 앱(/admin/center)·로그인(/admin/login)의 공통 부모.
 * 각 영역의 틀과 가드는 하위 layout 에서 처리한다.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
