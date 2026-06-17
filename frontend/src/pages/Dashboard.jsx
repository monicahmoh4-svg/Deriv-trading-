import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import TickerStrip from '../components/TickerStrip';
import SignalsPanel from '../components/SignalsPanel';
import TradeHistory from '../components/TradeHistory';
import RiskDisclaimer from '../components/RiskDisclaimer';
import { useAccount } from '../context/AccountContext';
import client from '../api/client';

const TILES = [
  { label: 'Manual Trading', icon: '👆', to: '/trade', enabled: true },
  { label: 'Bot Builder', icon: '🧩', to: '/bot-builder', enabled: false },
  { label: 'Bulk Trader', icon: '📊', to: '/bulk-trader', enabled: false },
  { label: 'AI Bots', icon: '🤖', to: '/ai-bots', enabled: false },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { account } = useAccount();
  const [symbols, setSymbols] = useState([]);
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    if (!account) return;
    client
      .get('/market/symbols')
      .then((res) => setSymbols(res.data.slice(0, 6)))
      .catch(() => setSymbols([]));
  }, [account]);

  useEffect(() => {
    client
      .get('/trade/history')
      .then((res) => setTrades(res.data))
      .catch(() => {});
  }, []);

  return (
    <div className="layout">
      <TopNav />
      <main className="main">
        {!account ? (
          <div className="panel" style={{ marginBottom: 24, maxWidth: 480 }}>
            <h2 style={{ marginBottom: 8 }}>Connect your Deriv account</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
              Link your account with an API token to see live prices, your balance, and start trading.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/connect')}>
              Connect Deriv account
            </button>
          </div>
        ) : (
          <>
            <TickerStrip symbols={symbols} />

            <div className="tile-grid">
              {TILES.map((tile) => (
                <div
                  key={tile.label}
                  className={`tile ${tile.enabled ? 'enabled' : 'disabled'}`}
                  onClick={() => tile.enabled && navigate(tile.to)}
                >
                  <span className="tile-icon">{tile.icon}</span>
                  <span className="tile-label">{tile.label}</span>
                </div>
              ))}
            </div>

            <h3 style={{ marginBottom: 12 }}>Live market signals</h3>
            <SignalsPanel symbols={symbols.slice(0, 3)} />

            <h3 style={{ margin: '28px 0 12px' }}>Recent trades</h3>
            <div className="panel">
              <TradeHistory trades={trades} />
            </div>
          </>
        )}
      </main>
      <RiskDisclaimer />
    </div>
  );
}
