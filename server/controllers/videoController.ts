import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { generateAudio } from '../services/tts';
import { renderWithHyperFrames, findFfmpegPath, getAudioDuration } from '../services/renderer';
import { publishToTikTok } from '../services/tiktok';
import { uploadVideo, downloadFile, deleteRemoteFile } from '../services/storage';

export const videoProgress = new Map<string, number>();

/**
 * Helper to split plain text into structured scenes for the rendering pipeline.
 */
function generateScriptFromText(text: string, imageUrl?: string | null) {
  const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
  const cleanContent = text.replace(emojiRegex, '').replace(/[*_~`|>\\\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  
  const lines = cleanContent
    .split(/\. |\n|\.|\!|\?/)
    .map(line => line.trim())
    .filter(line => line.length > 10); // Minimum length for a scene

  if (lines.length > 1) {
    return {
      scenes: lines.map((line, idx) => ({
        id: idx + 1,
        type: idx === 0 ? 'hook' : (idx === lines.length - 1 ? 'outro' : 'body'),
        voiceText: line,
        imageUrl: imageUrl || null
      }))
    };
  }
  
  return {
    scenes: [
      {
        id: 1,
        type: 'body',
        voiceText: text,
        imageUrl: imageUrl || null
      }
    ]
  };
}

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

export const generateBulk = async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    console.log(`🚀 [API] Received bulk-generate request for ${items.length} items from source: ${items[0]?.source || 'unknown'}`);
    
    const results = [];
    for (const item of items) {
      const { articleId, templateId, ttsProvider, ttsVoiceId, bgmAssetId, bgmVolume, content, script, title, imageUrl, source } = item;
      
      // Create a persistent task in the database
      const task = await prisma.videoTask.create({
        data: {
          articleId: articleId || null,
          templateId: templateId || 'modern',
          title: title || (content ? content.substring(0, 50) : null),
          content: content || null,
          script: script ? (typeof script === 'string' ? script : JSON.stringify(script)) : null,
          imageUrl: imageUrl || null,
          ttsProvider: ttsProvider || 'edge',
          ttsVoiceId: ttsVoiceId || 'vi-VN-HoaiMyNeural',
          bgmAssetId: bgmAssetId || null,
          bgmVolume: typeof bgmVolume === 'number' ? bgmVolume : 0.15,
          status: 'pending',
          source: source || 'internal'
        }
      });

      console.log(`📝 [API] Task created: ${task.id} (Status: pending)`);
      results.push({ videoId: task.id, status: 'pending' });
    }

    res.status(201).json({ success: true, videos: results });
    
    // Poke the worker
    console.log('🔔 [API] Triggering background worker...');
    const { triggerWorker } = await import('../services/videoWorker');
    triggerWorker();
  } catch (error: any) {
    console.error('❌ [API] Bulk generate error:', error);
    res.status(500).json({ error: error.message });
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

export const getBulkStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'IDs array required' });

    const results = await Promise.all(ids.map(async (id) => {
      // 1. Check if in progress (memory) - Most active state
      const progress = videoProgress.get(id);
      if (progress !== undefined) {
        return { id, status: 'processing', progress };
      }

      // 2. Check Task table for queue status
      const task = await prisma.videoTask.findUnique({ where: { id } });
      if (task) {
        const status = task.status;
        let videoUrl = undefined;
        
        if (status === 'completed') {
           // Get the final URL from Video table before deleting the task
           const video = await prisma.video.findUnique({ where: { id } });
           videoUrl = video?.videoUrl;
           
           // Cleanup: Delete the task now that it's completed and status is being returned
           await prisma.videoTask.delete({ where: { id } }).catch(() => {});
        }

        return { 
          id, 
          status: status, 
          error: task.error, 
          videoUrl,
          progress: status === 'pending' ? 0 : (status === 'completed' ? 100 : 10) 
        };
      }

      // 3. Fallback: If not in Task table, check if it already finished and was deleted
      const finishedVideo = await prisma.video.findUnique({ where: { id } });
      if (finishedVideo) {
        return { 
          id, 
          status: 'completed', 
          videoUrl: finishedVideo.videoUrl, 
          progress: 100 
        };
      }

      return { id, status: 'not_found' };
    }));

    res.json(results);
  } catch (err) {
    next(err);
  }
};

export const generateVideo = async (req: Request, res: Response, next: NextFunction) => {
  const { articleId, templateId, ttsProvider, ttsVoiceId, bgmAssetId, bgmVolume } = req.body;
  
  try {
    const article = await prisma.article.findUnique({ where: { id: articleId } });
    if (!article) return res.status(404).json({ error: 'Article not found' });

    // Create a persistent task with the script ALREADY SNAPSHOTTED into 'content'
    const task = await prisma.videoTask.create({
      data: {
        articleId: articleId,
        templateId: templateId || 'modern',
        title: article.title,
        // Snapshot the script into script field so worker doesn't need to query Article table
        script: article.script ? JSON.stringify(article.script) : null,
        // Also keep content for backward compatibility if needed, but title is better
        content: article.title,
        ttsProvider: ttsProvider || 'edge',
        ttsVoiceId: ttsVoiceId || 'vi-VN-HoaiMyNeural',
        bgmAssetId: bgmAssetId || null,
        bgmVolume: typeof bgmVolume === 'number' ? bgmVolume : 0.15,
        status: 'pending'
      }
    });

    // Save render settings to article script (optional metadata)
    await prisma.article.updateMany({
      where: { id: articleId },
      data: { 
        script: {
          ...(article.script as any),
          renderSettings: { templateId, ttsProvider, ttsVoiceId, bgmAssetId, bgmVolume }
        }
      }
    });

    res.json({ videoId: task.id, status: 'pending' });
    
    // Poke the worker to start immediately if idle
    const { triggerWorker } = await import('../services/videoWorker');
    triggerWorker();
  } catch (err: any) {
    next(err);
  }
};


export const runVideoGenerationPipeline = async (articleId: string, settings: any, existingVideoId?: string) => {
  const { templateId, ttsProvider, ttsVoiceId, bgmAssetId, bgmVolume, customContent, customImageUrl, source } = settings;
  const videoId = existingVideoId || `v_${articleId}_${Date.now()}`;
  
  console.log(`🎬 [RENDER START] Beginning pipeline for Video ID: ${videoId}`);
  console.log(`🔍 [RENDER INFO] ArticleID: ${articleId || 'None'}, Source: ${source || 'internal'}`);

  // Set initial progress
  videoProgress.set(videoId, 5);

  try {
    let script: any = { scenes: [] };
    let title = settings.title || 'Untitled Video';

    // 1. Load script from customScript or customContent (Snapshot)
    const scriptSource = settings.customScript || settings.customContent;
    if (scriptSource && scriptSource.trim() !== '') {
      try {
        if (scriptSource.startsWith('{') || scriptSource.startsWith('[')) {
          const parsed = JSON.parse(scriptSource);
          if (parsed && parsed.scenes) {
            script = parsed;
            console.log(`📦 [RENDER] Using script snapshot from VideoTask.`);
          } else {
            script = generateScriptFromText(scriptSource, customImageUrl);
          }
        } else {
          script = generateScriptFromText(scriptSource, customImageUrl);
        }
      } catch (e) {
        script = generateScriptFromText(scriptSource, customImageUrl);
      }
      
      // If title is still default and we have content that isn't JSON, use it as title
      if (title === 'Untitled Video' && scriptSource && !scriptSource.startsWith('{')) {
        title = scriptSource.substring(0, 50) + (scriptSource.length > 50 ? '...' : '');
      }
    } 
    
    // 2. Fallback only if snapshot is missing (Legacy)
    if ((!script.scenes || script.scenes.length === 0) && articleId) {
      console.log(`📂 [RENDER] Falling back to Article query for ID: ${articleId}...`);
      const article = await prisma.article.findUnique({ where: { id: articleId } });
      if (article) {
        script = article.script as any;
        if (title === 'Untitled Video') title = article.title;
      }
    }

    if (!script || !script.scenes || script.scenes.length === 0) {
      throw new Error('No valid script found for rendering');
    }

    // Process video generation asynchronously
    let bgmTempPath: string | undefined;
    try {

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
        title: title,
        videoUrl: videoCloudUrl,
        audioUrl: audioCloudUrl,
        status: 'ready',
        source: source || 'internal'
      }
    });

    // Try to link to article and update its status
    if (articleId) {
      await prisma.article.updateMany({
        where: { id: articleId },
        data: { 
          status: 'video_generated', 
          videoId: video.id 
        }
      });
    }

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

      if (articleId) {
        await prisma.article.updateMany({
          where: { id: articleId },
          data: { status: 'summarized' }
        });
      }
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


