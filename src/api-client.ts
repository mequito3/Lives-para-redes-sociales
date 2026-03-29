import type { SongRequest } from './db-operations';

// For Hostinger, we use api.php directly to avoid Node.js dependency issues.
// In development (local), we point to the Laragon Apache server because the Node/Vite server cannot execute PHP.
const isDev = import.meta.env.DEV;
const API_BASE = isDev 
  ? 'http://localhost/livejukebox/api.php' 
  : '/api.php';

export async function fetchPendingRequests(): Promise<SongRequest[]> {
  const response = await fetch(`${API_BASE}/api/songs`);
  if (!response.ok) throw new Error('Failed to fetch songs');
  return response.json();
}

export async function createSongRequest(request: Omit<SongRequest, 'id' | 'createdAt'>): Promise<number> {
  const response = await fetch(`${API_BASE}/api/songs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  if (!response.ok) throw new Error('Failed to create song request');
  const data = await response.json();
  return data.id;
}

export async function updateSongRequestAPI(id: number, updates: Partial<SongRequest>): Promise<void> {
  const response = await fetch(`${API_BASE}/api/songs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error('Failed to update song request');
}

export async function deleteSongRequestAPI(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/songs/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete song request');
}

export async function fetchStreamerStatus(): Promise<{ isLive: boolean }> {
  const response = await fetch(`${API_BASE}/api/status`);
  if (!response.ok) throw new Error('Failed to fetch status');
  return response.json();
}

export async function updateStreamerStatusAPI(isLive: boolean): Promise<void> {
  const response = await fetch(`${API_BASE}/api/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isLive })
  });
  if (!response.ok) throw new Error('Failed to update status');
}