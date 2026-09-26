import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "체험판",
  description: "ThinkCampus 역할별 체험 화면",
};

export default function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-bg">{children}</div>;
}
