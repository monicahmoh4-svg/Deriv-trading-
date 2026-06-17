import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import { useAuth } from './AuthContext';

const AccountContext = createContext(null);

export function AccountProvider({ children }) {
  const { token } = useAuth();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) {
      setAccount(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await client.get('/deriv/account');
      setAccount(data);
    } catch {
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AccountContext.Provider value={{ account, loading, refresh }}>{children}</AccountContext.Provider>
  );
}

export function useAccount() {
  return useContext(AccountContext);
}
