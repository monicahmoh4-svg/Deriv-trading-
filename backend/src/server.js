require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');

const pool = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/auth');
const derivRoutes = require('./routes/deriv');
const tradeRoutes = require('./routes/trade');
const marketRoutes = require('./routes/market');
const { initSockets } = require('./sockets/index');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// Render (and most PaaS hosts) sit one reverse-proxy hop in front of this app.
// Without this, express-rate-limit throws on every request because it sees an
// X-Forwarded-For header it isn't told to trust - which silently breaks every
// API call, including signup/login. "1" means "trust exactly one hop", which
// matches Render/Heroku/Vercel-style single-proxy setups.
app.set('trust proxy', 1);

// Accept a comma-separated list so this still works if you're testing against
// a Vercel preview URL in addition to your production domain, e.g.:
// FRONTEND_URL=https://your-app.vercel.app,https://your-app-git-branch.vercel.app
const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    logger.error('CORS rejected origin', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));
app.use(apiLimiter);

app.get('/', (req, res) => {
  res.json({
    service: 'deriv-trading-backend',
    status: 'running',
    health: '/health',
    api: ['/api/auth', '/api/deriv', '/api/trade', '/api/market'],
  });
});

app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/deriv', derivRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/market', marketRoutes);

// Anything else (unknown path) gets a clear JSON 404 instead of Express's plain-text default
app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

// Centralized error handler - never leaks stack traces or secrets to clients
app.use((err, req, res, next) => {
  logger.error('unhandled error', err);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'This origin is not allowed to call the API.' });
  }
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

const io = new Server(server, {
  cors: corsOptions,
});
initSockets(io);

// Runs migrations/001_init.sql against DATABASE_URL on every boot. Safe to repeat -
// every statement in that file is CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
// This exists specifically so you don't need direct psql/CLI access to the database
// (e.g. when it lives in a different Render account) just to get the schema created.
async function runMigrations() {
  const migrationPath = path.join(__dirname, '..', 'migrations', '001_init.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  await pool.query(sql);
  logger.info('database schema is up to date');
}

const PORT = process.env.PORT || 4000;

runMigrations()
  .then(() => {
    server.listen(PORT, () => {
      logger.info(`server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    // Don't boot into a half-working state where every DB query will fail anyway -
    // crash loudly so Render's logs show exactly why, and so it shows as a failed
    // deploy instead of a silently broken one.
    logger.error('startup migration failed - check DATABASE_URL', err);
    process.exit(1);
  });

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled rejection', reason);
});
