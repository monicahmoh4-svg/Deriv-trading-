-- Initial schema for the Deriv trading app
-- Run with: psql $DATABASE_URL -f migrations/001_init.sql

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deriv_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  encrypted_token TEXT NOT NULL,
  deriv_loginid VARCHAR(50),
  currency VARCHAR(10),
  is_virtual BOOLEAN DEFAULT TRUE,
  connected_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS risk_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  max_stake NUMERIC DEFAULT 10,
  daily_loss_limit NUMERIC DEFAULT 50,
  max_trades_per_day INTEGER DEFAULT 20
);

CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  contract_id VARCHAR(100),
  symbol VARCHAR(50),
  contract_type VARCHAR(20),
  stake NUMERIC,
  payout NUMERIC,
  profit NUMERIC,
  status VARCHAR(20) DEFAULT 'open',
  opened_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trades_user_opened ON trades (user_id, opened_at);
