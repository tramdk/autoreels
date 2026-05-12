import { PrismaClient } from '@prisma/client';
import { runVideoGenerationPipeline } from '../controllers/videoController';
import { EventBusClient } from './EventBusClient';

const prisma = new PrismaClient();
const eb = new EventBusClient();
let isWorking = false;

/**
 * Background worker that processes video generation tasks sequentially.
 */
let lastTaskStartTime: number | null = null;
const MAX_TASK_DURATION = 20 * 60 * 1000; // 20 minutes safety limit

export async function triggerWorker() {
  if (isWorking) return;
  isWorking = true;
  processNextTask();
}

async function processNextTask() {
  // We expect isWorking to be true when entering here from triggerWorker
  // but we keep the check for safety during the interval loop
  isWorking = true;
  
  try {
    // CRITICAL: Double check if any other task is ALREADY processing in DB
    // This handles cases where local state might be out of sync or race conditions
    const activeTask = await prisma.videoTask.findFirst({
      where: { status: 'processing' }
    });

    if (activeTask) {
      console.log(`⏳ [VIDEO WORKER] Task ${activeTask.id} is already in progress. Queueing current request.`);
      return; 
    }

    const task = await prisma.videoTask.findFirst({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' }
    });
    
    if (!task) {
      isWorking = false;
      return;
    }

    // ATOMIC CLAIM with status check
    const updateResult = await prisma.videoTask.updateMany({
      where: { id: task.id, status: 'pending' },
      data: { status: 'processing' }
    });

    if (updateResult.count === 0) {
      // Someone else (or another thread) claimed it
      isWorking = false;
      setTimeout(processNextTask, 500);
      return;
    }

    lastTaskStartTime = Date.now();
    console.log(`🎬 [VIDEO WORKER] Starting Task ${task.id}...`);

    // Notify Manager: Processing started
    await eb.publish('REEL_PROCESSING', { reelId: task.id });

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
        ratio: task.ratio,
        source: task.source
      }, task.id);

      // Fetch the final video details to get the URL
      const finishedVideo = await prisma.video.findUnique({ where: { id: task.id } });

      await prisma.videoTask.update({
        where: { id: task.id },
        data: { status: 'completed' }
      });

      // Notify Manager: Completion
      await eb.publish('REEL_COMPLETED', { 
        reelId: task.id, 
        videoUrl: finishedVideo?.videoUrl || '' 
      });

      console.log(`✅ [VIDEO WORKER] Task ${task.id} finished.`);
    } catch (err: any) {
      console.error(`❌ [VIDEO WORKER] Task ${task.id} failed:`, err);
      await prisma.videoTask.update({
        where: { id: task.id },
        data: { status: 'error', error: err.message || 'Unknown error' }
      });

      // Notify Manager: Failure
      await eb.publish('REEL_FAILED', { 
        reelId: task.id, 
        error: err.message || 'Unknown error' 
      });
    } finally {
      isWorking = false;
      lastTaskStartTime = null;
      setTimeout(processNextTask, 1000);
    }
  } catch (err) {
    console.error('[VIDEO WORKER] Loop Error:', err);
    isWorking = false;
  }
}

async function recoverStuckTasks() {
  try {
    const result = await prisma.videoTask.updateMany({
      where: { status: 'processing' },
      data: { status: 'pending' }
    });
    if (result.count > 0) console.log(`[VIDEO WORKER] Recovered ${result.count} tasks.`);
  } catch (err) { console.error('[VIDEO WORKER] Recovery error:', err); }
}

async function cleanupOldTasks() {
  console.log('[VIDEO WORKER] Cleanup skipped to preserve history.');
}

export async function startVideoWorker() {
  console.log('🚀 [VIDEO WORKER] Started background render worker.');
  await recoverStuckTasks();
  processNextTask();

  setInterval(async () => {
    if (isWorking && lastTaskStartTime && (Date.now() - lastTaskStartTime > MAX_TASK_DURATION)) {
      console.warn('⚠️ [VIDEO WORKER] Task taking too long.');
    }
    if (!isWorking) processNextTask();
  }, 10000);
}
