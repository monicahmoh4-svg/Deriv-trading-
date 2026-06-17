import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';

function TickerItem({ symbol, label }) {
  const { subscribeTicks } = useSocket();
  const [tick, setTick] = useState(null);
  const prevQuote = useRef(null);
  const [direction, setDirection] = useState('flat');

  useEffect(() => {
    const unsubscribe = subscribeTicks(symbol, (t) => {
      if (prevQuote.current !== null) {
        setDirection(t.quote > prevQuote.current ? 'up' : t.quote < prevQuote.current ? 'down' : direction);
      }
      prevQuote.current = t.quote;
      setTick(t);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  return (
    <div className="ticker-item">
      <div className="label">{label}</div>
      <div className="value">
        <span className={`price mono ${direction}`}>{tick ? tick.quote.toFixed(tick.pip_size || 2) : '—'}</span>
        <span className={`arrow ${direction}`}>{direction === 'up' ? '▲' : direction === 'down' ? '▼' : ''}</span>
      </div>
    </div>
  );
}

export default function TickerStrip({ symbols }) {
  if (!symbols.length) return null;
  return (
    <div className="ticker-strip">
      {symbols.map((s) => (
        <TickerItem key={s.symbol} symbol={s.symbol} label={s.display_name} />
      ))}
    </div>
  );
}
