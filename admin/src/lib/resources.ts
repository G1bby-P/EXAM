"use client";

import type {
  AuditLog,
  AuthResponse,
  AuthUser,
  Course,
  Exam,
  ExportHistory,
  Paginated,
  Question,
  QuestionImportResult,
  Result,
  Role,
  StatisticsDashboard,
  Topic,
  User,
} from "@/types/api";
import { apiDownload, apiRequest, toQuery } from "./api";

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify({ email, password }),
    }),
  me: () => apiRequest<AuthUser>("/auth/me"),
  logout: (refreshToken: string) =>
    apiRequest<void>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
};

export const adminApi = {
  dashboard: async () => {
    const [users, courses, topics, questions, exams, results, logs] = await Promise.all([
      apiRequest<Paginated<User>>(`/users${toQuery({ page: 1, limit: 5 })}`),
      apiRequest<Paginated<Course>>(`/courses${toQuery({ page: 1, limit: 5 })}`),
      apiRequest<Paginated<Topic>>(`/topics${toQuery({ page: 1, limit: 5 })}`),
      apiRequest<Paginated<Question>>(`/questions${toQuery({ page: 1, limit: 5 })}`),
      apiRequest<Paginated<Exam>>(`/exams${toQuery({ page: 1, limit: 5 })}`),
      apiRequest<Paginated<Result>>(`/results${toQuery({ page: 1, limit: 5 })}`),
      apiRequest<Paginated<AuditLog>>(`/logs${toQuery({ page: 1, limit: 5 })}`),
    ]);
    return { users, courses, topics, questions, exams, results, logs };
  },
  users: (params: Record<string, string | number | undefined>) => apiRequest<Paginated<User>>(`/users${toQuery(params)}`),
  roles: () => apiRequest<Role[]>("/roles"),
  courses: (params: Record<string, string | number | undefined>) =>
    apiRequest<Paginated<Course>>(`/courses${toQuery(params)}`),
  topics: (params: Record<string, string | number | undefined>) =>
    apiRequest<Paginated<Topic>>(`/topics${toQuery(params)}`),
  questions: (params: Record<string, string | number | undefined>) =>
    apiRequest<Paginated<Question>>(`/questions${toQuery(params)}`),
  importQuestionsExcel: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<QuestionImportResult>("/questions/import/excel", {
      method: "POST",
      body: formData,
    });
  },
  exams: (params: Record<string, string | number | undefined>) => apiRequest<Paginated<Exam>>(`/exams${toQuery(params)}`),
  exam: (id: string) => apiRequest<Exam>(`/exams/${id}`),
  results: (params: Record<string, string | number | undefined>) =>
    apiRequest<Paginated<Result>>(`/results${toQuery(params)}`),
  logs: (params: Record<string, string | number | undefined>) => apiRequest<Paginated<AuditLog>>(`/logs${toQuery(params)}`),
  statistics: (params: Record<string, string | number | undefined>) =>
    apiRequest<StatisticsDashboard>(`/statistics/dashboard${toQuery(params)}`),
  statisticsReportCsv: (params: Record<string, string | number | undefined>) =>
    apiRequest<string>(`/statistics/report.csv${toQuery(params)}`, {
      headers: { Accept: "text/csv" },
    }),
  exportHistory: (params: Record<string, string | number | undefined>) =>
    apiRequest<Paginated<ExportHistory>>(`/exports/history${toQuery(params)}`),
  exportFile: (resource: "results" | "report" | "history", format: "xlsx" | "pdf", params: Record<string, string | number | undefined>) =>
    apiDownload(`/exports/${resource}.${format}${toQuery(params)}`),
  health: () => apiRequest<{ status: string; timestamp: string }>("/health", { skipAuth: true }),
};

export function createResource<T>(path: string, payload: T) {
  return apiRequest(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateResource<T>(path: string, payload: T) {
  return apiRequest(path, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteResource(path: string) {
  return apiRequest(path, { method: "DELETE" });
}

export function postAction<T>(path: string, payload?: T) {
  return apiRequest(path, {
    method: "POST",
    body: payload ? JSON.stringify(payload) : undefined,
  });
}
