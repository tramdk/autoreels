import { Router } from 'express';
import authRoutes from './auth';
import articleRoutes from './articles';
import videoRoutes from './videos';
import sourceRoutes from './sources';
import settingRoutes from './settings';
import statsRoutes from './stats';
import assetRoutes from './assets';
import voiceRoutes from './voices';

const router = Router();

router.use('/auth', authRoutes);
router.use('/articles', articleRoutes);
router.use('/videos', videoRoutes);
router.use('/sources', sourceRoutes);
router.use('/settings', settingRoutes);
router.use('/stats', statsRoutes);
router.use('/assets', assetRoutes);
router.use('/voices', voiceRoutes);

export default router;
