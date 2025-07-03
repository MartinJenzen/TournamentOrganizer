/*
  Warnings:

  - The values [GOAL,ASSIST] on the enum `EventType` will be removed. If these variants are still used in the database, this will fail.
  - The values [LEAGUE,KNOCKOUT,GROUP_STAGE,CUP] on the enum `TournamentType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `group` on the `Team` table. All the data in the column will be lost.
  - Added the required column `stageType` to the `Match` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('In Progress', 'Completed');

-- CreateEnum
CREATE TYPE "StageType" AS ENUM ('League', 'Group Stage', 'Knockout');

-- CreateEnum
CREATE TYPE "KnockoutRound" AS ENUM ('Round of 16', 'Quarter-finals', 'Semi-finals', 'Final');

-- AlterEnum
BEGIN;
CREATE TYPE "EventType_new" AS ENUM ('Goal', 'Assist');
ALTER TABLE "MatchEvent" ALTER COLUMN "type" TYPE "EventType_new" USING ("type"::text::"EventType_new");
ALTER TYPE "EventType" RENAME TO "EventType_old";
ALTER TYPE "EventType_new" RENAME TO "EventType";
DROP TYPE "EventType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TournamentType_new" AS ENUM ('League', 'Group Stage', 'Knockout', 'Cup');
ALTER TABLE "Tournament" ALTER COLUMN "type" TYPE "TournamentType_new" USING ("type"::text::"TournamentType_new");
ALTER TYPE "TournamentType" RENAME TO "TournamentType_old";
ALTER TYPE "TournamentType_new" RENAME TO "TournamentType";
DROP TYPE "TournamentType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "knockoutRound" "KnockoutRound",
ADD COLUMN     "stageType" "StageType" NOT NULL;

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "group",
ADD COLUMN     "groupId" INTEGER,
ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "numberOfGroups" INTEGER DEFAULT 2,
ADD COLUMN     "status" "TournamentStatus" NOT NULL DEFAULT 'In Progress',
ADD COLUMN     "winnerTeam" TEXT,
ADD COLUMN     "winnerUserId" INTEGER,
ALTER COLUMN "groupStageTeams" SET DEFAULT 8;

-- CreateTable
CREATE TABLE "Group" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(1) NOT NULL,
    "tournamentId" INTEGER NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_InlistedTournaments" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_InlistedTournaments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_InlistedTournaments_B_index" ON "_InlistedTournaments"("B");

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_winnerUserId_fkey" FOREIGN KEY ("winnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InlistedTournaments" ADD CONSTRAINT "_InlistedTournaments_A_fkey" FOREIGN KEY ("A") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InlistedTournaments" ADD CONSTRAINT "_InlistedTournaments_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
