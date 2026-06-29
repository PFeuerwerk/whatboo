-- Add restaurant zones required by the current Prisma schema and Angular floor-plan UI.
-- This migration is intentionally non-destructive for existing local/dev databases.

CREATE TABLE IF NOT EXISTS "restaurant_zones" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_zones_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "restaurant_tables"
  ADD COLUMN IF NOT EXISTS "zoneId" TEXT;

CREATE INDEX IF NOT EXISTS "restaurant_zones_restaurantId_idx"
  ON "restaurant_zones"("restaurantId");

CREATE UNIQUE INDEX IF NOT EXISTS "restaurant_zones_restaurantId_name_key"
  ON "restaurant_zones"("restaurantId", "name");

CREATE INDEX IF NOT EXISTS "restaurant_tables_zoneId_idx"
  ON "restaurant_tables"("zoneId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'restaurant_zones_restaurantId_fkey'
  ) THEN
    ALTER TABLE "restaurant_zones"
      ADD CONSTRAINT "restaurant_zones_restaurantId_fkey"
      FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'restaurant_tables_zoneId_fkey'
  ) THEN
    ALTER TABLE "restaurant_tables"
      ADD CONSTRAINT "restaurant_tables_zoneId_fkey"
      FOREIGN KEY ("zoneId") REFERENCES "restaurant_zones"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
