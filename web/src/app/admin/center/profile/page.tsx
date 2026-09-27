"use client";

import { StaffProfile } from "@/components/staff/StaffProfile";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCenterRun } from "@/providers/CenterRunProvider";

export default function CenterProfilePage() {
  usePageTitle("내 정보");
  const { runs } = useCenterRun();
  const campusNames = [...new Set(runs.map((r) => r.campusName))];
  return <StaffProfile campusNames={campusNames} />;
}
