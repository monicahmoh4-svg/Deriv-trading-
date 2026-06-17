const pool = require('../config/db');

async function upsertAccount(userId, encryptedToken, derivLoginId, currency, isVirtual) {
  const { rows } = await pool.query(
    `INSERT INTO deriv_accounts (user_id, encrypted_token, deriv_loginid, currency, is_virtual)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id)
     DO UPDATE SET encrypted_token = $2, deriv_loginid = $3, currency = $4, is_virtual = $5, connected_at = NOW()
     RETURNING id, deriv_loginid, currency, is_virtual, connected_at`,
    [userId, encryptedToken, derivLoginId, currency, isVirtual]
  );
  return rows[0];
}

async function getAccountByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT id, user_id, encrypted_token, deriv_loginid, currency, is_virtual, connected_at
     FROM deriv_accounts WHERE user_id = $1`,
    [userId]
  );
  return rows[0] || null;
}

async function deleteAccount(userId) {
  await pool.query(`DELETE FROM deriv_accounts WHERE user_id = $1`, [userId]);
}

module.exports = { upsertAccount, getAccountByUserId, deleteAccount };
