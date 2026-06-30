CREATE TYPE "BillingPlan" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');

CREATE TYPE "BillingStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');

ALTER TABLE "restaurants"
  ADD COLUMN "billingPlan" "BillingPlan" NOT NULL DEFAULT 'FREE',
  ADD COLUMN "billingStatus" "BillingStatus" NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN "billingEmail" TEXT,
  ADD COLUMN "billingCustomerReference" TEXT,
  ADD COLUMN "trialEndsAt" TIMESTAMP(3),
  ADD COLUMN "currentPeriodEndsAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "restaurants_billing_status_idx"
  ON "restaurants"("billingStatus", "billingPlan")
  WHERE "deletedAt" IS NULL;
