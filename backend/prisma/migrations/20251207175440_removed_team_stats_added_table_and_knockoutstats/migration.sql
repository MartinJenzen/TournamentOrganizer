/*
  Warnings:

  - You are about to drop the column `knockoutStatsId` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `tableStatsId` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `totalStatsId` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the `TeamStats` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_knockoutStatsId_fkey";

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_tableStatsId_fkey";

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_totalStatsId_fkey";

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "knockoutStatsId",
DROP COLUMN "tableStatsId",
DROP COLUMN "totalStatsId",
ADD COLUMN     "kDraws" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kGamesPlayed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kGoalDifference" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kGoalsAgainst" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kGoalsFor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kLosses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kWins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tDraws" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tGamesPlayed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tGoalDifference" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tGoalsAgainst" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tGoalsFor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tLosses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tPosition" INTEGER,
ADD COLUMN     "tWins" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "TeamStats";
