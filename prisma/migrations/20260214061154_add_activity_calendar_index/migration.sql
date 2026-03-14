-- CreateIndex
CREATE INDEX "Activity_ownerId_date_startTime_idx" ON "Activity"("ownerId", "date", "startTime");
