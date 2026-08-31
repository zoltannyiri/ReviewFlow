-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "reviewRoundId" TEXT NOT NULL,
    "reviewLinkId" TEXT,
    "comment" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "tagName" TEXT NOT NULL,
    "reviewElementId" TEXT,
    "elementId" TEXT,
    "elementText" TEXT,
    "viewportWidth" INTEGER NOT NULL,
    "viewportHeight" INTEGER NOT NULL,
    "elementX" DOUBLE PRECISION NOT NULL,
    "elementY" DOUBLE PRECISION NOT NULL,
    "elementWidth" DOUBLE PRECISION NOT NULL,
    "elementHeight" DOUBLE PRECISION NOT NULL,
    "status" "CommentStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_reviewRoundId_idx" ON "Comment"("reviewRoundId");

-- CreateIndex
CREATE INDEX "Comment_reviewLinkId_idx" ON "Comment"("reviewLinkId");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_reviewRoundId_fkey" FOREIGN KEY ("reviewRoundId") REFERENCES "ReviewRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_reviewLinkId_fkey" FOREIGN KEY ("reviewLinkId") REFERENCES "ReviewLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
