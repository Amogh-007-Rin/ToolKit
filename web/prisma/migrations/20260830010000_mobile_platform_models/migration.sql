CREATE TYPE "AccessRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'ACTIONED', 'DISMISSED', 'APPEALED');

ALTER TABLE "User" ADD COLUMN "accessRole" "AccessRole" NOT NULL DEFAULT 'USER',
ADD COLUMN "emailVerificationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "hiddenAt" TIMESTAMP(3), ADD COLUMN "deletionScheduledAt" TIMESTAMP(3),
ADD COLUMN "notifyMessages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifySocial" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "pushPreview" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "AuthToken" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "kind" TEXT NOT NULL, "tokenHash" TEXT NOT NULL UNIQUE, "expiresAt" TIMESTAMP(3) NOT NULL, "usedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "AuthToken_userId_kind_idx" ON "AuthToken"("userId", "kind");
CREATE INDEX "AuthToken_expiresAt_idx" ON "AuthToken"("expiresAt");

CREATE TABLE "DeviceRegistration" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE, "expoToken" TEXT NOT NULL UNIQUE, "platform" TEXT NOT NULL, "appVersion" TEXT NOT NULL, "locale" TEXT NOT NULL DEFAULT 'en', "enabled" BOOLEAN NOT NULL DEFAULT true, "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "DeviceRegistration_userId_enabled_idx" ON "DeviceRegistration"("userId", "enabled");

CREATE TABLE "IdempotencyRecord" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "key" TEXT NOT NULL, "operation" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "statusCode" INTEGER NOT NULL, "response" JSONB NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("userId", "key", "operation"));
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

CREATE TABLE "Block" ("id" TEXT PRIMARY KEY, "blockerId" TEXT NOT NULL, "blockedId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("blockerId", "blockedId"));
CREATE INDEX "Block_blockedId_idx" ON "Block"("blockedId");

CREATE TABLE "Report" ("id" TEXT PRIMARY KEY, "reporterId" TEXT NOT NULL, "targetType" TEXT NOT NULL, "targetId" TEXT NOT NULL, "reason" TEXT NOT NULL, "description" TEXT, "evidence" JSONB NOT NULL, "status" "ReportStatus" NOT NULL DEFAULT 'OPEN', "assignedToId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

CREATE TABLE "ModerationAction" ("id" TEXT PRIMARY KEY, "reportId" TEXT, "moderatorId" TEXT NOT NULL, "action" TEXT NOT NULL, "targetType" TEXT NOT NULL, "targetId" TEXT NOT NULL, "reason" TEXT NOT NULL, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "ModerationAction_reportId_idx" ON "ModerationAction"("reportId");
CREATE INDEX "ModerationAction_moderatorId_createdAt_idx" ON "ModerationAction"("moderatorId", "createdAt");

CREATE TABLE "ConsentRecord" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "document" TEXT NOT NULL, "version" TEXT NOT NULL, "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("userId", "document", "version"));
CREATE TABLE "NotificationOutbox" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "eventType" TEXT NOT NULL, "payload" JSONB NOT NULL, "dedupeKey" TEXT NOT NULL UNIQUE, "attempts" INTEGER NOT NULL DEFAULT 0, "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "deliveredAt" TIMESTAMP(3), "lastError" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "NotificationOutbox_deliveredAt_availableAt_idx" ON "NotificationOutbox"("deliveredAt", "availableAt");
CREATE TABLE "PushReceipt" ("id" TEXT PRIMARY KEY, "outboxId" TEXT NOT NULL, "deviceId" TEXT NOT NULL, "ticketId" TEXT, "status" TEXT NOT NULL, "errorCode" TEXT, "checkedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("outboxId", "deviceId"));
CREATE INDEX "PushReceipt_ticketId_idx" ON "PushReceipt"("ticketId");
