import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import prisma from '../config/prisma.js';

const generateAccessToken = (userId) => {
  return jwt.sign(
    {
      sub: userId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d',
      issuer: 'reviewflow-api',
      audience: 'reviewflow-web',
    }
  );
};

export const registerUser = async ({
  email,
  password,
  firstName,
  lastName,
  organizationName,
}) => {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (existingUser) {
    throw new Error('EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
      },
    });

    const organization = await tx.organization.create({
      data: {
        name: organizationName.trim(),
      },
    });

    await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: 'OWNER',
      },
    });

    return {
      user,
      organization,
    };
  });

  const accessToken = generateAccessToken(result.user.id);

  return {
    accessToken,

    user: {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
    },

    organization: {
      id: result.organization.id,
      name: result.organization.name,
    },
  };
};

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!isPasswordValid) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const accessToken = generateAccessToken(user.id);

  return {
    accessToken,

    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  };
};