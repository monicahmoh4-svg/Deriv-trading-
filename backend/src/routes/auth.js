const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser, findByEmail, findById } = require('../models/users');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

const router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!isValidEmail(email) || !password || password.length < 8) {
      return res.status(400).json({ error: 'Valid email and a password of at least 8 characters are required.' });
    }

    const existing = await findByEmail(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser(email.toLowerCase(), passwordHash);

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    logger.error('signup failed', err);
    res.status(500).json({ error: 'Could not create account. Please try again.' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await findByEmail((email || '').toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password || '', user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    logger.error('login failed', err);
    res.status(500).json({ error: 'Could not log in. Please try again.' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await findById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user });
});

module.exports = router;
