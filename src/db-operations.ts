import { pool } from './db';

export interface SongRequest {
  id: number;
  usuario: string;
  youtube_id: string;
  titulo: string;
  miniatura: string;
  reproducida: boolean;
  duracion?: number;
  votos?: number;
  votosUsuarios?: string[];
  createdAt: Date;
}

// Get all pending song requests ordered by votes desc, then by created_at asc
export async function getPendingRequests(): Promise<SongRequest[]> {
  try {
    console.log('🔍 Testing database connection...');
    // Test connection first
    await pool.execute('SELECT 1');
    console.log('✅ Database connection OK');

    console.log('🔍 Executing query for pending requests...');
    const [rows] = await pool.execute(
      'SELECT id, usuario, youtube_id, titulo, miniatura, reproducida, duracion, votos, votos_usuarios as votosUsuarios, created_at as createdAt FROM song_requests WHERE reproducida = false ORDER BY votos DESC, created_at ASC'
    );
    console.log(`📊 Query returned ${rows.length} rows`);
    return (rows as any[]).map(row => {
      let votosUsuarios: string[] = [];
      try {
        votosUsuarios = JSON.parse(row.votosUsuarios || '[]');
      } catch (error) {
        console.warn(`⚠️ Invalid JSON in votos_usuarios for song ${row.id}, using empty array`);
        votosUsuarios = [];
      }
      return {
        ...row,
        votosUsuarios,
        createdAt: new Date(row.createdAt)
      };
    });
  } catch (error) {
    console.error('❌ Database error:', error);
    // Return empty array instead of throwing to prevent crashes
    return [];
  }
}

// Add a new song request
export async function addSongRequest(request: Omit<SongRequest, 'id' | 'createdAt'>): Promise<number> {
  const [result] = await pool.execute(
    'INSERT INTO song_requests (usuario, youtube_id, titulo, miniatura, reproducida, duracion, votos, votos_usuarios) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [request.usuario, request.youtube_id, request.titulo, request.miniatura, request.reproducida, request.duracion || 240, request.votos || 0, JSON.stringify(request.votosUsuarios || [])]
  );
  return (result as any).insertId;
}

// Update a song request (for voting or marking as played)
export async function updateSongRequest(id: number, updates: Partial<SongRequest>): Promise<void> {
  const fields = [];
  const values = [];

  if (updates.votos !== undefined) {
    fields.push('votos = ?');
    values.push(updates.votos);
  }
  if (updates.votosUsuarios !== undefined) {
    fields.push('votos_usuarios = ?');
    values.push(JSON.stringify(updates.votosUsuarios));
  }
  if (updates.reproducida !== undefined) {
    fields.push('reproducida = ?');
    values.push(updates.reproducida);
  }

  if (fields.length === 0) return;

  values.push(id);
  await pool.execute(
    `UPDATE song_requests SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

// Delete a song request
export async function deleteSongRequest(id: number): Promise<void> {
  await pool.execute('DELETE FROM song_requests WHERE id = ?', [id]);
}

// Get streamer status
export async function getStreamerStatus(): Promise<{ isLive: boolean }> {
  const [rows] = await pool.execute('SELECT is_live as isLive FROM streamer_status WHERE id = 1');
  return (rows as any[])[0] || { isLive: true };
}

// Update streamer status
export async function updateStreamerStatus(isLive: boolean): Promise<void> {
  await pool.execute('UPDATE streamer_status SET is_live = ? WHERE id = 1', [isLive]);
}