import axios from 'axios';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import prisma from '../lib/prisma';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const parser = new Parser({
  headers: {
    'User-Agent': USER_AGENT,
    'Accept': '*/*',
    'Referer': 'https://vnexpress.net/',
    'Cache-Control': 'no-cache',
  },
  timeout: 20000,
});

export async function extractMainImage(url: string): Promise<string | null> {
  try {
    const { data } = await axios.get(url, { 
      timeout: 20000, 
      headers: { 
        'User-Agent': USER_AGENT,
        'Referer': 'https://vnexpress.net/'
      } 
    });
    const $ = cheerio.load(data);
    const imageUrl = $('meta[property="og:image"]').attr('content') || 
                   $('meta[name="twitter:image"]').attr('content') ||
                   $('meta[property="og:image:url"]').attr('content');
    return imageUrl || null;
  } catch (e) {
    return null;
  }
}

export async function scrapeRssSources() {
  const dbSources = await prisma.source.findMany();
  if (dbSources.length === 0) {
    await prisma.source.createMany({
      data: [
        { name: 'VnExpress News', url: 'https://vnexpress.net/rss/tin-moi-nhat.rss', type: 'rss' },
        { name: 'BBC Vietnamese', url: 'https://www.bbc.com/vietnamese/index.xml', type: 'rss' }
      ]
    });
  }

  const currentSources = await prisma.source.findMany();
  const newArticles = [];
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  for (const source of currentSources) {
    if (source.type === 'rss') {
      let retryCount = 0;
      const maxRetries = 2;
      let feed = null;

      while (retryCount <= maxRetries && !feed) {
        try {
          console.log(`Scraping source: ${source.name} (Attempt ${retryCount + 1})...`);
          feed = await parser.parseURL(source.url);
        } catch (sourceError) {
          retryCount++;
          if (retryCount > maxRetries) {
            console.error(`Error scraping source ${source.name} after ${maxRetries + 1} attempts:`, sourceError);
          } else {
            console.log(`Retry ${retryCount} for ${source.name}...`);
            await delay(2000 * retryCount);
          }
        }
      }

      if (feed) {
        const topItems = feed.items.slice(0, 3);
        for (const item of topItems) {
          const existing = await prisma.article.findUnique({ where: { link: item.link } });
          if (!existing) {
            await delay(500);
            const imageUrl = item.link ? await extractMainImage(item.link) : null;
            const art = await prisma.article.create({
              data: {
                title: item.title || 'Untitled',
                link: item.link || '',
                contentSnippet: item.contentSnippet || item.content || '',
                pubDate: item.pubDate,
                imageUrl: imageUrl,
                sourceId: source.id,
                status: 'scraped'
              }
            });
            newArticles.push(art);
          }
        }
        await delay(1000);
      }
    }
  }
  return newArticles;
}
