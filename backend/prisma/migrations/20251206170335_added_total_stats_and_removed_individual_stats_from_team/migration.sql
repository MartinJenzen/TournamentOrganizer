/*
  Warnings:

  - You are about to drop the column `draws` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `gamesPlayed` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `goalDifference` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `goalsAgainst` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `goalsFor` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `losses` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `points` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `wins` on the `Team` table. All the data in the column will be lost.
  - Added the required column `teamId` to the `TeamStats` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Team" DROP COLUMN "draws",
DROP COLUMN "gamesPlayed",
DROP COLUMN "goalDifference",
DROP COLUMN "goalsAgainst",
DROP COLUMN "goalsFor",
DROP COLUMN "losses",
DROP COLUMN "points",
DROP COLUMN "position",
DROP COLUMN "wins",
ADD COLUMN     "totalStatsId" INTEGER;

-- AlterTable
ALTER TABLE "TeamStats" ADD COLUMN     "position" INTEGER,
ADD COLUMN     "teamId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_totalStatsId_fkey" FOREIGN KEY ("totalStatsId") REFERENCES "TeamStats"("id") ON DELETE SET NULL ON UPDATE CASCADE;
