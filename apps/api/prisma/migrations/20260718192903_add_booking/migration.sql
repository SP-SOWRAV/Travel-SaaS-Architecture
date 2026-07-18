-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('draft', 'reserved', 'ticket_issued', 'invoiced', 'paid', 'completed', 'refunded', 'cancelled');

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "booking_reference" VARCHAR(30) NOT NULL,
    "customer_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "status" "booking_status" NOT NULL DEFAULT 'draft',
    "currency_code" CHAR(3) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookings_tenant_id_idx" ON "bookings"("tenant_id");

-- CreateIndex
CREATE INDEX "bookings_tenant_id_status_idx" ON "bookings"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "bookings_tenant_id_customer_id_idx" ON "bookings"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "bookings_tenant_id_created_at_idx" ON "bookings"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_tenant_id_booking_reference_key" ON "bookings"("tenant_id", "booking_reference");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
