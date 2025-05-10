/*
  Warnings:

  - You are about to drop the column `reflection` on the `Conversation` table. All the data in the column will be lost.
  - Added the required column `elapsedSeconds` to the `ReflectionMessage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "reflection",
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "reflectionCompleted" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "ReflectionMessage" ADD COLUMN     "elapsedSeconds" INTEGER NOT NULL;
