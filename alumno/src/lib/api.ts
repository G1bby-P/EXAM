"use client";

import type { AuthResponse } from "@/types/api";
import { clearSession, getAccessToken, getRefreshToken, storeSession } from "./session";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  retry?: boolean;
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function refreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) {
    clearSession();
    return false;
  }
  const auth = (await response.json()) as AuthResponse;
  storeSession(auth);
  return true;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (!options.skipAuth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers });
  if (response.status === 401 && !options.skipAuth && options.retry !== false) {
    const refreshed = await refreshSession();
    if (refreshed) return apiRequest<T>(path, { ...options, retry: false });
  }
  const payload = await parseResponse(response);
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String((payload as { message: unknown }).message)
        : "Request failed.";
    throw new ApiError(message, response.status, payload);
  }
  return payload as T;
}
