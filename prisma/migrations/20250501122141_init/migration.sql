/*
  Warnings:

  - You are about to drop the column `role` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `achieved` on the `ScoringItem` table. All the data in the column will be lost.
  - You are about to drop the column `conversationId` on the `ScoringItem` table. All the data in the column will be lost.
  - You are about to drop the `ScoringItemMessage` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[code]` on the table `ScoringItem` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "ScoringItem" DROP CONSTRAINT "ScoringItem_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "ScoringItemMessage" DROP CONSTRAINT "ScoringItemMessage_messageId_fkey";

-- DropForeignKey
ALTER TABLE "ScoringItemMessage" DROP CONSTRAINT "ScoringItemMessage_scoringItemId_fkey";

-- DropIndex
DROP INDEX "ScoringItem_achieved_idx";

-- DropIndex
DROP INDEX "ScoringItem_code_idx";

-- DropIndex
DROP INDEX "ScoringItem_conversationId_idx";

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "role";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "ScoringId" INTEGER,
ADD COLUMN     "tag" TEXT;

-- AlterTable
ALTER TABLE "ScoringItem" DROP COLUMN "achieved",
DROP COLUMN "conversationId";

-- DropTable
DROP TABLE "ScoringItemMessage";

-- CreateIndex
CREATE UNIQUE INDEX "ScoringItem_code_key" ON "ScoringItem"("code");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_ScoringId_fkey" FOREIGN KEY ("ScoringId") REFERENCES "ScoringItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
