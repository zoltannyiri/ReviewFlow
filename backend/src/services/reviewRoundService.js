import prisma from '../config/prisma.js';
import { getProjectById } from './projectService.js';

export const createReviewRound = async ({ userId, projectId, name, targetUrl }) => {
  await getProjectById(userId, projectId);

  const latestRound = await prisma.reviewRound.findFirst({
    where: {
      projectId,
    },
    orderBy: {
      version: 'desc',
    },
    select: {
      version: true,
    },
  });

  const nextVersion = latestRound
    ? latestRound.version + 1
    : 1;

  return prisma.reviewRound.create({
    data: {
      projectId,
      name: name.trim(),
      targetUrl: targetUrl.trim(),
      version: nextVersion,
      status: 'DRAFT',
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          publicKey: true,
        },
      },
    },
  });
};

export const getReviewRounds = async ({ userId, projectId }) => {
  await getProjectById(userId, projectId);

  return prisma.reviewRound.findMany({
    where: {
      projectId,
    },
    orderBy: {
      version: 'desc',
    },
  });
};

export const getReviewRoundById = async ({  userId,  reviewRoundId }) => {
  const reviewRound = await prisma.reviewRound.findFirst({
    where: {
      id: reviewRoundId,

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
  });

  if (!reviewRound) {
    throw new Error('REVIEW_ROUND_NOT_FOUND');
  }

  return reviewRound;
};

export const updateReviewRound = async ({ userId, reviewRoundId, name, targetUrl, status }) => {
  const reviewRound = await getReviewRoundById({
    userId,
    reviewRoundId,
  });

  return prisma.reviewRound.update({
    where: {
      id: reviewRound.id,
    },
    data: {
      ...(name !== undefined && {
        name: name.trim(),
      }),

      ...(targetUrl !== undefined && {
        targetUrl: targetUrl.trim(),
      }),

      ...(status !== undefined && {
        status,
      }),
    },
  });
};

export const deleteReviewRound = async ({ userId, reviewRoundId }) => {
  const reviewRound = await getReviewRoundById({
    userId,
    reviewRoundId,
  });

  await prisma.reviewRound.delete({
    where: {
      id: reviewRound.id,
    },
  });
};