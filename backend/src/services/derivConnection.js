const WebSocket = require('ws');
const EventEmitter = require('events');
const logger = require('../utils/logger');

const DERIV_WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${process.env.DERIV_APP_ID || '1089'}`;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_BACKOFF_MS = 30000;

/**
 * One DerivConnection = one authenticated WebSocket session against the
 * Deriv API for a single end user. Holds no plaintext token after connect()
 * resolves except in memory for the lifetime of the socket.
 */
class DerivConnection extends EventEmitter {
  constructor(apiToken) {
    super();
    this._apiToken = apiToken;
    this.ws = null;
    this.authorized = false;
    this.accountInfo = null;
    this.manualClose = false;
    this.reconnectAttempts = 0;
    this._pending = new Map();
    this._reqId = 1;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(DERIV_WS_URL);

      this.ws.on('open', async () => {
        try {
          const res = await this._send({ authorize: this._apiToken });
          this.authorized = true;
          this.accountInfo = res.authorize;
          this.reconnectAttempts = 0;
          this.emit('authorized', this.accountInfo);
          resolve(this.accountInfo);
        } catch (err) {
          this.authorized = false;
          reject(err);
        }
      });

      this.ws.on('message', (raw) => this._handleMessage(raw));

      this.ws.on('close', () => {
        this.authorized = false;
        this.emit('disconnected');
        this._scheduleReconnect();
      });

      this.ws.on('error', (err) => {
        logger.error('deriv ws error', err);
        this.emit('connection_error', err);
        // Don't reject here if already resolved/connected - 'close' handles reconnect
        if (!this.authorized) reject(err);
      });
    });
  }

  _scheduleReconnect() {
    if (this.manualClose) return;
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** this.reconnectAttempts);
    this.reconnectAttempts += 1;
    logger.info(`deriv reconnect scheduled in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => {
      if (this.manualClose) return;
      this.connect().catch((err) => logger.error('deriv reconnect failed', err));
    }, delay);
  }

  _handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.error) {
      if (msg.req_id && this._pending.has(msg.req_id)) {
        const { reject } = this._pending.get(msg.req_id);
        this._pending.delete(msg.req_id);
        reject(new Error(msg.error.message || 'Deriv API error'));
        return;
      }
      this.emit('api_error', msg.error);
      return;
    }

    if (msg.req_id && this._pending.has(msg.req_id)) {
      const { resolve } = this._pending.get(msg.req_id);
      this._pending.delete(msg.req_id);
      resolve(msg);
    }

    switch (msg.msg_type) {
      case 'tick':
        this.emit('tick', msg.tick);
        break;
      case 'proposal_open_contract':
        this.emit('contract_update', msg.proposal_open_contract);
        break;
      case 'balance':
        this.emit('balance_update', msg.balance);
        break;
      default:
        break;
    }
  }

  _send(payload) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('Deriv connection is not open.'));
      }
      const req_id = this._reqId++;
      this._pending.set(req_id, { resolve, reject });
      this.ws.send(JSON.stringify({ ...payload, req_id }));

      setTimeout(() => {
        if (this._pending.has(req_id)) {
          this._pending.delete(req_id);
          reject(new Error('Deriv API request timed out.'));
        }
      }, REQUEST_TIMEOUT_MS);
    });
  }

  subscribeTicks(symbol) {
    return this._send({ ticks: symbol, subscribe: 1 });
  }

  unsubscribeTicks(symbol) {
    return this._send({ forget_all: 'ticks' });
  }

  subscribeBalance() {
    return this._send({ balance: 1, subscribe: 1 });
  }

  getProposal({ symbol, contract_type, amount, basis, duration, duration_unit, currency }) {
    return this._send({
      proposal: 1,
      symbol,
      contract_type,
      amount,
      basis: basis || 'stake',
      duration,
      duration_unit: duration_unit || 't',
      currency: currency || (this.accountInfo && this.accountInfo.currency) || 'USD',
    });
  }

  buyContract(proposalId, price) {
    return this._send({ buy: proposalId, price });
  }

  subscribeContract(contractId) {
    return this._send({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1 });
  }

  getAccountStatus() {
    return this._send({ get_account_status: 1 });
  }

  getActiveSymbols() {
    return this._send({ active_symbols: 'brief', product_type: 'basic' });
  }

  close() {
    this.manualClose = true;
    if (this.ws) this.ws.close();
  }
}

module.exports = DerivConnection;
