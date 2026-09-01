import prisma from '../config/prisma.js';
import { getPublicReviewByToken } from './reviewLinkService.js';
import { replyListSelection } from './commentReplyService.js';

const projectMembership = (userId) => ({
  organization: { members: { some: { userId } } },
});

export const getDeveloperComments = async ({ userId, reviewRoundId }) => {
  // Fetch the round and its comments together under the membership constraint.
  const round = await prisma.reviewRound.findFirst({
    where: { id: reviewRoundId, project: projectMembership(userId) },
    select: {
      id: true,
      name: true,
      version: true,
      status: true,
      comments: {
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: { replies: replyListSelection },
      },
    },
  });

  if (!round) throw new Error('REVIEW_ROUND_NOT_FOUND');

  const { comments, ...reviewRound } = round;
  return { reviewRound, comments };
};

export const resolveComment = async ({ userId, commentId }) => {
  try {
    // Keep authorization in the UPDATE itself, not only in a preceding read.
    // All organization members may resolve; guest tokens cannot reach this call.
    return await prisma.$transaction(async (tx) => {
      const updatedComment = await tx.comment.update({
        where: {
          id: commentId,
          reviewRound: { project: projectMembership(userId) },
        },
        data: { status: 'RESOLVED' },
        include: { replies: replyListSelection },
      });

      await tx.task.updateMany({
        where: { commentId: updatedComment.id },
        data: { status: 'DONE' },
      });

      return updatedComment;
    });
  } catch (error) {
    if (error.code === 'P2025') throw new Error('COMMENT_NOT_FOUND');
    throw error;
  }
};

export const createPublicComment = async ({
  token,
  comment,
  pathname,
  tagName,
  reviewElementId,
  elementId,
  elementText,
  viewportWidth,
  viewportHeight,
  elementRect,
}) => {
  const review = await getPublicReviewByToken(token);

  return prisma.$transaction(async (tx) => {
    const createdComment = await tx.comment.create({
      data: {
        reviewRoundId: review.reviewRound.id,
        reviewLinkId: review.link.id,

        comment: comment.trim(),

        pathname,
        tagName,

        reviewElementId: reviewElementId || null,
        elementId: elementId || null,
        elementText: elementText || null,

        viewportWidth,
        viewportHeight,

        elementX: elementRect.x,
        elementY: elementRect.y,
        elementWidth: elementRect.width,
        elementHeight: elementRect.height,
      },
    });

    await tx.task.create({
      data: {
        projectId: review.project.id,
        reviewRoundId: review.reviewRound.id,
        commentId: createdComment.id,
        title: comment.trim(),
        status: 'TODO',
        position: 0,
      },
    });

    return createdComment;
  });
};

export const getPublicComments = async ({
  token,
  pathname,
}) => {
  const review = await getPublicReviewByToken(token);

  return prisma.comment.findMany({
    where: {
      reviewRoundId: review.reviewRound.id,

      ...(pathname && {
        pathname,
      }),
    },
    orderBy: {
      createdAt: 'asc',
    },
    include: { replies: replyListSelection },
  });
};
