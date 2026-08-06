-- CreateEnum
CREATE TYPE "ShowtimeStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "Showtime" ADD COLUMN     "cleanupTimeMins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "endTime" TIMESTAMP(3),
ADD COLUMN     "priceCardId" TEXT,
ADD COLUMN     "status" "ShowtimeStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "trailerDurationMins" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Showtime" ADD CONSTRAINT "Showtime_priceCardId_fkey" FOREIGN KEY ("priceCardId") REFERENCES "PriceCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
