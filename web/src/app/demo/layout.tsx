import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "시연용 페이지",
  description: "ThinkCampus 역할별 시연용 페이지",
};

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-bg">{children}</div>;
}
