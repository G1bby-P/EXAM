ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'CLINICAL_CASE';

DO $$
BEGIN
  CREATE TYPE "QuestionMediaType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'PDF');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "clinical_cases" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" VARCHAR(200) NOT NULL,
  "patient_context" TEXT NOT NULL,
  "summary" TEXT,
  "diagnosis" TEXT,
  "metadata" JSONB,
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archived_at" TIMESTAMPTZ(6),
  CONSTRAINT "clinical_cases_title_not_blank" CHECK (length(trim("title")) > 0),
  CONSTRAINT "clinical_cases_patient_context_not_blank" CHECK (length(trim("patient_context")) > 0),
  CONSTRAINT "clinical_cases_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

ALTER TABLE "questions"
  ADD COLUMN IF NOT EXISTS "clinical_case_id" UUID;

ALTER TABLE "questions"
  ADD CONSTRAINT "questions_clinical_case_id_fkey"
  FOREIGN KEY ("clinical_case_id") REFERENCES "clinical_cases"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "question_media" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "question_id" UUID NOT NULL,
  "file_asset_id" UUID,
  "media_type" "QuestionMediaType" NOT NULL,
  "title" VARCHAR(160),
  "description" TEXT,
  "url" VARCHAR(1000),
  "sort_order" INTEGER NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "question_media_sort_order_positive" CHECK ("sort_order" > 0),
  CONSTRAINT "question_media_source_required" CHECK ("file_asset_id" IS NOT NULL OR length(trim(coalesce("url", ''))) > 0),
  CONSTRAINT "question_media_question_id_fkey"
    FOREIGN KEY ("question_id") REFERENCES "questions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "question_media_file_asset_id_fkey"
    FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "question_media_question_id_sort_order_key"
  ON "question_media"("question_id", "sort_order");

CREATE INDEX IF NOT EXISTS "clinical_cases_created_by_id_idx" ON "clinical_cases"("created_by_id");
CREATE INDEX IF NOT EXISTS "clinical_cases_created_at_idx" ON "clinical_cases"("created_at");
CREATE INDEX IF NOT EXISTS "questions_clinical_case_id_idx" ON "questions"("clinical_case_id");
CREATE INDEX IF NOT EXISTS "question_media_question_id_media_type_idx" ON "question_media"("question_id", "media_type");
CREATE INDEX IF NOT EXISTS "question_media_file_asset_id_idx" ON "question_media"("file_asset_id");
