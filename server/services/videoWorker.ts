import { PrismaClient } from '@prisma/client';
import { runVideoGenerationPipeline } from '../controllers/videoController';

const prisma = new PrismaClient();
let isWorking = false;

/**
 * Background worker that processes video generation tasks sequentially.
 * This prevents server overload by ensuring only a limited number of renders
 * run at the same time.
 */
export async function startVideoWorker() {
  console.log('🚀 [VIDEO WORKER] Started background render worker.');
  
  // Run the worker loop
  setInterval(async () => {
    if (isWorking) return;
    
    try {
      // Find the next pending task
      const task = await prisma.videoTask.findFirst({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' }
      });

      if (task) {
        isWorking = true;
        console.log(`🎬 [VIDEO WORKER] Starting render for Task ${task.id}...`);

        // Update status to processing
        await prisma.videoTask.update({
          where: { id: task.id },
          data: { status: 'processing' }
        });

        try {
          // Execute the actual rendering pipeline
          // We pass the task's metadata. 
          // Note: runVideoGenerationPipeline might need to be adjusted to accept 
          // direct content if articleId is missing.
          await runVideoGenerationPipeline(task.articleId || '', {
            templateId: task.templateId,
            ttsProvider: task.ttsProvider,
            ttsVoiceId: task.ttsVoiceId,
            bgmAssetId: task.bgmAssetId || undefined,
            bgmVolume: task.bgmVolume || 0.15,
            // Pass content/imageUrl if they exist (for workflow-generated posts)
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
        }
      }
    } catch (err) {
      console.error('[VIDEO WORKER] Error in loop:', err);
      isWorking = false;
    }
  }, 5000); // Check every 5 seconds
}
