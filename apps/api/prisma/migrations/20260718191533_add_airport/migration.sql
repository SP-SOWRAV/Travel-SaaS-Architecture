-- CreateTable
CREATE TABLE "airports" (
    "id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "iata_code" CHAR(3) NOT NULL,
    "icao_code" CHAR(4),
    "name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "airports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "airports_iata_code_key" ON "airports"("iata_code");

-- CreateIndex
CREATE INDEX "airports_city_id_idx" ON "airports"("city_id");

-- CreateIndex
CREATE INDEX "airports_icao_code_idx" ON "airports"("icao_code");

-- AddForeignKey
ALTER TABLE "airports" ADD CONSTRAINT "airports_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
