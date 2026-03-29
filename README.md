<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Live Jukebox

Aplicación de jukebox en vivo para streamers, construida con React, TypeScript, Vite y MySQL.

## Características
- **Vista Usuario**: Busca y pide canciones de YouTube
- **Vista Streamer**: Panel de control para gestionar la cola
- **Vista Overlay**: Interfaz para mostrar en stream
- **Sistema de votos**: Los usuarios pueden votar por canciones
- **Tiempo real**: Actualización automática de la cola

## Requisitos
- Node.js
- MySQL (incluido en Laragon)

## Instalación

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar base de datos:**
   - Asegúrate de que MySQL esté corriendo en Laragon
   - Ejecuta el script de inicialización:
     ```bash
     mysql -u root < init.sql
     ```

3. **Configurar variables de entorno:**
   - Copia `.env.example` a `.env`
   - Configura las variables necesarias:
     ```
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=
     DB_NAME=livejukebox
     DB_PORT=3306
     VITE_YOUTUBE_API_KEY=YOUR_YOUTUBE_API_KEY
     ```

4. **Ejecutar la aplicación:**
   ```bash
   npm run dev
   ```

## Despliegue

Para hosting, asegúrate de:
- Configurar las variables de entorno en tu servidor
- Tener MySQL corriendo
- Ejecutar `npm run build` para producción
- Usar `npm start` para servir la aplicación

## Uso
- Accede a `/` para la vista de usuario
- Accede a `/admin` para el panel de streamer (contraseña: americo123)
- Accede a `/overlay` para la vista overlay
