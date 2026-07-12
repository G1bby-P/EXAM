-- Adds course and topic support required by Fase 3 backend modules.
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "TopicStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "courses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title" VARCHAR(200) NOT NULL,
  "slug" VARCHAR(220) NOT NULL,
  "description" TEXT,
  "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "archived_at" TIMESTAMPTZ(6),
  CONSTRAINT "courses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "courses_archived_status_check" CHECK (("archived_at" IS NULL AND "status" <> 'ARCHIVED') OR ("archived_at" IS NOT NULL AND "status" = 'ARCHIVED'))
);

CREATE TABLE "topics" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "course_id" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "slug" VARCHAR(220) NOT NULL,
  "description" TEXT,
  "status" "TopicStatus" NOT NULL DEFAULT 'ACTIVE',
  "sort_order" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "archived_at" TIMESTAMPTZ(6),
  CONSTRAINT "topics_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "topics_sort_order_check" CHECK ("sort_order" >= 1),
  CONSTRAINT "topics_archived_status_check" CHECK (("archived_at" IS NULL AND "status" <> 'ARCHIVED') OR ("archived_at" IS NOT NULL AND "status" = 'ARCHIVED'))
);

ALTER TABLE "questions" ADD COLUMN "topic_id" UUID;
ALTER TABLE "exams" ADD COLUMN "course_id" UUID;
ALTER TABLE "exams" ADD COLUMN "topic_id" UUID;

CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");
CREATE INDEX "courses_status_idx" ON "courses"("status");
CREATE INDEX "courses_created_at_idx" ON "courses"("created_at");

CREATE UNIQUE INDEX "topics_course_id_slug_key" ON "topics"("course_id","slug");
CREATE UNIQUE INDEX "topics_course_id_sort_order_key" ON "topics"("course_id","sort_order");
CREATE INDEX "topics_course_id_status_idx" ON "topics"("course_id","status");

CREATE INDEX "questions_topic_id_status_idx" ON "questions"("topic_id","status");
CREATE INDEX "exams_course_id_status_idx" ON "exams"("course_id","status");
CREATE INDEX "exams_topic_id_status_idx" ON "exams"("topic_id","status");

ALTER TABLE "topics" ADD CONSTRAINT "topics_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "questions" ADD CONSTRAINT "questions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "exams" ADD CONSTRAINT "exams_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "exams" ADD CONSTRAINT "exams_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
