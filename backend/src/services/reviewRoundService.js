import prisma from '../config/prisma.js';
import { getProjectById } from './projectService.js';
import { isAllowedOrigin, parseTargetUrl } from '../utils/projectUrl.js';

export const createReviewRound = async ({ userId, projectId, name, targetUrl }) => {
  const project = await getProjectById(userId, projectId);
  const url = parseTargetUrl(targetUrl);
  if (!(project.allowedDomains || []).length || !isAllowedOrigin(url.origin, project, url.href)) {
    throw new Error('TARGET_DOMAIN_NOT_ALLOWED');
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const latestRound = await prisma.reviewRound.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    try {
      return await prisma.reviewRound.create({
        data: {
          projectId,
          name: name.trim(),
          targetUrl: url.href,
          version: latestRound ? latestRound.version + 1 : 1,
          status: 'DRAFT',
        },
        include: {
          project: {
            select: { id: true, name: true, publicKey: true, allowedDomains: true },
          },
        },
      });
    } catch (error) {
      if (error.code !== 'P2002' || attempt === 2) throw error;
    }
  }
  throw new Error('REVIEW_ROUND_CREATE_FAILED');
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

  if (targetUrl !== undefined) {
    const url = parseTargetUrl(targetUrl);
    if (!isAllowedOrigin(url.origin, reviewRound.project, reviewRound.targetUrl)) {
      throw new Error('TARGET_DOMAIN_NOT_ALLOWED');
    }
  }

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
