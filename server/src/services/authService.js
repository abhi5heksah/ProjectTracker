const bcrypt = require('bcrypt');
const jsonwebtoken = require('jsonwebtoken');
const prisma = require('./db');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'secret_refresh';

const generateTokens = (user) => {
  const accessToken = jsonwebtoken.sign({ userId: user.id, role: user.role }, JWT_ACCESS_SECRET, {
    expiresIn: '15m',
  });
  const refreshToken = jsonwebtoken.sign({ userId: user.id }, JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
  return { accessToken, refreshToken };
};

const registerUser = async (name, email, password) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('User already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
  });

  const { accessToken, refreshToken } = generateTokens(user);
  
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash },
  });

  return { user, accessToken, refreshToken };
};

const loginUser = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  const { accessToken, refreshToken } = generateTokens(user);

  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash },
  });

  return { user, accessToken, refreshToken };
};

const refreshUserToken = async (refreshToken) => {
  if (!refreshToken) throw new Error('No refresh token provided');

  let decoded;
  try {
    decoded = jsonwebtoken.verify(refreshToken, JWT_REFRESH_SECRET);
  } catch (err) {
    throw new Error('Invalid refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user || !user.refreshTokenHash) {
    throw new Error('Invalid refresh token');
  }

  const isMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!isMatch) {
    throw new Error('Invalid refresh token');
  }

  const tokens = generateTokens(user);

  const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash },
  });

  return { user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
};

const logoutUser = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshTokenHash: null },
  });
};

module.exports = {
  registerUser,
  loginUser,
  refreshUserToken,
  logoutUser,
};
