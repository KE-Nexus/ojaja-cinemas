-- CreateTable
CREATE TABLE "PosConcessionSale" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,
    "staffSessionId" TEXT,
    "paymentMethod" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosConcessionSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosConcessionSaleLine" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "posItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priceAtBooking" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PosConcessionSaleLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosConcessionSale_branchId_idx" ON "PosConcessionSale"("branchId");

-- CreateIndex
CREATE INDEX "PosConcessionSale_cashierId_idx" ON "PosConcessionSale"("cashierId");

-- CreateIndex
CREATE INDEX "PosConcessionSaleLine_saleId_idx" ON "PosConcessionSaleLine"("saleId");

-- AddForeignKey
ALTER TABLE "PosConcessionSale" ADD CONSTRAINT "PosConcessionSale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosConcessionSale" ADD CONSTRAINT "PosConcessionSale_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosConcessionSale" ADD CONSTRAINT "PosConcessionSale_staffSessionId_fkey" FOREIGN KEY ("staffSessionId") REFERENCES "StaffSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosConcessionSaleLine" ADD CONSTRAINT "PosConcessionSaleLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "PosConcessionSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosConcessionSaleLine" ADD CONSTRAINT "PosConcessionSaleLine_posItemId_fkey" FOREIGN KEY ("posItemId") REFERENCES "PosItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
