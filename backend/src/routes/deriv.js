const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { encrypt } = require('../utils/encryption');
const derivAccounts = require('../models/derivAccounts');
const connectionManager = require('../services/connectionManager');
const DerivConnection = require('../services/derivConnection');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/deriv/connect
 * Body: { api_token }
 * Validates the token by authorizing against Deriv directly,
 * then stores it encrypted. The raw token is never logged or persisted in plaintext.
 */
router.post('/connect', requireAuth, async (req, res) => {
  const { api_token } = req.body;
  if (!api_token || typeof api_token !== 'string') {
    return res.status(400).json({ error: 'A Deriv API token is required.' });
  }

  const probe = new DerivConnection(api_token);
  try {
    const accountInfo = await probe.connect();

    const encryptedToken = encrypt(api_token);
    const saved = await derivAccounts.upsertAccount(
      req.userId,
      encryptedToken,
      accountInfo.loginid,
      accountInfo.currency,
      accountInfo.is_virtual === 1
    );

    // Replace any stale in-memory connection with this freshly authorized one.
    connectionManager.removeConnection(req.userId);
    connectionManager.registerConnection(req.userId, probe);

    res.json({
      connected: true,
      account: {
        loginid: saved.deriv_loginid,
        currency: saved.currency,
        is_virtual: saved.is_virtual,
        balance: accountInfo.balance,
      },
    });
  } catch (err) {
    logger.error('deriv token validation failed', err);
    probe.close();
    return res.status(400).json({
      error: 'Could not authorize with Deriv. Double-check the token has the right scopes (read, trade) and try again.',
    });
  }
});

router.get('/account', requireAuth, async (req, res) => {
  try {
    const account = await derivAccounts.getAccountByUserId(req.userId);
    if (!account) {
      return res.status(404).json({ error: 'No Deriv account connected yet.' });
    }

    const conn = await connectionManager.getOrCreateConnection(req.userId, account.encrypted_token);

    res.json({
      loginid: account.deriv_loginid,
      currency: account.currency,
      is_virtual: account.is_virtual,
      connected_at: account.connected_at,
      balance: conn.accountInfo?.balance,
    });
  } catch (err) {
    logger.error('fetch account failed', err);
    res.status(502).json({ error: 'Could not reach Deriv right now. Please try again shortly.' });
  }
});

router.delete('/disconnect', requireAuth, async (req, res) => {
  connectionManager.removeConnection(req.userId);
  await derivAccounts.deleteAccount(req.userId);
  res.json({ disconnected: true });
});

module.exports = router;
