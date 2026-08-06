/*
  Warnings:

  - You are about to drop the column `className` on the `TicketClass` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TicketClassKind" AS ENUM ('STANDARD', 'PACKAGE');

-- AlterTable
ALTER TABLE "TicketClass" DROP COLUMN "className",
ADD COLUMN     "isComplementary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLoyaltyTicket" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" "TicketClassKind" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "salesSources" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "salesTaxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "seatClass" "SeatCategory";

-- CreateTable
CREATE TABLE "TicketPackageLine" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "ticketClassId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "TicketPackageLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketPackageItemLine" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "posItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "TicketPackageItemLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketPackageLine_packageId_idx" ON "TicketPackageLine"("packageId");

-- CreateIndex
CREATE INDEX "TicketPackageItemLine_packageId_idx" ON "TicketPackageItemLine"("packageId");

-- AddForeignKey
ALTER TABLE "TicketPackageLine" ADD CONSTRAINT "TicketPackageLine_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TicketClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPackageLine" ADD CONSTRAINT "TicketPackageLine_ticketClassId_fkey" FOREIGN KEY ("ticketClassId") REFERENCES "TicketClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPackageItemLine" ADD CONSTRAINT "TicketPackageItemLine_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TicketClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPackageItemLine" ADD CONSTRAINT "TicketPackageItemLine_posItemId_fkey" FOREIGN KEY ("posItemId") REFERENCES "PosItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
