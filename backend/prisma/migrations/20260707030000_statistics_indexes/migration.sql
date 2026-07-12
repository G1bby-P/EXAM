CREATE INDEX IF NOT EXISTS "results_created_at_idx" ON "results"("created_at");
CREATE INDEX IF NOT EXISTS "results_passed_idx" ON "results"("passed");
CREATE INDEX IF NOT EXISTS "exam_attempts_submitted_at_idx" ON "exam_attempts"("submitted_at");
