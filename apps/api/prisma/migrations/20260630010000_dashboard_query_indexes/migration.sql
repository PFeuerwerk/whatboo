-- Dashboard query indexes validated against the current NestJS repository access patterns.
-- Existing low-volume local data can still prefer sequential scans; these indexes target production cardinality.

CREATE INDEX IF NOT EXISTS "customers_tenant_active_dashboard_order_idx"
  ON "customers"("restaurantId", "totalReservations" DESC, "lastReservationAt" DESC, "firstName")
  WHERE "active" = true;

CREATE INDEX IF NOT EXISTS "restaurant_tables_tenant_active_capacity_idx"
  ON "restaurant_tables"("restaurantId", "capacity", "id")
  WHERE "active" = true;

CREATE INDEX IF NOT EXISTS "reservations_tenant_active_status_window_idx"
  ON "reservations"("restaurantId", "status", "reservationStart", "reservationEnd")
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "reservation_cancellation_audits_tenant_reservation_created_idx"
  ON "reservation_cancellation_audits"("restaurantId", "reservationId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "users_tenant_role_active_email_idx"
  ON "users"("restaurantId", "role", "isActive", "email");
