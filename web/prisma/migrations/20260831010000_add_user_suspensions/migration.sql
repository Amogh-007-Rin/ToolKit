ALTER TABLE "User" ADD COLUMN "suspendedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "suspensionReason" TEXT;
CREATE INDEX "User_suspendedAt_idx" ON "User"("suspendedAt");
