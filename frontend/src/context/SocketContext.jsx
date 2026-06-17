import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin.replace(':5173', ':4000');

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const socketRef = useRef(null);
  const listenersRef = useRef(new Map()); // symbol -> Set<callback>
  const subscribedRef = useRef(new Set());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect();
      return;
    }

    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Re-subscribe to anything that was active before a reconnect.
      subscribedRef.current.forEach((symbol) => socket.emit('subscribe_ticks', symbol));
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('tick', (tick) => {
      listenersRef.current.get(tick.symbol)?.forEach((cb) => cb(tick));
    });

    return () => {
      socket.disconnect();
      subscribedRef.current.clear();
    };
  }, [token]);

  function subscribeTicks(symbol, callback) {
    if (!listenersRef.current.has(symbol)) listenersRef.current.set(symbol, new Set());
    listenersRef.current.get(symbol).add(callback);

    if (!subscribedRef.current.has(symbol)) {
      subscribedRef.current.add(symbol);
      socketRef.current?.emit('subscribe_ticks', symbol);
    }

    return () => {
      listenersRef.current.get(symbol)?.delete(callback);
    };
  }

  return (
    <SocketContext.Provider value={{ connected, subscribeTicks }}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
