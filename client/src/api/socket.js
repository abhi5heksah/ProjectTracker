import { io } from 'socket.io-client';
import useAuthStore from '../store/useAuthStore';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const token = useAuthStore.getState().accessToken;
    socket = io(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000', {
      auth: {
        token,
      },
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
