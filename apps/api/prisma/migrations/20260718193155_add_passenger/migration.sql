-- CreateEnum
CREATE TYPE "passenger_type" AS ENUM ('ADT', 'CHD', 'INF');

-- CreateTable
CREATE TABLE "passengers" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "date_of_birth" DATE,
    "passport_number" VARCHAR(50),
    "passenger_type" "passenger_type" NOT NULL DEFAULT 'ADT',
    "nationality_country_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "passengers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "passengers_booking_id_idx" ON "passengers"("booking_id");

-- AddForeignKey
ALTER TABLE "passengers" ADD CONSTRAINT "passengers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
