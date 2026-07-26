const jwt = require('jsonwebtoken');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'secret';

const socketAuth = (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
};

module.exports = socketAuth;
