-- Inicialización de la base de datos para Live Jukebox

CREATE DATABASE IF NOT EXISTS livejukebox;
USE livejukebox;

-- Tabla para solicitudes de canciones
CREATE TABLE IF NOT EXISTS song_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(255) NOT NULL,
  youtube_id VARCHAR(255) NOT NULL,
  titulo TEXT NOT NULL,
  miniatura TEXT,
  reproducida BOOLEAN DEFAULT FALSE,
  duracion INT DEFAULT 240,
  votos INT DEFAULT 0,
  votos_usuarios JSON DEFAULT ('[]'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reproducida_votos (reproducida, votos DESC, created_at ASC)
);

-- Tabla para estado del streamer
CREATE TABLE IF NOT EXISTS streamer_status (
  id INT PRIMARY KEY DEFAULT 1,
  is_live BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insertar estado inicial
INSERT IGNORE INTO streamer_status (id, is_live) VALUES (1, TRUE);