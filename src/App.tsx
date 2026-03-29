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
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchPendingRequests, createSongRequest, updateSongRequestAPI, deleteSongRequestAPI, fetchStreamerStatus, updateStreamerStatusAPI } from './api-client';
import { initializeSocket, onSongsUpdated, onStatusUpdated, offSongsUpdated, offStatusUpdated, requestSongs, requestStatus } from './socket-client';
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

export interface YouTubeResult {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
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
  const [apiKey, setApiKey] = useState(() => import.meta.env.VITE_YOUTUBE_API_KEY || '');
  const [showConfig, setShowConfig] = useState(false);
  const [streamerPass, setStreamerPass] = useState('');
  const [isStreamerAuth, setIsStreamerAuth] = useState(false);
  const [passError, setPassError] = useState(false);

  // Removed persistent setting of apiKey since settings gear was removed

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
      "min-h-screen text-white font-sans selection:bg-orange-500/30",
      location.pathname === '/overlay' ? "bg-transparent" : "bg-[#0a0a0a]"
    )}>
      <Routes>
        <Route path="/" element={
          <div className="min-h-screen">
            <main className="max-w-6xl mx-auto px-4 py-8">
              <UserView apiKey={apiKey} />
            </main>
            
            {/* Footer Americo Labs */}
            <footer className="max-w-6xl mx-auto px-4 pb-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-white/5">
              <p className="text-sm font-medium text-white/40">
                © {new Date().getFullYear()} Americo Labs. Todos los derechos reservados.
              </p>
              <a 
                href="https://portafolio.americolabs.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group flex items-center gap-2.5 px-5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-full transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]"
              >
                <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-500/80">
                  DISEÑADO POR
                </span>
                <span className="text-sm font-extrabold text-emerald-400">
                  Americo Labs
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            </footer>
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
              <div className="min-h-screen bg-[#0a0a0a]">
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
  const [isLive, setIsLive] = useState(true); // Default to true to avoid initial flicker

  // Persist username
  useEffect(() => {
    localStorage.setItem('jukebox_user', userName);
  }, [userName]);

  // Poll streamer status and queue
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { isLive } = await fetchStreamerStatus();
        setIsLive(isLive);
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Dynamic search with debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (queryStr.trim().length >= 3) {
        searchSongs();
      } else if (queryStr.trim().length === 0) {
        setResults([]);
        setMessage(null);
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
      setMessage({ text: "⚠️ Falta la API Key de YouTube. Configúrala en el archivo .env", type: 'error' });
      return;
    }

    if (!queryStr.trim()) {
      return;
    }

    setLoading(true);

    const keys = apiKey.split(',').map(k => k.trim()).filter(Boolean);
    let success = false;
    let lastError = null;

    for (const key of keys) {
      try {
        const musicFilter = '&videoCategoryId=10';
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryStr)}&maxResults=6&type=video${musicFilter}&key=${key}`
        );
        
        if (!res.ok) {
          const errorData = await res.json();
          // If quota exceeded or another API Key error, throw to catch and retry next key
          throw new Error(errorData.error?.message || "Error desconocido de YouTube");
        }

        const data = await res.json();
        
        if (!data.items || data.items.length === 0) {
          setMessage({ text: "No se encontraron resultados para esa búsqueda.", type: 'error' });
        } else {
          const filteredResults = data.items.filter((item: any) => item.id && item.id.videoId);
          if (filteredResults.length === 0) {
            setMessage({ text: "No se encontraron videos válidos.", type: 'error' });
          }
          setResults(filteredResults);
        }
        
        // Success! We don't need to try the next key
        success = true;
        break; 
        
      } catch (err: any) {
        lastError = err;
        console.warn(`Límite alcanzado o error en la llave ${key.substring(0, 5)}... probando otra si existe.`);
      }
    }

    if (!success && lastError) {
      console.error(lastError);
      const errorMsg = (lastError as Error).message.toLowerCase();
      if (errorMsg.includes('quota') || errorMsg.includes('exceeded') || errorMsg.includes('key') || errorMsg.includes('403')) {
        setMessage({ text: "❌ La Rockola está descansando: Las llaves llegaron a su límite o no están habilitadas. ¡Añade más magia en la consola de Google!", type: 'error' });
      } else {
        setMessage({ text: "❌ Ocurrió un problema en la búsqueda: " + (lastError as Error).message, type: 'error' });
      }
    }

    setLoading(false);
  };

  const handleRequest = async (video: YouTubeResult) => {
    console.log("CACHE_BUSTER_NEW_UI");
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
    
    // Obtener duración del video probando cada llave disponible
    const keys = apiKey.split(',').map(k => k.trim()).filter(Boolean);
    let durationParsed = null;
    let fallbackError = null;

    for (const key of keys) {
      try {
        const durRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${key}`
        );
        
        if (!durRes.ok) {
           throw new Error("DurRes Error");
        }
        
        const durData = await durRes.json();
        
        if (durData.items && durData.items.length > 0) {
          durationParsed = durData.items[0].contentDetails.duration;
          break; // Funciona, salimos del loop
        }
      } catch (e: any) {
        fallbackError = e;
      }
    }

    try {
      // Create request in backend con la duracion encontrada
      await createSongRequest({
        usuario: userName,
        youtube_id: videoId,
        titulo: video.snippet.title,
        miniatura: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url || '',
        duracion: durationParsed ? parseYouTubeDuration(durationParsed) : 240,
        reproducida: false,
        votos: 0,
        votosUsuarios: []
      });
      setMessage({ text: "¡Canción pedida con éxito!", type: 'success' });
      setQueryStr('');
      setResults([]);
    } catch (err: any) {
      console.error(err);
      setMessage({ text: "Error al pedir: " + err.message, type: 'error' });
    } finally {
      setRequesting(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleVote = async (song: SongRequest) => {
    if (!userName.trim()) {
      setMessage({ text: "Introduce tu nombre para votar.", type: 'error' });
      return;
    }

    const yaVoto = song.votosUsuarios?.includes(userName);
    if (yaVoto) {
      setMessage({ text: "Ya has votado por esta canción.", type: 'error' });
      return;
    }

    try {
      const newVotos = (song.votos || 0) + 1;
      const newVotosUsuarios = [...(song.votosUsuarios || []), userName];
      
      await updateSongRequestAPI(song.id, {
        votos: newVotos,
        votosUsuarios: newVotosUsuarios
      });
    } catch (err) {
      console.error("Error al votar:", err);
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
                  disabled={requesting === video.id.videoId}
                  className="w-full bg-white text-black hover:bg-orange-500 hover:text-white py-2 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  {requesting === video.id.videoId ? (
                    'Pidiendo...'
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

      {/* Próximamente Teaser */}
      <div className="mt-16 flex justify-center pb-4">
        <div className="inline-flex flex-col items-center gap-3 px-8 py-6 bg-gradient-to-t from-orange-500/10 to-transparent border border-orange-500/20 rounded-3xl cursor-default transition-all duration-500 hover:border-orange-500/40 group">
          <div className="bg-orange-500/20 p-2 rounded-full group-hover:bg-orange-500/30 transition-colors">
            <Sparkles className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-center space-y-1">
            <span className="block text-sm font-black tracking-widest uppercase text-orange-500/80 group-hover:text-orange-400 transition-colors">
              Nuevas Funcionalidades Muy Pronto
            </span>
            <span className="block text-xs text-white/30 font-medium max-w-xs mx-auto">
              Estamos trabajando en sorpresas y opciones especiales para interactuar mejor con la Jukebox.
            </span>
          </div>
        </div>
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
    currentSongIdRef.current = currentSong?.id || null;
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

  // Escuchar pedidos via Polling HTTP
  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const list = await fetchPendingRequests();
        setPedidos(list);

        const isCurrentStillPending = list.some(s => s.id === currentSongIdRef.current);

        if (list.length > 0 && (!currentSongIdRef.current || !isCurrentStillPending)) {
          setCurrentSong(list[0]);
        }
      } catch (error) {
        console.error('Error fetching queue:', error);
      }
    };

    fetchPedidos();
    const interval = setInterval(fetchPedidos, 3000); // Check every 3 seconds

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
              // event.data === 0 means the video has ended
              if (event.data === 0) {
                if (currentSongIdRef.current) {
                  markAsPlayed(currentSongIdRef.current);
                }
              }
            },
            onError: (event: any) => {
              console.error("YouTube Player Error:", event.data);
              // If there's an error, skip to the next song
              if (currentSongIdRef.current) {
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
  const pedidosRef = useRef<SongRequest[]>([]);

  useEffect(() => {
    pedidosRef.current = pedidos;
  }, [pedidos]);

  const markAsPlayed = async (id: number) => {
    if (!id || markingRef.current === id) return;
    markingRef.current = id;
    
    // Optimistic update: use fresh array to avoid stale closures in YouTube events
    const freshPedidos = pedidosRef.current;
    const currentIndex = freshPedidos.findIndex(p => p.id === id);
    
    if (currentIndex !== -1 && currentIndex < freshPedidos.length - 1) {
      const nextSong = freshPedidos[currentIndex + 1];
      setCurrentSong(nextSong);
      
      // Force play video inside trusted event tick
      if (playerRef.current && playerRef.current.loadVideoById) {
        try {
          playerRef.current.loadVideoById(nextSong.youtube_id);
        } catch(e) { }
      }
    } else if (freshPedidos.length <= 1) {
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

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const list = await fetchPendingRequests();
        if (list.length > 0) {
          setCurrentSong(list[0]);
        } else {
          setCurrentSong(null);
        }
      } catch (error) {
        console.error('Error fetching queue:', error);
      }
    };

    fetchPedidos();
    const interval = setInterval(fetchPedidos, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-transparent flex justify-center items-end p-4 pb-12 overflow-hidden pointer-events-none">
      <AnimatePresence mode="wait">
        {!currentSong ? (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="relative flex items-center gap-6 bg-black/90 backdrop-blur-2xl border-2 border-orange-500/30 p-4 pr-10 rounded-full shadow-[0_0_50px_rgba(234,88,12,0.3)] w-auto min-w-[340px] pl-24"
          >
            {/* Massive Pop-out QR */}
            <div className="absolute -top-10 -left-4 bg-white p-2 rounded-3xl shadow-[0_15px_35px_rgba(0,0,0,0.6)] -rotate-6 border-4 border-orange-500">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://live.americolabs.com" alt="QR" className="w-[85px] h-[85px] mix-blend-multiply" />
            </div>
            
            <div className="flex flex-col">
              <div className="text-[12px] font-black text-orange-500 uppercase tracking-[0.3em] mb-1 flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                ROCKOLA TOTAL
              </div>
              <span className="text-[14px] font-black text-white leading-tight uppercase">Mándame tu música aquí</span>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            key={currentSong.id}
            className="relative flex flex-row items-center gap-4 bg-gradient-to-r from-black via-zinc-950 to-black/95 backdrop-blur-3xl border-2 border-orange-500/40 p-3 rounded-[35px] shadow-[0_0_60px_rgba(234,88,12,0.25)] w-full max-w-[440px] mt-12"
          >
            {/* Left: Huge Thumbnail */}
            <div className="relative w-[85px] h-[85px] flex-shrink-0 rounded-[24px] overflow-hidden shadow-2xl border-2 border-white/10">
              <img src={currentSong.miniatura} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30" />
              
              {/* Audio Bars */}
              <div className="absolute bottom-2 w-full flex justify-center items-end gap-1 h-5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [4, 18, 6, 24, 10] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                    className="w-[4px] bg-orange-500 rounded-full shadow-[0_0_10px_rgba(234,88,12,1)]"
                  />
                ))}
              </div>
            </div>

            {/* Middle: Info */}
            <div className="flex-1 min-w-0 pr-12 space-y-1">
              <div className="inline-flex bg-orange-600 px-2 py-0.5 rounded-md flex items-center gap-1.5 shadow-lg">
                 <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                 <span className="text-[8px] font-black text-white uppercase tracking-widest">SONANDO AHORA</span>
              </div>
              <h1 className="text-[15px] font-black text-white line-clamp-1 leading-none uppercase tracking-tighter" dangerouslySetInnerHTML={{ __html: currentSong.titulo }} />
              <p className="text-[10px] text-white/50 font-bold truncate">A pedido de: <span className="text-orange-400">{currentSong.usuario}</span></p>
              
              {/* THE LINK IN ONE LINE */}
              <div className="bg-orange-500/10 border border-orange-500/30 px-3 py-1 rounded-full w-fit mt-2 shadow-inner">
                 <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">live.americolabs.com</span>
              </div>
            </div>

            {/* Right: MASSIVE Pop-out QR */}
            <div className="absolute -top-12 -right-3 flex flex-col items-center flex-shrink-0 group">
              <div className="bg-white p-2 rounded-[28px] shadow-[0_20px_45px_rgba(0,0,0,0.8)] rotate-6 border-4 border-orange-600 group-hover:rotate-0 transition-transform duration-500">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://live.americolabs.com" alt="QR" className="w-[95px] h-[95px] mix-blend-multiply" />
              </div>
              <div className="mt-2 bg-orange-600 px-3 py-1 rounded-full shadow-lg -rotate-3 mt-4">
                 <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">SÁCALE CAPTURA</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

