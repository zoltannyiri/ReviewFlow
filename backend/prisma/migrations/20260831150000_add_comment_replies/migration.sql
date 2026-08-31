-- Additive migration: existing comments and statuses remain unchanged.
CREATE TYPE "CommentReplyAuthorType" AS ENUM ('DEVELOPER', 'CLIENT');

CREATE TABLE "CommentReply" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "authorType" "CommentReplyAuthorType" NOT NULL,
    "authorName" VARCHAR(160) NOT NULL,
    "authorId" TEXT,
    "reviewLinkId" TEXT,
    "message" VARCHAR(5000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentReply_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommentReply_commentId_createdAt_id_idx" ON "CommentReply"("commentId", "createdAt", "id");
CREATE INDEX "CommentReply_authorId_idx" ON "CommentReply"("authorId");
CREATE INDEX "CommentReply_reviewLinkId_idx" ON "CommentReply"("reviewLinkId");

ALTER TABLE "CommentReply" ADD CONSTRAINT "CommentReply_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommentReply" ADD CONSTRAINT "CommentReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommentReply" ADD CONSTRAINT "CommentReply_reviewLinkId_fkey" FOREIGN KEY ("reviewLinkId") REFERENCES "ReviewLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
