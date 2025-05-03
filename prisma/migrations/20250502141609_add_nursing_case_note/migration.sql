-- CreateTable
CREATE TABLE "NursingCaseNote" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "rawText" TEXT NOT NULL,
    "matchedCodes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NursingCaseNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NursingCaseNote_conversationId_key" ON "NursingCaseNote"("conversationId");

-- AddForeignKey
ALTER TABLE "NursingCaseNote" ADD CONSTRAINT "NursingCaseNote_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
