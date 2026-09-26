"use client";

import type { InstructorAttendance, InstructorRosterRow } from "@/lib/demoInstructor";
import { StudentAttendanceCard, type AttendanceChoice } from "@/components/students/StudentAttendanceCard";

export function InstructorAttendanceEditor({
  rows,
  onChange,
}: {
  rows: InstructorRosterRow[];
  onChange: (studentId: string, patch: Partial<InstructorRosterRow>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
      {rows.map((st) => (
        <StudentAttendanceCard
          key={st.studentId}
          student={{
            studentId: st.studentId,
            name: st.name,
            photoUrl: st.photoUrl,
            status: st.attendance === "unset" ? undefined : (st.attendance as AttendanceChoice),
            lateMinutes: st.lateMinutes,
            participationScore: st.participationScore,
          }}
          onStatus={(status) => onChange(st.studentId, { attendance: status as InstructorAttendance })}
          onLateMinutes={(m) => onChange(st.studentId, { lateMinutes: m })}
          onParticipationScore={(score) => onChange(st.studentId, { participationScore: score })}
          showParticipation
        />
      ))}
    </div>
  );
}
