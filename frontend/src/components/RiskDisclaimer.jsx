import React, { useState } from 'react';

const DISMISS_KEY = 'risk_disclaimer_dismissed';

export default function RiskDisclaimer() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');

  if (dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  return (
    <div className="risk-disclaimer" role="alert">
      <span>⚠</span>
      <span>
        Synthetic indices and derivatives carry a high level of risk and can result in losses exceeding your stake.
        Trade only with money you can afford to lose.
      </span>
      <button onClick={dismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
