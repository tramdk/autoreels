import { Router } from 'express';
import multer from 'multer';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import cloudinary from '../lib/cloudinary';

const router = Router();
const upload = multer({ dest: 'temp_renders/uploads/' });

// Default settings
const DEFAULT_SETTINGS: Record<string, string> = {
  tts_priority: 'elevenlabs,edge,gemini',
  video_template: JSON.stringify({
    logoText: 'AUTOREELS',
    logoColor: '#00f2ff',
    hookColor: '#ffffff',
    bodyColor: 'rgba(255, 255, 255, 0.9)',
    dividerColor: '#00f2ff',
    tagText: 'HOT NEWS',
    tagBg: '#fff000',
    tagColor: '#000000',
    backgroundBrightness: 0.4,
    backgroundImage: '' // Empty means use default bg.jpg
  })
};

router.post('/upload-bg', authenticate, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'autoreels/backgrounds',
    });
    res.json({ url: result.secure_url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const result: Record<string, string> = { ...DEFAULT_SETTINGS };
    
    settings.forEach(s => {
      result[s.key] = s.value;
    });
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'Key is required' });
  
  try {
    await prisma.setting.upsert({
      where: { key },
      update: { value: typeof value === 'string' ? value : JSON.stringify(value) },
      create: { 
        key, 
        value: typeof value === 'string' ? value : JSON.stringify(value) 
      },
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
