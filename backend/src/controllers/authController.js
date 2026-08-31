import prisma from '../config/prisma.js';

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

const setRefreshCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);
}

export const register = async (req, res) => {
  try {
    const result = await prisma.user.create({
      data: {
        email: req.body.email,
        password: req.body.password,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}


export const login = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: req.body.email },
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.password !== req.body.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ id: user.id, email: user.email });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export const logout = async (req, res) => {
  try {
    res.clearCookie('refreshToken', refreshCookieOptions);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}