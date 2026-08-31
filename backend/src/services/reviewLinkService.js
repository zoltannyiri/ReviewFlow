import crypto from 'crypto';

import prisma from '../config/prisma.js';
import { getReviewRoundById } from './reviewRoundService.js';

const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const hashToken = (token) => {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
};

export const createReviewLink = async ({
  userId,
  reviewRoundId,
  expiresAt,
}) => {
  const reviewRound = await getReviewRoundById({
    userId,
    reviewRoundId,
  });

  const token = generateToken();
  const tokenHash = hashToken(token);

  const reviewLink = await prisma.reviewLink.create({
    data: {
      reviewRoundId: reviewRound.id,
      tokenHash,
      expiresAt: expiresAt || null,
    },
    select: {
      id: true,
      reviewRoundId: true,
      isActive: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return {
    ...reviewLink,

    token,

    reviewUrl: `${process.env.FRONTEND_URL}/r/${token}`,
  };
};

export const getReviewLinks = async ({
  userId,
  reviewRoundId,
}) => {
  await getReviewRoundById({
    userId,
    reviewRoundId,
  });

  return prisma.reviewLink.findMany({
    where: {
      reviewRoundId,
    },
    select: {
      id: true,
      reviewRoundId: true,
      isActive: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const deactivateReviewLink = async ({
  userId,
  reviewLinkId,
}) => {
  const reviewLink = await prisma.reviewLink.findFirst({
    where: {
      id: reviewLinkId,

      reviewRound: {
        project: {
          organization: {
            members: {
              some: {
                userId,
              },
            },
          },
        },
      },
    },
    select: {
      id: true,
      reviewRoundId: true,
      isActive: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!reviewLink) {
    throw new Error('REVIEW_LINK_NOT_FOUND');
  }

  if (!reviewLink.isActive) {
    return reviewLink;
  }

  return prisma.reviewLink.update({
    where: {
      id: reviewLink.id,
    },
    data: {
      isActive: false,
    },
    select: {
      id: true,
      reviewRoundId: true,
      isActive: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const getPublicReviewByToken = async (token) => {
  const tokenHash = hashToken(token);

  const reviewLink = await prisma.reviewLink.findUnique({
    where: {
      tokenHash,
    },
    include: {
      reviewRound: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              publicKey: true,
              allowedDomains: true,
            },
          },
        },
      },
    },
  });

  if (!reviewLink) {
    throw new Error('REVIEW_LINK_NOT_FOUND');
  }

  if (!reviewLink.isActive) {
    throw new Error('REVIEW_LINK_INACTIVE');
  }

  if (
    reviewLink.expiresAt &&
    reviewLink.expiresAt < new Date()
  ) {
    throw new Error('REVIEW_LINK_EXPIRED');
  }

  return {
    link: {
      id: reviewLink.id,
      expiresAt: reviewLink.expiresAt,
    },

    reviewRound: {
      id: reviewLink.reviewRound.id,
      name: reviewLink.reviewRound.name,
      version: reviewLink.reviewRound.version,
      status: reviewLink.reviewRound.status,
      targetUrl: reviewLink.reviewRound.targetUrl,
    },

    project: reviewLink.reviewRound.project,
  };
};
