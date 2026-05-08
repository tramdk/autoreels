import { PrismaClient } from '@prisma/client';
import { runVideoGenerationPipeline } from '../controllers/videoController';
import { EventBusClient } from './EventBusClient';

const prisma = new PrismaClient();
const eb = new EventBusClient();
let isWorking = false;

/**
 * Background worker that processes video generation tasks sequentially.
 * This prevents server overload by ensuring only a limited number of renders
 * run at the same time.
 */
let lastTaskStartTime: number | null = null;
const MAX_TASK_DURATION = 20 * 60 * 1000; // 20 minutes safety limit for monitoring

export async function triggerWorker() {
  if (isWorking) return;
  processNextTask();
}

async function processNextTask() {
  if (isWorking) return;
  isWorking = true; // Set immediately to prevent race conditions

  try {
    // Find the next pending task
    const task = await prisma.videoTask.findFirst({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' }
    });

    if (task) {
      lastTaskStartTime = Date.now();
      console.log(`🎬 [VIDEO WORKER] Starting render for Task ${task.id}...`);

      // Update status to processing
      await prisma.videoTask.update({
        where: { id: task.id },
        data: { status: 'processing' }
      });

      // Publish processing event if from manager
      if (task.source === 'manager') {
        await eb.publish('REEL_PROCESSING', {
          reelId: task.id,
          status: 'started'
        });
      }

      // Also update the related article status to 'generating' if it exists
      if (task.articleId) {
        await prisma.article.updateMany({
          where: { id: task.articleId },
          data: { status: 'generating' }
        });
      }

      try {
        await runVideoGenerationPipeline(task.articleId || '', {
          templateId: task.templateId,
          ttsProvider: task.ttsProvider,
          ttsVoiceId: task.ttsVoiceId,
          bgmAssetId: task.bgmAssetId || undefined,
          bgmVolume: task.bgmVolume || 0.15,
          title: task.title || undefined,
          customContent: task.content || undefined,
          customScript: task.script || undefined,
          customImageUrl: task.imageUrl || undefined,
          source: task.source
        }, task.id);

        // Update task to completed
        await prisma.videoTask.update({
          where: { id: task.id },
          data: { status: 'completed' }
        });

        // Publish completion event
        if (task.source === 'manager') {
          const video = await prisma.video.findUnique({ where: { id: task.id } });
          if (video) {
            await eb.publish('REEL_COMPLETED', {
              reelId: task.id,
              videoUrl: video.videoUrl,
              thumbnailUrl: video.videoUrl.replace('.mp4', '.jpg'), // Basic heuristic
              duration: 0 // Could be extracted if needed
            });
          }
        }

        console.log(`✅ [VIDEO WORKER] Task ${task.id} finished successfully.`);
      } catch (err: any) {
        console.error(`❌ [VIDEO WORKER] Task ${task.id} failed:`, err);
        await prisma.videoTask.update({
          where: { id: task.id },
          data: { status: 'error', error: err.message || 'Unknown error' }
        });

        if (task.source === 'manager') {
          await eb.publish('REEL_FAILED', {
            reelId: task.id,
            error: err.message || 'Unknown error'
          });
        }
      } finally {
        isWorking = false;
        lastTaskStartTime = null;
        // Check immediately for next task in queue
        setTimeout(processNextTask, 1000);
      }
    } else {
      isWorking = false;
    }
  } catch (err) {
    console.error('[VIDEO WORKER] Error in loop:', err);
    isWorking = false;
    lastTaskStartTime = null;
  }
}

/**
 * Recovers tasks that were stuck in 'processing' state (e.g., due to server crash).
 */
async function recoverStuckTasks() {
  try {
    const result = await prisma.videoTask.updateMany({
      where: { status: 'processing' },
      data: { status: 'pending' }
    });
    if (result.count > 0) {
      console.log(`[VIDEO WORKER] Recovered ${result.count} stuck tasks.`);
    }
  } catch (err) {
    console.error('[VIDEO WORKER] Recovery error:', err);
  }
}

/**
 * Periodically deletes completed tasks from source 'internal' to keep the DB clean.
 */
async function cleanupCompletedTasks() {
  try {
    const result = await prisma.videoTask.deleteMany({
      where: { 
        status: 'completed',
        source: 'internal'
      }
    });
    if (result.count > 0) {
      console.log(`[VIDEO WORKER] Cleaned up ${result.count} completed internal tasks.`);
    }
  } catch (err) {
    console.error('[VIDEO WORKER] Cleanup error:', err);
  }
}

/**
 * Background worker that processes video generation tasks sequentially.
 */
export async function startVideoWorker() {
  console.log('🚀 [VIDEO WORKER] Started background render worker.');

  // Recover stuck tasks from previous session (e.g. server crash)
  await recoverStuckTasks();
  
  // Initial cleanup
  await cleanupCompletedTasks();

  // Initial check
  processNextTask();

  // Periodic check (every 10 seconds)
  setInterval(async () => {
    // Monitoring check: log if a task is taking unusually long, but don't reset the lock for safety
    if (isWorking && lastTaskStartTime && (Date.now() - lastTaskStartTime > MAX_TASK_DURATION)) {
      console.warn('⚠️ [VIDEO WORKER] Task has been running for over 20 minutes. Please check server resources.');
    }

    if (!isWorking) {
      processNextTask();
    }
    
    // Cleanup every 5 minutes (approx)
    if (Date.now() % 300000 < 10000) {
       cleanupCompletedTasks();
    }
  }, 10000);
}

