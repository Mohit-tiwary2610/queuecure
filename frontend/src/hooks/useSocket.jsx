import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [clinicState, setClinicState] = useState({
    queue: [],
    currentToken: null,
    avgConsultationTime: 8,
    totalServed: 0,
    clinicOpen: true,
    stats: { totalWaiting: 0, urgentCount: 0, estimatedClearTime: 0 },
    lastUpdated: null
  });
  const [lastCalledToken, setLastCalledToken] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const s = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      setConnected(true);
      console.log('Socket connected:', s.id);
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    s.on('state_update', (state) => {
      setClinicState(state);
    });

    s.on('token_called', (data) => {
      setLastCalledToken(data);
      // Clear after 10 seconds
      setTimeout(() => setLastCalledToken(null), 10000);
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const emit = useCallback((event, data) => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({ error: 'Not connected' });
      socketRef.current.emit(event, data, (response) => {
        resolve(response || {});
      });
    });
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, clinicState, emit, lastCalledToken }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
