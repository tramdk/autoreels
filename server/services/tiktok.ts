import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';
import { downloadFile, cleanupFile } from './storage';

export async function publishToTikTok(videoId: string) {
  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) throw new Error('Video not found');

  const account = await prisma.account.findUnique({ where: { platform: 'tiktok' } });
  if (!account) throw new Error('TikTok account not connected');

  const tempDir = path.join(process.cwd(), 'render_cache');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  
  const localPath = path.join(tempDir, `${video.id}.mp4`);
  let isTempDownload = false;

  // 1. Ensure we have the video file locally
  if (!fs.existsSync(localPath)) {
    if (video.videoUrl && video.videoUrl.startsWith('http')) {
      console.log(`[TikTok] Local file missing, downloading from cloud: ${video.videoUrl}`);
      try {
        await downloadFile(video.videoUrl, localPath);
        
        // Verify download success
        if (!fs.existsSync(localPath) || fs.statSync(localPath).size === 0) {
          throw new Error('Downloaded file is empty or missing');
        }
        
        isTempDownload = true;
        console.log(`[TikTok] Download successful (${fs.statSync(localPath).size} bytes)`);
      } catch (dlErr: any) {
        throw new Error(`Cloud download failed: ${dlErr.message}`);
      }
    } else {
      throw new Error(`Video file not found locally and no cloud URL available for: ${videoId}`);
    }
  } else {
    // File exists locally, verify it's not empty
    const stats = fs.statSync(localPath);
    if (stats.size === 0) {
      console.log(`[TikTok] Local file is empty, attempting re-download...`);
      fs.unlinkSync(localPath);
      return publishToTikTok(videoId); // Recursive call to trigger download logic
    }
    console.log(`[TikTok] Using existing local file (${stats.size} bytes)`);
  }

  try {
    // 2. Prepare the video for upload
    const stats = fs.statSync(localPath);
    const videoSize = stats.size;

    // 2. Initialize Upload
    console.log(`[TikTok] Initializing upload for video: ${videoId} (${videoSize} bytes)`);
    const initResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({
        post_info: {
          title: (video.title || "AutoReels Video").slice(0, 150).replace(/[^\w\s\u00C0-\u1EF9]/gi, ''),
          privacy_level: "SELF_ONLY",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: videoSize,
          chunk_size: videoSize,
          total_chunk_count: 1
        }
      })
    });

    const initData = await initResponse.json() as any;
    if (initData.error && initData.error.code !== 'ok' && initData.error.code !== 0) {
      console.error(`[TikTok Init Error]`, JSON.stringify(initData.error, null, 2));
      throw new Error(initData.error.message || 'Failed to initialize TikTok upload');
    }

    const uploadUrl = initData.data?.upload_url;
    const publishId = initData.data?.publish_id;
    if (!uploadUrl) throw new Error('TikTok did not provide an upload URL');

    // 3. Upload the file using Stream
    console.log(`[TikTok] Streaming file to TikTok...`);
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`
      },
      body: fs.createReadStream(localPath)
    });

    if (!uploadResponse.ok) throw new Error(`Failed to upload to TikTok: ${uploadResponse.statusText}`);

    // SUCCESS! Update status
    console.log(`[TikTok] Publish success! Video ID: ${videoId}`);
    
    await prisma.video.update({
      where: { id: video.id },
      data: { 
        status: 'posted', 
        publishId
      }
    });

    // Always cleanup local file after successful publish to save space
    // The UI can still play the video via the Cloudinary URL redirect
    cleanupFile(localPath);

    return { success: true, publishId };
  } catch (error: any) {
    console.error(`[TikTok Publish Error]`, error.message);
    throw error;
  }
}
