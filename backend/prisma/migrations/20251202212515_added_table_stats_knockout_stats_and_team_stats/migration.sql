-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "knockoutStatsId" INTEGER,
ADD COLUMN     "tableStatsId" INTEGER;

-- CreateTable
CREATE TABLE "TeamStats" (
    "id" SERIAL NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "goalsFor" INTEGER NOT NULL DEFAULT 0,
    "goalsAgainst" INTEGER NOT NULL DEFAULT 0,
    "goalDifference" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TeamStats_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_tableStatsId_fkey" FOREIGN KEY ("tableStatsId") REFERENCES "TeamStats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_knockoutStatsId_fkey" FOREIGN KEY ("knockoutStatsId") REFERENCES "TeamStats"("id") ON DELETE SET NULL ON UPDATE CASCADE;
