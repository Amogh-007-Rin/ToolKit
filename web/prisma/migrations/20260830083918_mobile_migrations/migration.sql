-- DropForeignKey
ALTER TABLE "DeviceRegistration" DROP CONSTRAINT "DeviceRegistration_userId_fkey";

-- AddForeignKey
ALTER TABLE "DeviceRegistration" ADD CONSTRAINT "DeviceRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
