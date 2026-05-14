import { Router } from 'express';
import * as authController from '../controllers/authController';

const router = Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/logout', authController.logout);
router.get('/me', authController.getMe);
router.post('/change-password', authController.changePassword);
router.get('/tiktok/url', authController.getTikTokAuthUrl);
router.get('/tiktok/callback', authController.tiktokCallback);
router.post('/tiktok/disconnect', authController.disconnectTikTok);

export default router;
