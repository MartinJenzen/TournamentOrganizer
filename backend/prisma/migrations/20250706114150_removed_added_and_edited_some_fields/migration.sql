/*
  Warnings:

  - The values [Group Stage,Knockout] on the enum `TournamentType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `stageType` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `groupStageTeams` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `hasGroupStage` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `hasKnockoutStage` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `knockoutRounds` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `leagueTeams` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `numberOfGroups` on the `Tournament` table. All the data in the column will be lost.
  - Added the required column `stage` to the `Match` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TournamentStage" AS ENUM ('League', 'Group', 'Knockout');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "KnockoutRound" ADD VALUE 'Round of 64';
ALTER TYPE "KnockoutRound" ADD VALUE 'Round of 32';

-- AlterEnum
BEGIN;
CREATE TYPE "TournamentType_new" AS ENUM ('League', 'Group and Knockout', 'Cup');
ALTER TABLE "Tournament" ALTER COLUMN "type" TYPE "TournamentType_new" USING ("type"::text::"TournamentType_new");
ALTER TYPE "TournamentType" RENAME TO "TournamentType_old";
ALTER TYPE "TournamentType_new" RENAME TO "TournamentType";
DROP TYPE "TournamentType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Match" DROP COLUMN "stageType",
ADD COLUMN     "stage" "TournamentStage" NOT NULL,
ALTER COLUMN "homeScore" SET DEFAULT 0,
ALTER COLUMN "awayScore" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Tournament" DROP COLUMN "groupStageTeams",
DROP COLUMN "hasGroupStage",
DROP COLUMN "hasKnockoutStage",
DROP COLUMN "knockoutRounds",
DROP COLUMN "leagueTeams",
DROP COLUMN "numberOfGroups",
ADD COLUMN     "groupsCount" INTEGER DEFAULT 0,
ADD COLUMN     "knockoutRound" "KnockoutRound",
ADD COLUMN     "stage" "TournamentStage" NOT NULL DEFAULT 'League',
ADD COLUMN     "teamsCount" INTEGER DEFAULT 0,
ALTER COLUMN "matchesPerTeam" SET DEFAULT 0,
ALTER COLUMN "topTeamsAdvancing" SET DEFAULT 0,
ALTER COLUMN "knockoutLegs" SET DEFAULT 0;

-- DropEnum
DROP TYPE "StageType";
