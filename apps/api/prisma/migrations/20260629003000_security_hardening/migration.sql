-- Security hardening: immutable audit logs, password history, temporary password lifecycle.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "temporaryPasswordExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "tenantSlug" TEXT,
  "actorUserId" TEXT,
  "actorRole" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "previousValue" JSONB,
  "newValue" JSONB,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "result" TEXT NOT NULL DEFAULT 'SUCCESS',
  "durationMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "password_history" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "algorithm" TEXT NOT NULL DEFAULT 'bcrypt',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_history_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_tenantId_fkey'
  ) THEN
    ALTER TABLE "audit_logs"
      ADD CONSTRAINT "audit_logs_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;


  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'password_history_userId_fkey'
  ) THEN
    ALTER TABLE "password_history"
      ADD CONSTRAINT "password_history_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "audit_logs_tenant_created_idx" ON "audit_logs"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "audit_logs_tenant_slug_created_idx" ON "audit_logs"("tenantSlug", "createdAt");
CREATE INDEX IF NOT EXISTS "audit_logs_actor_created_idx" ON "audit_logs"("actorUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "audit_logs_action_created_idx" ON "audit_logs"("action", "createdAt");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs"("entity", "entityId");
CREATE INDEX IF NOT EXISTS "audit_logs_result_created_idx" ON "audit_logs"("result", "createdAt");
CREATE INDEX IF NOT EXISTS "password_history_user_created_idx" ON "password_history"("userId", "createdAt");

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_prevent_update ON "audit_logs";
CREATE TRIGGER audit_logs_prevent_update
BEFORE UPDATE ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS audit_logs_prevent_delete ON "audit_logs";
CREATE TRIGGER audit_logs_prevent_delete
BEFORE DELETE ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();