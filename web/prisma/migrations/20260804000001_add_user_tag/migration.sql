ALTER TABLE "User" ADD COLUMN "tag" TEXT;

CREATE UNIQUE INDEX "User_tag_key" ON "User"("tag");
