import prisma from '../lib/prisma';
import { apiRequestInternal } from '../utils/internalApi';

/**
 * Recovery Service: Tự động tìm và chạy lại các tác vụ dựng video bị dở dang khi server restart.
 */
export async function recoverInterruptedTasks() {
  console.log('[RECOVERY] Checking for interrupted video generation tasks...');

  try {
    const interruptedArticles = await prisma.article.findMany({
      where: { status: 'generating' }
    });

    if (interruptedArticles.length === 0) {
      console.log('[RECOVERY] No interrupted tasks found.');
      return;
    }

    console.log(`[RECOVERY] Found ${interruptedArticles.length} tasks to recover.`);

    for (const article of interruptedArticles) {
      const script = article.script as any;
      const settings = script?.renderSettings;

      if (!settings) {
        console.warn(`[RECOVERY] Article ${article.id} has no render settings. Resetting status to summarized.`);
        await prisma.article.update({
          where: { id: article.id },
          data: { status: 'summarized' }
        });
        continue;
      }

      console.log(`[RECOVERY] Restarting generation for article: ${article.title}`);
      
      // Chúng ta sẽ gọi nội bộ hàm generate thông qua một helper 
      // để đảm bảo logic chạy ngầm giống hệt như lúc bấm nút.
      triggerInternalGeneration(article.id, settings);
    }
  } catch (error) {
    console.error('[RECOVERY] Critical error during recovery:', error);
  }
}

// Helper để kích hoạt lại tiến trình (sẽ được import logic từ videoController)
async function triggerInternalGeneration(articleId: string, settings: any) {
  // Vì videoController.generateVideo yêu cầu Req/Res, 
  // chúng ta sẽ import hàm core của nó sau khi refactor.
  const { runVideoGenerationPipeline } = await import('../controllers/videoController');
  
  runVideoGenerationPipeline(articleId, settings).catch(err => {
    console.error(`[RECOVERY] Failed to restart task for ${articleId}:`, err);
  });
}
