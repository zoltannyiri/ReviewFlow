import prisma from '../src/config/prisma.js';

export const backfillTasks = async () => {
  const result = await prisma.$executeRawUnsafe(`
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
    WHERE NOT EXISTS (
      SELECT 1 FROM "Task" t WHERE t."commentId" = c."id"
    )
    ON CONFLICT ("commentId") DO NOTHING;
  `);
  return result;
};

if (process.argv[1]?.endsWith('backfillTasks.js')) {
  backfillTasks()
    .then((count) => {
      console.log(`Backfilled ${count} tasks.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Backfill error:', err);
      process.exit(1);
    });
}
