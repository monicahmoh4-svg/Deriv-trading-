const pool = require('../config/db');

async function recordTrade({ userId, contractId, symbol, contractType, stake, payout }) {
  const { rows } = await pool.query(
    `INSERT INTO trades (user_id, contract_id, symbol, contract_type, stake, payout, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'open')
     RETURNING *`,
    [userId, contractId, symbol, contractType, stake, payout]
  );
  return rows[0];
}

async function closeTrade(contractId, profit, status) {
  const { rows } = await pool.query(
    `UPDATE trades SET profit = $2, status = $3, closed_at = NOW()
     WHERE contract_id = $1 RETURNING *`,
    [contractId, profit, status]
  );
  return rows[0];
}

async function getHistory(userId, limit = 50) {
  const { rows } = await pool.query(
    `SELECT * FROM trades WHERE user_id = $1 ORDER BY opened_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

async function getTodaysStats(userId) {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) AS trade_count,
       COALESCE(SUM(CASE WHEN profit < 0 THEN profit ELSE 0 END), 0) AS total_loss,
       COALESCE(SUM(profit), 0) AS net_profit
     FROM trades
     WHERE user_id = $1 AND opened_at >= CURRENT_DATE`,
    [userId]
  );
  return rows[0];
}

module.exports = { recordTrade, closeTrade, getHistory, getTodaysStats };
