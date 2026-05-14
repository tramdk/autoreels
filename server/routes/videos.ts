import { Router } from 'express';
import * as videoController from '../controllers/videoController';
import { authenticate } from '../middleware/auth';
import prisma from '../lib/prisma';
import path from 'path';
import fs from 'fs';

const router = Router();

// BGM Presets endpoint — returns preset BGMs + uploaded audio assets
router.get('/bgm-presets', authenticate, async (req, res) => {
  try {
    // 1. Load preset BGMs from JSON file
    const presetsPath = path.join(process.cwd(), 'public', 'bgm', 'presets.json');
    let presets: any[] = [];
    if (fs.existsSync(presetsPath)) {
      presets = JSON.parse(fs.readFileSync(presetsPath, 'utf-8'));
      presets = presets
        .filter(p => fs.existsSync(path.join(process.cwd(), 'public', 'bgm', p.filename)))
        .map(p => ({
          id: `preset:${p.filename}`,
          name: p.label,
          description: p.description,
          category: p.category || 'general',
          type: 'preset',
          url: `/bgm/${p.filename}`,
        }));
    }

    // 2. Load uploaded audio assets from DB
    const audioAssets = await prisma.asset.findMany({
      where: { type: 'audio' },
      orderBy: { createdAt: 'desc' },
    });
    const uploaded = audioAssets.map(a => ({
      id: a.id,
      name: a.name,
      description: 'Uploaded',
      category: 'custom',
      type: 'uploaded',
      url: a.url,
    }));

    res.json([...presets, ...uploaded]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', authenticate, videoController.getVideos);
router.post('/bulk-generate', authenticate, videoController.generateBulk);
router.post('/bulk-status', authenticate, videoController.getBulkStatus);
router.post('/generate', authenticate, videoController.generateVideo);
router.get('/active-tasks', authenticate, videoController.getActiveTasks);
router.get('/progress/:id', videoController.getProgress);
router.get('/:id', authenticate, videoController.getVideoById);
router.delete('/:id', authenticate, videoController.deleteVideo);
router.post('/post/:videoId', authenticate, videoController.postToTikTok);
router.get('/post/status/:videoId', authenticate, videoController.getTikTokStatus);
router.get('/play/:id', videoController.playVideo);

export default router;
