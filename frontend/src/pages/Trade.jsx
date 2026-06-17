import React, { useEffect, useState } from 'react';
import TopNav from '../components/TopNav';
import TickChart from '../components/TickChart';
import client from '../api/client';
import { useSocket } from '../context/SocketContext';

const FALLBACK_MARKETS = [
  { symbol: 'R_10', display_name: 'Volatility 10 Index' },
  { symbol: 'R_25', display_name: 'Volatility 25 Index' },
  { symbol: 'R_50', display_name: 'Volatility 50 Index' },
  { symbol: 'R_75', display_name: 'Volatility 75 Index' },
  { symbol: 'R_100', display_name: 'Volatility 100 Index' },
];

export default function Trade() {
  const { connected, subscribeTicks } = useSocket();
  const [markets, setMarkets] = useState(FALLBACK_MARKETS);
  const [symbol, setSymbol] = useState('R_100');
  const [ticks, setTicks] = useState([]);
  const [stake, setStake] = useState(5);
  const [duration, setDuration] = useState(5);
  const [proposal, setProposal] = useState(null);
  const [contractType, setContractType] = useState('CALL');
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    client
      .get('/market/symbols')
      .then((res) => {
        if (res.data.length) setMarkets(res.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setTicks([]);
    setProposal(null);
    const unsubscribe = subscribeTicks(symbol, (tick) => {
      setTicks((prev) => [...prev.slice(-119), tick]);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  async function fetchProposal(type) {
    setError('');
    setContractType(type);
    try {
      const { data } = await client.post('/trade/proposal', {
        symbol,
        contract_type: type,
        amount: Number(stake),
        duration: Number(duration),
        duration_unit: 't',
      });
      setProposal(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not fetch a quote.');
      setProposal(null);
    }
  }

  async function placeTrade() {
    if (!proposal) return;
    setPlacing(true);
    setError('');
    try {
      await client.post('/trade/buy', {
        proposal_id: proposal.id,
        price: proposal.ask_price,
        symbol,
        contract_type: contractType,
      });
      setProposal(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Trade could not be placed.');
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="layout">
      <TopNav />
      <main className="main">
        <div className="topbar">
          <h2>Manual Trader</h2>
          <span className={`pill ${connected ? 'pill-live' : 'pill-off'}`}>
            <span className="pill-dot" /> {connected ? 'Live feed' : 'Connecting…'}
          </span>
        </div>

        <div className="field" style={{ maxWidth: 280, marginBottom: 16 }}>
          <label htmlFor="market">Market</label>
          <select id="market" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            {markets.map((m) => (
              <option key={m.symbol} value={m.symbol}>
                {m.display_name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
          <TickChart ticks={ticks} />

          <div className="panel">
            <h3 style={{ marginBottom: 14 }}>Place order</h3>

            <div className="field">
              <label htmlFor="stake">Stake</label>
              <input
                id="stake"
                type="number"
                min="1"
                step="0.5"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="duration">Duration (ticks)</label>
              <input
                id="duration"
                type="number"
                min="1"
                max="10"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <button className="btn btn-up" style={{ flex: 1 }} onClick={() => fetchProposal('CALL')}>
                Rise
              </button>
              <button className="btn btn-down" style={{ flex: 1 }} onClick={() => fetchProposal('PUT')}>
                Fall
              </button>
            </div>

            {proposal && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                  {contractType === 'CALL' ? 'Rise' : 'Fall'} · payout if correct
                </p>
                <p className="mono" style={{ fontSize: 22, margin: '4px 0' }}>
                  {proposal.payout}{' '}
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>for {proposal.ask_price} stake</span>
                </p>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={placeTrade} disabled={placing}>
                  {placing ? 'Placing…' : 'Confirm trade'}
                </button>
              </div>
            )}

            {error && <p className="error-text">{error}</p>}

            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Synthetic indices are highly volatile. Only trade with stakes you can afford to lose, and check your
              risk settings before going live.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
