import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { generateAudio } from '../services/tts';
import { renderWithHyperFrames, SceneItem, findFfmpegPath, getAudioDuration } from '../services/renderer';

const router = Router();
export const videoProgress = new Map<string, number>();

router.get('/', authenticate, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const skip = (page - 1) * limit;

  const where = status ? { status } : {};

  const [total, items] = await Promise.all([
    prisma.video.count({ where }),
    prisma.video.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { articles: true },
      skip,
      take: limit,
    })
  ]);

  res.json({ total, items, page, limit, totalPages: Math.ceil(total / limit) });
});

router.get(['/file/:id', '/play/:id'], async (req, res) => {
  try {
    const videoId = req.params.id;
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) return res.status(404).send('Video not found');

    const vUrl = video.videoUrl || '';
    if (vUrl.startsWith('data:video/mp4;base64,')) {
      return res.send(Buffer.from(vUrl.split(',')[1], 'base64'));
    }
    if (vUrl.startsWith('http') && vUrl.includes('cloudinary.com')) {
      return res.redirect(vUrl);
    }

    const videoPath = path.resolve(process.cwd(), 'temp_renders', `${videoId}.mp4`);
    if (fs.existsSync(videoPath)) return res.sendFile(videoPath);

    const fallbackPath = path.resolve(process.cwd(), vUrl);
    if (fs.existsSync(fallbackPath) && fs.lstatSync(fallbackPath).isFile()) {
      return res.sendFile(fallbackPath);
    }

    return res.status(404).send('Video asset not found');
  } catch (error) {
    console.error(`[Video Play] Error:`, error);
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
      clearInterval(interval);
      res.end();
      return;
    }
    if (actual < 100 && simulated < 95) simulated += (Math.random() * 2) + 0.5;
    const finalProgress = actual >= 100 ? 100 : Math.min(95, Math.max(actual, Math.floor(simulated)));
    res.write(`data: ${JSON.stringify({ progress: finalProgress })}\n\n`);
    if (finalProgress >= 100) {
      clearInterval(interval);
      res.end();
    }
  }, 1000);
  req.on('close', () => clearInterval(interval));
});

router.post('/generate/:articleId', authenticate, async (req, res) => {
  const { templateId, ttsProvider, ttsVoiceId } = req.body;
  const article = await prisma.article.findUnique({ where: { id: req.params.articleId } });
  if (!article || !article.script) return res.status(400).json({ error: 'Invalid article or missing script' });

  const videoId = `v_${article.id}_${Date.now()}`;
  videoProgress.set(videoId, 1);
  res.json({ success: true, message: 'Rendering started', videoId });

  (async () => {
    try {
      const script = JSON.parse(article.script as string);
      const scenes: SceneItem[] = script.scenes || [];
      const localTmpDir = path.join(process.cwd(), 'temp_renders');
      if (!fs.existsSync(localTmpDir)) fs.mkdirSync(localTmpDir);

      // === SINGLE AUDIO GENERATION (one voice, one call) ===
      // Use minimal separator to reduce inter-scene pauses
      const SEPARATOR = '... ';
      const fullText = scenes.map(s => s.voiceText).join(SEPARATOR);
      
      console.log(`[RENDER] Generating single audio for entire script (${fullText.length} chars)...`);
      
      const ttsRes = await generateAudio(fullText, templateId, {
        provider: ttsProvider,
        voiceId: ttsVoiceId,
      });

      const audioPath = path.join(localTmpDir, `${videoId}_total.${ttsRes.ext}`);
      fs.writeFileSync(audioPath, ttsRes.buffer);

      // Measure REAL duration using ffprobe
      let totalDuration = getAudioDuration(audioPath);
      if (!totalDuration || totalDuration <= 0) {
        totalDuration = ttsRes.durationSeconds;
      }
      console.log(`[RENDER] Total audio duration: ${totalDuration.toFixed(2)}s`);

      // Estimate TTS pause time between scenes (~0.3s per separator)
      const pausePerScene = 0.3;
      const totalPauseTime = pausePerScene * (scenes.length - 1);
      const speechOnlyDuration = totalDuration - totalPauseTime;

      // Distribute speech-only duration proportionally by character count
      const totalChars = scenes.reduce((sum, s) => sum + s.voiceText.length, 0);
      const sceneDurations = scenes.map((s, i) => {
        const speechTime = totalChars > 0 
          ? (s.voiceText.length / totalChars) * speechOnlyDuration 
          : speechOnlyDuration / scenes.length;
        // Add pause time after each scene (except last)
        return i < scenes.length - 1 ? speechTime + pausePerScene : speechTime;
      });

      console.log(`[RENDER] Scene durations: ${sceneDurations.map(d => d.toFixed(2) + 's').join(', ')}`);

      // If audio is wav, convert to mp3 for the renderer
      let finalAudioPath = audioPath;
      let finalExt = ttsRes.ext;
      if (ttsRes.ext === 'wav') {
        const ffmpegPath = findFfmpegPath();
        finalAudioPath = path.join(localTmpDir, `${videoId}_total.mp3`);
        execSync(`"${ffmpegPath}" -y -i "${audioPath}" -ar 44100 -ac 2 "${finalAudioPath}"`, { stdio: 'inherit' });
        finalExt = 'mp3';
      }

      const totalAudioBuffer = fs.readFileSync(finalAudioPath);
      const relativeOutputPath = path.join('temp_renders', `${videoId}.mp4`);
      const absoluteOutputPath = path.resolve(process.cwd(), relativeOutputPath);

      await renderWithHyperFrames({
        videoId,
        scenes,
        sceneDurations,
        audioBuffer: totalAudioBuffer,
        audioExt: finalExt as 'mp3' | 'wav',
        audioDuration: totalDuration,
        outputPath: absoluteOutputPath,
        templateId,
        onProgress: (p) => videoProgress.set(videoId, p),
      });

      const videoRecord = await prisma.video.create({
        data: {
          id: videoId,
          title: article.title,
          videoUrl: relativeOutputPath,
          audioUrl: `data:audio/mpeg;base64,${totalAudioBuffer.toString('base64')}`,
          status: 'ready',
        },
      });

      await prisma.article.update({
        where: { id: article.id },
        data: { videoId: videoRecord.id, status: 'video_generated' },
      });

      // Cleanup temp files
      try { fs.unlinkSync(audioPath); } catch(e) {}
      if (finalAudioPath !== audioPath) try { fs.unlinkSync(finalAudioPath); } catch(e) {}
      videoProgress.set(videoId, 100);
    } catch (err) {
      console.error('[generate-video] error:', err);
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
