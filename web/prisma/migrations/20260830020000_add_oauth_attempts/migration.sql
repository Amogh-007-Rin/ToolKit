CREATE TABLE "OAuthAttempt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "stateHash" TEXT NOT NULL UNIQUE,
  "provider" TEXT NOT NULL,
  "redirectUri" TEXT NOT NULL,
  "verifier" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "OAuthAttempt_expiresAt_idx" ON "OAuthAttempt"("expiresAt");
