import { Router } from 'express';
import multer from 'multer';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import cloudinary from '../lib/cloudinary';

const router = Router();
const upload = multer({ dest: 'temp_renders/uploads/' });

// Default settings
const DEFAULT_SETTINGS: Record<string, string> = {
  tts_priority: JSON.stringify(['ohfree', 'edge', 'gemini']),
  video_template: JSON.stringify({
    logoText: 'AUTOREELS', logoColor: '#ffffff', logoTop: 100, logoLeft: 0, logoAnim: 'slide-down', logoSize: 60,
    hookColor: '#ffffff', hookAnim: 'rotate-in', hookSize: 120,
    bodyColor: 'rgba(255, 255, 255, 0.9)', bodyAnim: 'slide-up', bodySize: 48,
    dividerColor: '#00f2ff', dividerWidth: 200,
    mainTop: 600, mainLeft: 100, contentGap: 40,
    tagText: 'HOT NEWS', tagBg: '#fff000', tagColor: '#000000', tagTop: 1600, tagLeft: 0, tagAnim: 'slide-right', tagSize: 32,
    backgroundBrightness: 0.4, backgroundImage: '',
    cardBgColor: 'rgba(0,0,0,0)', cardBorderColor: 'rgba(255,255,255,0.1)',
    cardBorderTop: 0, cardBorderBottom: 0, cardBorderLeft: 0, cardBorderRight: 0, cardBorderRadius: 0,
    showLogo: true, showTag: true, showDatetime: true, showCard: true
  }),
  video_template_classic: JSON.stringify({
    logoText: 'AUTOREELS', logoColor: '#ffffff', logoTop: 100, logoLeft: 0,
    hookColor: '#ffffff', hookSize: 120,
    bodyColor: 'rgba(255, 255, 255, 0.9)', bodySize: 48,
    dividerColor: '#00f2ff',
    mainTop: 600, mainLeft: 100, contentGap: 40,
    tagText: 'HOT NEWS', tagBg: '#fff000', tagColor: '#000000', tagTop: 1600,
    backgroundBrightness: 0.4, backgroundImage: '',
    cardBgColor: 'rgba(0,0,0,0)', cardBorderColor: 'rgba(255,255,255,0.1)',
    showLogo: true, showTag: true, showDatetime: true, showCard: true
  }),
  video_template_modern: JSON.stringify({
    logoText: 'MODERN REELS', logoColor: '#a855f7', logoTop: 100, logoLeft: 0,
    hookColor: '#ffffff', hookSize: 130,
    bodyColor: 'rgba(255, 255, 255, 0.95)', bodySize: 52,
    dividerColor: '#a855f7',
    mainTop: 650, mainLeft: 100, contentGap: 50,
    tagText: 'TRENDING', tagBg: '#a855f7', tagColor: '#ffffff', tagTop: 1550,
    backgroundBrightness: 0.35, backgroundImage: '',
    cardBgColor: 'rgba(0,0,0,0.2)', cardBorderColor: 'rgba(168, 85, 247, 0.2)',
    showLogo: true, showTag: true, showDatetime: true, showCard: true
  }),
  video_template_bold: JSON.stringify({
    logoText: 'BOLD MEDIA', logoColor: '#ff0055', logoTop: 120, logoLeft: 0,
    hookColor: '#ff0055', hookSize: 150,
    bodyColor: '#ffffff', bodySize: 56,
    dividerColor: '#ff0055',
    mainTop: 550, mainLeft: 100, contentGap: 30,
    tagText: 'URGENT', tagBg: '#ff0055', tagColor: '#ffffff', tagTop: 1650,
    backgroundBrightness: 0.5, backgroundImage: '',
    cardBgColor: 'rgba(0,0,0,0.8)', cardBorderColor: '#ff0055',
    showLogo: true, showTag: true, showDatetime: true, showCard: true
  }),
  video_template_cinematic: JSON.stringify({
    logoText: 'CINEMA', logoColor: '#e2b714', logoTop: 150, logoLeft: 0,
    hookColor: '#ffffff', hookSize: 110,
    bodyColor: 'rgba(255, 255, 255, 0.8)', bodySize: 44,
    dividerColor: '#e2b714',
    mainTop: 700, mainLeft: 120, contentGap: 60,
    tagText: 'PREMIUM', tagBg: '#111111', tagColor: '#e2b714', tagTop: 1700,
    backgroundBrightness: 0.3, backgroundImage: '',
    cardBgColor: 'rgba(0,0,0,0)', cardBorderColor: 'rgba(226, 183, 20, 0.1)',
    showLogo: true, showTag: true, showDatetime: true, showCard: true
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

router.get('/:key', authenticate, async (req, res) => {
  try {
    const key = req.params.key;
    const setting = await prisma.setting.findUnique({ where: { key } });

    if (!setting) {
      if (DEFAULT_SETTINGS[key]) {
        let val = DEFAULT_SETTINGS[key];
        try { val = JSON.parse(val); } catch (e) { }
        return res.json({ key, value: val });
      }
      return res.json({ key, value: null });
    }

    let value = setting.value;
    try { value = JSON.parse(value); } catch (e) { }
    res.json({ key: setting.key, value });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const result: Record<string, any> = {};

    for (const key in DEFAULT_SETTINGS) {
      try { result[key] = JSON.parse(DEFAULT_SETTINGS[key]); } catch (e) { result[key] = DEFAULT_SETTINGS[key]; }
    }

    settings.forEach(s => {
      let val = s.value;
      try { val = JSON.parse(val); } catch (e) { }
      result[s.key] = val;
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
