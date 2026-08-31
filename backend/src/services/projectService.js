import prisma from '../config/prisma.js';
import { parseTargetUrl } from '../utils/projectUrl.js';

const editableRoles = ['OWNER', 'ADMIN'];

const exposeMembershipRole = (project) => {
  const members = project.organization?.members;
  if (!members) return project;
  const organization = { id: project.organization.id, name: project.organization.name };
  return { ...project, organization, role: members[0]?.role || null };
};

const getMembership = async (userId, organizationId) => {
  return prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });
};

export const createProject = async ({ name, allowedDomains, organizationId, userId }) => {
  const membership = await getMembership(userId, organizationId);

  if (!membership) {
    throw new Error('USER_NOT_MEMBER_OF_ORGANIZATION');
  }

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      allowedDomains,
      organizationId,
      createdById: userId,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
  return { ...project, role: membership.role };
};

export const getProjects = async (userId) => {
  const projects = await prisma.project.findMany({
    where: {
      organization: {
        members: {
          some: {
            userId,
          },
        },
      },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          members: {
            where: { userId },
            select: { role: true },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return projects.map(exposeMembershipRole);
};

export const getProjectById = async (userId, projectId) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,

      organization: {
        members: {
          some: {
            userId,
          },
        },
      },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          members: {
            where: { userId },
            select: { role: true },
          },
        },
      },

      createdBy: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!project) {
    throw new Error('PROJECT_NOT_FOUND');
  }

  return exposeMembershipRole(project);
};

export const updateProjectOrigins = async ({ userId, projectId, allowedDomains }) => {
  const project = await getProjectById(userId, projectId);
  if (!editableRoles.includes(project.role)) throw new Error('PROJECT_SETTINGS_FORBIDDEN');

  const rounds = await prisma.reviewRound.findMany({
    where: { projectId },
    select: { targetUrl: true },
  });
  const requiredOrigins = new Set(rounds.map(({ targetUrl }) => parseTargetUrl(targetUrl).origin));
  if ([...requiredOrigins].some((origin) => !allowedDomains.includes(origin))) {
    throw new Error('ORIGIN_IN_USE');
  }

  try {
    const updated = await prisma.project.update({
      where: {
        id: projectId,
        organization: { members: { some: { userId, role: { in: editableRoles } } } },
      },
      data: { allowedDomains },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });
    return { ...updated, role: project.role };
  } catch (error) {
    if (error.code === 'P2025') throw new Error('PROJECT_SETTINGS_FORBIDDEN');
    throw error;
  }
};

export const updateProject = async ({
  userId,
  projectId,
  name,
  allowedDomains,
}) => {
  let project = await getProjectById(userId, projectId);

  if (allowedDomains !== undefined) {
    project = await updateProjectOrigins({ userId, projectId, allowedDomains });
  }

  if (name === undefined) return project;

  const updated = await prisma.project.update({
    where: {
      id: project.id,
    },
    data: {
      ...(name !== undefined && {
        name: name.trim(),
      }),

    },
    include: { organization: { select: { id: true, name: true } } },
  });
  return { ...updated, role: project.role };
};

export const deleteProject = async ({ userId, projectId }) => {
  const project = await getProjectById(userId, projectId);

  const membership = await getMembership(
    userId,
    project.organizationId
  );

  if (
    !membership ||
    !['OWNER', 'ADMIN'].includes(membership.role)
  ) {
    throw new Error('PROJECT_DELETE_FORBIDDEN');
  }

  await prisma.project.delete({
    where: {
      id: project.id,
    },
  });
};
