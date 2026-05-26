import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { triggerWorker } from './videoWorker';
import { EventBusClient } from './EventBusClient';

const prisma = new PrismaClient();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required for blocking commands like XREADGROUP
  retryStrategy(times) {
    const delay = Math.min(times * 2000, 30000); // Max 30s between retries
    console.log(`🔄 [EVENT BUS] Redis reconnecting in ${delay/1000}s (attempt ${times})...`);
    return delay;
  },
  lazyConnect: true, // Don't connect until we call .connect()
});

redis.on('error', (err) => {
  console.error(`⚠️ [EVENT BUS] Redis error: ${err.message}`);
});

redis.on('connect', () => {
  console.log('✅ [EVENT BUS] Redis connected.');
});

const eb = new EventBusClient();

const STREAM_NAME = 'reels_stream';
const GROUP_NAME = 'autoreels_workers';
const CONSUMER_NAME = `worker_${Math.random().toString(36).substring(7)}`;

/**
 * Listens to the Event Bus (Redis Stream) for new video generation requests.
 */
export async function startEventBusWorker() {
  console.log(`📡 [EVENT BUS] Worker ${CONSUMER_NAME} starting...`);

  // 0. Connect to Redis (with lazyConnect)
  try {
    await redis.connect();
  } catch (err: any) {
    console.error(`⚠️ [EVENT BUS] Initial Redis connect failed: ${err.message}. Worker will retry in background.`);
    return; // Don't block server startup; ioredis retryStrategy handles reconnection
  }

  // 1. Create Consumer Group if it doesn't exist
  let groupCreated = false;
  while (!groupCreated) {
    try {
      await redis.xgroup('CREATE', STREAM_NAME, GROUP_NAME, '0', 'MKSTREAM');
      console.log(`📡 [EVENT BUS] Created consumer group: ${GROUP_NAME}`);
      groupCreated = true;
    } catch (err: any) {
      if (err.message.includes('BUSYGROUP')) {
        console.log(`📡 [EVENT BUS] Consumer group ${GROUP_NAME} already exists.`);
        groupCreated = true;
      } else {
        console.error('❌ [EVENT BUS] Error creating group:', err.message);
        let delay = 5000;
        if (err && err.message && err.message.includes('max requests limit exceeded')) {
          console.warn('⚠️ [EVENT BUS] Redis limit exceeded. Sleeping for 15 minutes before retrying group creation...');
          delay = 15 * 60 * 1000;
        } else {
          console.log('🔄 [EVENT BUS] Retrying in 5s...');
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // 2. Loop to read messages
  while (true) {
    try {
      // Read new messages from the group
      // '>' means messages that have never been delivered to other consumers
      const results = await redis.xreadgroup(
        'GROUP', GROUP_NAME, CONSUMER_NAME,
        'COUNT', '1',
        'BLOCK', '5000',
        'STREAMS', STREAM_NAME, '>'
      );

      if (!results || (results as any).length === 0) continue;

      const [stream, messages] = (results as any)[0] as [string, any[]];
      for (const [messageId, [_, data]] of messages) {
        const eventData = JSON.parse(data as string);
        
        if (eventData.event === 'REEL_REQUESTED') {
          console.log(`📥 [EVENT BUS] Received REEL_REQUESTED: ${eventData.payload.reelId}`);
          await handleReelRequest(eventData.payload);
        }

        // Acknowledge message
        await redis.xack(STREAM_NAME, GROUP_NAME, messageId);
      }
    } catch (err: any) {
      console.error('❌ [EVENT BUS] Error in worker loop:', err);
      let delay = 5000;
      if (err && err.message && err.message.includes('max requests limit exceeded')) {
        console.warn('⚠️ [EVENT BUS] Redis limit exceeded. Sleeping for 15 minutes to prevent spamming...');
        delay = 15 * 60 * 1000; // 15 minutes
      }
      await new Promise(resolve => setTimeout(resolve, delay)); // Wait before retry
    }
  }
}

async function handleReelRequest(payload: any) {
  try {
    // 1. Map payload to VideoTask
    const task = await prisma.videoTask.create({
      data: {
        id: payload.reelId, // Use the ID from manager
        articleId: payload.articleId || null,
        templateId: payload.templateId || 'classic',
        title: payload.title,
        content: payload.content || null,
        script: payload.script || null,
        imageUrl: payload.imageUrl,
        source: payload.source || 'manager', // Mark as coming from manager
        status: 'pending',
        ttsProvider: payload.ttsProvider || 'edge',
        ttsVoiceId: payload.ttsVoiceId || 'vi-VN-HoaiMyNeural',
        bgmAssetId: payload.bgmAssetId,
        bgmVolume: payload.bgmVolume || 0.15
      }
    });

    console.log(`✅ [EVENT BUS] Task created in DB: ${task.id}. Triggering worker...`);

    // 2. Wake up the video worker
    triggerWorker();
    
  } catch (err: any) {
    console.error(`❌ [EVENT BUS] Failed to create task for ${payload.reelId}:`, err.message);
  }
}
