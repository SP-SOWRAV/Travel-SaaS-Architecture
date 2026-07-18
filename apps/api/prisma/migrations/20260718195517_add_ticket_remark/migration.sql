-- CreateEnum
CREATE TYPE "ticket_status" AS ENUM ('unissued', 'issued', 'voided');

-- CreateEnum
CREATE TYPE "remark_type" AS ENUM ('internal', 'customer_facing');

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "passenger_id" UUID NOT NULL,
    "ticket_number" VARCHAR(30),
    "status" "ticket_status" NOT NULL DEFAULT 'unissued',
    "issued_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remarks" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "remark_type" "remark_type" NOT NULL DEFAULT 'internal',
    "remark_text" TEXT NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_number_key" ON "tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "tickets_booking_id_idx" ON "tickets"("booking_id");

-- CreateIndex
CREATE INDEX "tickets_passenger_id_idx" ON "tickets"("passenger_id");

-- CreateIndex
CREATE INDEX "remarks_booking_id_idx" ON "remarks"("booking_id");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remarks" ADD CONSTRAINT "remarks_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remarks" ADD CONSTRAINT "remarks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
