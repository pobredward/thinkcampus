"use client";

import { StaffProfile } from "@/components/staff/StaffProfile";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function InstructorProfilePage() {
  usePageTitle("내 정보");
  return <StaffProfile />;
}
