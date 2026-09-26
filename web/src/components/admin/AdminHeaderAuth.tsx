"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { useAuth } from "@/providers/AuthProvider";

export function AdminHeaderAuth() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { access } = useStaffAccess(user?.uid ?? null);
  const { active: demoActive } = useDemoPortal();

  if (demoActive && user) {
    const label = user.email ?? user.displayName ?? "체험 계정";
    return <span className="max-w-[160px] truncate text-sub" title={label}>{label}</span>;
  }

  if (!user) {
    return (
      <Link href="/admin/login" className="underline">로그인</Link>
    );
  }

  const label = user.email ?? user.phoneNumber ?? "계정";

  return (
    <span className="flex items-center gap-2">
      <span className="max-w-[140px] truncate text-sub" title={label}>
        {access.companyAdmin ? "회사" : access.centerAdmin ? "센터" : ""} {label}
      </span>
      <button
        type="button"
        className="underline"
        onClick={() => void signOut().then(() => router.push("/admin/login"))}
      >
        로그아웃
      </button>
    </span>
  );
}
