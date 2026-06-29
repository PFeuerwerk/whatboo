-- Tenant-scoped partial indexes for high-volume SaaS queries.
-- These are aligned with the active-record filters used by NestJS repositories/controllers.

CREATE INDEX IF NOT EXISTS "restaurants_active_slug_idx"
  ON "restaurants"("slug")
  WHERE "status" = 'ACTIVE' AND "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "reservations_tenant_active_start_idx"
  ON "reservations"("restaurantId", "reservationStart")
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "reservations_tenant_active_status_start_idx"
  ON "reservations"("restaurantId", "status", "reservationStart")
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "reservations_tenant_active_customer_start_idx"
  ON "reservations"("restaurantId", "customerId", "reservationStart")
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "restaurant_tables_tenant_active_zone_idx"
  ON "restaurant_tables"("restaurantId", "zoneId", "name")
  WHERE "active" = true;

CREATE INDEX IF NOT EXISTS "restaurant_zones_tenant_active_priority_idx"
  ON "restaurant_zones"("restaurantId", "priority", "name")
  WHERE "active" = true;

CREATE INDEX IF NOT EXISTS "customers_tenant_active_name_idx"
  ON "customers"("restaurantId", "firstName", "lastName")
  WHERE "active" = true;

CREATE INDEX IF NOT EXISTS "users_tenant_active_role_email_idx"
  ON "users"("restaurantId", "role", "email")
  WHERE "isActive" = true;

CREATE INDEX IF NOT EXISTS "opening_hours_tenant_active_day_idx"
  ON "opening_hours"("restaurantId", "dayOfWeek")
  WHERE "active" = true AND "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "capacity_rules_tenant_active_idx"
  ON "capacity_rules"("restaurantId")
  WHERE "active" = true AND "deletedAt" IS NULL;
