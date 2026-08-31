import { randomUUID } from 'node:crypto';
import prisma from '../config/prisma.js';
import { getPublicReviewByToken } from './reviewLinkService.js';

const publicReplyFields = {
  id: true, commentId: true, authorType: true,
  authorName: true, message: true, createdAt: true,
};

// Internal author/link IDs are intentionally not part of API responses.
export const replyListSelection = {
  select: publicReplyFields,
  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
};

const appendReply = async (where, data) => {
  const id = randomUUID();
  try {
    // Authorization and the nested insert share the same database operation.
    // The parent status is never changed by adding a reply.
    const comment = await prisma.comment.update({
      where,
      data: { replies: { create: { id, ...data } } },
      select: { replies: { where: { id }, select: publicReplyFields } },
    });
    return comment.replies[0];
  } catch (error) {
    if (error.code === 'P2025') throw new Error('COMMENT_NOT_FOUND');
    throw error;
  }
};

export const createDeveloperReply = async ({ user, commentId, message }) => {
  // user comes from requireAuth, never from the request body.
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return appendReply({
    id: commentId,
    reviewRound: { project: { organization: { members: { some: { userId: user.id } } } } },
  }, {
    authorType: 'DEVELOPER',
    authorName: [...(name || 'Fejlesztő')].slice(0, 160).join(''),
    authorId: user.id,
    message: message.trim(),
  });
};

export const createGuestReply = async ({ token, commentId, message }) => {
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/i.test(token)) {
    throw new Error('REVIEW_LINK_NOT_FOUND');
  }
  const review = await getPublicReviewByToken(token);
  return appendReply({
    id: commentId,
    reviewRoundId: review.reviewRound.id,
    // Recheck link validity on write as well as during initial token lookup.
    reviewRound: {
      reviewLinks: { some: {
        id: review.link.id,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      } },
    },
  }, {
    authorType: 'CLIENT',
    authorName: 'Ügyfél',
    reviewLinkId: review.link.id,
    message: message.trim(),
  });
};
