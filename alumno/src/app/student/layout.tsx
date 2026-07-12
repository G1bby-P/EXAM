"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/components/student/AuthProvider";
import { StudentShell } from "@/components/student/StudentShell";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <StudentShell>{children}</StudentShell>
    </AuthProvider>
  );
}
