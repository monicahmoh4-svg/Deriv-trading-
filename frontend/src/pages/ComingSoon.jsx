import React from 'react';
import TopNav from '../components/TopNav';

export default function ComingSoon({ title }) {
  return (
    <div className="layout">
      <TopNav />
      <main className="main">
        <span className="coming-soon-badge">Coming soon</span>
        <h2>{title}</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: 480 }}>
          This module isn't built yet. The current release covers token-based account linking, live market data,
          and manual trade execution - the rest gets layered in next.
        </p>
      </main>
    </div>
  );
}
