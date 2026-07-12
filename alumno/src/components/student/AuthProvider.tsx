"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/types/api";
import { studentApi } from "@/lib/resources";
import { clearSession, getRefreshToken, getStoredUser, storeSession, storeUser } from "@/lib/session";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const storedUser = getStoredUser();
    if (storedUser) setUser(storedUser);
    studentApi
      .me()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        storeUser(currentUser);
      })
      .catch(() => {
        if (!active) return;
        clearSession();
        setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email: string, password: string) => {
        const auth = await studentApi.login(email, password);
        storeSession(auth);
        const currentUser = await studentApi.me();
        if (!currentUser.roles.includes("STUDENT")) {
          clearSession();
          throw new Error("La cuenta no tiene permisos de alumno.");
        }
        storeUser(currentUser);
        setUser(currentUser);
        router.push("/student");
      },
      logout: async () => {
        const refreshToken = getRefreshToken();
        if (refreshToken) await studentApi.logout(refreshToken).catch(() => undefined);
        clearSession();
        setUser(null);
        router.push("/login");
      },
    }),
    [loading, router, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
