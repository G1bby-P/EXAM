"use client";

import type { AuthResponse, AuthUser } from "@/types/api";

const ACCESS_TOKEN_KEY = "exam_student_access_token";
const REFRESH_TOKEN_KEY = "exam_student_refresh_token";
const USER_KEY = "exam_student_user";

export function getAccessToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const value = window.localStorage.getItem(USER_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    clearSession();
    return null;
  }
}

export function storeSession(auth: AuthResponse, user?: AuthUser): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, auth.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, auth.refreshToken);
  if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function storeUser(user: AuthUser): void {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}
