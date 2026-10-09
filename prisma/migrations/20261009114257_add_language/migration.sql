-- CreateTable
CREATE TABLE "Language" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Language_name_key" ON "Language"("name");

-- Seed with the languages every showtime/scheduling form already hardcoded, so switching
-- those forms over to this table doesn't remove any option admins were relying on.
INSERT INTO "Language" (id, name, "isActive", "createdAt") VALUES
    (md5(random()::text || clock_timestamp()::text || 'English'), 'English', true, CURRENT_TIMESTAMP),
    (md5(random()::text || clock_timestamp()::text || 'Yoruba'), 'Yoruba', true, CURRENT_TIMESTAMP),
    (md5(random()::text || clock_timestamp()::text || 'Igbo'), 'Igbo', true, CURRENT_TIMESTAMP),
    (md5(random()::text || clock_timestamp()::text || 'Hausa'), 'Hausa', true, CURRENT_TIMESTAMP),
    (md5(random()::text || clock_timestamp()::text || 'Pidgin'), 'Pidgin', true, CURRENT_TIMESTAMP),
    (md5(random()::text || clock_timestamp()::text || 'French'), 'French', true, CURRENT_TIMESTAMP);
