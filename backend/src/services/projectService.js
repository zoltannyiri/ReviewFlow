import prisma from "../config/prisma.js"

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
  const membership = await getMembership(userId, organizationId)

  if (!membership) {
    throw new Error('USER_NOT_MEMBER_OF_ORGANIZATION')
  }

  return prisma.project.create({
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
    }
  })
}

export const getProjects = async (userId) => {
  return prisma.project.findMany({
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
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
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

  return project;
};

export const updateProject = async ({
  userId,
  projectId,
  name,
  allowedDomains,
}) => {
  const project = await getProjectById(userId, projectId);

  return prisma.project.update({
    where: {
      id: project.id,
    },
    data: {
      ...(name !== undefined && {
        name: name.trim(),
      }),

      ...(allowedDomains !== undefined && {
        allowedDomains,
      }),
    },
  });
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