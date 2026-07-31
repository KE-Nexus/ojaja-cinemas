-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'DRIVER';

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleClaim" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "claimId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Claim_key_key" ON "Claim"("key");

-- CreateIndex
CREATE INDEX "RoleClaim_role_idx" ON "RoleClaim"("role");

-- CreateIndex
CREATE UNIQUE INDEX "RoleClaim_role_claimId_key" ON "RoleClaim"("role", "claimId");

-- AddForeignKey
ALTER TABLE "RoleClaim" ADD CONSTRAINT "RoleClaim_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
