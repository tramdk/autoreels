import prisma from '../lib/prisma';

/**
 * Recovery Service: Resets interrupted tasks when server restarts.
 * Instead of re-running pipelines directly (which causes race conditions),
 * it resets article status and creates new VideoTask entries in the queue.
 */
export async function recoverInterruptedTasks() {
  console.log('[RECOVERY] Checking for interrupted video generation tasks...');

  try {
    // Find articles stuck in 'generating' state (from a previous crash)
    const interruptedArticles = await prisma.article.findMany({
      where: { status: 'generating' }
    });

    if (interruptedArticles.length === 0) {
      console.log('[RECOVERY] No interrupted tasks found.');
      return;
    }

    console.log(`[RECOVERY] Found ${interruptedArticles.length} interrupted articles.`);

    for (const article of interruptedArticles) {
      const script = article.script as any;
      const settings = script?.renderSettings;

      if (!settings) {
        // No render settings saved — just reset to summarized
        console.warn(`[RECOVERY] Article ${article.id} has no render settings. Resetting to summarized.`);
        await prisma.article.update({
          where: { id: article.id },
          data: { status: 'summarized' }
        });
        continue;
      }

      // Check if a pending/processing task already exists for this article
      const existingTask = await prisma.videoTask.findFirst({
        where: { articleId: article.id, status: { in: ['pending', 'processing'] } }
      });

      if (existingTask) {
        console.log(`[RECOVERY] Task ${existingTask.id} already exists for article ${article.id}. Skipping.`);
        continue;
      }

      // Create a new task in the queue instead of calling pipeline directly
      console.log(`[RECOVERY] Re-queuing article: ${article.title}`);
      await prisma.videoTask.create({
        data: {
          articleId: article.id,
          templateId: settings.templateId || 'classic',
          title: article.title,
          content: article.contentSnippet || article.title,
          script: JSON.stringify(script),
          imageUrl: article.imageUrl,
          ttsProvider: settings.ttsProvider || 'edge',
          ttsVoiceId: settings.ttsVoiceId || 'vi-VN-HoaiMyNeural',
          bgmAssetId: settings.bgmAssetId || null,
          bgmVolume: settings.bgmVolume || 0.15,
          status: 'pending',
          source: 'internal'
        }
      });
    }

    // Trigger the worker to pick up recovered tasks
    const { triggerWorker } = await import('../services/videoWorker');
    triggerWorker();

  } catch (error) {
    console.error('[RECOVERY] Critical error during recovery:', error);
  }
}
