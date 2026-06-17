import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import client from '../api/client';
import { useAccount } from '../context/AccountContext';

export default function ConnectDeriv() {
  const navigate = useNavigate();
  const { account, refresh } = useAccount();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleConnect(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await client.post('/deriv/connect', { api_token: token });
      setToken('');
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not connect this token.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    await client.delete('/deriv/disconnect');
    await refresh();
  }

  return (
    <div className="layout">
      <TopNav />
      <main className="main">
        <div className="topbar">
          <h2>Connect your Deriv account</h2>
        </div>

        {account ? (
          <div className="panel" style={{ marginBottom: 20, maxWidth: 360 }}>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Connected account</p>
            <h3 style={{ marginTop: 6 }}>{account.loginid}</h3>
            <p className="mono" style={{ fontSize: 20, marginTop: 8 }}>
              {Number(account.balance).toFixed(2)} {account.currency} {account.is_virtual ? '(demo)' : '(real)'}
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="btn btn-primary" onClick={() => navigate('/trade')}>
                Go to trading
              </button>
              <button className="btn btn-ghost" onClick={handleDisconnect}>
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="panel" style={{ marginBottom: 20, maxWidth: 520 }}>
            <ol style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, paddingLeft: 20 }}>
              <li>
                Log in at{' '}
                <a href="https://app.deriv.com" target="_blank" rel="noreferrer">
                  app.deriv.com
                </a>
                .
              </li>
              <li>Go to Settings → API Token.</li>
              <li>
                Create a token with the <strong>Read</strong> and <strong>Trade</strong> scopes.
              </li>
              <li>Paste it below. We never see or store your Deriv password.</li>
            </ol>

            <form onSubmit={handleConnect}>
              <div className="field">
                <label htmlFor="api_token">Deriv API token</label>
                <input
                  id="api_token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your token here"
                  required
                />
              </div>
              {error && <p className="error-text">{error}</p>}
              <button className="btn btn-primary" disabled={loading}>
                {loading ? 'Connecting…' : 'Connect account'}
              </button>
            </form>
          </div>
        )}

        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 520 }}>
          Your token is encrypted before it's stored and is only ever decrypted in memory to talk to Deriv on your
          behalf. You can revoke it from Deriv's settings at any time, which immediately disconnects this app.
        </p>
      </main>
    </div>
  );
}
