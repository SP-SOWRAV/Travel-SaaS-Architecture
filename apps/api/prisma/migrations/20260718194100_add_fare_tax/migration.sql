-- CreateTable
CREATE TABLE "fares" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "passenger_id" UUID NOT NULL,
    "sector_id" UUID NOT NULL,
    "base_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "currency_code" CHAR(3) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxes" (
    "id" UUID NOT NULL,
    "fare_id" UUID NOT NULL,
    "tax_code" VARCHAR(10) NOT NULL,
    "description" VARCHAR(255),
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "taxes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fares_booking_id_idx" ON "fares"("booking_id");

-- CreateIndex
CREATE INDEX "fares_passenger_id_idx" ON "fares"("passenger_id");

-- CreateIndex
CREATE INDEX "fares_sector_id_idx" ON "fares"("sector_id");

-- CreateIndex
CREATE UNIQUE INDEX "fares_passenger_id_sector_id_key" ON "fares"("passenger_id", "sector_id");

-- CreateIndex
CREATE INDEX "taxes_fare_id_idx" ON "taxes"("fare_id");

-- AddForeignKey
ALTER TABLE "fares" ADD CONSTRAINT "fares_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fares" ADD CONSTRAINT "fares_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fares" ADD CONSTRAINT "fares_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxes" ADD CONSTRAINT "taxes_fare_id_fkey" FOREIGN KEY ("fare_id") REFERENCES "fares"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
