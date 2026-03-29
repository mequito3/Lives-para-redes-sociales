import { io, Socket } from 'socket.io-client';
import type { SongRequest } from './db-operations';

let socket: Socket | null = null;

export function initializeSocket() {
  if (socket) return socket;

  const isDev = import.meta.env.DEV;
  const url = isDev ? 'http://localhost:3000' : window.location.origin;

  socket = io(url, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('✅ WebSocket connected:', socket?.id);
  });

  socket.on('disconnect', () => {
    console.log('❌ WebSocket disconnected');
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Event listeners
export function onSongsUpdated(callback: (songs: SongRequest[]) => void) {
  if (!socket) initializeSocket();
  socket?.on('songs_updated', callback);
}

export function onStatusUpdated(callback: (status: { isLive: boolean }) => void) {
  if (!socket) initializeSocket();
  socket?.on('status_updated', callback);
}

// Event emitters
export function requestSongs() {
  if (!socket) initializeSocket();
  socket?.emit('request_songs');
}

export function requestStatus() {
  if (!socket) initializeSocket();
  socket?.emit('request_status');
}

// Remove listeners
export function offSongsUpdated() {
  socket?.off('songs_updated');
}

export function offStatusUpdated() {
  socket?.off('status_updated');
}