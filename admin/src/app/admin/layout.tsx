"use client";

import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AuthProvider } from "@/components/admin/AuthProvider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AdminShell>{children}</AdminShell>
    </AuthProvider>
  );
}
