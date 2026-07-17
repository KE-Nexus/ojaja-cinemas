-- AlterTable
ALTER TABLE "Movie" ADD COLUMN "tmdbId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "Movie"("tmdbId");
