CREATE TABLE "reservation_cancellation_audits" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "cancelledByUserId" TEXT,
  "reason" TEXT NOT NULL,
  "source" "ReservationSource" NOT NULL DEFAULT 'DASHBOARD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "reservation_cancellation_audits_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "reservation_cancellation_audits"
  ADD CONSTRAINT "reservation_cancellation_audits_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reservation_cancellation_audits"
  ADD CONSTRAINT "reservation_cancellation_audits_reservationId_fkey"
  FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reservation_cancellation_audits"
  ADD CONSTRAINT "reservation_cancellation_audits_cancelledByUserId_fkey"
  FOREIGN KEY ("cancelledByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "reservation_cancellation_audits_restaurantId_idx"
  ON "reservation_cancellation_audits"("restaurantId");

CREATE INDEX "reservation_cancellation_audits_reservationId_idx"
  ON "reservation_cancellation_audits"("reservationId");

CREATE INDEX "reservation_cancellation_audits_cancelledByUserId_idx"
  ON "reservation_cancellation_audits"("cancelledByUserId");

CREATE INDEX "reservation_cancellation_audits_createdAt_idx"
  ON "reservation_cancellation_audits"("createdAt");
