export type RoleCode = "ADMIN" | "REVIEWER" | "STUDENT";
export type AssignmentStatus = "ASSIGNED" | "REVOKED" | "COMPLETED" | "EXPIRED";
export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | "GRADED" | "CANCELLED";
export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_TEXT" | "ESSAY" | "FILE_UPLOAD";
export type ResultStatus = "PENDING_REVIEW" | "READY" | "PUBLISHED" | "WITHHELD";
export type SecurityEventType =
  | "FULLSCREEN_ENTERED"
  | "FULLSCREEN_EXITED"
  | "TAB_HIDDEN"
  | "TAB_VISIBLE"
  | "WINDOW_BLUR"
  | "WINDOW_FOCUS"
  | "COPY_BLOCKED"
  | "PASTE_BLOCKED"
  | "CUT_BLOCKED"
  | "CONTEXT_MENU_BLOCKED"
  | "KEYBOARD_SHORTCUT_BLOCKED"
  | "PRINT_BLOCKED";
export type SecurityEventSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface AuthUser {
  id: string;
  email: string;
  roles: RoleCode[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: string;
}

export interface ExamSummary {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
}

export interface ExamVersionSummary {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  timeLimitMinutes?: number | null;
  maxAttempts: number;
  passingScore?: string | null;
}

export interface ExamAssignment {
  id: string;
  examId: string;
  examVersionId: string;
  userId: string;
  status: AssignmentStatus;
  startsAt?: string | null;
  dueAt?: string | null;
  maxAttemptsOverride?: number | null;
  exam: ExamSummary;
  examVersion: ExamVersionSummary;
  attempts: Array<{
    id: string;
    status: AttemptStatus;
    attemptNumber: number;
    startedAt: string;
    submittedAt?: string | null;
  }>;
}

export interface ExamSection {
  id: string;
  title: string;
  description?: string | null;
  sortOrder: number;
}

export interface ExamQuestion {
  id: string;
  examVersionId: string;
  examVersionSectionId?: string | null;
  type: QuestionType;
  prompt: string;
  explanation?: string | null;
  optionsSnapshot?: Array<{
    id: string;
    label?: string | null;
    text: string;
    sortOrder: number;
  }> | null;
  sortOrder: number;
  points: string;
  isRequired: boolean;
}

export interface ExamAttempt {
  id: string;
  assignmentId: string;
  examVersionId: string;
  userId: string;
  attemptNumber: number;
  status: AttemptStatus;
  startedAt: string;
  expiresAt?: string | null;
  timeLimitMinutes?: number | null;
  maxScore: string;
  examVersion: ExamVersionSummary & {
    sections: ExamSection[];
    questions: ExamQuestion[];
  };
}

export interface SaveAnswerPayload {
  answerText?: string;
  selectedOptionIds?: string[];
}

export interface SecurityEventPayload {
  eventType: SecurityEventType;
  severity?: SecurityEventSeverity;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
}

export interface SecurityEvent {
  id: string;
  attemptId: string;
  userId: string;
  eventType: SecurityEventType;
  severity: SecurityEventSeverity;
  occurredAt: string;
  createdAt: string;
}

export interface Result {
  id: string;
  attemptId: string;
  userId: string;
  examVersionId: string;
  status: ResultStatus;
  score: string;
  maxScore: string;
  percentage: string;
  passed: boolean;
  publishedAt?: string | null;
  examVersion?: ExamVersionSummary;
  createdAt: string;
}
