-- DropIndex
DROP INDEX "Movie_tmdbId_key";

-- AlterTable
ALTER TABLE "Movie" DROP COLUMN "tmdbId",
ADD COLUMN     "everyFilmId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Movie_everyFilmId_key" ON "Movie"("everyFilmId");
