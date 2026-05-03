import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const [sources, articles, videos, postedVideos] = await Promise.all([
      prisma.source.count(),
      prisma.article.count(),
      prisma.video.count(),
      prisma.video.count({ where: { status: 'posted' } })
    ]);
    res.json({ sources, articles, videos, postedVideos });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
