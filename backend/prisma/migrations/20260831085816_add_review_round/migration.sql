-- CreateEnum
CREATE TYPE "ReviewRoundStatus" AS ENUM ('DRAFT', 'REVIEWING', 'APPROVED', 'CLOSED');

-- CreateTable
CREATE TABLE "ReviewRound" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ReviewRoundStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewRound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewRound_projectId_idx" ON "ReviewRound"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRound_projectId_version_key" ON "ReviewRound"("projectId", "version");

-- AddForeignKey
ALTER TABLE "ReviewRound" ADD CONSTRAINT "ReviewRound_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
