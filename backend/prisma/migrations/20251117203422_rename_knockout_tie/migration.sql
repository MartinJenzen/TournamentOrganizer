/*
  Warnings:

  - You are about to drop the column `tieId` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the `Tie` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_tieId_fkey";

-- DropForeignKey
ALTER TABLE "Tie" DROP CONSTRAINT "Tie_tournamentId_fkey";

-- AlterTable
ALTER TABLE "Match" DROP COLUMN "tieId",
ADD COLUMN     "knockoutTieId" INTEGER;

-- DropTable
DROP TABLE "Tie";

-- CreateTable
CREATE TABLE "KnockoutTie" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnockoutTie_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_knockoutTieId_fkey" FOREIGN KEY ("knockoutTieId") REFERENCES "KnockoutTie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnockoutTie" ADD CONSTRAINT "KnockoutTie_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
