export type RoleCode = "ADMIN" | "REVIEWER" | "STUDENT";
export type UserStatus = "INVITED" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
export type CourseStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type TopicStatus = "ACTIVE" | "ARCHIVED";
export type QuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "SHORT_TEXT"
  | "ESSAY"
  | "FILE_UPLOAD"
  | "CLINICAL_CASE";
export type QuestionMediaType = "IMAGE" | "VIDEO" | "AUDIO" | "PDF";
export type QuestionStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type ExamStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type ResultStatus = "PENDING_REVIEW" | "READY" | "PUBLISHED" | "WITHHELD";
export type ResultVisibility = "HIDDEN" | "IMMEDIATE" | "AFTER_REVIEW" | "AFTER_CLOSE_DATE";
export type ExportFormat = "EXCEL" | "PDF";
export type ExportType = "RESULTS" | "REPORT" | "HISTORY";
export type ExportStatus = "COMPLETED" | "FAILED";

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

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

export interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  status: UserStatus;
  roles: RoleCode[];
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface Role {
  id: string;
  code: RoleCode;
  name: string;
  description?: string | null;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  status: CourseStatus;
  topics?: Topic[];
  createdAt: string;
}

export interface Topic {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  description?: string | null;
  status: TopicStatus;
  sortOrder: number;
  course?: Course;
}

export interface Alternative {
  id: string;
  questionId: string;
  label?: string | null;
  text: string;
  isCorrect: boolean;
  sortOrder: number;
  scoreWeight?: string | null;
  feedback?: string | null;
}

export interface ClinicalCase {
  id: string;
  title: string;
  patientContext: string;
  summary?: string | null;
  diagnosis?: string | null;
  createdAt: string;
}

export interface QuestionMedia {
  id: string;
  questionId: string;
  fileAssetId?: string | null;
  mediaType: QuestionMediaType;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface Question {
  id: string;
  topicId?: string | null;
  clinicalCaseId?: string | null;
  type: QuestionType;
  status: QuestionStatus;
  prompt: string;
  explanation?: string | null;
  defaultPoints: string;
  difficulty?: number | null;
  allowPartialCredit: boolean;
  topic?: Topic | null;
  clinicalCase?: ClinicalCase | null;
  options?: Alternative[];
  media?: QuestionMedia[];
  createdAt: string;
}

export interface QuestionImportResult {
  created: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
  questionIds: string[];
}

export interface ExamSection {
  id: string;
  examId: string;
  title: string;
  description?: string | null;
  sortOrder: number;
  randomizeQuestions: boolean;
}

export interface ExamQuestion {
  id: string;
  examId: string;
  sectionId?: string | null;
  questionId: string;
  sortOrder: number;
  points: string;
  isRequired: boolean;
  question?: Question;
  section?: ExamSection | null;
}

export interface ExamVersion {
  id: string;
  examId: string;
  versionNumber: number;
  status: "PUBLISHED" | "RETIRED";
  title: string;
  publishedAt: string;
}

export interface Exam {
  id: string;
  courseId?: string | null;
  topicId?: string | null;
  title: string;
  slug: string;
  description?: string | null;
  status: ExamStatus;
  instructions?: string | null;
  timeLimitMinutes?: number | null;
  passingScore?: string | null;
  maxAttempts: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  resultVisibility: ResultVisibility;
  availableFrom?: string | null;
  availableUntil?: string | null;
  course?: Course | null;
  topic?: Topic | null;
  sections?: ExamSection[];
  questions?: ExamQuestion[];
  versions?: ExamVersion[];
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
  user?: Pick<User, "id" | "email" | "firstName" | "lastName">;
  examVersion?: ExamVersion;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
  createdAt: string;
  actor?: Pick<User, "id" | "email" | "firstName" | "lastName"> | null;
}

export interface StatisticsFilters {
  from?: string | null;
  to?: string | null;
  courseId?: string | null;
  topicId?: string | null;
  examId?: string | null;
  examVersionId?: string | null;
  userId?: string | null;
  status?: ResultStatus | null;
  rankingLimit: number;
}

export interface StatisticsSummary {
  totalResults: number;
  passedResults: number;
  failedResults: number;
  passRate: number;
  averagePercentage: number;
  averageScore: number;
  averageMaxScore: number;
  averageDurationMinutes: number;
  highestPercentage: number;
  lowestPercentage: number;
  pendingReviewResults: number;
  readyResults: number;
  publishedResults: number;
}

export interface StatisticsChartItem {
  label: string;
  value?: number;
  percentage?: number;
  count?: number;
  averagePercentage?: number;
  averageScore?: number;
  passRate?: number;
  averageDurationMinutes?: number;
  metadata?: Record<string, string | null>;
}

export interface StatisticsRankingItem {
  id: string;
  label: string;
  count: number;
  averagePercentage: number;
  averageScore: number;
  passRate: number;
  averageDurationMinutes: number;
  metadata?: Record<string, string | null>;
}

export interface StatisticsDashboard {
  generatedAt: string;
  filters: StatisticsFilters;
  summary: StatisticsSummary;
  charts: {
    statusDistribution: StatisticsChartItem[];
    passFail: StatisticsChartItem[];
    trend: StatisticsRankingItem[];
    examAverages: StatisticsRankingItem[];
  };
  rankings: {
    students: StatisticsRankingItem[];
    exams: StatisticsRankingItem[];
  };
}

export interface ExportHistory {
  id: string;
  actorUserId?: string | null;
  exportType: ExportType;
  format: ExportFormat;
  status: ExportStatus;
  fileName: string;
  filters?: unknown;
  rowCount: number;
  errorMessage?: string | null;
  createdAt: string;
  actor?: Pick<User, "id" | "email" | "firstName" | "lastName"> | null;
}
