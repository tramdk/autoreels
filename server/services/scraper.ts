import axios from 'axios';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import prisma from '../lib/prisma';

const parser = new Parser();

export async function extractMainImage(url: string): Promise<string | null> {
  try {
    const { data } = await axios.get(url, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } });
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

  for (const source of currentSources) {
    if (source.type === 'rss') {
      try {
        const feed = await parser.parseURL(source.url);
        const topItems = feed.items.slice(0, 3);
        for (const item of topItems) {
          const existing = await prisma.article.findUnique({ where: { link: item.link } });
          if (!existing) {
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
      } catch (sourceError) {
        console.error(`Error scraping source ${source.name}:`, sourceError);
      }
    }
  }
  return newArticles;
}
