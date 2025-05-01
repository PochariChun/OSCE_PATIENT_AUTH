-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "nickname" TEXT,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'nurse',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "overtime" BOOLEAN NOT NULL DEFAULT false,
    "reflection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scenarioId" INTEGER,
    "score" INTEGER,
    "role" TEXT NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "sender" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "elapsedSeconds" INTEGER NOT NULL,
    "delayFromPrev" INTEGER,
    "isDelayed" BOOLEAN,
    "isCorrect" BOOLEAN,
    "emotionLabel" TEXT,
    "emotionScore" DOUBLE PRECISION,
    "audioUrl" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReflectionMessage" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "sender" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceNodeId" TEXT,
    "strategyTag" TEXT,

    CONSTRAINT "ReflectionMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scenarioCode" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "patientName" TEXT NOT NULL DEFAULT '暫無',
    "patientAge" INTEGER NOT NULL DEFAULT 0,
    "diagnosis" TEXT NOT NULL DEFAULT '未填寫',
    "accompaniedBy" TEXT NOT NULL DEFAULT '未知',
    "orderNPO" BOOLEAN NOT NULL DEFAULT false,
    "triggerStatements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keyTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimatedDuration" INTEGER NOT NULL DEFAULT 8,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringItem" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "achieved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ScoringItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringItemMessage" (
    "id" SERIAL NOT NULL,
    "scoringItemId" INTEGER NOT NULL,
    "messageId" INTEGER NOT NULL,

    CONSTRAINT "ScoringItemMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Scenario_scenarioCode_key" ON "Scenario"("scenarioCode");

-- CreateIndex
CREATE INDEX "ScoringItem_conversationId_idx" ON "ScoringItem"("conversationId");

-- CreateIndex
CREATE INDEX "ScoringItem_code_idx" ON "ScoringItem"("code");

-- CreateIndex
CREATE INDEX "ScoringItem_achieved_idx" ON "ScoringItem"("achieved");

-- CreateIndex
CREATE INDEX "ScoringItemMessage_scoringItemId_idx" ON "ScoringItemMessage"("scoringItemId");

-- CreateIndex
CREATE INDEX "ScoringItemMessage_messageId_idx" ON "ScoringItemMessage"("messageId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReflectionMessage" ADD CONSTRAINT "ReflectionMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringItem" ADD CONSTRAINT "ScoringItem_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringItemMessage" ADD CONSTRAINT "ScoringItemMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringItemMessage" ADD CONSTRAINT "ScoringItemMessage_scoringItemId_fkey" FOREIGN KEY ("scoringItemId") REFERENCES "ScoringItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
