\pset pager off

\echo DASHBOARD_RESERVATIONS_BY_DATE_RANGE
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, "reservationStart", status
FROM reservations
WHERE "restaurantId" = (SELECT id FROM restaurants WHERE "deletedAt" IS NULL LIMIT 1)
  AND "deletedAt" IS NULL
  AND "reservationStart" >= (
    SELECT COALESCE(min("reservationStart"), now())
    FROM reservations
    WHERE "restaurantId" = (SELECT id FROM restaurants WHERE "deletedAt" IS NULL LIMIT 1)
      AND "deletedAt" IS NULL
  )
  AND "reservationStart" <= (
    SELECT COALESCE(max("reservationStart"), now() + interval '1 day')
    FROM reservations
    WHERE "restaurantId" = (SELECT id FROM restaurants WHERE "deletedAt" IS NULL LIMIT 1)
      AND "deletedAt" IS NULL
  )
ORDER BY "reservationStart" ASC
LIMIT 100;

\echo DASHBOARD_RESERVATIONS_BY_STATUS_RANGE
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, "reservationStart", status
FROM reservations
WHERE "restaurantId" = (SELECT id FROM restaurants WHERE "deletedAt" IS NULL LIMIT 1)
  AND "deletedAt" IS NULL
  AND status = 'CONFIRMED'
  AND "reservationStart" >= (
    SELECT COALESCE(min("reservationStart"), now())
    FROM reservations
    WHERE "restaurantId" = (SELECT id FROM restaurants WHERE "deletedAt" IS NULL LIMIT 1)
      AND "deletedAt" IS NULL
  )
  AND "reservationStart" <= (
    SELECT COALESCE(max("reservationStart"), now() + interval '1 day')
    FROM reservations
    WHERE "restaurantId" = (SELECT id FROM restaurants WHERE "deletedAt" IS NULL LIMIT 1)
      AND "deletedAt" IS NULL
  )
ORDER BY "reservationStart" ASC
LIMIT 100;

\echo CUSTOMER_PROFILE_RESERVATIONS
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, "reservationStart", status
FROM reservations
WHERE "restaurantId" = (SELECT id FROM restaurants WHERE "deletedAt" IS NULL LIMIT 1)
  AND "customerId" = (
    SELECT id
    FROM customers
    WHERE "restaurantId" = (SELECT id FROM restaurants WHERE "deletedAt" IS NULL LIMIT 1)
      AND active = true
    LIMIT 1
  )
  AND "deletedAt" IS NULL
ORDER BY "reservationStart" DESC
LIMIT 20;

\echo CUSTOMERS_LIST_ORDER
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, phone, "firstName", "lastName", "totalReservations", "lastReservationAt"
FROM customers
WHERE "restaurantId" = (SELECT id FROM restaurants WHERE "deletedAt" IS NULL LIMIT 1)
  AND active = true
ORDER BY "totalReservations" DESC, "lastReservationAt" DESC, "firstName" ASC
LIMIT 50;

\echo TABLES_LIST_ORDER
EXPLAIN (ANALYZE, BUFFERS)
SELECT t.id, t.name, t.capacity, z.priority
FROM restaurant_tables t
LEFT JOIN restaurant_zones z ON z.id = t."zoneId"
WHERE t."restaurantId" = (SELECT id FROM restaurants WHERE "deletedAt" IS NULL LIMIT 1)
  AND t.active = true
ORDER BY z.priority ASC, t.name ASC;

\echo AVAILABILITY_BOOKED_TABLES
EXPLAIN (ANALYZE, BUFFERS)
SELECT rt."tableId"
FROM reservation_tables rt
JOIN reservations r ON r.id = rt."reservationId"
WHERE r."restaurantId" = (SELECT id FROM restaurants WHERE "deletedAt" IS NULL LIMIT 1)
  AND r.status IN ('PENDING', 'CONFIRMED')
  AND r."reservationStart" < (
    SELECT COALESCE(max("reservationStart"), now() + interval '1 day')
    FROM reservations
    WHERE "restaurantId" = (SELECT id FROM restaurants WHERE "deletedAt" IS NULL LIMIT 1)
      AND "deletedAt" IS NULL
  )
  AND r."reservationEnd" > (
    SELECT COALESCE(min("reservationStart"), now())
    FROM reservations
    WHERE "restaurantId" = (SELECT id FROM restaurants WHERE "deletedAt" IS NULL LIMIT 1)
      AND "deletedAt" IS NULL
  );

\echo AVAILABILITY_TABLE_CANDIDATES
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, name, capacity
FROM restaurant_tables
WHERE "restaurantId" = (SELECT id FROM restaurants WHERE "deletedAt" IS NULL LIMIT 1)
  AND active = true
  AND capacity >= 2
  AND capacity <= 5
ORDER BY capacity ASC;
