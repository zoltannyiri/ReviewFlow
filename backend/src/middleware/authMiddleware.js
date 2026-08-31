import jwt from 'jsonwebtoken';

import prisma from '../config/prisma.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (
      !authorizationHeader ||
      !authorizationHeader.startsWith('Bearer ')
    ) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const token = authorizationHeader.split(' ')[1];

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        issuer: 'reviewflow-api',
        audience: 'reviewflow-web',
      }
    );

    const user = await prisma.user.findUnique({
      where: {
        id: payload.sub,
      },

      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,

        memberships: {
          select: {
            id: true,
            role: true,

            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    req.user = user;

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired access token',
    });
  }
};