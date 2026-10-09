-- AlterTable
ALTER TABLE "Movie" ADD COLUMN "distributorId" TEXT;

-- Backfill: turn each distinct free-text distributor name already on a Movie into a real
-- Distributor row (email/phone left blank — an admin can fill them in from the new module),
-- then point the movie at it before the old text column is dropped.
INSERT INTO "Distributor" (id, name, email, phone, "createdAt")
SELECT md5(random()::text || clock_timestamp()::text || name), name, '', '', CURRENT_TIMESTAMP
FROM (SELECT DISTINCT trim(distributor) AS name FROM "Movie" WHERE distributor IS NOT NULL AND trim(distributor) <> '') AS d;

UPDATE "Movie" m
SET "distributorId" = dist.id
FROM "Distributor" dist
WHERE m.distributor IS NOT NULL AND trim(m.distributor) <> '' AND trim(m.distributor) = dist.name;

-- AlterTable
ALTER TABLE "Movie" DROP COLUMN "distributor";

-- CreateIndex
CREATE INDEX "Movie_distributorId_idx" ON "Movie"("distributorId");

-- AddForeignKey
ALTER TABLE "Movie" ADD CONSTRAINT "Movie_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
