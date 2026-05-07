import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get unique providers
router.get('/providers', authenticate, async (req, res) => {
  try {
    const providers = await (prisma as any).voice.findMany({
      select: { provider: true },
      distinct: ['provider']
    });
    res.json(providers.map((p: any) => p.provider));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all voices
router.get('/', authenticate, async (req, res) => {
  try {
    const voices = await (prisma as any).voice.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(voices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add a voice
router.post('/', authenticate, async (req, res) => {
  try {
    const { voiceId, name, provider } = req.body;
    const voice = await (prisma as any).voice.create({
      data: { voiceId, name, provider }
    });
    res.json(voice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update a voice
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { voiceId, name, provider } = req.body;
    const voice = await (prisma as any).voice.update({
      where: { id: req.params.id },
      data: { voiceId, name, provider }
    });
    res.json(voice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a voice
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await (prisma as any).voice.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
