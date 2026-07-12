"use client";

import {
  Activity,
  BookOpen,
  ClipboardCheck,
  FileDown,
  FileQuestion,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LogOut,
  ScrollText,
  Settings,
  Shield,
  Tags,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/StatusState";
import { useAuth } from "./AuthProvider";
import styles from "./admin-shell.module.css";

const navItems = [
  { href: "/admin", label: "Tablero", icon: LayoutDashboard },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/roles", label: "Roles", icon: Shield },
  { href: "/admin/courses", label: "Cursos", icon: GraduationCap },
  { href: "/admin/topics", label: "Temas", icon: BookOpen },
  { href: "/admin/questions", label: "Preguntas", icon: FileQuestion },
  { href: "/admin/exams", label: "Examenes", icon: ListChecks },
  { href: "/admin/results", label: "Resultados", icon: ClipboardCheck },
  { href: "/admin/exports", label: "Exportaciones", icon: FileDown },
  { href: "/admin/audit", label: "Auditoria", icon: ScrollText },
  { href: "/admin/settings", label: "Configuracion", icon: Settings },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

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
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <Activity size={20} aria-hidden />
          </div>
          <div>
            <strong>Exam Admin</strong>
            <span>Panel operativo</span>
          </div>
        </div>
        <nav className={styles.nav} aria-label="Navegacion administrativa">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={[styles.navItem, active ? styles.active : ""].join(" ")}>
                <Icon size={18} aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.kicker}>Administrador</span>
            <strong>{user.email}</strong>
          </div>
          <Button variant="secondary" size="sm" onClick={logout} icon={<LogOut size={16} aria-hidden />}>
            Salir
          </Button>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
