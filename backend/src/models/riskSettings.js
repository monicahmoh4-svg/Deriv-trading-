const pool = require('../config/db');

async function getOrCreateSettings(userId) {
  const { rows } = await pool.query(`SELECT * FROM risk_settings WHERE user_id = $1`, [userId]);
  if (rows[0]) return rows[0];

  const { rows: created } = await pool.query(
    `INSERT INTO risk_settings (user_id) VALUES ($1) RETURNING *`,
    [userId]
  );
  return created[0];
}

async function updateSettings(userId, { maxStake, dailyLossLimit, maxTradesPerDay }) {
  const { rows } = await pool.query(
    `UPDATE risk_settings
     SET max_stake = COALESCE($2, max_stake),
         daily_loss_limit = COALESCE($3, daily_loss_limit),
         max_trades_per_day = COALESCE($4, max_trades_per_day)
     WHERE user_id = $1
     RETURNING *`,
    [userId, maxStake, dailyLossLimit, maxTradesPerDay]
  );
  return rows[0];
}

module.exports = { getOrCreateSettings, updateSettings };
