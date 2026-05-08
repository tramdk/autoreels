import { PrismaClient } from '@prisma/client';
import { runVideoGenerationPipeline } from '../controllers/videoController';

const prisma = new PrismaClient();
let isWorking = false;

/**
 * Background worker that processes video generation tasks sequentially.
 * This prevents server overload by ensuring only a limited number of renders
 * run at the same time.
 */
let lastTaskStartTime: number | null = null;
const MAX_TASK_DURATION = 15 * 60 * 1000; // 15 minutes safety timeout

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

      try {
        await runVideoGenerationPipeline(task.articleId || '', {
          templateId: task.templateId,
          ttsProvider: task.ttsProvider,
          ttsVoiceId: task.ttsVoiceId,
          bgmAssetId: task.bgmAssetId || undefined,
          bgmVolume: task.bgmVolume || 0.15,
          customContent: task.content || undefined,
          customImageUrl: task.imageUrl || undefined,
          source: task.source
        }, task.id);

        // Update task to completed
        await prisma.videoTask.update({
          where: { id: task.id },
          data: { status: 'completed' }
        });
        console.log(`✅ [VIDEO WORKER] Task ${task.id} finished successfully.`);
      } catch (err: any) {
        console.error(`❌ [VIDEO WORKER] Task ${task.id} failed:`, err);
        await prisma.videoTask.update({
          where: { id: task.id },
          data: { status: 'error', error: err.message || 'Unknown error' }
        });
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
 * Background worker that processes video generation tasks sequentially.
 */
export async function startVideoWorker() {
  console.log('🚀 [VIDEO WORKER] Started background render worker.');
  
  // Initial check
  processNextTask();

  // Periodic check (every 10 seconds)
  setInterval(async () => {
    // Safety check: if worker is "stuck" for too long, reset it
    if (isWorking && lastTaskStartTime && (Date.now() - lastTaskStartTime > MAX_TASK_DURATION)) {
      console.warn('⚠️ [VIDEO WORKER] Task seems stuck. Resetting worker lock...');
      isWorking = false;
    }

    if (!isWorking) {
      processNextTask();
    }
  }, 10000);
}

