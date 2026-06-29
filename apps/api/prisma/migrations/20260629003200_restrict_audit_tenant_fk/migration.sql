ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_tenantId_fkey";
ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;