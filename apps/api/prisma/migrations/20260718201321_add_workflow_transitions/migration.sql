-- CreateTable
CREATE TABLE "workflow_transitions" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "from_stage" "booking_status",
    "to_stage" "booking_status" NOT NULL,
    "actor_id" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_transitions_booking_id_idx" ON "workflow_transitions"("booking_id");

-- CreateIndex
CREATE INDEX "workflow_transitions_booking_id_created_at_idx" ON "workflow_transitions"("booking_id", "created_at");

-- AddForeignKey
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
