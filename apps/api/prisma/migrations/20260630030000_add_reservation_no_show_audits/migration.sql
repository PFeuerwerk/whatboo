CREATE TABLE "reservation_no_show_audits" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "markedByUserId" TEXT,
  "reasonCode" TEXT NOT NULL,
  "details" TEXT,
  "source" "ReservationSource" NOT NULL DEFAULT 'DASHBOARD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "reservation_no_show_audits_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "reservation_no_show_audits"
  ADD CONSTRAINT "reservation_no_show_audits_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reservation_no_show_audits"
  ADD CONSTRAINT "reservation_no_show_audits_reservationId_fkey"
  FOREIGN KEY ("reservationId") REFERENCES "reservations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reservation_no_show_audits"
  ADD CONSTRAINT "reservation_no_show_audits_markedByUserId_fkey"
  FOREIGN KEY ("markedByUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "reservation_no_show_audits_restaurantId_idx"
  ON "reservation_no_show_audits"("restaurantId");

CREATE INDEX "reservation_no_show_audits_reservationId_idx"
  ON "reservation_no_show_audits"("reservationId");

CREATE INDEX "reservation_no_show_audits_markedByUserId_idx"
  ON "reservation_no_show_audits"("markedByUserId");

CREATE INDEX "reservation_no_show_audits_createdAt_idx"
  ON "reservation_no_show_audits"("createdAt");
