"use client";

import type {
  AuthResponse,
  AuthUser,
  ExamAssignment,
  ExamAttempt,
  Result,
  SaveAnswerPayload,
  SecurityEvent,
  SecurityEventPayload,
} from "@/types/api";
import { apiRequest } from "./api";

export const studentApi = {
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
  availableExams: () => apiRequest<ExamAssignment[]>("/exams/available/me"),
  startAttempt: (assignmentId: string) =>
    apiRequest<ExamAttempt>(`/exam-assignments/${assignmentId}/attempts`, { method: "POST" }),
  saveAnswer: (attemptId: string, questionId: string, payload: SaveAnswerPayload) =>
    apiRequest(`/exam-attempts/${attemptId}/questions/${questionId}/answer`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  submitAttempt: (attemptId: string) =>
    apiRequest<Result>(`/exam-attempts/${attemptId}/submit`, { method: "POST" }),
  recordSecurityEvent: (attemptId: string, payload: SecurityEventPayload) =>
    apiRequest<SecurityEvent>(`/exam-attempts/${attemptId}/security-events`, {
      method: "POST",
      keepalive: true,
      body: JSON.stringify(payload),
    }),
  myResults: () => apiRequest<Result[]>("/results/me"),
  result: (id: string) => apiRequest<Result>(`/results/${id}`),
};
