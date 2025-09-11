/*
  Warnings:

  - You are about to drop the column `date` on the `Match` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Match" DROP COLUMN "date",
ADD COLUMN     "matchDay" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "played" BOOLEAN NOT NULL DEFAULT false;
