import { PrismaClient } from '@prisma/client';
import { runVideoGenerationPipeline } from '../controllers/videoController';
import { EventBusClient } from './EventBusClient';

const prisma = new PrismaClient();
const eb = new EventBusClient();

// CONCURRENCY SETTINGS
const MAX_CONCURRENT_TASKS = 3; 
let activeTaskCount = 0;
const activeTaskStarts = new Map<string, number>();

/**
 * Background worker that processes video generation tasks in parallel.
 */
const MAX_TASK_DURATION = 20 * 60 * 1000; // 20 minutes safety limit

export async function triggerWorker() {
  if (activeTaskCount >= MAX_CONCURRENT_TASKS) {
    console.log(`[VIDEO WORKER] Concurrency limit reached (${activeTaskCount}/${MAX_CONCURRENT_TASKS}). Task queued.`);
    return;
  }
  processNextTask();
}

async function processNextTask() {
  if (activeTaskCount >= MAX_CONCURRENT_TASKS) return;
  
  try {
    // Find the oldest pending task
    const task = await prisma.videoTask.findFirst({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' }
    });
    
    if (!task) return;

    // ATOMIC CLAIM: Only pick it up if it's still 'pending'
    const updateResult = await prisma.videoTask.updateMany({
      where: { id: task.id, status: 'pending' },
      data: { status: 'processing' }
    });

    if (updateResult.count === 0) {
      // Someone else claimed it, try for the next one immediately
      setTimeout(processNextTask, 100);
      return;
    }

    // Increment concurrency counter
    activeTaskCount++;
    activeTaskStarts.set(task.id, Date.now());
    console.log(`🎬 [VIDEO WORKER] [${activeTaskCount}/${MAX_CONCURRENT_TASKS}] Starting Task ${task.id}...`);

    // Notify Manager: Processing started (only for external tasks)
    if (task.source !== 'internal') {
      await eb.publish('REEL_PROCESSING', { reelId: task.id });
    }

    // Run the pipeline asynchronously so we can pick up the next task
    (async () => {
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
        }, task.id, task.userId || undefined);

        // Fetch the final video details to get the URL
        const finishedVideo = await prisma.video.findUnique({ where: { id: task.id } });

        await prisma.videoTask.update({
          where: { id: task.id },
          data: { status: 'completed' }
        });

        // Notify Manager: Completion (only for external tasks)
        if (task.source !== 'internal') {
          await eb.publish('REEL_COMPLETED', { 
            reelId: task.id, 
            videoUrl: finishedVideo?.videoUrl || '' 
          });
        }

        console.log(`✅ [VIDEO WORKER] Task ${task.id} finished.`);
      } catch (err: any) {
        console.error(`❌ [VIDEO WORKER] Task ${task.id} failed:`, err);
        await prisma.videoTask.update({
          where: { id: task.id },
          data: { status: 'error', error: err.message || 'Unknown error' }
        });

        if (task.source !== 'internal') {
          await eb.publish('REEL_FAILED', { 
            reelId: task.id, 
            error: err.message || 'Unknown error' 
          });
        }
      } finally {
        activeTaskCount--;
        activeTaskStarts.delete(task.id);
        // After finishing, check if there's more work to do
        processNextTask();
      }
    })();

    // Try to pick up another task if we still have capacity
    if (activeTaskCount < MAX_CONCURRENT_TASKS) {
      setTimeout(processNextTask, 500);
    }
  } catch (err) {
    console.error('[VIDEO WORKER] Loop Error:', err);
  }
}

async function recoverStuckTasks() {
  try {
    // Reset tasks that were marked as 'processing' but are actually dead
    const result = await prisma.videoTask.updateMany({
      where: { status: 'processing' },
      data: { status: 'pending' }
    });
    if (result.count > 0) console.log(`[VIDEO WORKER] Recovered ${result.count} tasks.`);
  } catch (err) { console.error('[VIDEO WORKER] Recovery error:', err); }
}

async function cleanupOldTasks() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await prisma.videoTask.deleteMany({
      where: {
        status: { in: ['completed', 'error'] },
        createdAt: { lt: sevenDaysAgo }
      }
    });
  } catch (err) { console.error('[VIDEO WORKER] Cleanup error:', err); }
}

export async function startVideoWorker() {
  console.log(`🚀 [VIDEO WORKER] Started. Concurrency: ${MAX_CONCURRENT_TASKS}`);
  await recoverStuckTasks();
  processNextTask();

  // Safety net: Check for timed-out tasks every 60s
  setInterval(async () => {
    const now = Date.now();
    for (const [id, start] of activeTaskStarts.entries()) {
      if (now - start > MAX_TASK_DURATION) {
        console.warn(`⚠️ [VIDEO WORKER] Task ${id} timed out. Marking as error...`);
        try {
          await prisma.videoTask.update({
            where: { id },
            data: { status: 'error', error: 'Task timed out after 20 minutes' }
          });
          activeTaskStarts.delete(id);
          activeTaskCount = Math.max(0, activeTaskCount - 1);
        } catch (e) {}
      }
    }
    
    // Periodically check if we missed anything (e.g. after a DB reconnect)
    if (activeTaskCount < MAX_CONCURRENT_TASKS) processNextTask();
  }, 60000);

  // Run cleanup every 24 hours
  setInterval(cleanupOldTasks, 24 * 60 * 60 * 1000);
  cleanupOldTasks();
}
