import { Router } from 'express';
import multer from 'multer';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import cloudinary from '../lib/cloudinary';
import fs from 'fs';
import path from 'path';

const router = Router();
const upload = multer({ dest: 'render_cache/uploads/' });

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
    bgGradientStart: 'rgba(139, 169, 239, 0.4)', bgGradientEnd: 'rgba(178, 215, 93, 0.7)',
    cardBgColor: 'rgba(0,0,0,0)', cardBorderColor: 'rgba(255,255,255,0.1)',
    cardBorderTop: 0, cardBorderBottom: 0, cardBorderLeft: 0, cardBorderRight: 0, cardBorderRadius: 0,
    showLogo: true, showTag: true, showDatetime: true, showCard: true
  }),
  video_template_dynamic: JSON.stringify({
    logoText: 'AUTOREELS', logoColor: '#ffffff', logoTop: 100, logoLeft: 0, logoAnim: 'slide-down', logoSize: 60,
    hookColor: '#ffffff', hookAnim: 'slide-up', hookSize: 120,
    bodyColor: 'rgba(255, 255, 255, 0.95)', bodyAnim: 'slide-up', bodySize: 48,
    dividerColor: '#00f2ff', dividerWidth: 200,
    mainTop: 600, mainLeft: 100, contentGap: 40,
    tagText: 'TRENDING', tagBg: '#fff000', tagColor: '#000000', tagTop: 1600, tagLeft: 0, tagAnim: 'slide-right', tagSize: 32,
    backgroundBrightness: 0.45, backgroundImage: '',
    bgGradientStart: 'rgba(139, 169, 239, 0.4)', bgGradientEnd: 'rgba(178, 215, 93, 0.7)',
    cardBgColor: 'rgba(8, 12, 24, 0.72)', cardBorderColor: 'rgba(255, 255, 255, 0.08)',
    cardBorderTop: 1, cardBorderBottom: 1, cardBorderLeft: 1, cardBorderRight: 1, cardBorderRadius: 32,
    showLogo: true, showTag: true, showDatetime: true, showCard: true,
    accentColor: '#00f2ff', secondaryColor: '#f43f5e', fontFamily: 'Plus Jakarta Sans', showProgressBar: true
  }),
  video_template_classic: JSON.stringify({
    logoText: 'AUTOREELS', logoColor: '#ffffff', logoTop: 100, logoLeft: 0,
    hookColor: '#ffffff', hookSize: 120,
    bodyColor: 'rgba(255, 255, 255, 0.9)', bodySize: 48,
    dividerColor: '#00f2ff',
    mainTop: 600, mainLeft: 100, contentGap: 40,
    tagText: 'HOT NEWS', tagBg: '#fff000', tagColor: '#000000', tagTop: 1600,
    backgroundBrightness: 0.4, backgroundImage: '',
    bgGradientStart: 'rgba(139, 169, 239, 0.4)', bgGradientEnd: 'rgba(178, 215, 93, 0.7)',
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
    bgGradientStart: 'rgba(168, 85, 247, 0.3)', bgGradientEnd: 'rgba(30, 41, 59, 0.6)',
    cardBgColor: 'rgba(0,0,0,0.2)', cardBorderColor: 'rgba(168, 85, 247, 0.2)',
    showLogo: true, showTag: true, showDatetime: true, showCard: true
  }),
  video_template_bold: JSON.stringify({
    logoText: 'BOLD MEDIA', logoColor: '#ff0055', logoTop: 120, logoLeft: 0,
    hookColor: '#ffffff', hookSize: 140,
    bodyColor: 'rgba(255, 255, 255, 1)', bodySize: 56,
    dividerColor: '#ff0055',
    mainTop: 700, mainLeft: 100, contentGap: 60,
    tagText: 'EXCLUSIVE', tagBg: '#ff0055', tagColor: '#ffffff', tagTop: 1500,
    backgroundBrightness: 0.3, backgroundImage: '',
    bgGradientStart: 'rgba(255, 0, 85, 0.4)', bgGradientEnd: 'rgba(0, 0, 0, 0.8)',
    cardBgColor: 'rgba(0,0,0,0.4)', cardBorderColor: 'rgba(255, 0, 85, 0.3)',
    showLogo: true, showTag: true, showDatetime: true, showCard: true
  }),
  video_template_cinematic: JSON.stringify({
    logoText: 'CINEMA', logoColor: '#ffcc00', logoTop: 150, logoLeft: 0,
    hookColor: '#ffffff', hookSize: 110,
    bodyColor: 'rgba(255, 255, 255, 0.8)', bodySize: 44,
    dividerColor: '#ffcc00',
    mainTop: 700, mainLeft: 120, contentGap: 60,
    tagText: 'PREMIUM', tagBg: '#111111', tagColor: '#ffcc00', tagTop: 1700,
    backgroundBrightness: 0.3, backgroundImage: '',
    cardBgColor: 'rgba(0,0,0,0)', cardBorderColor: 'rgba(255, 204, 0, 0.1)',
    showLogo: true, showTag: true, showDatetime: true, showCard: true
  }),
  video_template_cyberpunk: JSON.stringify({
    logoText: 'CYBER_REEL', logoColor: '#22d3ee', logoTop: 100, logoLeft: 0,
    hookColor: '#ffffff', hookSize: 130,
    bodyColor: 'rgba(255, 255, 255, 0.9)', bodySize: 48,
    dividerColor: '#d946ef',
    mainTop: 650, mainLeft: 100, contentGap: 50,
    tagText: 'ENCRYPTED', tagBg: '#d946ef', tagColor: '#ffffff', tagTop: 1600,
    backgroundBrightness: 0.35, backgroundImage: '',
    cardBgColor: 'rgba(0,0,0,0.2)', cardBorderColor: '#22d3ee',
    showLogo: true, showTag: true, showDatetime: true, showCard: true
  }),
  video_template_glassmorphism: JSON.stringify({
    logoText: 'GLASS_STUDIO', logoColor: '#ffffff', logoTop: 120, logoLeft: 0,
    hookColor: '#ffffff', hookSize: 120,
    bodyColor: '#ffffff', bodySize: 50,
    dividerColor: '#8b5cf6',
    mainTop: 600, mainLeft: 100, contentGap: 40,
    tagText: 'FROSTED', tagBg: 'rgba(255,255,255,0.2)', tagColor: '#ffffff', tagTop: 1650,
    backgroundBrightness: 0.45, backgroundImage: '',
    cardBgColor: 'rgba(255,255,255,0.1)', cardBorderColor: 'rgba(255,255,255,0.2)',
    showLogo: true, showTag: true, showDatetime: true, showCard: true
  }),
  video_template_minimal: JSON.stringify({
    logoText: 'MINIMAL', logoColor: '#ffffff', logoTop: 100, logoLeft: 0,
    hookColor: '#ffffff', hookSize: 140,
    bodyColor: '#ffffff', bodySize: 48,
    dividerColor: '#ffffff',
    mainTop: 600, mainLeft: 100, contentGap: 40,
    tagText: 'CLEAN', tagBg: '#ffffff', tagColor: '#000000', tagTop: 1600,
    backgroundBrightness: 0.5, backgroundImage: '',
    cardBgColor: 'transparent', cardBorderColor: 'transparent',
    showLogo: true, showTag: true, showDatetime: true, showCard: true
  }),
  video_template_y2k: JSON.stringify({
    logoText: 'RETRO_Y2K', logoColor: '#00f2ff', logoTop: 80, logoLeft: 0,
    hookColor: '#000000', hookSize: 120,
    bodyColor: '#000000', bodySize: 44,
    dividerColor: '#ff00ff',
    mainTop: 600, mainLeft: 100, contentGap: 40,
    tagText: 'SYSTEM_READY', tagBg: '#c0c0c0', tagColor: '#000000', tagTop: 1600,
    backgroundBrightness: 0.4, backgroundImage: '',
    cardBgColor: '#c0c0c0', cardBorderColor: '#ffffff',
    showLogo: true, showTag: true, showDatetime: true, showCard: true
  }),
  global_default_template: 'classic'
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

// Get raw template HTML for preview
router.get('/templates/:id/raw', authenticate, async (req, res) => {
  const { id } = req.params;
  let templatePath = path.join(process.cwd(), 'app', 'templates', id, 'index.html');
  
  if (id === 'dynamic') {
    templatePath = path.join(process.cwd(), 'app', 'video-template', 'index.html');
  }
  
  try {
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'Template not found' });
    }
    const html = fs.readFileSync(templatePath, 'utf-8');
    res.send(html);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
