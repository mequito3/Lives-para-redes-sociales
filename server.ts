import 'dotenv/config';
import express from "express";
import { createServer as createHttpServer } from "http";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { getPendingRequests, addSongRequest, updateSongRequest, deleteSongRequest, getStreamerStatus, updateStreamerStatus } from "./src/db-operations.js";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProd = true; // Forzado a production para evitar crash en Passenger
  const root = process.cwd();

  console.log(`\n--- JUKEBOX SERVER STARTING ---`);
  console.log(`Mode: ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);

  // Middleware
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: isProd ? 'production' : 'development' });
  });

  app.get("/api/songs", async (req, res) => {
    try {
      console.log('📋 Fetching songs...');
      const songs = await getPendingRequests();
      console.log(`✅ Found ${songs.length} songs`);
      res.json(songs);
    } catch (error) {
      console.error('❌ Error fetching songs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post("/api/songs", async (req, res) => {
    try {
      const songData = req.body;
      const id = await addSongRequest(songData);
      res.json({ id });
    } catch (error) {
      console.error('Error adding song:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put("/api/songs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      await updateSongRequest(id, updates);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating song:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete("/api/songs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await deleteSongRequest(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting song:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/api/status", async (req, res) => {
    try {
      const status = await getStreamerStatus();
      res.json(status);
    } catch (error) {
      console.error('Error fetching status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put("/api/status", async (req, res) => {
    try {
      const { isLive } = req.body;
      await updateStreamerStatus(isLive);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  if (isProd) {
    const distPath = path.resolve(root, 'dist');
    console.log(`Serving static files from: ${distPath}`);
    
    // Serve static assets
    app.use(express.static(distPath));

    // Fallback for any route to index.html (though HashRouter handles this)
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    console.log("Initializing Vite in middleware mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const templatePath = path.resolve(root, 'index.html');
        let template = fs.readFileSync(templatePath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  }

  const httpServer = createHttpServer(app);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`   Also accessible at http://127.0.0.1:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("FATAL: Failed to start server:", err);
  process.exit(1);
});
