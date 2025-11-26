-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "tieId" INTEGER;

-- CreateTable
CREATE TABLE "Tie" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tie_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tieId_fkey" FOREIGN KEY ("tieId") REFERENCES "Tie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tie" ADD CONSTRAINT "Tie_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
