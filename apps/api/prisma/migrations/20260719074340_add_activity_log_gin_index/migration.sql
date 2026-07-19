-- CreateIndex
CREATE INDEX "activity_logs_metadata_idx" ON "activity_logs" USING GIN ("metadata");
