require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');

const { apiLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/auth');
const derivRoutes = require('./routes/deriv');
const tradeRoutes = require('./routes/trade');
const marketRoutes = require('./routes/market');
const { initSockets } = require('./sockets/index');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(apiLimiter);

app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/deriv', derivRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/market', marketRoutes);

// Centralized error handler - never leaks stack traces or secrets to clients
app.use((err, req, res, next) => {
  logger.error('unhandled error', err);
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

const io = new Server(server, {
  cors: { origin: FRONTEND_URL, credentials: true },
});
initSockets(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  logger.info(`server listening on port ${PORT}`);
});

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled rejection', reason);
});
