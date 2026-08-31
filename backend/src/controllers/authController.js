import {
  registerUser,
  loginUser,
} from '../services/authService.js';

export const register = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      organizationName,
    } = req.body;

    if (!email || !password || !organizationName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password and organizationName are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    const result = await registerUser({
      email,
      password,
      firstName,
      lastName,
      organizationName,
    });

    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error.message === 'EMAIL_ALREADY_EXISTS') {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    console.error('Register error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const login = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const result = await loginUser({
      email,
      password,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    console.error('Login error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const me = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};