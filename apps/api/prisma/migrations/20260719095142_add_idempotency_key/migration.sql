-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "status_code" INTEGER NOT NULL,
    "response_body" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_tenant_id_key_key" ON "idempotency_keys"("tenant_id", "key");

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
