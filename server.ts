import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Import Routes
import authRoutes from './server/routes/auth';
import articleRoutes from './server/routes/articles';
import videoRoutes from './server/routes/videos';
import sourceRoutes from './server/routes/sources';
import settingRoutes from './server/routes/settings';
import statsRoutes from './server/routes/stats';
import assetRoutes from './server/routes/assets';
import voiceRoutes from './server/routes/voices';

// Import Services
import { startCleanupJob } from './server/services/cleanup';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/articles', articleRoutes);
  app.use('/api/videos', videoRoutes);
  app.use('/api/sources', sourceRoutes);
  app.use('/api/settings', settingRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/assets', assetRoutes);
  app.use('/api/voices', voiceRoutes);

  // Serve temp_renders as static files for reliable video streaming
  app.use('/temp_renders', express.static(path.join(process.cwd(), 'temp_renders')));

  // Background Jobs
  startCleanupJob();

  // Vite or Static Assets
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      try {
        const fs = await import('fs');
        const template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running at http://localhost:${PORT}`);
    console.log(`[Mode] ${isProd ? 'Production' : 'Development'}`);
  });
}

startServer();
