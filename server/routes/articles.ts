import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { scrapeRssSources } from '../services/scraper';
import { genAI, getAIClient } from '../lib/ai';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  const allArticles = await prisma.article.findMany({
    orderBy: { createdAt: 'desc' },
    include: { source: true }
  });
  res.json(allArticles);
});

router.post('/scrape', authenticate, async (req, res) => {
  try {
    const newArticles = await scrapeRssSources();
    res.json({ success: true, count: newArticles.length, articles: newArticles });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/manual', authenticate, async (req, res) => {
  const { title, content, imageUrl } = req.body;
  try {
    const article = await prisma.article.create({
      data: {
        title,
        contentSnippet: content,
        imageUrl: imageUrl || null,
        link: 'manual://' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        status: 'scraped'
      }
    });
    res.json(article);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/summarize/:id', authenticate, async (req, res) => {
  console.log('[AI Debug] Resolving AI Client...');
  const resolvedAI = getAIClient(genAI);
  
  if (!resolvedAI) {
    console.error('[AI Debug] genAI is null/undefined');
    return res.status(500).json({ error: 'AI not configured' });
  }

  console.log('[AI Debug] Type of resolvedAI:', typeof resolvedAI);
  console.log('[AI Debug] Has getGenerativeModel:', typeof (resolvedAI as any).getGenerativeModel);
  
  const article = await prisma.article.findUnique({ where: { id: req.params.id } });
  if (!article) return res.status(404).json({ error: 'Article not found' });

  try {
    const model = resolvedAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `
    Summarize this article into a high-retention, viral TikTok script (about 120-150 words total).
    Language: Vietnamese.
    Style: Fast-paced, engaging, and detailed enough to fill 30-40 seconds of video.
    
    Structure: 
    1. Hook (15-20 words): A shocking or intriguing opening statement that stops the scroll.
    2. Body (80-100 words): Detailed explanation of the core facts. Use short, punchy sentences. Avoid being too brief.
    3. Call to Action (20-30 words): An interactive closing that asks a specific question to the audience.
    4. Suggested Keywords: 3 keywords for image search.
    
    Article Title: ${article.title}
    Content: ${article.contentSnippet}
    
    Return ONLY a JSON object:
    { "hook": "...", "body": "...", "callToAction": "...", "suggestedImages": ["...", "...", "..."] }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    await prisma.article.update({
      where: { id: article.id },
      data: { script: cleanJson, status: 'summarized' }
    });
    
    res.json(JSON.parse(cleanJson));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/script', authenticate, async (req, res) => {
  const { script } = req.body;
  try {
    await prisma.article.update({
      where: { id: req.params.id },
      data: { script: JSON.stringify(script) }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/clear', authenticate, async (req, res) => {
  await prisma.article.deleteMany();
  res.json({ success: true });
});

export default router;
