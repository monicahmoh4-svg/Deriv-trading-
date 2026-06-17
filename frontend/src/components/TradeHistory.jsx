import React from 'react';

const badgeClass = { open: 'badge-open', won: 'badge-won', lost: 'badge-lost' };

export default function TradeHistory({ trades }) {
  if (!trades.length) {
    return <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No trades yet. Your executed contracts will show up here.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Type</th>
          <th>Stake</th>
          <th>Payout</th>
          <th>Profit</th>
          <th>Status</th>
          <th>Opened</th>
        </tr>
      </thead>
      <tbody>
        {trades.map((t) => (
          <tr key={t.id}>
            <td>{t.symbol}</td>
            <td>{t.contract_type}</td>
            <td className="mono">{Number(t.stake).toFixed(2)}</td>
            <td className="mono">{Number(t.payout).toFixed(2)}</td>
            <td className="mono">{t.profit !== null ? Number(t.profit).toFixed(2) : '—'}</td>
            <td>
              <span className={`badge ${badgeClass[t.status] || 'badge-open'}`}>{t.status}</span>
            </td>
            <td style={{ color: 'var(--text-muted)' }}>{new Date(t.opened_at).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
