-- CreateTable
CREATE TABLE "PriceCard" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "days" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceCardTicket" (
    "id" TEXT NOT NULL,
    "priceCardId" TEXT NOT NULL,
    "ticketClassId" TEXT NOT NULL,

    CONSTRAINT "PriceCardTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceCard_branchId_idx" ON "PriceCard"("branchId");

-- CreateIndex
CREATE INDEX "PriceCardTicket_priceCardId_idx" ON "PriceCardTicket"("priceCardId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceCardTicket_priceCardId_ticketClassId_key" ON "PriceCardTicket"("priceCardId", "ticketClassId");

-- AddForeignKey
ALTER TABLE "PriceCard" ADD CONSTRAINT "PriceCard_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceCardTicket" ADD CONSTRAINT "PriceCardTicket_priceCardId_fkey" FOREIGN KEY ("priceCardId") REFERENCES "PriceCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceCardTicket" ADD CONSTRAINT "PriceCardTicket_ticketClassId_fkey" FOREIGN KEY ("ticketClassId") REFERENCES "TicketClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
