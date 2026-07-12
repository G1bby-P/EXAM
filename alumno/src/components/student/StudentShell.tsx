"use client";

import { ClipboardList, LogOut, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/StatusState";
import { useAuth } from "./AuthProvider";
import styles from "./student-shell.module.css";

export function StudentShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  if (loading) {
    return (
      <main className={styles.centered}>
        <LoadingState label="Verificando sesion" />
      </main>
    );
  }

  if (!user) return null;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/student" className={styles.brand}>
          <ClipboardList size={22} aria-hidden />
          <span>Exam Student</span>
        </Link>
        <nav className={styles.nav} aria-label="Navegacion del alumno">
          <Link className={pathname === "/student" ? styles.active : ""} href="/student">
            Examenes
          </Link>
          <Link className={pathname.startsWith("/student/results") ? styles.active : ""} href="/student/results">
            <Trophy size={16} aria-hidden />
            Resultados
          </Link>
        </nav>
        <div className={styles.userArea}>
          <span>{user.email}</span>
          <Button variant="secondary" icon={<LogOut size={16} aria-hidden />} onClick={logout}>
            Salir
          </Button>
        </div>
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
