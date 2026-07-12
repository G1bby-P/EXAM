"use client";

import type { ExamAttempt, SaveAnswerPayload } from "@/types/api";

const ATTEMPT_PREFIX = "exam_student_attempt:";

export interface StoredAttemptState {
  attempt: ExamAttempt;
  answers: Record<string, SaveAnswerPayload>;
  currentIndex: number;
  updatedAt: string;
}

function key(assignmentId: string): string {
  return `${ATTEMPT_PREFIX}${assignmentId}`;
}

export function loadStoredAttempt(assignmentId: string): StoredAttemptState | null {
  const value = window.localStorage.getItem(key(assignmentId));
  if (!value) return null;
  try {
    return JSON.parse(value) as StoredAttemptState;
  } catch {
    window.localStorage.removeItem(key(assignmentId));
    return null;
  }
}

export function storeAttempt(assignmentId: string, state: StoredAttemptState): void {
  window.localStorage.setItem(
    key(assignmentId),
    JSON.stringify({
      ...state,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function clearStoredAttempt(assignmentId: string): void {
  window.localStorage.removeItem(key(assignmentId));
}
