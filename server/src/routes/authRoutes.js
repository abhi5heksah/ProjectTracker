const express = require('express');
const { register, login, refresh, logout, getMe } = require('../controllers/authController');
const authenticate = require('../middlewares/authenticate');
const { authLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout); // authenticate to get userId, but could also just rely on cookie
router.get('/me', authenticate, getMe);

module.exports = router;
