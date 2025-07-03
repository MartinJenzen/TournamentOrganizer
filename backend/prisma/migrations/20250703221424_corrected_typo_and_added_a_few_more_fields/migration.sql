/*
  Warnings:

  - You are about to drop the `_InlistedTournaments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_InlistedTournaments" DROP CONSTRAINT "_InlistedTournaments_A_fkey";

-- DropForeignKey
ALTER TABLE "_InlistedTournaments" DROP CONSTRAINT "_InlistedTournaments_B_fkey";

-- DropTable
DROP TABLE "_InlistedTournaments";

-- CreateTable
CREATE TABLE "_ManagedTournaments" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ManagedTournaments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EnlistedTournaments" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_EnlistedTournaments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ManagedTournaments_B_index" ON "_ManagedTournaments"("B");

-- CreateIndex
CREATE INDEX "_EnlistedTournaments_B_index" ON "_EnlistedTournaments"("B");

-- AddForeignKey
ALTER TABLE "_ManagedTournaments" ADD CONSTRAINT "_ManagedTournaments_A_fkey" FOREIGN KEY ("A") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ManagedTournaments" ADD CONSTRAINT "_ManagedTournaments_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EnlistedTournaments" ADD CONSTRAINT "_EnlistedTournaments_A_fkey" FOREIGN KEY ("A") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EnlistedTournaments" ADD CONSTRAINT "_EnlistedTournaments_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
