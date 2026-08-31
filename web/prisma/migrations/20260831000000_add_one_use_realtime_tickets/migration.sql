CREATE TABLE "RealtimeTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jtiHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RealtimeTicket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RealtimeTicket_jtiHash_key" ON "RealtimeTicket"("jtiHash");
CREATE INDEX "RealtimeTicket_userId_consumedAt_idx" ON "RealtimeTicket"("userId", "consumedAt");
CREATE INDEX "RealtimeTicket_expiresAt_idx" ON "RealtimeTicket"("expiresAt");
ALTER TABLE "RealtimeTicket" ADD CONSTRAINT "RealtimeTicket_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
