-- CreateTable
CREATE TABLE "airlines" (
    "id" UUID NOT NULL,
    "iata_code" CHAR(2) NOT NULL,
    "icao_code" CHAR(3),
    "name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "airlines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "airlines_iata_code_key" ON "airlines"("iata_code");

-- CreateIndex
CREATE INDEX "airlines_name_idx" ON "airlines"("name");
