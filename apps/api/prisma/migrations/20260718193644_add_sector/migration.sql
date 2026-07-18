-- CreateEnum
CREATE TYPE "cabin_class" AS ENUM ('economy', 'premium_economy', 'business', 'first');

-- CreateTable
CREATE TABLE "sectors" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "airline_id" UUID NOT NULL,
    "origin_airport_id" UUID NOT NULL,
    "destination_airport_id" UUID NOT NULL,
    "flight_number" VARCHAR(10) NOT NULL,
    "cabin_class" "cabin_class" NOT NULL DEFAULT 'economy',
    "departure_at" TIMESTAMPTZ NOT NULL,
    "arrival_at" TIMESTAMPTZ NOT NULL,
    "sequence_number" SMALLINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sectors_booking_id_idx" ON "sectors"("booking_id");

-- CreateIndex
CREATE INDEX "sectors_airline_id_idx" ON "sectors"("airline_id");

-- CreateIndex
CREATE INDEX "sectors_origin_airport_id_idx" ON "sectors"("origin_airport_id");

-- CreateIndex
CREATE INDEX "sectors_destination_airport_id_idx" ON "sectors"("destination_airport_id");

-- AddForeignKey
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_airline_id_fkey" FOREIGN KEY ("airline_id") REFERENCES "airlines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_origin_airport_id_fkey" FOREIGN KEY ("origin_airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_destination_airport_id_fkey" FOREIGN KEY ("destination_airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
