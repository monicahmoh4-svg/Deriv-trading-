import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ConnectDeriv from './pages/ConnectDeriv';
import Dashboard from './pages/Dashboard';
import Trade from './pages/Trade';
import ComingSoon from './pages/ComingSoon';

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/connect"
        element={
          <PrivateRoute>
            <ConnectDeriv />
          </PrivateRoute>
        }
      />
      <Route
        path="/trade"
        element={
          <PrivateRoute>
            <Trade />
          </PrivateRoute>
        }
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />

      {/* Placeholder tabs - present in the nav for parity with the planned product, not yet built */}
      <Route path="/bot-builder" element={<PrivateRoute><ComingSoon title="Bot Builder" /></PrivateRoute>} />
      <Route path="/bulk-trader" element={<PrivateRoute><ComingSoon title="Bulk Trader" /></PrivateRoute>} />
      <Route path="/ai-bots" element={<PrivateRoute><ComingSoon title="AI Bots" /></PrivateRoute>} />
      <Route path="/copy-trader" element={<PrivateRoute><ComingSoon title="Copy Trader" /></PrivateRoute>} />
      <Route path="/analysis-tools" element={<PrivateRoute><ComingSoon title="Analysis Tools" /></PrivateRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
