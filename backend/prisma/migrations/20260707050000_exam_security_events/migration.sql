DO $$
BEGIN
  CREATE TYPE "SecurityEventType" AS ENUM (
    'FULLSCREEN_ENTERED',
    'FULLSCREEN_EXITED',
    'TAB_HIDDEN',
    'TAB_VISIBLE',
    'WINDOW_BLUR',
    'WINDOW_FOCUS',
    'COPY_BLOCKED',
    'PASTE_BLOCKED',
    'CUT_BLOCKED',
    'CONTEXT_MENU_BLOCKED',
    'KEYBOARD_SHORTCUT_BLOCKED',
    'PRINT_BLOCKED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SecurityEventSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "exam_security_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "attempt_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "event_type" "SecurityEventType" NOT NULL,
  "severity" "SecurityEventSeverity" NOT NULL DEFAULT 'INFO',
  "occurred_at" TIMESTAMPTZ(6) NOT NULL,
  "ip_address" INET,
  "user_agent" VARCHAR(512),
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exam_security_events_attempt_id_fkey"
    FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "exam_security_events_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "exam_security_events_attempt_id_occurred_at_idx"
  ON "exam_security_events"("attempt_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "exam_security_events_user_id_occurred_at_idx"
  ON "exam_security_events"("user_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "exam_security_events_event_type_occurred_at_idx"
  ON "exam_security_events"("event_type", "occurred_at");
CREATE INDEX IF NOT EXISTS "exam_security_events_severity_idx"
  ON "exam_security_events"("severity");
