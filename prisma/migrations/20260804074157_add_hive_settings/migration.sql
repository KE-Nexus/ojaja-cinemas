-- CreateEnum
CREATE TYPE "BranchImageKind" AS ENUM ('PROMOTIONAL', 'GALLERY');

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "aboutUs" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "useFilmSchedule" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "BranchImage" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "kind" "BranchImageKind" NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BranchImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BranchImage_branchId_kind_idx" ON "BranchImage"("branchId", "kind");

-- AddForeignKey
ALTER TABLE "BranchImage" ADD CONSTRAINT "BranchImage_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
