const authService = require('../services/authService');

const setRefreshCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    domain: process.env.COOKIE_DOMAIN || 'localhost',
  });
};

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const { user, accessToken, refreshToken } = await authService.registerUser(name, email, password);
    setRefreshCookie(res, refreshToken);
    res.status(201).json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role }, accessToken });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const { user, accessToken, refreshToken } = await authService.loginUser(email, password);
    setRefreshCookie(res, refreshToken);
    res.status(200).json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role }, accessToken });
  } catch (err) {
    if (err.message === 'Invalid credentials') {
      return res.status(401).json({ success: false, message: err.message });
    }
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token' });
    }
    const result = await authService.refreshUserToken(refreshToken);
    setRefreshCookie(res, result.refreshToken);
    res.status(200).json({ success: true, user: { id: result.user.id, name: result.user.name, email: result.user.email, role: result.user.role }, accessToken: result.accessToken });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

const logout = async (req, res, next) => {
  try {
    if (req.user && req.user.userId) {
      await authService.logoutUser(req.user.userId);
    }
    res.clearCookie('refreshToken', {
      domain: process.env.COOKIE_DOMAIN || 'localhost',
    });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const prisma = require('../services/db');
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
};
