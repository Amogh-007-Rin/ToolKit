ALTER TABLE "Collection" ADD COLUMN "importedFromId" TEXT;

CREATE UNIQUE INDEX "Collection_userId_importedFromId_key"
ON "Collection"("userId", "importedFromId");
