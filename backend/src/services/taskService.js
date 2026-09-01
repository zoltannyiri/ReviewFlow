import prisma from '../config/prisma.js';
import { replyListSelection } from './commentReplyService.js';

export const projectMembership = (userId) => ({
  organization: { members: { some: { userId } } },
});

export const VALID_TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'ON_HOLD', 'DONE'];

export const getRoundTasks = async ({ userId, reviewRoundId }) => {
  const round = await prisma.reviewRound.findFirst({
    where: { id: reviewRoundId, project: projectMembership(userId) },
    select: {
      id: true,
      name: true,
      version: true,
      status: true,
      targetUrl: true,
      projectId: true,
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!round) throw new Error('REVIEW_ROUND_NOT_FOUND');

  const tasks = await prisma.task.findMany({
    where: {
      reviewRoundId,
      project: projectMembership(userId),
    },
    orderBy: [
      { position: 'asc' },
      { createdAt: 'asc' },
    ],
    include: {
      comment: {
        include: {
          replies: replyListSelection,
        },
      },
    },
  });

  return { reviewRound: round, tasks };
};

export const getTaskById = async ({ userId, taskId }) => {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: projectMembership(userId),
    },
    include: {
      comment: {
        include: {
          replies: replyListSelection,
        },
      },
      reviewRound: {
        select: {
          id: true,
          name: true,
          version: true,
          targetUrl: true,
        },
      },
    },
  });

  if (!task) throw new Error('TASK_NOT_FOUND');
  return task;
};

export const updateTask = async ({
  userId,
  taskId,
  status,
  position,
  title,
  description,
}) => {
  if (status !== undefined && !VALID_TASK_STATUSES.includes(status)) {
    throw new Error('INVALID_TASK_STATUS');
  }

  return prisma.$transaction(async (tx) => {
    // Check access first within transaction
    const existing = await tx.task.findFirst({
      where: {
        id: taskId,
        project: projectMembership(userId),
      },
      select: {
        id: true,
        commentId: true,
        status: true,
      },
    });

    if (!existing) throw new Error('TASK_NOT_FOUND');

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (position !== undefined) updateData.position = position;
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;

    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        comment: {
          include: {
            replies: replyListSelection,
          },
        },
        reviewRound: {
          select: {
            id: true,
            name: true,
            version: true,
            targetUrl: true,
          },
        },
      },
    });

    // Synchronize linked comment status if task status changed
    if (status !== undefined) {
      const commentStatus = status === 'DONE' ? 'RESOLVED' : 'OPEN';
      await tx.comment.update({
        where: { id: existing.commentId },
        data: { status: commentStatus },
      });
      // Reflect updated comment status in the returned object
      if (updatedTask.comment) {
        updatedTask.comment.status = commentStatus;
      }
    }

    return updatedTask;
  });
};
