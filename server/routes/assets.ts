import { Router } from 'express';
import multer from 'multer';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import cloudinary from '../lib/cloudinary';
import crypto from 'crypto';
import fs from 'fs';

const router = Router();
const upload = multer({ dest: 'temp_renders/uploads/' });

// Helper to calculate file hash
function calculateHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  try {
    const { path: filePath, size, originalname } = req.file;
    const hash = await calculateHash(filePath);

    // 1. Check if asset already exists
    const existingAsset = await prisma.asset.findUnique({
      where: { hash }
    });

    if (existingAsset) {
      // Delete temporary file and return existing URL
      fs.unlinkSync(filePath);
      return res.json(existingAsset);
    }

    // 2. Upload to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'autoreels/assets',
    });

    // 3. Save metadata to DB
    const newAsset = await prisma.asset.create({
      data: {
        name: originalname,
        size: size,
        hash: hash,
        url: result.secure_url,
        type: req.file.mimetype.startsWith('image') ? 'image' : 'video'
      }
    });

    // Cleanup
    fs.unlinkSync(filePath);

    res.json(newAsset);
  } catch (error: any) {
    console.error('[Asset Upload] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const assets = await prisma.asset.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(assets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
