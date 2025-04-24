/*
  Warnings:

  - Added the required column `orderIndex` to the `Conversation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prompt` to the `Conversation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `response` to the `Conversation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `Conversation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `topic` to the `Conversation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `triggerType` to the `Conversation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Conversation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "expected" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "orderIndex" INTEGER NOT NULL,
ADD COLUMN     "prompt" TEXT NOT NULL,
ADD COLUMN     "response" TEXT NOT NULL,
ADD COLUMN     "role" TEXT NOT NULL,
ADD COLUMN     "topic" TEXT NOT NULL,
ADD COLUMN     "triggerType" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Scenario" ADD COLUMN     "accompaniedBy" TEXT NOT NULL DEFAULT '未知',
ADD COLUMN     "diagnosis" TEXT NOT NULL DEFAULT '未填寫',
ADD COLUMN     "estimatedDuration" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN     "keyTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "orderNPO" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "patientAge" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "patientName" TEXT NOT NULL DEFAULT '暫無',
ADD COLUMN     "triggerStatements" TEXT[] DEFAULT ARRAY[]::TEXT[];
