/*
  Warnings:

  - You are about to drop the column `ScoringId` on the `Message` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_ScoringId_fkey";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "ScoringId";

-- CreateTable
CREATE TABLE "_MessageToScoringItem" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_MessageToScoringItem_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_MessageToScoringItem_B_index" ON "_MessageToScoringItem"("B");

-- AddForeignKey
ALTER TABLE "_MessageToScoringItem" ADD CONSTRAINT "_MessageToScoringItem_A_fkey" FOREIGN KEY ("A") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MessageToScoringItem" ADD CONSTRAINT "_MessageToScoringItem_B_fkey" FOREIGN KEY ("B") REFERENCES "ScoringItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
