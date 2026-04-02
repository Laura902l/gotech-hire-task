import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import ChatPage from './components/ChatPage';

import { API_URL } from './config';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [userId, setUserId] = useState<number | null>(
    localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId')!) : null
  );

  const socketRef = React.useRef<any>(null);
console.log('TOKEN BEFORE SOCKET:', token);
  React.useEffect(() => {
      if (!token) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    socketRef.current = io(API_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
    });
    try {
      (window as any).__socket = socketRef.current;
      console.log('socket created', socketRef.current);
    } catch (err) {
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token]);
  const socket = socketRef.current;

  const handleLogin = (newToken: string, newUserId: number) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('userId', String(newUserId));
    setToken(newToken);
    setUserId(newUserId);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setToken(null);
    setUserId(null);
  };

  return (
    // No ErrorBoundary wrapping the app
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/chat" /> : <LoginPage onLogin={handleLogin} />} />
        <Route path="/register" element={token ? <Navigate to="/chat" /> : <RegisterPage onLogin={handleLogin} />} />
        <Route
          path="/chat"
          element={token ? <ChatPage token={token} userId={userId!} socket={socket} apiUrl={API_URL} onLogout={handleLogout} /> : <Navigate to="/login" />}
        />
        <Route path="*" element={<Navigate to={token ? '/chat' : '/login'} />} />
      </Routes>
    </BrowserRouter>
  );
}
