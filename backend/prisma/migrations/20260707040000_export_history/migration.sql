DO $$
BEGIN
  CREATE TYPE "ExportFormat" AS ENUM ('EXCEL', 'PDF');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ExportType" AS ENUM ('RESULTS', 'REPORT', 'HISTORY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ExportStatus" AS ENUM ('COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "export_history" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_user_id" UUID,
  "export_type" "ExportType" NOT NULL,
  "format" "ExportFormat" NOT NULL,
  "status" "ExportStatus" NOT NULL DEFAULT 'COMPLETED',
  "file_name" VARCHAR(255) NOT NULL,
  "filters" JSONB,
  "row_count" INTEGER NOT NULL DEFAULT 0,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "export_history_file_name_not_blank" CHECK (length(trim("file_name")) > 0),
  CONSTRAINT "export_history_row_count_non_negative" CHECK ("row_count" >= 0),
  CONSTRAINT "export_history_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "export_history_actor_user_id_idx" ON "export_history"("actor_user_id");
CREATE INDEX IF NOT EXISTS "export_history_export_type_format_idx" ON "export_history"("export_type", "format");
CREATE INDEX IF NOT EXISTS "export_history_status_idx" ON "export_history"("status");
CREATE INDEX IF NOT EXISTS "export_history_created_at_idx" ON "export_history"("created_at");
