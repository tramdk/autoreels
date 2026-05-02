import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  const sources = await prisma.source.findMany();
  res.json(sources);
});

router.post('/', authenticate, async (req, res) => {
  const { name, url, type } = req.body;
  const source = await prisma.source.create({
    data: { name, url, type }
  });
  res.json(source);
});

router.delete('/:id', authenticate, async (req, res) => {
  await prisma.source.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
