ALTER TABLE "User"
ADD COLUMN "notifyFollows" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyLikes" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyComments" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Notification"
ADD COLUMN "commentId" TEXT;

CREATE INDEX "Notification_userId_type_idx" ON "Notification"("userId", "type");
CREATE INDEX "Notification_commentId_idx" ON "Notification"("commentId");
