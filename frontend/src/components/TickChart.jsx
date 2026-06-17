import React, { useEffect, useRef, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

const MAX_POINTS = 60;

export default function TickChart({ ticks }) {
  const [pulse, setPulse] = useState(false);
  const prevPrice = useRef(null);
  const [direction, setDirection] = useState('flat');

  const latest = ticks[ticks.length - 1];

  useEffect(() => {
    if (!latest) return;
    if (prevPrice.current !== null) {
      setDirection(latest.quote > prevPrice.current ? 'up' : latest.quote < prevPrice.current ? 'down' : 'flat');
    }
    prevPrice.current = latest.quote;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 250);
    return () => clearTimeout(t);
  }, [latest?.quote]);

  const data = ticks.slice(-MAX_POINTS).map((t) => ({ quote: t.quote }));
  const lineColor = direction === 'up' ? 'var(--up)' : direction === 'down' ? 'var(--down)' : 'var(--accent-teal)';

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>{latest?.symbol || 'Select a market'}</p>
          <div className={`ticker ${direction} ${pulse ? 'pulse' : ''}`}>
            {latest ? latest.quote.toFixed(latest.pip_size || 2) : '—'}
          </div>
        </div>
      </div>
      <div style={{ height: 180, marginTop: 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <YAxis hide domain={['auto', 'auto']} />
            <Line type="monotone" dataKey="quote" stroke={lineColor} dot={false} strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
