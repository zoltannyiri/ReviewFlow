-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'ON_HOLD', 'DONE');

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "projectId" TEXT NOT NULL,
    "reviewRoundId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Task_commentId_key" ON "Task"("commentId");

-- CreateIndex
CREATE INDEX "Task_reviewRoundId_status_idx" ON "Task"("reviewRoundId", "status");

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_reviewRoundId_fkey" FOREIGN KEY ("reviewRoundId") REFERENCES "ReviewRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing comments to Task
INSERT INTO "Task" ("id", "projectId", "reviewRoundId", "commentId", "title", "status", "position", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text AS "id",
    rr."projectId" AS "projectId",
    c."reviewRoundId" AS "reviewRoundId",
    c."id" AS "commentId",
    c."comment" AS "title",
    CASE 
        WHEN c."status" = 'RESOLVED' THEN 'DONE'::"TaskStatus"
        ELSE 'TODO'::"TaskStatus"
    END AS "status",
    0 AS "position",
    c."createdAt" AS "createdAt",
    c."updatedAt" AS "updatedAt"
FROM "Comment" c
JOIN "ReviewRound" rr ON c."reviewRoundId" = rr."id"
ON CONFLICT ("commentId") DO NOTHING;

