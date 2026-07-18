-- CreateEnum
CREATE TYPE "settings_theme" AS ENUM ('light', 'dark', 'system');

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "legal_name" VARCHAR(255),
    "logo_url" VARCHAR(500),
    "theme" "settings_theme" NOT NULL DEFAULT 'system',
    "currency_code" CHAR(3) NOT NULL DEFAULT 'USD',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "invoice_prefix" VARCHAR(10) NOT NULL DEFAULT 'INV-',
    "ticket_prefix" VARCHAR(10) NOT NULL DEFAULT 'TKT-',
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(30),
    "address_line1" VARCHAR(255),
    "address_line2" VARCHAR(255),
    "city_id" UUID,
    "country_id" UUID,
    "postal_code" VARCHAR(20),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "settings_tenant_id_key" ON "settings"("tenant_id");

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
