-- CreateEnum
CREATE TYPE "agency_status" AS ENUM ('trial', 'active', 'suspended');

-- CreateTable
CREATE TABLE "agencies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" "agency_status" NOT NULL DEFAULT 'trial',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);
