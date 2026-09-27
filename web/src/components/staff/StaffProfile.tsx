"use client";

/**
 * 직원 내 정보 — 이름 · 이메일 · 권한 · 캠퍼스, 로그아웃 (체험 중이면 체험 종료)
 */

import { useRouter } from "next/navigation";
import { Button, Card, KeyValue, PageTitle } from "@/components/staff/ui";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { useAuth } from "@/providers/AuthProvider";
import { useDemo } from "@/providers/DemoProvider";
import { useDialog } from "@/providers/DialogProvider";
import { STAFF_ROLE_LABEL } from "@/services";

export function StaffProfile({ campusNames }: { campusNames?: string[] }) {
  const { user, signOut } = useAuth();
  const { access } = useStaffAccess(user?.uid ?? null);
  const { active: demo } = useDemo();
  const dialog = useDialog();
  const router = useRouter();
  const roles = [access.companyAdmin && STAFF_ROLE_LABEL.companyAdmin, access.centerAdmin && STAFF_ROLE_LABEL.centerAdmin, access.instructor && STAFF_ROLE_LABEL.instructor].filter(Boolean).join(" · ");

  async function handleSignOut() {
    const ok = await dialog.confirm(demo ? "체험을 끝낼까요?" : "로그아웃할까요?", demo ? "체험을 끝내면 역할 선택 화면으로 돌아가요." : undefined, { confirmText: demo ? "체험 종료" : "로그아웃" });
    if (!ok) return;
    await signOut();
    if (!demo) router.replace("/admin/login");
  }

  return (
    <div>
      <PageTitle title="내 정보" />
      <Card>
        <KeyValue
          items={[
            { k: "이름", v: access.displayName ?? user?.displayName ?? "-" },
            { k: "이메일", v: access.email ?? user?.email ?? "-" },
            { k: "권한", v: roles || "-" },
            { k: "캠퍼스", v: campusNames?.length ? campusNames.join(", ") : access.campusIds.length ? access.campusIds.join(", ") : "전체" },
          ]}
        />
      </Card>
      <div className="mt-4">
        <Button variant="secondary" size="lg" className="w-full" onClick={() => void handleSignOut()}>
          {demo ? "체험 종료" : "로그아웃"}
        </Button>
      </div>
    </div>
  );
}
