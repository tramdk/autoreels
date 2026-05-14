import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { config } from './config';

export async function createApp() {
  const app = express();
  app.set('trust proxy', true);

  // Standard Middlewares
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({
    origin: true, // Allow all origins with credentials
    credentials: true
  }));

  // Static files for video renders
  app.use('/render_cache', express.static(path.join(process.cwd(), 'render_cache')));

  // Static files for BGM presets
  app.use('/bgm', express.static(path.join(process.cwd(), 'public', 'bgm')));

  // Static files for Template Assets (GSAP, fonts, etc.)
  app.use('/assets', express.static(path.join(process.cwd(), 'app', 'templates', 'assets')));

  // API Routes
  app.use('/api', routes);

  // Vite or Static Assets handling
  if (!config.isProd) {
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

  // Global Error Handler (Must be last)
  app.use(errorHandler);

  return app;
}
