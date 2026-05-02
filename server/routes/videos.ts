import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { generateAudio } from '../services/tts';
import { renderWithHyperFrames } from '../services/renderer';


const router = Router();
export const videoProgress = new Map<string, number>();

router.get('/', authenticate, async (req, res) => {
  const videos = await prisma.video.findMany({
    orderBy: { createdAt: 'desc' },
    include: { articles: true }
  });
  res.json(videos);
});

// Support both /file and /play for backward compatibility
router.get(['/file/:id', '/play/:id'], async (req, res) => {
  try {
    const videoId = req.params.id;

    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) {
      console.error(`[Video Play] ID not found in database: ${videoId}`);
      return res.status(404).send('Video not found');
    }

    const vUrl = video.videoUrl || '';

    // 1. Handle Base64 Data URI
    if (vUrl.startsWith('data:video/mp4;base64,')) {
      const base64Data = vUrl.split(',')[1];
      return res.send(Buffer.from(base64Data, 'base64'));
    }

    // 2. Handle Cloud URL (Only redirect if it's actually Cloudinary)
    if (vUrl.startsWith('http') && vUrl.includes('cloudinary.com')) {
      return res.redirect(vUrl);
    }

    // 3. Try to find the file in temp_renders using the ID
    const videoPath = path.resolve(process.cwd(), 'temp_renders', `${videoId}.mp4`);

    if (fs.existsSync(videoPath)) {
      return res.sendFile(videoPath);
    }

    // 4. Final Fallback: Check if the stored videoUrl is a relative path itself
    const fallbackPath = path.resolve(process.cwd(), vUrl);
    if (fs.existsSync(fallbackPath) && fs.lstatSync(fallbackPath).isFile()) {
      return res.sendFile(fallbackPath);
    }

    console.error(`[Video Play] FAILED: No physical file found for ID ${videoId}`);
    return res.status(404).send('Video asset not found');
  } catch (error) {
    console.error(`[Video Play] Critical Error:`, error);
    if (!res.headersSent) res.status(500).send('Server error');
  }
});

router.get('/progress/:id', authenticate, (req, res) => {
  const videoId = req.params.id;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let simulated = 0;
  const interval = setInterval(() => {
    const actual = videoProgress.get(videoId) ?? 0;

    if (actual === -1) {
      res.write(`data: ${JSON.stringify({ progress: -1 })}\n\n`);
      if ((res as any).flush) (res as any).flush();
      clearInterval(interval);
      res.end();
      return;
    }

    if (actual < 100 && simulated < 95) {
      simulated += (Math.random() * 2) + 0.5;
    }

    const finalProgress = actual >= 100 ? 100 : Math.min(95, Math.max(actual, Math.floor(simulated)));
    res.write(`data: ${JSON.stringify({ progress: finalProgress })}\n\n`);
    if ((res as any).flush) (res as any).flush();

    if (finalProgress >= 100) {
      clearInterval(interval);
      res.end();
    }
  }, 1000);

  req.on('close', () => clearInterval(interval));
});

router.post('/generate/:articleId', authenticate, async (req, res) => {
  const article = await prisma.article.findUnique({ where: { id: req.params.articleId } });
  if (!article) return res.status(404).json({ error: 'Article not found' });
  if (!article.script) return res.status(400).json({ error: 'Article must be summarized first' });

  const videoId = `v_${article.id}_${Date.now()}`;
  videoProgress.set(videoId, 1);

  res.json({ success: true, message: 'Rendering started', videoId });

  (async () => {
    try {
      const script = JSON.parse(article.script as string);
      const rawScriptText = `${script.hook} ${script.body} ${script.callToAction}`;

      const audio = await generateAudio(rawScriptText);
      const localTmpDir = path.join(process.cwd(), 'temp_renders');
      if (!fs.existsSync(localTmpDir)) fs.mkdirSync(localTmpDir);

      const relativeOutputPath = path.join('temp_renders', `${videoId}.mp4`);
      const absoluteOutputPath = path.resolve(process.cwd(), relativeOutputPath);

      await renderWithHyperFrames({
        videoId,
        hook: script.hook || '',
        body: script.body || '',
        cta: script.callToAction || '',
        audioBuffer: audio.buffer,
        audioExt: audio.ext,
        audioDuration: audio.durationSeconds,
        outputPath: absoluteOutputPath,
        onProgress: (p) => videoProgress.set(videoId, p),
      });

      videoProgress.set(videoId, 100);

      const videoRecord = await prisma.video.create({
        data: {
          id: videoId,
          title: article.title,
          videoUrl: relativeOutputPath, // Store relative physical path
          audioUrl: `data:${audio.mimeType};base64,${audio.buffer.toString('base64')}`,
          status: 'ready',
        },
      });

      await prisma.article.update({
        where: { id: article.id },
        data: { videoId: videoRecord.id, status: 'video_generated' },
      });

      console.log(`[Render] SUCCESS: ${videoId}`);
    } catch (err: any) {
      console.error('[generate-video] Async error:', err);
      videoProgress.set(videoId, -1);
    }
  })();
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.video.delete({ where: { id: req.params.id } });
    const videoPath = path.join(process.cwd(), 'temp_renders', `${req.params.id}.mp4`);
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

import { publishToTikTok } from '../services/tiktok';
import { log } from 'console';

router.post('/post/:videoId', authenticate, async (req, res) => {
  try {
    const result = await publishToTikTok(req.params.videoId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/post/status/:videoId', authenticate, async (req, res) => {
  const video = await prisma.video.findUnique({ where: { id: req.params.videoId } });
  if (!video) return res.status(404).json({ error: 'Video not found' });
  res.json({ status: video.status, publishId: video.publishId });
});

export default router;
