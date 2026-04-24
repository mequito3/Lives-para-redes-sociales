/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useNavigate,
  useLocation
} from 'react-router-dom';
import { 
  Search, 
  Music, 
  Play, 
  CheckCircle, 
  User, 
  Tv, 
  Trash2,
  Settings,
  AlertCircle,
  ChevronRight,
  ThumbsUp,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchPendingRequests, createSongRequest, updateSongRequestAPI, deleteSongRequestAPI, fetchStreamerStatus, updateStreamerStatusAPI } from './api-client';
import { cn } from './lib/utils';

// --- Types ---
interface SongRequest {
  id: number;
  usuario: string;
  youtube_id: string;
  titulo: string;
  miniatura: string;
  reproducida: boolean;
  duracion?: number; // Duración en segundos
  createdAt: Date;
  votos?: number;
  votosUsuarios?: string[]; // Para evitar votos duplicados por sesión
}

interface YouTubeResult {
  id: { 
    kind: string;
    videoId?: string;
  };
  snippet: {
    title: string;
    thumbnails: {
      medium: { url: string };
    };
  };
}

// --- Utils ---
const parseYouTubeDuration = (duration: string): number => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 240; // Fallback 4 mins
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  return (hours * 3600) + (minutes * 60) + seconds;
};

const formatEstimatedTime = (seconds: number) => {
  if (seconds <= 0) return '0 min';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// --- Components ---

function CopyButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // Intentamos obtener el origen, pero si estamos en dev, usamos el link público (-pre-)
    let url = window.location.origin + '/overlay';
    if (url.includes('-dev-')) {
      url = url.replace('-dev-', '-pre-');
    }
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button 
        onClick={handleCopy}
        className={cn(
          "px-4 py-2 rounded-full text-white text-xs font-bold transition-all flex items-center gap-2 border",
          copied 
            ? "bg-green-600 border-green-500 shadow-[0_0_15px_rgba(22,163,74,0.4)]" 
            : "bg-orange-600 hover:bg-orange-500 border-orange-500/30"
        )}
      >
        {copied ? (
          <>
            <CheckCircle className="w-3 h-3" />
            ¡LINK COPIADO!
          </>
        ) : (
          <>
            <ExternalLink className="w-3 h-3" />
            COPIAR LINK OVERLAY
          </>
        )}
      </button>
      {window.location.href.includes('-dev-') && (
        <p className="text-[9px] text-orange-400 font-bold animate-pulse">
          ⚠️ USA EL "SHARED APP URL" PARA OBS
        </p>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [apiKey, setApiKey] = useState(() => {
    const stored = localStorage.getItem('jukebox_api_key');
    if (stored) return stored;
    // Handle comma-separated keys in .env — take the first valid one
    const envKey = import.meta.env.VITE_YOUTUBE_API_KEY || '';
    return envKey.split(',')[0].trim();
  });
  const [showConfig, setShowConfig] = useState(false);
  const [streamerPass, setStreamerPass] = useState('');
  const [isStreamerAuth, setIsStreamerAuth] = useState(false);
  const [passError, setPassError] = useState(false);

  useEffect(() => {
    localStorage.setItem('jukebox_api_key', apiKey);
  }, [apiKey]);

  const handleStreamerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (streamerPass === 'americo123') {
      setIsStreamerAuth(true);
      setPassError(false);
    } else {
      setPassError(true);
      setStreamerPass('');
    }
  };

  return (
    <div className={cn(
      "min-h-[100dvh] text-white font-sans selection:bg-orange-500/30",
      location.pathname === '/overlay' ? "bg-transparent" : "bg-[#0a0a0a]"
    )}>
      <Routes>
        <Route path="/" element={
          <div className="min-h-[100dvh]">
            <main className="max-w-6xl mx-auto px-4 py-8">
              <UserView apiKey={apiKey} />
            </main>
          </div>
        } />

        <Route path="/admin" element={
          <div className="min-h-screen">
            {!isStreamerAuth ? (
              <div className="min-h-screen flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-sm w-full bg-white/5 border border-white/10 p-8 rounded-[40px] text-center space-y-6"
                >
                  <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-orange-600/20">
                    <Tv className="w-8 h-8 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Acceso Streamer</h2>
                    <p className="text-white/40 text-sm">Introduce la contraseña para entrar a tu auto</p>
                  </div>

                  <form onSubmit={handleStreamerLogin} className="space-y-4">
                    <div className="relative">
                      <input 
                        type="password" 
                        value={streamerPass}
                        onChange={(e) => setStreamerPass(e.target.value)}
                        placeholder="Contraseña..."
                        autoFocus
                        className={cn(
                          "w-full bg-black border rounded-2xl px-4 py-4 text-center text-lg focus:border-orange-500 outline-none transition-all",
                          passError ? "border-red-500 animate-shake" : "border-white/10"
                        )}
                      />
                      {passError && (
                        <p className="text-red-500 text-xs mt-2 flex items-center justify-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Contraseña incorrecta
                        </p>
                      )}
                    </div>
                    <button 
                      type="submit"
                      className="w-full bg-orange-600 hover:bg-orange-500 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-orange-600/20"
                    >
                      Entrar
                    </button>
                    <Link 
                      to="/"
                      className="text-white/20 hover:text-white/40 text-sm transition-colors block"
                    >
                      Volver
                    </Link>
                  </form>
                </motion.div>
              </div>
            ) : (
              <div className="min-h-[100dvh] bg-[#0a0a0a]">
                <header className="max-w-6xl mx-auto px-4 pt-6 flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Link 
                      to="/"
                      className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/40 hover:text-white transition-all flex items-center justify-center"
                      title="Volver a la vista de usuario"
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </Link>
                    <Link 
                      to="/overlay"
                      target="_blank"
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white text-[10px] sm:text-xs font-bold transition-all flex items-center gap-2"
                      title="Previsualizar Overlay"
                    >
                      <ExternalLink className="w-3 h-3" />
                      VER OVERLAY
                    </Link>
                    <CopyButton />
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <div className="flex items-center gap-2 text-white/20 text-[10px] font-black uppercase tracking-widest">
                      <Tv className="w-3 h-3" />
                      Panel de Control
                    </div>
                    {window.location.href.includes('-dev-') && (
                      <p className="text-[10px] text-orange-500/60 font-medium mt-1">
                        Modo Desarrollo: El botón copia el link público automáticamente.
                      </p>
                    )}
                  </div>
                </header>
                <main className="max-w-6xl mx-auto px-4 py-8">
                  <StreamerView />
                </main>
              </div>
            )}
          </div>
        } />

        <Route path="/overlay" element={<OverlayView />} />
      </Routes>
    </div>
  );
}

// --- User View ---

function UserView({ apiKey }: { apiKey: string }) {
  const [queryStr, setQueryStr] = useState('');
  const [results, setResults] = useState<YouTubeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem('jukebox_user') || '');
  const [requesting, setRequesting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [queue, setQueue] = useState<SongRequest[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [requestedId, setRequestedId] = useState<string | null>(null);

  // Persist username
  useEffect(() => {
    localStorage.setItem('jukebox_user', userName);
  }, [userName]);

  // Poll streamer status every 10 seconds
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await fetchStreamerStatus();
        setIsLive(status.isLive);
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Dynamic search with debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (queryStr.trim().length >= 3) {
        searchSongs();
      } else if (queryStr.trim().length === 0) {
        setResults([]);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [queryStr]);

  // Listen to queue
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const list = await fetchPendingRequests();
        setQueue(list);
      } catch (error) {
        console.error('Error fetching queue:', error);
      }
    };

    fetchQueue(); // Initial fetch
    const interval = setInterval(fetchQueue, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const searchSongs = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!apiKey) {
      setMessage({ text: "⚠️ Falta la API Key de YouTube. Configúrala en el icono de engranaje.", type: 'error' });
      return;
    }

    if (!queryStr.trim()) {
      return;
    }

    setLoading(true);
    // Don't clear results immediately to avoid flickering during dynamic search
    // setResults([]); 

    try {
      const musicFilter = '&videoCategoryId=10';
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryStr)}&maxResults=6&type=video${musicFilter}&key=${apiKey}`
      );
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "Error desconocido de YouTube");
      }

      const data = await res.json();
      
      if (!data.items || data.items.length === 0) {
        setMessage({ text: "No se encontraron resultados para esa búsqueda.", type: 'error' });
      } else {
        // Filter to ensure we only have videos with IDs
        const filteredResults = data.items.filter((item: any) => item.id && item.id.videoId);
        if (filteredResults.length === 0) {
          setMessage({ text: "No se encontraron videos válidos.", type: 'error' });
        }
        setResults(filteredResults);
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: "❌ Error: " + err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (video: YouTubeResult) => {
    const videoId = video.id?.videoId;

    if (!videoId) {
      setMessage({ text: "Error: No se pudo obtener el ID del video.", type: 'error' });
      return;
    }

    if (!userName.trim()) {
      setMessage({ text: "Por favor, introduce tu nombre de usuario.", type: 'error' });
      return;
    }

    setRequesting(videoId);
    try {
      // Obtener duración del video
      const durRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${apiKey}`
      );
      const durData = await durRes.json();
      const durationStr = durData.items?.[0]?.contentDetails?.duration || 'PT4M';
      const durationSec = parseYouTubeDuration(durationStr);

      await createSongRequest({
        usuario: userName,
        youtube_id: videoId,
        titulo: video.snippet.title,
        miniatura: video.snippet.thumbnails.medium.url,
        reproducida: false,
        duracion: durationSec,
        votos: 0,
        votosUsuarios: []
      });

      // Mostrar éxito en la tarjeta antes de limpiar — evita pantalla en blanco en móvil
      setRequestedId(videoId);
      setMessage({ text: "¡Canción añadida a la cola!", type: 'success' });
      setTimeout(() => {
        setQueryStr('');
        setResults([]);
        setRequestedId(null);
        setMessage(null);
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setMessage({ text: "Error al pedir: " + err.message, type: 'error' });
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setRequesting(null);
    }
  };

  const handleVote = async (song: SongRequest) => {
    if (!userName.trim()) {
      setMessage({ text: "Introduce tu nombre para votar.", type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const yaVoto = song.votosUsuarios?.includes(userName);
    if (yaVoto) {
      setMessage({ text: "Ya has votado por esta canción.", type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const newVotos = (song.votos || 0) + 1;
    const newVotosUsuarios = [...(song.votosUsuarios || []), userName];

    // Optimistic update — el contador sube al instante sin esperar el poll
    setQueue(prev => prev.map(s =>
      s.id === song.id ? { ...s, votos: newVotos, votosUsuarios: newVotosUsuarios } : s
    ));

    try {
      await updateSongRequestAPI(song.id, {
        votos: newVotos,
        votosUsuarios: newVotosUsuarios
      });
    } catch (err) {
      console.error("Error al votar:", err);
      // Revert on error
      setQueue(prev => prev.map(s =>
        s.id === song.id ? { ...s, votos: song.votos, votosUsuarios: song.votosUsuarios } : s
      ));
    }
  };

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {!isLive && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-orange-600/10 border border-orange-600/30 p-4 rounded-2xl flex items-start gap-4 text-orange-400">
              <div className="bg-orange-600/20 p-2 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm uppercase tracking-wider">Streamer Desconectado</h4>
                <p className="text-sm text-orange-400/80 leading-relaxed">
                  El reproductor no está activo. Tu música podría no sonar en este momento.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight px-2">Pide tu canción favorita</h2>
        <p className="text-sm sm:text-base text-white/60 px-4">Busca cualquier canción en YouTube y el streamer la reproducirá en vivo.</p>
      </div>

      <div className="max-w-xl mx-auto space-y-4">
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input 
            type="text" 
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Tu nombre en TikTok..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:border-orange-500 outline-none transition-all text-lg"
          />
        </div>

        <div className="relative">
          <Search className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
            loading ? "text-orange-500 animate-pulse" : "text-white/40"
          )} />
          <input 
            type="text" 
            value={queryStr}
            onChange={(e) => setQueryStr(e.target.value)}
            placeholder="Nombre de la canción o artista..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:border-orange-500 outline-none transition-all text-lg"
          />
        </div>
      </div>

      {loading && results.length === 0 && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {message && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "max-w-xl mx-auto p-4 rounded-xl flex items-center gap-3",
            message.type === 'success' ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"
          )}
        >
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {results.map((video) => (
            <motion.div 
              key={video.id.videoId}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all"
            >
              <div className="aspect-video relative overflow-hidden">
                <img src={video.snippet.thumbnails.medium.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-4 space-y-3">
                <h3 className="font-medium line-clamp-2 h-12" dangerouslySetInnerHTML={{ __html: video.snippet.title }} />
                <button
                  onClick={() => handleRequest(video)}
                  disabled={requesting === video.id.videoId || requestedId === video.id.videoId}
                  className={cn(
                    "w-full py-2 rounded-xl font-semibold transition-all flex items-center justify-center gap-2",
                    requestedId === video.id.videoId
                      ? "bg-green-500 text-white cursor-default"
                      : "bg-white text-black hover:bg-orange-500 hover:text-white"
                  )}
                >
                  {requesting === video.id.videoId ? (
                    'Pidiendo...'
                  ) : requestedId === video.id.videoId ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      ¡Pedida!
                    </>
                  ) : (
                    <>
                      Pedir Canción
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Public Queue */}
      <div className="mt-12 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold">Lista de Espera</h2>
            <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs text-white/60">{queue.length}</span>
          </div>
          
          {queue.length > 0 && (
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
              <div className="flex flex-col">
                <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Tiempo Estimado</span>
                <span className="text-sm font-bold text-orange-500">
                  ~{formatEstimatedTime(queue.reduce((acc, curr) => acc + (curr.duracion || 240), 0))}
                </span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Promedio</span>
                <span className="text-sm font-bold">
                  {formatDuration(Math.round(queue.reduce((acc, curr) => acc + (curr.duracion || 240), 0) / queue.length))}
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {queue.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl relative group">
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative">
                <img src={item.miniatura} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] font-bold">
                  #{index + 1}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium line-clamp-1" dangerouslySetInnerHTML={{ __html: item.titulo }} />
                <div className="flex items-center justify-between mt-1">
                  <div className="flex flex-col">
                    <p className="text-[10px] text-white/40 truncate">Por: {item.usuario}</p>
                    {item.duracion && (
                      <p className="text-[9px] text-orange-500/60 font-medium">{formatDuration(item.duracion)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleVote(item)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all",
                        item.votosUsuarios?.includes(userName) 
                          ? "bg-orange-500 text-white" 
                          : "bg-white/10 text-white/60 hover:bg-white/20"
                      )}
                    >
                      <ThumbsUp className="w-2.5 h-2.5" />
                      {item.votos || 0}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {queue.length === 0 && (
            <div className="col-span-full py-8 text-center text-white/20 border border-dashed border-white/10 rounded-2xl">
              No hay canciones en espera. ¡Sé el primero en pedir!
            </div>
          )}
        </div>
      </div>

      {/* Version badge */}
      <div className="flex items-center justify-center gap-2 pt-8 pb-4">
        <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[10px] font-bold text-white/30 tracking-widest uppercase">
          <Music className="w-2.5 h-2.5 text-orange-500/60" />
          Live Jukebox
          <span className="bg-orange-600/30 text-orange-400/80 px-1.5 py-0.5 rounded-full text-[9px]">v2.1</span>
        </span>
      </div>
    </div>
  );
}

// --- Streamer View ---

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

function StreamerView() {
  const [pedidos, setPedidos] = useState<SongRequest[]>([]);
  const [currentSong, setCurrentSong] = useState<SongRequest | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [hasStarted, setHasStarted] = useState(() => localStorage.getItem('jukebox_started') === 'true');
  const playerRef = useRef<any>(null);
  const currentSongIdRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem('jukebox_started', String(hasStarted));
  }, [hasStarted]);

  // Update streamer status in database
  useEffect(() => {
    const updateStatus = async (live: boolean) => {
      try {
        await updateStreamerStatusAPI(live);
      } catch (err) {
        console.error("Error updating status:", err);
      }
    };

    updateStatus(hasStarted);

    // Cleanup on unmount
    return () => {
      updateStatus(false);
    };
  }, [hasStarted]);

  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  // Update ref when currentSong changes
  useEffect(() => {
    currentSongIdRef.current = currentSong?.id ?? null;
  }, [currentSong?.id, hasStarted]);

  // Cargar API de YouTube
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      setPlayerReady(true);
    };

    if (window.YT && window.YT.Player) {
      setPlayerReady(true);
    }
  }, []);

  // Poll queue every 3 seconds
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const list = await fetchPendingRequests();
        setPedidos(list);
        const isCurrentStillPending = list.some(s => s.id === currentSongIdRef.current);
        if (list.length > 0 && (currentSongIdRef.current == null || !isCurrentStillPending)) {
          setCurrentSong(list[0]);
        } else if (list.length === 0) {
          setCurrentSong(null);
        }
      } catch (error) {
        console.error('Error fetching queue:', error);
      }
    };
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  // Inicializar o actualizar el reproductor
  useEffect(() => {
    if (playerReady && currentSong && hasStarted) {
      if (!playerRef.current) {
        playerRef.current = new window.YT.Player('youtube-player', {
          height: '100%',
          width: '100%',
          videoId: currentSong.youtube_id,
          playerVars: {
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
            rel: 0
          },
          events: {
            onStateChange: (event: any) => {
              if (event.data === 0) {
                if (currentSongIdRef.current != null) {
                  markAsPlayed(currentSongIdRef.current);
                }
              }
            },
            onError: (event: any) => {
              console.error("YouTube Player Error:", event.data);
              if (currentSongIdRef.current != null) {
                markAsPlayed(currentSongIdRef.current);
              }
            },
            onReady: (event: any) => {
              event.target.playVideo();
            }
          }
        });
      } else {
        // Only load if it's a different video to avoid unnecessary flickering
        try {
          const currentVideoId = playerRef.current.getVideoData?.()?.video_id;
          if (currentVideoId !== currentSong.youtube_id) {
            playerRef.current.loadVideoById(currentSong.youtube_id);
          }
        } catch (e) {
          // Fallback if getVideoData is not available yet
          playerRef.current.loadVideoById(currentSong.youtube_id);
        }
      }
    }
  }, [playerReady, currentSong, hasStarted]);

  const markingRef = useRef<number | null>(null);

  const markAsPlayed = async (id: number) => {
    if (id == null || markingRef.current === id) return;
    markingRef.current = id;

    // Optimistic update: find next song in current list
    const currentIndex = pedidos.findIndex(p => p.id === id);
    if (currentIndex !== -1 && currentIndex < pedidos.length - 1) {
      setCurrentSong(pedidos[currentIndex + 1]);
    } else if (pedidos.length <= 1) {
      setCurrentSong(null);
    }

    console.log("Marcando canción como reproducida:", id);
    try {
      await updateSongRequestAPI(id, { reproducida: true });
      markingRef.current = null;
    } catch (err) {
      console.error("Error al marcar como reproducida:", err);
      markingRef.current = null;
    }
  };

  const deleteRequest = async (id: number) => {
    try {
      await deleteSongRequestAPI(id);
    } catch (err) {
      console.error("Error al borrar:", err);
    }
  };

  if (!hasStarted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-8 text-center bg-white/5 rounded-[40px] border border-white/10">
        <div className="w-24 h-24 bg-orange-600 rounded-full flex items-center justify-center animate-pulse shadow-2xl shadow-orange-600/40">
          <Play className="w-12 h-12 text-white fill-white" />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-bold">Modo Streamer Listo</h2>
          <p className="text-white/60 max-w-sm mx-auto">Toca el botón de abajo para activar el reproductor automático. ¡Las peticiones de tu audiencia sonarán solas!</p>
        </div>
        <button 
          onClick={() => setHasStarted(true)}
          className="bg-white text-black px-12 py-5 rounded-3xl font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-xl"
        >
          🚀 ACTIVAR REPRODUCTOR
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Reproductor */}
      <div className="lg:col-span-2 space-y-6">
        <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative group">
          <div id="youtube-player" className="w-full h-full"></div>
          
          {!currentSong && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 space-y-4 bg-[#0a0a0a]">
              <Play className="w-20 h-20" />
              <p className="text-lg font-medium">Esperando peticiones...</p>
            </div>
          )}
        </div>

        {currentSong && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Music className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white/40 uppercase tracking-widest font-bold">Reproduciendo Ahora</p>
                  <h3 className="text-xl font-bold line-clamp-1" dangerouslySetInnerHTML={{ __html: currentSong.titulo }} />
                  <p className="text-orange-500 font-medium">Pedido por: {currentSong.usuario}</p>
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button 
                  onClick={() => markAsPlayed(currentSong.id)}
                  className="flex-1 md:flex-none bg-white text-black hover:bg-orange-500 hover:text-white px-8 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  Siguiente
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cola de Peticiones */}
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              Cola de Espera
              <span className="bg-orange-600 text-[10px] px-2 py-0.5 rounded-full">{pedidos.length}</span>
            </h2>
          </div>
          
          {pedidos.length > 0 && (
            <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-white/40">
              <div className="flex flex-col">
                <span>Tiempo Restante</span>
                <span className="text-orange-500 text-xs">~{formatEstimatedTime(pedidos.reduce((acc, curr) => acc + (curr.duracion || 240), 0))}</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col text-right">
                <span>Promedio</span>
                <span className="text-white text-xs">{formatDuration(Math.round(pedidos.reduce((acc, curr) => acc + (curr.duracion || 240), 0) / pedidos.length))}</span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {pedidos.map((pedido, index) => (
              <motion.div 
                key={pedido.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={cn(
                  "p-4 rounded-2xl border transition-all flex gap-4 group",
                  index === 0 ? "bg-orange-500/10 border-orange-500/30" : "bg-white/5 border-white/10"
                )}
              >
                <div className="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={pedido.miniatura} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-1" dangerouslySetInnerHTML={{ __html: pedido.titulo }} />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-white/40">Por: <span className="text-white/80">{pedido.usuario}</span></p>
                    {pedido.duracion && (
                      <span className="text-[10px] text-orange-500 font-bold">{formatDuration(pedido.duracion)}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setCurrentSong(pedido)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteRequest(pedido.id)}
                    className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-500/60 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {pedidos.length === 0 && (
            <div className="text-center py-12 text-white/20 border-2 border-dashed border-white/5 rounded-3xl">
              <Music className="w-12 h-12 mx-auto mb-2 opacity-10" />
              <p>No hay canciones en cola</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Overlay View (OBS) ---

function OverlayView() {
  const [currentSong, setCurrentSong] = useState<SongRequest | null>(null);
  const [nextSong, setNextSong] = useState<SongRequest | null>(null);

  // Poll queue every 3 seconds for overlay
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const list = await fetchPendingRequests();
        if (list.length > 0) {
          setCurrentSong(list[0]);
          setNextSong(list[1] || null);
        } else {
          setCurrentSong(null);
          setNextSong(null);
        }
      } catch (error) {
        console.error('Overlay: Error fetching queue:', error);
      }
    };
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-transparent flex items-end p-4 sm:p-8 overflow-hidden pointer-events-none">
      <AnimatePresence mode="wait">
        {!currentSong ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="text-[9px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-2 sm:ml-4 mb-2 sm:mb-4"
          >
            Overlay Activo • Esperando Petición
          </motion.div>
        ) : (
          <motion.div 
            initial={{ x: -100, opacity: 0, scale: 0.8 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 100, opacity: 0, scale: 0.8 }}
            key={currentSong.id}
            className="flex items-center gap-4 sm:gap-6 bg-black/95 backdrop-blur-xl border border-orange-500/20 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] shadow-2xl shadow-orange-600/10 w-full sm:max-w-2xl"
          >
            {/* Album Art / Thumbnail */}
            <div className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl overflow-hidden flex-shrink-0 shadow-lg border-2 border-orange-500/30">
              <img src={currentSong.miniatura} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              
              {/* Animated Audio Bars */}
              <div className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-0.5 h-3 sm:h-4">
                {[1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [3, 10, 5, 14, 7] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                    className="w-0.5 sm:w-1 bg-orange-500 rounded-full"
                  />
                ))}
              </div>
            </div>

            {/* Song Info */}
            <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-1.5 py-0.5 bg-orange-600 text-[8px] sm:text-[10px] font-black rounded-full uppercase tracking-tighter text-white">SONANDO AHORA</span>
                {currentSong.votos && currentSong.votos > 0 && (
                  <div className="flex items-center gap-1 text-orange-500 text-[8px] sm:text-[10px] font-bold bg-orange-500/10 px-1.5 py-0.5 rounded-full">
                    <ThumbsUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    {currentSong.votos} VOTOS
                  </div>
                )}
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-white truncate leading-tight italic uppercase tracking-tighter" dangerouslySetInnerHTML={{ __html: currentSong.titulo }} />
              <p className="text-white/60 text-[10px] sm:text-sm font-medium">Pedido por: <span className="text-orange-400 font-bold">{currentSong.usuario}</span></p>
            </div>

            {/* Next Song Preview */}
            {nextSong && (
              <div className="ml-4 sm:ml-6 pl-4 sm:pl-6 border-l border-white/10 hidden lg:block max-w-[180px]">
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1">SIGUIENTE</p>
                <p className="text-[11px] font-bold text-white/80 truncate" dangerouslySetInnerHTML={{ __html: nextSong.titulo }} />
                <p className="text-[9px] text-white/40 truncate">Por: {nextSong.usuario}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
