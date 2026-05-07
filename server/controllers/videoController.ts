import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { generateAudio } from '../services/tts';
import { renderWithHyperFrames, findFfmpegPath, getAudioDuration } from '../services/renderer';
import { publishToTikTok } from '../services/tiktok';
import { uploadVideo, downloadFile, deleteRemoteFile } from '../services/storage';

export const videoProgress = new Map<string, number>();

export const getVideos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { articles: true }
      }),
      prisma.video.count({ where })
    ]);

    res.json({
      items: videos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    next(err);
  }
};

export const getVideoById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const video = await prisma.video.findUnique({ where: { id: req.params.id } });
    if (!video) {
      // Check if it is still in the active generation map
      const progress = videoProgress.get(req.params.id);
      if (progress !== undefined) {
        return res.json({ id: req.params.id, status: 'processing', progress });
      }
      return res.status(404).json({ error: 'Video not found or expired' });
    }
    res.json(video);
  } catch (err) {
    next(err);
  }
};

export const generateVideo = async (req: Request, res: Response, next: NextFunction) => {
  console.log('[AUTOREELS-API] Received generateVideo request:', JSON.stringify(req.body, null, 2));
  const { articleId, templateId, ttsProvider, ttsVoiceId, bgmAssetId, bgmVolume } = req.body;
  const videoId = `v_${articleId}_${Date.now()}`;
  
  // Set initial progress
  videoProgress.set(videoId, 5);

  try {
    const article = await prisma.article.findUnique({ where: { id: articleId } });
    if (!article) return res.status(404).json({ error: 'Article not found' });

    await prisma.article.update({
      where: { id: articleId },
      data: { 
        status: 'generating',
        script: {
          ...(article.script as any),
          renderSettings: { templateId, ttsProvider, ttsVoiceId, bgmAssetId, bgmVolume }
        }
      }
    });

    res.json({ videoId, status: 'generating' });
    
    const settings = { templateId, ttsProvider, ttsVoiceId, bgmAssetId, bgmVolume };
    runVideoGenerationPipeline(articleId, settings, videoId);
  } catch (err: any) {
    next(err);
  }
};

export const runVideoGenerationPipeline = async (articleId: string, settings: any, existingVideoId?: string) => {
  const { templateId, ttsProvider, ttsVoiceId, bgmAssetId, bgmVolume } = settings;
  const videoId = existingVideoId || `v_${articleId}_${Date.now()}`;
  
  // Set initial progress
  videoProgress.set(videoId, 5);

  try {
    const article = await prisma.article.findUnique({ where: { id: articleId } });
    if (!article) throw new Error('Article not found');

    // Nếu chưa ở trạng thái generating (ví dụ gọi từ recovery), cập nhật lại
    if (article.status !== 'generating') {
      await prisma.article.update({
        where: { id: articleId },
        data: { 
          status: 'generating',
          script: {
            ...(article.script as any),
            renderSettings: settings
          }
        }
      });
    }

    // Process video generation asynchronously
    let bgmTempPath: string | undefined;
    try {

    const script = article.script as any;
    const scenes: any[] = script.scenes || [];
    const localTmpDir = path.join(process.cwd(), 'temp_renders');
    if (!fs.existsSync(localTmpDir)) fs.mkdirSync(localTmpDir);

    // === BGM DOWNLOAD (if selected) ===
    if (bgmAssetId && bgmAssetId !== 'none') {
      try {
        // Check if it's a preset BGM (starts with 'preset:')
        if (bgmAssetId.startsWith('preset:')) {
          const presetName = bgmAssetId.replace('preset:', '');
          const presetPath = path.join(process.cwd(), 'public', 'bgm', presetName);
          if (fs.existsSync(presetPath)) {
            bgmTempPath = presetPath;
            console.log(`[RENDER] Using preset BGM: ${presetName}`);
          }
        } else {
          // It's an asset ID — look up from DB
          const bgmAsset = await prisma.asset.findUnique({ where: { id: bgmAssetId } });
          if (bgmAsset && bgmAsset.url) {
            bgmTempPath = path.join(localTmpDir, `${videoId}_bgm.mp3`);
            console.log(`[RENDER] Downloading BGM from: ${bgmAsset.url}`);
            await downloadFile(bgmAsset.url, bgmTempPath);
          }
        }
      } catch (bgmErr) {
        console.error('[RENDER] BGM download failed, continuing without BGM:', bgmErr);
        bgmTempPath = undefined;
      }
    }

    // === AUDIO GENERATION ===
    const SEPARATOR = '... ';
    const validScenes = scenes.map(s => ({ ...s, voiceText: s.voiceText || '' }));
    const fullText = validScenes.map(s => s.voiceText).join(SEPARATOR);
    
    console.log(`[RENDER] Generating single audio for entire script (${fullText.length} chars)...`);
    
    const ttsRes = await generateAudio(fullText, templateId, {
      provider: ttsProvider,
      voiceId: ttsVoiceId,
    });

    const audioPath = path.join(localTmpDir, `${videoId}_total.${ttsRes.ext}`);
    fs.writeFileSync(audioPath, ttsRes.buffer);

    let totalDuration = getAudioDuration(audioPath);
    if (!totalDuration || totalDuration <= 0) {
      totalDuration = ttsRes.durationSeconds;
    }
    
    videoProgress.set(videoId, 20);

    // Distribute durations
    const pausePerScene = 0.3;
    const totalPauseTime = pausePerScene * (validScenes.length - 1);
    const speechOnlyDuration = totalDuration - totalPauseTime;
    const totalChars = validScenes.reduce((sum, s) => sum + (s.voiceText?.length || 0), 0);
    
    const sceneDurations = validScenes.map((s, i) => {
      const speechTime = totalChars > 0 
        ? ((s.voiceText?.length || 0) / totalChars) * speechOnlyDuration 
        : speechOnlyDuration / validScenes.length;
      return i < validScenes.length - 1 ? speechTime + pausePerScene : speechTime;
    });

    // === VIDEO RENDERING ===
    const outputPath = path.join(localTmpDir, `${videoId}.mp4`);
    
    await renderWithHyperFrames({
      videoId,
      scenes,
      sceneDurations,
      templateId,
      outputPath,
      audioBuffer: ttsRes.buffer,
      audioExt: ttsRes.ext,
      audioDuration: totalDuration,
      bgmPath: bgmTempPath,
      bgmVolume: typeof bgmVolume === 'number' ? bgmVolume : 0.15,
      onProgress: (p) => {
        const scaledProgress = 20 + (p * 0.75); // 20% to 95%
        videoProgress.set(videoId, Math.round(scaledProgress));
      }
    });

    // === CLOUD UPLOAD ===
    console.log(`[RENDER] Uploading results to Cloudinary for persistence...`);
    videoProgress.set(videoId, 96);
    
    // Upload video and audio to Cloudinary
    const [videoCloudUrl, audioCloudUrl] = await Promise.all([
      uploadVideo(outputPath, 'autoreels_videos', true), // Keep local for a bit
      uploadVideo(audioPath, 'autoreels_audio', true)
    ]);

    // Save to DB with Cloud URLs
    const video = await prisma.video.create({
      data: {
        id: videoId,
        title: article.title,
        videoUrl: videoCloudUrl,
        audioUrl: audioCloudUrl,
        status: 'ready',
        articles: { connect: { id: articleId } }
      }
    });

    await prisma.article.update({
      where: { id: articleId },
      data: { status: 'video_generated', videoId: video.id }
    });

    videoProgress.set(videoId, 100);

    // === CLEANUP ===
    // Cleanup temp audio file (TTS)
    try { if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath); } catch (_) {}
    
    // Cleanup temp BGM file (but not preset files)
    if (bgmTempPath && bgmAssetId && !bgmAssetId.startsWith('preset:')) {
      try { if (fs.existsSync(bgmTempPath)) fs.unlinkSync(bgmTempPath); } catch (_) {}
    }
    } catch (err: any) {
      console.error('[VIDEO GEN ERROR]', err);
      videoProgress.set(videoId, -1);
      
      if (bgmTempPath && settings.bgmAssetId && !settings.bgmAssetId.startsWith('preset:')) {
        try { fs.unlinkSync(bgmTempPath); } catch (_) {}
      }

      await prisma.article.update({
        where: { id: articleId },
        data: { status: 'summarized' }
      }).catch(console.error);
    }
  } catch (err: any) {
    console.error('[PIPELINE FATAL ERROR]', err);
  }
};

// Local download helper removed in favor of storage service downloadFile

export const getProgress = (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const videoId = req.params.id;

  const sendProgress = () => {
    const progress = videoProgress.get(videoId) || 0;
    res.write(`data: ${JSON.stringify({ progress })}\n\n`);

    if (progress === 100 || progress === -1) {
      clearInterval(interval);
      res.end();
    }
  };

  // Send immediately, then poll
  sendProgress();
  const interval = setInterval(sendProgress, 1000);

  req.on('close', () => {
    clearInterval(interval);
  });
};

export const deleteVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const video = await prisma.video.findUnique({ where: { id: req.params.id } });
    if (!video) throw new Error('Video not found');

    // 1. Delete from Cloudinary (if it's a cloud URL)
    if (video.videoUrl && video.videoUrl.startsWith('http')) {
      console.log(`[Video] Deleting remote video: ${video.videoUrl}`);
      await deleteRemoteFile(video.videoUrl).catch(err => console.error('[Video] Cloudinary delete failed:', err));
    }
    
    if (video.audioUrl && video.audioUrl.startsWith('http')) {
      console.log(`[Video] Deleting remote audio: ${video.audioUrl}`);
      await deleteRemoteFile(video.audioUrl).catch(err => console.error('[Video] Cloudinary audio delete failed:', err));
    }

    // 2. Delete local file (if exists)
    const videoPath = path.join(process.cwd(), 'temp_renders', `${req.params.id}.mp4`);
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    
    // 3. Delete from DB
    await prisma.video.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const postToTikTok = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await publishToTikTok(req.params.videoId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const playVideo = async (req: Request, res: Response) => {
  const videoId = req.params.id;
  const videoPath = path.join(process.cwd(), 'temp_renders', videoId.endsWith('.mp4') ? videoId : `${videoId}.mp4`);
  
  if (fs.existsSync(videoPath)) {
    return res.sendFile(videoPath);
  }

  // If local file is missing (published and archived), check DB for Cloudinary URL
  try {
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (video && video.videoUrl && video.videoUrl.startsWith('http')) {
      return res.redirect(video.videoUrl);
    }
    return res.status(404).json({ error: 'Video file not found' });
  } catch (err) {
    return res.status(404).json({ error: 'Video file not found' });
  }
};


export const getTikTokStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const video = await prisma.video.findUnique({ where: { id: req.params.videoId } });
    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json({ status: video.status, publishId: video.publishId });
  } catch (err) {
    next(err);
  }
};


