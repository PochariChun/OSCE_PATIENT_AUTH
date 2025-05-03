/*
  Warnings:

  - You are about to drop the `_MessageToScoringItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_MessageToScoringItem" DROP CONSTRAINT "_MessageToScoringItem_A_fkey";

-- DropForeignKey
ALTER TABLE "_MessageToScoringItem" DROP CONSTRAINT "_MessageToScoringItem_B_fkey";

-- DropTable
DROP TABLE "_MessageToScoringItem";

-- CreateTable
CREATE TABLE "_MessageToScoringItems" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_MessageToScoringItems_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_MessageToScoringItems_B_index" ON "_MessageToScoringItems"("B");

-- AddForeignKey
ALTER TABLE "_MessageToScoringItems" ADD CONSTRAINT "_MessageToScoringItems_A_fkey" FOREIGN KEY ("A") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MessageToScoringItems" ADD CONSTRAINT "_MessageToScoringItems_B_fkey" FOREIGN KEY ("B") REFERENCES "ScoringItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
