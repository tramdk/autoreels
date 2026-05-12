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

  // Improved splitting: split by common sentence enders followed by space or newline, or at line breaks
  const lines = cleanContent
    .split(/(?<=[.!?])\s+|\n/)
    .map(line => line.trim())
    .filter(line => line.length >= 3); // Allow short impactful hooks like "TIN NÓNG!"

  if (lines.length > 0) {
    return {
      scenes: lines.map((line, idx) => ({
        id: idx + 1,
        type: idx === 0 ? 'hook' : (idx === lines.length - 1 ? 'outro' : 'body'),
        voiceText: line,
        bodyText: line,
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
        bodyText: text,
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

    // Get global default template ONCE before loop
    const globalTpl = await prisma.setting.findUnique({ where: { key: 'global_default_template' } });
    const defaultTplId = globalTpl?.value || 'classic';

    const results = [];
    for (const item of items) {
      const { articleId, templateId, ttsProvider, ttsVoiceId, bgmAssetId, bgmVolume, ratio, content, script, title, imageUrl, source } = item;

      // Create a persistent task in the database
      const task = await prisma.videoTask.create({
        data: {
          articleId: articleId || null,
          templateId: templateId || defaultTplId,
          title: title || (content ? content.substring(0, 50) : null),
          content: content || null,
          script: script ? (typeof script === 'string' ? script : JSON.stringify(script)) : null,
          imageUrl: imageUrl || null,
          ttsProvider: ttsProvider || 'edge',
          ttsVoiceId: ttsVoiceId || 'vi-VN-NamMinhNeural',
          bgmAssetId: bgmAssetId || null,
          bgmVolume: typeof bgmVolume === 'number' ? bgmVolume : 0.15,
          ratio: ratio || '9:16',
          status: 'pending',
          source: source || 'internal'
        }
      });

      console.log(`📝 [API] Task created: ${task.id} (Status: pending)`);
      
      // Update article status to 'generating' immediately so UI knows it's in progress
      if (articleId) {
        await prisma.article.update({
          where: { id: articleId },
          data: { status: 'generating' }
        });
      }

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
          // Get the final URL from Video table
          const video = await prisma.video.findUnique({ where: { id } });
          videoUrl = video?.videoUrl;
          // Task cleanup is handled by cleanupOldTasks in videoWorker
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
  const { articleId, templateId, ttsProvider, ttsVoiceId, bgmAssetId, bgmVolume, ratio, imageUrl, settings, customScript, title } = req.body;

  try {
    const article = await prisma.article.findUnique({ where: { id: articleId } });
    if (!article) return res.status(404).json({ error: 'Article not found' });

    // Correctly extract the scenes array from various possible formats
    let finalScenes: any[] = [];
    const scriptToParse = customScript || article.script;
    
    if (scriptToParse) {
      try {
        let parsed = typeof scriptToParse === 'string' ? JSON.parse(scriptToParse) : scriptToParse;
        // Handle the case where the script is wrapped in another object { scenes: [...], customSettings: {...} }
        if (parsed && parsed.scenes && Array.isArray(parsed.scenes)) {
          finalScenes = parsed.scenes;
        } else if (Array.isArray(parsed)) {
          finalScenes = parsed;
        } else if (parsed && typeof parsed === 'object') {
          finalScenes = [parsed]; // Single scene object fallback
        }
      } catch (e) {
        console.warn(`[API] Failed to parse script for article ${articleId}, falling back to text generation.`);
      }
    }

    // Fallback: Generate from content if script is missing or invalid
    if (finalScenes.length === 0) {
      const gen = generateScriptFromText(article.contentSnippet || article.title, article.imageUrl);
      finalScenes = gen.scenes;
    }

    // Get global default template if not specified
    const globalTpl = await prisma.setting.findUnique({ where: { key: 'global_default_template' } });
    const defaultTplId = globalTpl?.value || 'classic';

    // Construct a comprehensive payload that includes both script and custom settings
    // Prioritize title from payload if provided
    const payload = {
      scenes: finalScenes,
      customSettings: settings || null
    };

    // Create a persistent task with the payload SNAPSHOTTED into the script field
    const task = await prisma.videoTask.create({
      data: {
        articleId: articleId,
        templateId: templateId || defaultTplId,
        title: title || article.title,
        script: JSON.stringify(payload),
        imageUrl: imageUrl || article.imageUrl,
        content: article.contentSnippet || article.title,
        ttsProvider: ttsProvider || 'edge',
        ttsVoiceId: ttsVoiceId || 'vi-VN-HoaiMyNeural',
        bgmAssetId: bgmAssetId || null,
        bgmVolume: typeof bgmVolume === 'number' ? bgmVolume : 0.15,
        ratio: ratio || '9:16',
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
  const {
    templateId, ttsProvider, ttsVoiceId, bgmAssetId, bgmVolume, ratio,
    customContent, customScript, customImageUrl, source, title: settingsTitle
  } = settings;

  const videoId = existingVideoId || `v_${articleId}_${Date.now()}`;

  console.log(`🎬 [RENDER START] Beginning pipeline for Video ID: ${videoId}`);
  console.log(`🔍 [RENDER INFO] ArticleID: ${articleId || 'None'}, Source: ${source || 'internal'}`);
  console.log(`📝 [RENDER DATA] hasContent: ${!!customContent}, hasScript: ${!!customScript}`);

  // Set initial progress
  videoProgress.set(videoId, 5);

  try {
    let script: any = { scenes: [] };
    let title = settingsTitle || 'Untitled Video';
    
    // 1. Load script from customScript or customContent (Snapshot)
    const scriptSource = customScript || customContent;
    let customSettings: any = null;

    if (scriptSource) {
      try {
        if (typeof scriptSource === 'string' && scriptSource.trim().startsWith('{')) {
          const parsed = JSON.parse(scriptSource);
          if (parsed.scenes && Array.isArray(parsed.scenes)) {
            script = { scenes: parsed.scenes };
            customSettings = parsed.customSettings || null;
          } else if (Array.isArray(parsed)) {
            script = { scenes: parsed };
          } else {
            script = generateScriptFromText(scriptSource, customImageUrl);
          }
        } else if (typeof scriptSource === 'object') {
          if (Array.isArray(scriptSource)) {
            script = { scenes: scriptSource };
          } else if ((scriptSource as any).scenes) {
            script = { scenes: (scriptSource as any).scenes };
            customSettings = (scriptSource as any).customSettings || null;
          } else {
            script = { scenes: [scriptSource] };
          }
        } else {
          script = generateScriptFromText(String(scriptSource), customImageUrl);
        }
      } catch (e) {
        script = generateScriptFromText(String(scriptSource), customImageUrl);
      }
    }

    // Merge customSettings from the pipeline parameters if provided directly
    if (!customSettings && settings.settings) {
      customSettings = settings.settings;
    }

    if (script.scenes) {
      console.log(`📦 [RENDER] Script initialized (${script.scenes.length} scenes).`);
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

      const rawScenes = script.scenes;
      const scenes: any[] = Array.isArray(rawScenes) ? rawScenes : (rawScenes ? [rawScenes] : []);
      const localTmpDir = path.join(process.cwd(), 'render_cache');
      if (!fs.existsSync(localTmpDir)) fs.mkdirSync(localTmpDir, { recursive: true });

      // === PARALLEL: TTS + BGM Download ===
      // Run both concurrently since they're independent I/O operations
      const SEPARATOR = '... ';
      const validScenes = scenes.map(s => ({ ...s, voiceText: s.voiceText || '' }));
      const fullText = validScenes.map(s => s.voiceText).join(SEPARATOR);

      console.log(`[PIPELINE] STEP 1: Starting TTS (${fullText.length} chars) + BGM download in parallel...`);
      videoProgress.set(videoId, 10);

      const ttsStartTime = Date.now();

      // BGM download task (runs in parallel with TTS)
      const bgmTask = (async () => {
        if (!bgmAssetId || bgmAssetId === 'none') return;
        try {
          if (bgmAssetId.startsWith('preset:')) {
            const presetName = bgmAssetId.replace('preset:', '');
            const presetPath = path.join(process.cwd(), 'public', 'bgm', presetName);
            if (fs.existsSync(presetPath)) {
              bgmTempPath = presetPath;
              console.log(`[RENDER] Using preset BGM: ${presetName}`);
            }
          } else {
            const bgmAsset = await prisma.asset.findUnique({ where: { id: bgmAssetId } });
            if (bgmAsset && bgmAsset.url) {
              const extension = bgmAsset.url.split('.').pop()?.split('?')[0] || 'mp3';
              bgmTempPath = path.join(localTmpDir, `${videoId}_bgm.${extension}`);
              console.log(`[RENDER] Downloading BGM (${extension}) from: ${bgmAsset.url}`);
              await downloadFile(bgmAsset.url, bgmTempPath);
            }
          }
        } catch (bgmErr) {
          console.error('[RENDER] BGM download failed, continuing without BGM:', bgmErr);
          bgmTempPath = undefined;
        }
      })();

      // TTS generation task (runs in parallel with BGM)
      const ttsTask = generateAudio(fullText, templateId, {
        provider: ttsProvider,
        voiceId: ttsVoiceId,
      });

      // Wait for both to complete
      const [, ttsRes] = await Promise.all([bgmTask, ttsTask]);
      const ttsDuration = (Date.now() - ttsStartTime) / 1000;
      console.log(`[PIPELINE] TTS+BGM COMPLETE in ${ttsDuration.toFixed(1)}s: Audio ${ttsRes.durationSeconds}s, Buffer ${ttsRes.buffer.length} bytes`);

      // Use a timestamped filename to avoid any OS-level file caching
      const audioPath = path.join(localTmpDir, `${videoId}_${Date.now()}_audio.${ttsRes.ext}`);
      fs.writeFileSync(audioPath, ttsRes.buffer);

      let totalDuration = getAudioDuration(audioPath);
      console.log(`[PIPELINE] FFPROBE Duration for ${path.basename(audioPath)}: ${totalDuration}s`);

      if (!totalDuration || totalDuration <= 0) {
        console.warn(`[PIPELINE] ffprobe failed, falling back to TTS estimate: ${ttsRes.durationSeconds}`);
        totalDuration = ttsRes.durationSeconds || 5; 
      }
      
      // Ensure minimum duration to prevent HyperFrames crash
      totalDuration = Math.max(totalDuration, 1.0);
      console.log(`[PIPELINE] Final Audio Master Duration: ${totalDuration.toFixed(2)}s`);

      videoProgress.set(videoId, 20); // TTS Fully finished and analyzed

      // Distribute durations
      const totalChars = validScenes.reduce((sum, s) => sum + (s.voiceText?.length || 0), 0);
      const sceneDurations = validScenes.map((s) => {
        const charCount = s.voiceText?.length || 1;
        return (charCount / totalChars) * totalDuration;
      });

      console.log(`[PIPELINE] Proportional Scene Durations: ${sceneDurations.map(d => d.toFixed(2)).join(', ')} (Total: ${totalDuration.toFixed(2)}s)`);

      // === VIDEO RENDERING ===
      const outputPath = path.join(localTmpDir, `${videoId}.mp4`);

      await renderWithHyperFrames({
        videoId,
        scenes: validScenes, // Use cleaned scenes
        sceneDurations,
        templateId,
        outputPath,
        audioBuffer: ttsRes.buffer,
        audioExt: ttsRes.ext,
        audioDuration: totalDuration,
        bgmPath: bgmTempPath,
        bgmVolume: typeof bgmVolume === 'number' ? bgmVolume : 0.15,
        ratio: ratio || '9:16',
        settings: customSettings || undefined, // PASS CUSTOM SETTINGS TO RENDERER
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

      // Cleanup progress map after 5 minutes to prevent memory leak
      setTimeout(() => videoProgress.delete(videoId), 5 * 60 * 1000);

      // === CLEANUP ===
      // Cleanup temp audio file (TTS)
      try { if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath); } catch (_) { }

      // Cleanup temp BGM file (but not preset files)
      if (bgmTempPath && bgmAssetId && !bgmAssetId.startsWith('preset:')) {
        try { if (fs.existsSync(bgmTempPath)) fs.unlinkSync(bgmTempPath); } catch (_) { }
      }
    } catch (err: any) {
      console.error('[VIDEO GEN ERROR]', err);
      videoProgress.set(videoId, -1);

      if (bgmTempPath && settings.bgmAssetId && !settings.bgmAssetId.startsWith('preset:')) {
        try { fs.unlinkSync(bgmTempPath); } catch (_) { }
      }

      if (articleId) {
        await prisma.article.updateMany({
          where: { id: articleId },
          data: { status: 'summarized' }
        });
      }
      throw err;
    }
  } catch (err: any) {
    console.error('[PIPELINE FATAL ERROR]', err);
    throw err; // Re-throw so videoWorker can update task status to 'error'
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
    const videoPath = path.join(process.cwd(), 'render_cache', `${req.params.id}.mp4`);
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
  const videoPath = path.join(process.cwd(), 'render_cache', videoId.endsWith('.mp4') ? videoId : `${videoId}.mp4`);

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


