import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';

const TABS = [
  { to: '/', label: 'Dashboard' },
  { to: '/trade', label: 'Manual Trader' },
  { to: '/bot-builder', label: 'Bot Builder' },
  { to: '/bulk-trader', label: 'Bulk Trader' },
  { to: '/ai-bots', label: 'AI Bots' },
  { to: '/copy-trader', label: 'Copy Trader' },
  { to: '/analysis-tools', label: 'Analysis Tools' },
];

export default function TopNav() {
  const { logout } = useAuth();
  const { account, refresh } = useAccount();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  return (
    <header className="topnav">
      <div className="topnav-row">
        <div className="topnav-left">
          <button
            className="icon-btn"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            ☰
          </button>
          <button className="icon-btn" aria-label="Refresh" onClick={refresh}>
            ⟳
          </button>
          <span className="brand">deriv<span>terminal</span></span>
        </div>

        <div className="topnav-right">
          <div className="account-pill" onClick={() => setAccountMenuOpen((v) => !v)}>
            {account ? (
              <>
                <span className="mono">
                  {Number(account.balance).toFixed(2)} {account.currency}
                </span>
                <span className="caret">▾</span>
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Not connected</span>
            )}
            {accountMenuOpen && (
              <div className="account-menu" onClick={(e) => e.stopPropagation()}>
                {account ? (
                  <>
                    <div className="account-menu-row">
                      <span style={{ color: 'var(--text-muted)' }}>Account</span>
                      <span>{account.loginid}</span>
                    </div>
                    <div className="account-menu-row">
                      <span style={{ color: 'var(--text-muted)' }}>Type</span>
                      <span>{account.is_virtual ? 'Demo' : 'Real'}</span>
                    </div>
                    <NavLink to="/connect" className="account-menu-link">
                      Manage connection
                    </NavLink>
                  </>
                ) : (
                  <NavLink to="/connect" className="account-menu-link">
                    Connect Deriv account
                  </NavLink>
                )}
                <button className="account-menu-link" onClick={logout}>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <nav className={`tabstrip${menuOpen ? ' open' : ''}`}>
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `tab${isActive ? ' active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
