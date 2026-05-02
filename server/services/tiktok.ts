import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';
import { uploadVideo } from './storage';

export async function publishToTikTok(videoId: string) {
  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) throw new Error('Video not found');

  const account = await prisma.account.findUnique({ where: { platform: 'tiktok' } });
  if (!account) throw new Error('TikTok account not connected');

  const localPath = path.join(process.cwd(), 'temp_renders', `${video.id}.mp4`);
  
  if (!fs.existsSync(localPath)) {
    throw new Error(`Local video file not found for publishing: ${localPath}`);
  }

  try {
    const videoBuffer = fs.readFileSync(localPath);
    const videoSize = videoBuffer.length;

    // 1. Initialize Upload using FILE_UPLOAD
    console.log(`[TikTok] Initializing upload for video: ${videoId} (${videoSize} bytes)`);
    const initResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({
        post_info: {
          title: video.title || "AutoReels Video",
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
      throw new Error(initData.error.message || 'Failed to initialize TikTok upload');
    }

    const uploadUrl = initData.data?.upload_url;
    const publishId = initData.data?.publish_id;
    if (!uploadUrl) throw new Error('TikTok did not provide an upload URL');

    // 2. Upload the file
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`
      },
      body: videoBuffer
    });

    if (!uploadResponse.ok) throw new Error(`Failed to upload to TikTok: ${uploadResponse.statusText}`);

    // SUCCESS! Now upload to Cloudinary for permanent storage and clean up local
    console.log(`[TikTok] Publish success! Archiving to Cloudinary...`);
    const cloudinaryUrl = await uploadVideo(localPath, 'autoreels_published', false);

    await prisma.video.update({
      where: { id: video.id },
      data: { 
        status: 'posted', 
        publishId,
        videoUrl: cloudinaryUrl // Update to Cloudinary URL
      }
    });

    return { success: true, publishId, archiveUrl: cloudinaryUrl };
  } catch (error: any) {
    console.error(`[TikTok Publish Error]`, error.message);
    throw error;
  }
}
