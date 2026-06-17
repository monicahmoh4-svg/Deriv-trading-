const jwt = require('jsonwebtoken');
const derivAccounts = require('../models/derivAccounts');
const trades = require('../models/trades');
const connectionManager = require('../services/connectionManager');
const logger = require('../utils/logger');

function initSockets(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`socket connected for user ${socket.userId}`);

    socket.on('subscribe_ticks', async (symbol) => {
      try {
        const account = await derivAccounts.getAccountByUserId(socket.userId);
        if (!account) return socket.emit('error_message', 'No Deriv account connected.');

        const conn = await connectionManager.getOrCreateConnection(socket.userId, account.encrypted_token);

        const tickHandler = (tick) => {
          if (tick.symbol === symbol) socket.emit('tick', tick);
        };
        const contractHandler = async (contract) => {
          socket.emit('contract_update', contract);
          if (contract.is_sold) {
            await trades.closeTrade(
              String(contract.contract_id),
              Number(contract.profit),
              Number(contract.profit) >= 0 ? 'won' : 'lost'
            );
          }
        };

        conn.on('tick', tickHandler);
        conn.on('contract_update', contractHandler);
        await conn.subscribeTicks(symbol);

        socket.on('disconnect', () => {
          conn.removeListener('tick', tickHandler);
          conn.removeListener('contract_update', contractHandler);
        });
      } catch (err) {
        logger.error('subscribe_ticks failed', err);
        socket.emit('error_message', 'Could not subscribe to live prices.');
      }
    });
  });
}

module.exports = { initSockets };
