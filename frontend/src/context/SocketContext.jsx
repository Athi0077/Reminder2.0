import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    let newSocket;
    if (user) {
      const token = localStorage.getItem('token');
      const rawApiUrl = import.meta.env.VITE_API_URL;
      const url = rawApiUrl ? rawApiUrl.replace(/\/+$/, '') : 'http://localhost:5000';
      newSocket = io(url, {
        auth: { token }
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
      });

      setSocket(newSocket);
    }

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
