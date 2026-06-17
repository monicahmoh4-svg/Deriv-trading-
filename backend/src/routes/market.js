const express = require('express');
const { requireAuth } = require('../middleware/auth');
const derivAccounts = require('../models/derivAccounts');
const connectionManager = require('../services/connectionManager');
const logger = require('../utils/logger');

const router = express.Router();

let symbolCache = { data: null, fetchedAt: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * GET /api/market/symbols
 * Returns the live list of synthetic index symbols Deriv currently offers,
 * fetched straight from Deriv's active_symbols call rather than hardcoded -
 * Deriv adds/retires indices over time, so this stays correct automatically.
 */
router.get('/symbols', requireAuth, async (req, res) => {
  try {
    if (symbolCache.data && Date.now() - symbolCache.fetchedAt < CACHE_TTL_MS) {
      return res.json(symbolCache.data);
    }

    const account = await derivAccounts.getAccountByUserId(req.userId);
    if (!account) return res.status(400).json({ error: 'Connect your Deriv account first.' });

    const conn = await connectionManager.getOrCreateConnection(req.userId, account.encrypted_token);
    const result = await conn.getActiveSymbols();

    const synthetics = (result.active_symbols || [])
      .filter((s) => s.market === 'synthetic_index')
      .map((s) => ({
        symbol: s.symbol,
        display_name: s.display_name,
        submarket: s.submarket_display_name,
      }));

    symbolCache = { data: synthetics, fetchedAt: Date.now() };
    res.json(synthetics);
  } catch (err) {
    logger.error('fetch symbols failed', err);
    res.status(502).json({ error: 'Could not load markets from Deriv right now.' });
  }
});

module.exports = router;
