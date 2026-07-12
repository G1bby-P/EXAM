-- Initial database schema for the exam platform.
-- PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE "RoleCode" AS ENUM ('ADMIN', 'REVIEWER', 'STUDENT');
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_TEXT', 'ESSAY', 'FILE_UPLOAD');
CREATE TYPE "QuestionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ExamVersionStatus" AS ENUM ('PUBLISHED', 'RETIRED');
CREATE TYPE "ResultVisibility" AS ENUM ('HIDDEN', 'IMMEDIATE', 'AFTER_REVIEW', 'AFTER_CLOSE_DATE');
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'REVOKED', 'COMPLETED', 'EXPIRED');
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'GRADED', 'CANCELLED');
CREATE TYPE "AnswerReviewStatus" AS ENUM ('NOT_REQUIRED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "ResultStatus" AS ENUM ('PENDING_REVIEW', 'READY', 'PUBLISHED', 'WITHHELD');

-- Core identity and security tables
CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" VARCHAR(254) NOT NULL,
  "email_normalized" VARCHAR(254) NOT NULL,
  "password_hash" VARCHAR(255),
  "first_name" VARCHAR(100),
  "last_name" VARCHAR(100),
  "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
  "last_login_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  "created_by_id" UUID,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "users_email_normalized_check" CHECK ("email_normalized" = lower(btrim("email"))),
  CONSTRAINT "users_deleted_status_check" CHECK (("deleted_at" IS NULL AND "status" <> 'DELETED') OR ("deleted_at" IS NOT NULL AND "status" = 'DELETED'))
);

CREATE TABLE "roles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" "RoleCode" NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_roles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "role_id" UUID NOT NULL,
  "assigned_by_id" UUID,
  "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refresh_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "token_hash" VARCHAR(255) NOT NULL,
  "ip_address" INET,
  "user_agent" VARCHAR(512),
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "refresh_tokens_expiry_check" CHECK ("expires_at" > "created_at")
);

CREATE TABLE "password_reset_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "token_hash" VARCHAR(255) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "used_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "password_reset_tokens_expiry_check" CHECK ("expires_at" > "created_at"),
  CONSTRAINT "password_reset_tokens_used_check" CHECK ("used_at" IS NULL OR "used_at" >= "created_at")
);

-- Question bank
CREATE TABLE "tags" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(80) NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "questions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "type" "QuestionType" NOT NULL,
  "status" "QuestionStatus" NOT NULL DEFAULT 'DRAFT',
  "prompt" TEXT NOT NULL,
  "explanation" TEXT,
  "default_points" DECIMAL(8,2) NOT NULL DEFAULT 1.0,
  "difficulty" INTEGER,
  "allow_partial_credit" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "created_by_id" UUID,
  "updated_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "archived_at" TIMESTAMPTZ(6),
  CONSTRAINT "questions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "questions_default_points_check" CHECK ("default_points" >= 0),
  CONSTRAINT "questions_difficulty_check" CHECK ("difficulty" IS NULL OR ("difficulty" BETWEEN 1 AND 5)),
  CONSTRAINT "questions_archived_status_check" CHECK (("archived_at" IS NULL AND "status" <> 'ARCHIVED') OR ("archived_at" IS NOT NULL AND "status" = 'ARCHIVED'))
);

CREATE TABLE "question_options" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "question_id" UUID NOT NULL,
  "label" VARCHAR(10),
  "text" TEXT NOT NULL,
  "is_correct" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL,
  "score_weight" DECIMAL(5,2),
  "feedback" TEXT,
  "metadata" JSONB,
  CONSTRAINT "question_options_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "question_options_sort_order_check" CHECK ("sort_order" >= 1),
  CONSTRAINT "question_options_score_weight_check" CHECK ("score_weight" IS NULL OR ("score_weight" >= 0 AND "score_weight" <= 1))
);

CREATE TABLE "question_tags" (
  "question_id" UUID NOT NULL,
  "tag_id" UUID NOT NULL,
  CONSTRAINT "question_tags_pkey" PRIMARY KEY ("question_id","tag_id")
);

-- Exam authoring
CREATE TABLE "exams" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title" VARCHAR(200) NOT NULL,
  "slug" VARCHAR(220) NOT NULL,
  "description" TEXT,
  "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
  "instructions" TEXT,
  "time_limit_minutes" INTEGER,
  "passing_score" DECIMAL(5,2),
  "max_attempts" INTEGER NOT NULL DEFAULT 1,
  "randomize_questions" BOOLEAN NOT NULL DEFAULT false,
  "randomize_options" BOOLEAN NOT NULL DEFAULT false,
  "result_visibility" "ResultVisibility" NOT NULL DEFAULT 'AFTER_REVIEW',
  "available_from" TIMESTAMPTZ(6),
  "available_until" TIMESTAMPTZ(6),
  "created_by_id" UUID,
  "updated_by_id" UUID,
  "published_at" TIMESTAMPTZ(6),
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "exams_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exams_time_limit_check" CHECK ("time_limit_minutes" IS NULL OR "time_limit_minutes" > 0),
  CONSTRAINT "exams_passing_score_check" CHECK ("passing_score" IS NULL OR ("passing_score" >= 0 AND "passing_score" <= 100)),
  CONSTRAINT "exams_max_attempts_check" CHECK ("max_attempts" > 0),
  CONSTRAINT "exams_availability_check" CHECK ("available_from" IS NULL OR "available_until" IS NULL OR "available_until" > "available_from"),
  CONSTRAINT "exams_published_status_check" CHECK (("published_at" IS NULL AND "status" <> 'PUBLISHED') OR ("published_at" IS NOT NULL AND "status" IN ('PUBLISHED','ARCHIVED'))),
  CONSTRAINT "exams_archived_status_check" CHECK (("archived_at" IS NULL AND "status" <> 'ARCHIVED') OR ("archived_at" IS NOT NULL AND "status" = 'ARCHIVED'))
);

CREATE TABLE "exam_sections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "exam_id" UUID NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL,
  "randomize_questions" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "exam_sections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exam_sections_sort_order_check" CHECK ("sort_order" >= 1)
);

CREATE TABLE "exam_questions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "exam_id" UUID NOT NULL,
  "section_id" UUID,
  "question_id" UUID NOT NULL,
  "sort_order" INTEGER NOT NULL,
  "points" DECIMAL(8,2) NOT NULL,
  "is_required" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exam_questions_sort_order_check" CHECK ("sort_order" >= 1),
  CONSTRAINT "exam_questions_points_check" CHECK ("points" >= 0)
);

-- Immutable published exam snapshots
CREATE TABLE "exam_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "exam_id" UUID NOT NULL,
  "version_number" INTEGER NOT NULL,
  "status" "ExamVersionStatus" NOT NULL DEFAULT 'PUBLISHED',
  "title" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "instructions" TEXT,
  "time_limit_minutes" INTEGER,
  "passing_score" DECIMAL(5,2),
  "max_attempts" INTEGER NOT NULL,
  "randomize_questions" BOOLEAN NOT NULL,
  "randomize_options" BOOLEAN NOT NULL,
  "result_visibility" "ResultVisibility" NOT NULL,
  "published_by_id" UUID,
  "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retired_at" TIMESTAMPTZ(6),
  CONSTRAINT "exam_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exam_versions_version_number_check" CHECK ("version_number" >= 1),
  CONSTRAINT "exam_versions_time_limit_check" CHECK ("time_limit_minutes" IS NULL OR "time_limit_minutes" > 0),
  CONSTRAINT "exam_versions_passing_score_check" CHECK ("passing_score" IS NULL OR ("passing_score" >= 0 AND "passing_score" <= 100)),
  CONSTRAINT "exam_versions_max_attempts_check" CHECK ("max_attempts" > 0),
  CONSTRAINT "exam_versions_retired_status_check" CHECK (("retired_at" IS NULL AND "status" = 'PUBLISHED') OR ("retired_at" IS NOT NULL AND "status" = 'RETIRED'))
);

CREATE TABLE "exam_version_sections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "exam_version_id" UUID NOT NULL,
  "source_section_id" UUID,
  "title" VARCHAR(160) NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL,
  "randomize_questions" BOOLEAN NOT NULL,
  CONSTRAINT "exam_version_sections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exam_version_sections_sort_order_check" CHECK ("sort_order" >= 1)
);

CREATE TABLE "exam_version_questions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "exam_version_id" UUID NOT NULL,
  "exam_version_section_id" UUID,
  "source_question_id" UUID,
  "type" "QuestionType" NOT NULL,
  "prompt" TEXT NOT NULL,
  "explanation" TEXT,
  "options_snapshot" JSONB,
  "correct_answer_snapshot" JSONB,
  "sort_order" INTEGER NOT NULL,
  "points" DECIMAL(8,2) NOT NULL,
  "is_required" BOOLEAN NOT NULL,
  "allow_partial_credit" BOOLEAN NOT NULL,
  "metadata" JSONB,
  CONSTRAINT "exam_version_questions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exam_version_questions_sort_order_check" CHECK ("sort_order" >= 1),
  CONSTRAINT "exam_version_questions_points_check" CHECK ("points" >= 0)
);

-- Delivery, attempts and grading
CREATE TABLE "exam_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "exam_id" UUID NOT NULL,
  "exam_version_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "assigned_by_id" UUID,
  "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
  "starts_at" TIMESTAMPTZ(6),
  "due_at" TIMESTAMPTZ(6),
  "max_attempts_override" INTEGER,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  CONSTRAINT "exam_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exam_assignments_window_check" CHECK ("starts_at" IS NULL OR "due_at" IS NULL OR "due_at" > "starts_at"),
  CONSTRAINT "exam_assignments_max_attempts_override_check" CHECK ("max_attempts_override" IS NULL OR "max_attempts_override" > 0),
  CONSTRAINT "exam_assignments_status_dates_check" CHECK (
    ("status" = 'ASSIGNED' AND "revoked_at" IS NULL AND "completed_at" IS NULL)
    OR ("status" = 'REVOKED' AND "revoked_at" IS NOT NULL)
    OR ("status" = 'COMPLETED' AND "completed_at" IS NOT NULL)
    OR ("status" = 'EXPIRED')
  )
);

CREATE TABLE "exam_attempts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assignment_id" UUID NOT NULL,
  "exam_version_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "attempt_number" INTEGER NOT NULL,
  "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6),
  "last_activity_at" TIMESTAMPTZ(6),
  "submitted_at" TIMESTAMPTZ(6),
  "graded_at" TIMESTAMPTZ(6),
  "time_limit_minutes" INTEGER,
  "score" DECIMAL(8,2),
  "max_score" DECIMAL(8,2) NOT NULL DEFAULT 0.0,
  "passed" BOOLEAN,
  "ip_address" INET,
  "user_agent" VARCHAR(512),
  "metadata" JSONB,
  CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exam_attempts_attempt_number_check" CHECK ("attempt_number" >= 1),
  CONSTRAINT "exam_attempts_expires_check" CHECK ("expires_at" IS NULL OR "expires_at" > "started_at"),
  CONSTRAINT "exam_attempts_submitted_check" CHECK ("submitted_at" IS NULL OR "submitted_at" >= "started_at"),
  CONSTRAINT "exam_attempts_graded_check" CHECK ("graded_at" IS NULL OR "submitted_at" IS NOT NULL),
  CONSTRAINT "exam_attempts_time_limit_check" CHECK ("time_limit_minutes" IS NULL OR "time_limit_minutes" > 0),
  CONSTRAINT "exam_attempts_score_check" CHECK ("score" IS NULL OR ("score" >= 0 AND "score" <= "max_score")),
  CONSTRAINT "exam_attempts_max_score_check" CHECK ("max_score" >= 0)
);

CREATE TABLE "file_assets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "bucket" VARCHAR(120) NOT NULL,
  "storage_key" VARCHAR(500) NOT NULL,
  "original_name" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(120) NOT NULL,
  "size_bytes" BIGINT NOT NULL,
  "checksum" VARCHAR(128),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "file_assets_size_bytes_check" CHECK ("size_bytes" >= 0)
);

CREATE TABLE "attempt_answers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "attempt_id" UUID NOT NULL,
  "exam_version_question_id" UUID NOT NULL,
  "answer_text" TEXT,
  "selected_option_ids" JSONB,
  "file_asset_id" UUID,
  "score" DECIMAL(8,2),
  "is_correct" BOOLEAN,
  "review_status" "AnswerReviewStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  "reviewed_by_id" UUID,
  "reviewed_at" TIMESTAMPTZ(6),
  "feedback" TEXT,
  "saved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "attempt_answers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "attempt_answers_score_check" CHECK ("score" IS NULL OR "score" >= 0),
  CONSTRAINT "attempt_answers_review_check" CHECK (("review_status" = 'NOT_REQUIRED' AND "reviewed_by_id" IS NULL AND "reviewed_at" IS NULL) OR "review_status" <> 'NOT_REQUIRED')
);

CREATE TABLE "results" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "attempt_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "exam_version_id" UUID NOT NULL,
  "status" "ResultStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "score" DECIMAL(8,2) NOT NULL,
  "max_score" DECIMAL(8,2) NOT NULL,
  "percentage" DECIMAL(5,2) NOT NULL,
  "passed" BOOLEAN NOT NULL,
  "auto_score" DECIMAL(8,2),
  "manual_score" DECIMAL(8,2),
  "published_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "results_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "results_score_check" CHECK ("score" >= 0 AND "score" <= "max_score"),
  CONSTRAINT "results_max_score_check" CHECK ("max_score" > 0),
  CONSTRAINT "results_percentage_check" CHECK ("percentage" >= 0 AND "percentage" <= 100),
  CONSTRAINT "results_component_scores_check" CHECK (("auto_score" IS NULL OR "auto_score" >= 0) AND ("manual_score" IS NULL OR "manual_score" >= 0)),
  CONSTRAINT "results_published_status_check" CHECK (("published_at" IS NULL AND "status" <> 'PUBLISHED') OR ("published_at" IS NOT NULL AND "status" = 'PUBLISHED'))
);

CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actor_user_id" UUID,
  "action" VARCHAR(120) NOT NULL,
  "entity_type" VARCHAR(120) NOT NULL,
  "entity_id" UUID,
  "ip_address" INET,
  "user_agent" VARCHAR(512),
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Unique constraints and indexes
CREATE UNIQUE INDEX "users_email_normalized_key" ON "users"("email_normalized");
CREATE INDEX "users_status_idx" ON "users"("status");
CREATE INDEX "users_created_by_id_idx" ON "users"("created_by_id");
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id","role_id");
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");
CREATE INDEX "user_roles_assigned_by_id_idx" ON "user_roles"("assigned_by_id");

CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");
CREATE INDEX "tags_name_idx" ON "tags"("name");

CREATE INDEX "questions_type_status_idx" ON "questions"("type","status");
CREATE INDEX "questions_status_idx" ON "questions"("status");
CREATE INDEX "questions_created_by_id_idx" ON "questions"("created_by_id");
CREATE INDEX "questions_updated_by_id_idx" ON "questions"("updated_by_id");

CREATE UNIQUE INDEX "question_options_question_id_sort_order_key" ON "question_options"("question_id","sort_order");
CREATE INDEX "question_options_question_id_is_correct_idx" ON "question_options"("question_id","is_correct");

CREATE INDEX "question_tags_tag_id_idx" ON "question_tags"("tag_id");

CREATE UNIQUE INDEX "exams_slug_key" ON "exams"("slug");
CREATE INDEX "exams_status_idx" ON "exams"("status");
CREATE INDEX "exams_created_by_id_idx" ON "exams"("created_by_id");
CREATE INDEX "exams_updated_by_id_idx" ON "exams"("updated_by_id");
CREATE INDEX "exams_available_from_available_until_idx" ON "exams"("available_from","available_until");

CREATE UNIQUE INDEX "exam_sections_exam_id_sort_order_key" ON "exam_sections"("exam_id","sort_order");
CREATE UNIQUE INDEX "exam_sections_id_exam_id_key" ON "exam_sections"("id","exam_id");
CREATE INDEX "exam_sections_exam_id_idx" ON "exam_sections"("exam_id");

CREATE UNIQUE INDEX "exam_questions_exam_id_question_id_key" ON "exam_questions"("exam_id","question_id");
CREATE UNIQUE INDEX "exam_questions_exam_id_section_id_sort_order_key" ON "exam_questions"("exam_id","section_id","sort_order");
CREATE UNIQUE INDEX "exam_questions_unsectioned_sort_key" ON "exam_questions"("exam_id","sort_order") WHERE "section_id" IS NULL;
CREATE INDEX "exam_questions_question_id_idx" ON "exam_questions"("question_id");
CREATE INDEX "exam_questions_section_id_idx" ON "exam_questions"("section_id");

CREATE UNIQUE INDEX "exam_versions_exam_id_version_number_key" ON "exam_versions"("exam_id","version_number");
CREATE UNIQUE INDEX "exam_versions_id_exam_id_key" ON "exam_versions"("id","exam_id");
CREATE INDEX "exam_versions_status_idx" ON "exam_versions"("status");
CREATE INDEX "exam_versions_published_by_id_idx" ON "exam_versions"("published_by_id");
CREATE INDEX "exam_versions_published_at_idx" ON "exam_versions"("published_at");

CREATE UNIQUE INDEX "exam_version_sections_exam_version_id_sort_order_key" ON "exam_version_sections"("exam_version_id","sort_order");
CREATE INDEX "exam_version_sections_source_section_id_idx" ON "exam_version_sections"("source_section_id");

CREATE UNIQUE INDEX "exam_version_questions_exam_version_id_exam_version_section_id_sort_order_key" ON "exam_version_questions"("exam_version_id","exam_version_section_id","sort_order");
CREATE UNIQUE INDEX "exam_version_questions_unsectioned_sort_key" ON "exam_version_questions"("exam_version_id","sort_order") WHERE "exam_version_section_id" IS NULL;
CREATE INDEX "exam_version_questions_source_question_id_idx" ON "exam_version_questions"("source_question_id");
CREATE INDEX "exam_version_questions_exam_version_section_id_idx" ON "exam_version_questions"("exam_version_section_id");

CREATE INDEX "exam_assignments_user_id_status_idx" ON "exam_assignments"("user_id","status");
CREATE INDEX "exam_assignments_exam_version_id_status_idx" ON "exam_assignments"("exam_version_id","status");
CREATE INDEX "exam_assignments_assigned_by_id_idx" ON "exam_assignments"("assigned_by_id");
CREATE INDEX "exam_assignments_starts_at_due_at_idx" ON "exam_assignments"("starts_at","due_at");
CREATE UNIQUE INDEX "exam_assignments_active_user_version_key" ON "exam_assignments"("exam_version_id","user_id") WHERE "status" = 'ASSIGNED';

CREATE UNIQUE INDEX "exam_attempts_assignment_id_attempt_number_key" ON "exam_attempts"("assignment_id","attempt_number");
CREATE INDEX "exam_attempts_user_id_status_idx" ON "exam_attempts"("user_id","status");
CREATE INDEX "exam_attempts_exam_version_id_status_idx" ON "exam_attempts"("exam_version_id","status");
CREATE INDEX "exam_attempts_started_at_idx" ON "exam_attempts"("started_at");

CREATE UNIQUE INDEX "file_assets_storage_key_key" ON "file_assets"("storage_key");
CREATE INDEX "file_assets_owner_user_id_idx" ON "file_assets"("owner_user_id");
CREATE INDEX "file_assets_created_at_idx" ON "file_assets"("created_at");

CREATE UNIQUE INDEX "attempt_answers_attempt_id_exam_version_question_id_key" ON "attempt_answers"("attempt_id","exam_version_question_id");
CREATE INDEX "attempt_answers_exam_version_question_id_idx" ON "attempt_answers"("exam_version_question_id");
CREATE INDEX "attempt_answers_file_asset_id_idx" ON "attempt_answers"("file_asset_id");
CREATE INDEX "attempt_answers_review_status_idx" ON "attempt_answers"("review_status");
CREATE INDEX "attempt_answers_reviewed_by_id_idx" ON "attempt_answers"("reviewed_by_id");

CREATE UNIQUE INDEX "results_attempt_id_key" ON "results"("attempt_id");
CREATE INDEX "results_user_id_status_idx" ON "results"("user_id","status");
CREATE INDEX "results_exam_version_id_status_idx" ON "results"("exam_version_id","status");
CREATE INDEX "results_published_at_idx" ON "results"("published_at");

CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type","entity_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- Foreign keys
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "questions" ADD CONSTRAINT "questions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "questions" ADD CONSTRAINT "questions_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exams" ADD CONSTRAINT "exams_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "exams" ADD CONSTRAINT "exams_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "exam_sections" ADD CONSTRAINT "exam_sections_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "exam_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "exam_versions" ADD CONSTRAINT "exam_versions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exam_versions" ADD CONSTRAINT "exam_versions_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "exam_version_sections" ADD CONSTRAINT "exam_version_sections_exam_version_id_fkey" FOREIGN KEY ("exam_version_id") REFERENCES "exam_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_version_sections" ADD CONSTRAINT "exam_version_sections_source_section_id_fkey" FOREIGN KEY ("source_section_id") REFERENCES "exam_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "exam_version_questions" ADD CONSTRAINT "exam_version_questions_exam_version_id_fkey" FOREIGN KEY ("exam_version_id") REFERENCES "exam_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_version_questions" ADD CONSTRAINT "exam_version_questions_exam_version_section_id_fkey" FOREIGN KEY ("exam_version_section_id") REFERENCES "exam_version_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "exam_version_questions" ADD CONSTRAINT "exam_version_questions_source_question_id_fkey" FOREIGN KEY ("source_question_id") REFERENCES "questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "exam_assignments" ADD CONSTRAINT "exam_assignments_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exam_assignments" ADD CONSTRAINT "exam_assignments_exam_version_id_fkey" FOREIGN KEY ("exam_version_id") REFERENCES "exam_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exam_assignments" ADD CONSTRAINT "exam_assignments_exam_version_exam_consistency_fkey" FOREIGN KEY ("exam_version_id","exam_id") REFERENCES "exam_versions"("id","exam_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exam_assignments" ADD CONSTRAINT "exam_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exam_assignments" ADD CONSTRAINT "exam_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "exam_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_version_id_fkey" FOREIGN KEY ("exam_version_id") REFERENCES "exam_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_exam_version_question_id_fkey" FOREIGN KEY ("exam_version_question_id") REFERENCES "exam_version_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "results" ADD CONSTRAINT "results_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "results" ADD CONSTRAINT "results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "results" ADD CONSTRAINT "results_exam_version_id_fkey" FOREIGN KEY ("exam_version_id") REFERENCES "exam_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
