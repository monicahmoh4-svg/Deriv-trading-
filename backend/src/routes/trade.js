const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { tradeLimiter } = require('../middleware/rateLimiter');
const derivAccounts = require('../models/derivAccounts');
const trades = require('../models/trades');
const riskSettings = require('../models/riskSettings');
const connectionManager = require('../services/connectionManager');
const logger = require('../utils/logger');

const router = express.Router();

async function getConnOrFail(req, res) {
  const account = await derivAccounts.getAccountByUserId(req.userId);
  if (!account) {
    res.status(400).json({ error: 'Connect your Deriv account before trading.' });
    return null;
  }
  const conn = await connectionManager.getOrCreateConnection(req.userId, account.encrypted_token);
  return conn;
}

/**
 * POST /api/trade/proposal
 * Body: { symbol, contract_type, amount, duration, duration_unit }
 * Gets a live price quote from Deriv. No money moves yet.
 */
router.post('/proposal', requireAuth, async (req, res) => {
  try {
    const conn = await getConnOrFail(req, res);
    if (!conn) return;

    const { symbol, contract_type, amount, duration, duration_unit } = req.body;
    if (!symbol || !contract_type || !amount || !duration) {
      return res.status(400).json({ error: 'symbol, contract_type, amount and duration are required.' });
    }

    const result = await conn.getProposal({ symbol, contract_type, amount, duration, duration_unit });
    res.json(result.proposal);
  } catch (err) {
    logger.error('proposal failed', err);
    res.status(502).json({ error: err.message || 'Could not fetch a price quote from Deriv.' });
  }
});

/**
 * POST /api/trade/buy
 * Body: { proposal_id, price, symbol, contract_type }
 * Risk checks run BEFORE the buy is sent to Deriv - this is the layer
 * that stops a single fat-fingered or runaway trade from blowing past
 * the user's own configured limits.
 */
router.post('/buy', requireAuth, tradeLimiter, async (req, res) => {
  try {
    const { proposal_id, price, symbol, contract_type } = req.body;
    if (!proposal_id || price === undefined) {
      return res.status(400).json({ error: 'proposal_id and price are required.' });
    }

    const settings = await riskSettings.getOrCreateSettings(req.userId);
    const todayStats = await trades.getTodaysStats(req.userId);

    if (Number(price) > Number(settings.max_stake)) {
      return res.status(403).json({
        error: `Stake of ${price} exceeds your configured max stake of ${settings.max_stake}.`,
      });
    }
    if (Number(todayStats.trade_count) >= Number(settings.max_trades_per_day)) {
      return res.status(403).json({
        error: `Daily trade limit of ${settings.max_trades_per_day} reached. Try again tomorrow or raise the limit in risk settings.`,
      });
    }
    if (Math.abs(Number(todayStats.total_loss)) >= Number(settings.daily_loss_limit)) {
      return res.status(403).json({
        error: `Daily loss limit of ${settings.daily_loss_limit} reached. Trading is paused for today to protect your account.`,
      });
    }

    const conn = await getConnOrFail(req, res);
    if (!conn) return;

    const result = await conn.buyContract(proposal_id, price);
    const contract = result.buy;

    await trades.recordTrade({
      userId: req.userId,
      contractId: String(contract.contract_id),
      symbol: symbol || '',
      contractType: contract_type || '',
      stake: price,
      payout: contract.payout,
    });

    // Start tracking this contract so we can record the outcome when it settles.
    conn.subscribeContract(contract.contract_id).catch((e) => logger.error('subscribe contract failed', e));

    res.json(contract);
  } catch (err) {
    logger.error('buy failed', err);
    res.status(502).json({ error: err.message || 'Trade could not be executed.' });
  }
});

router.get('/history', requireAuth, async (req, res) => {
  const rows = await trades.getHistory(req.userId);
  res.json(rows);
});

router.get('/risk-settings', requireAuth, async (req, res) => {
  const settings = await riskSettings.getOrCreateSettings(req.userId);
  res.json(settings);
});

router.put('/risk-settings', requireAuth, async (req, res) => {
  const { maxStake, dailyLossLimit, maxTradesPerDay } = req.body;
  const updated = await riskSettings.updateSettings(req.userId, { maxStake, dailyLossLimit, maxTradesPerDay });
  res.json(updated);
});

module.exports = router;
