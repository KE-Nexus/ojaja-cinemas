-- CreateEnum
CREATE TYPE "StaffSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('CUSTOMER', 'TICKETER', 'ACCOUNTANT', 'SUPERVISOR', 'TECHNICIAN', 'AUDITOR', 'CIRCUIT_ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
COMMIT;

-- DropForeignKey
ALTER TABLE "BookingConcession" DROP CONSTRAINT "BookingConcession_concessionItemId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pinHash" TEXT,
ADD COLUMN     "staffNumber" TEXT;

-- AlterTable
ALTER TABLE "Movie" ADD COLUMN     "distributor" TEXT;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "processedById" TEXT;

-- AlterTable
ALTER TABLE "BookingConcession" DROP COLUMN "concessionItemId",
ADD COLUMN     "posItemId" TEXT NOT NULL;

-- DropTable
DROP TABLE "ConcessionItem";

-- CreateTable
CREATE TABLE "FilmContract" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "contractStartDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilmContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketClass" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "defaultPrice" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosItem" (
    "id" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "itemClass" TEXT NOT NULL,
    "itemGroup" TEXT NOT NULL,
    "defaultPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterShift" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RosterShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffSession" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "status" "StaffSessionStatus" NOT NULL DEFAULT 'OPEN',
    "actualCard" DOUBLE PRECISION,
    "actualCash" DOUBLE PRECISION,
    "actualTransfer" DOUBLE PRECISION,
    "actualVoucher" DOUBLE PRECISION,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,

    CONSTRAINT "StaffSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FilmContract_branchId_idx" ON "FilmContract"("branchId");

-- CreateIndex
CREATE INDEX "FilmContract_movieId_idx" ON "FilmContract"("movieId");

-- CreateIndex
CREATE INDEX "TicketClass_branchId_idx" ON "TicketClass"("branchId");

-- CreateIndex
CREATE INDEX "PosItem_branchId_idx" ON "PosItem"("branchId");

-- CreateIndex
CREATE INDEX "RosterShift_branchId_date_idx" ON "RosterShift"("branchId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RosterShift_staffId_date_key" ON "RosterShift"("staffId", "date");

-- CreateIndex
CREATE INDEX "StaffSession_branchId_idx" ON "StaffSession"("branchId");

-- CreateIndex
CREATE INDEX "StaffSession_staffId_idx" ON "StaffSession"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "User_staffNumber_key" ON "User"("staffNumber");

-- CreateIndex
CREATE INDEX "User_branchId_idx" ON "User"("branchId");

-- CreateIndex
CREATE INDEX "Booking_processedById_idx" ON "Booking"("processedById");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingConcession" ADD CONSTRAINT "BookingConcession_posItemId_fkey" FOREIGN KEY ("posItemId") REFERENCES "PosItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmContract" ADD CONSTRAINT "FilmContract_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmContract" ADD CONSTRAINT "FilmContract_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketClass" ADD CONSTRAINT "TicketClass_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosItem" ADD CONSTRAINT "PosItem_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterShift" ADD CONSTRAINT "RosterShift_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterShift" ADD CONSTRAINT "RosterShift_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSession" ADD CONSTRAINT "StaffSession_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSession" ADD CONSTRAINT "StaffSession_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSession" ADD CONSTRAINT "StaffSession_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

