const DerivConnection = require('./derivConnection');
const { decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

// In-memory map: userId -> DerivConnection
// For multi-instance/horizontal scaling, this needs to move to a sticky-session
// setup or a shared store (see README "Scaling notes").
const connections = new Map();

async function getOrCreateConnection(userId, encryptedToken) {
  const existing = connections.get(userId);
  if (existing && existing.authorized) return existing;

  const token = decrypt(encryptedToken);
  const conn = new DerivConnection(token);

  await conn.connect();
  connections.set(userId, conn);

  conn.on('disconnected', () => {
    logger.info(`deriv connection dropped for user ${userId}, will auto-reconnect`);
  });

  return conn;
}

function getConnection(userId) {
  return connections.get(userId) || null;
}

// Used when a route already has a freshly authorized DerivConnection
// (e.g. right after token validation) and wants to register it as the
// user's live connection instead of opening a duplicate socket.
function registerConnection(userId, conn) {
  const existing = connections.get(userId);
  if (existing && existing !== conn) existing.close();
  connections.set(userId, conn);
  conn.on('disconnected', () => {
    logger.info(`deriv connection dropped for user ${userId}, will auto-reconnect`);
  });
}

function removeConnection(userId) {
  const conn = connections.get(userId);
  if (conn) conn.close();
  connections.delete(userId);
}

module.exports = { getOrCreateConnection, getConnection, registerConnection, removeConnection };
