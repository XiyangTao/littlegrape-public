/**
 * RSS 抓取服务
 * 从教育/科学/文化类 RSS 源抓取文章，导入精读管道
 */

import Parser from 'rss-parser';
import axios from 'axios';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jsdom = require('jsdom');
const { JSDOM, VirtualConsole } = jsdom;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Readability } = require('@mozilla/readability');
import sharp from 'sharp';
import { prisma } from '@/config/database';
import { OSSService } from '@/services/ossService';
import { logger } from '@/utils/logger';

// ─── RSS 源配置 ──────────────────────────────────────────

interface RssSource {
  name: string;
  url: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  titleFilter?: RegExp; // 只导入标题匹配的条目
}

const RSS_SOURCES: RssSource[] = [
  // ── 初级：专为英语学习者/儿童设计，词汇简单 ──
  { name: 'VOA As It Is', url: 'https://learningenglish.voanews.com/api/zkm-ql-vomx-tpej-rqi', level: 'beginner', category: 'general' },
  { name: 'VOA Science', url: 'https://learningenglish.voanews.com/api/zmg_pl-vomx-tpeymtm', level: 'beginner', category: 'general' },
  { name: 'VOA Health', url: 'https://learningenglish.voanews.com/api/zmmpql-vomx-tpey-_q', level: 'beginner', category: 'general' },
  { name: 'VOA Arts', url: 'https://learningenglish.voanews.com/api/zpyp_l-vomx-tpe_rym', level: 'beginner', category: 'general' },
  { name: 'VOA Everyday Grammar', url: 'https://learningenglish.voanews.com/api/zoroqql-vomx-tpeptpqq', level: 'beginner', category: 'general' },
  { name: 'VOA Education Tips', url: 'https://learningenglish.voanews.com/api/z_gjqyl-vomx-tpevmrov', level: 'beginner', category: 'general' },
  { name: 'News in Levels', url: 'https://www.newsinlevels.com/feed/', level: 'beginner', category: 'general', titleFilter: /– level 1$/i },
  { name: 'Time for Kids', url: 'https://www.timeforkids.com/feed/', level: 'beginner', category: 'general' },
  { name: 'Simple English News', url: 'https://www.simpleenglishnews.com/feed', level: 'beginner', category: 'general' },
  { name: 'Science News Explores', url: 'https://www.snexplores.org/feed', level: 'beginner', category: 'general' },
  { name: 'Mongabay Kids', url: 'https://kids.mongabay.com/feed/', level: 'beginner', category: 'general' },
  { name: 'Breaking News English', url: 'https://breakingnewsenglish.com/rss.xml', level: 'beginner', category: 'general' },
  { name: 'Spotlight English', url: 'https://spotlightenglish.com/feed/', level: 'beginner', category: 'general' },
  { name: 'Good News Network Kids', url: 'https://www.goodnewsnetwork.org/category/news/kids/feed/', level: 'beginner', category: 'general' },
  { name: 'Good News Network', url: 'https://www.goodnewsnetwork.org/feed/', level: 'beginner', category: 'general' },
  { name: 'PBS Nature Blog', url: 'https://www.pbs.org/wnet/nature/blog/feed/', level: 'beginner', category: 'general' },
  { name: 'The Kid Should See This', url: 'https://thekidshouldseethis.com/feed', level: 'beginner', category: 'general' },
  { name: 'Smithsonian Smart News', url: 'https://www.smithsonianmag.com/rss/smart-news/', level: 'beginner', category: 'general' },
  { name: 'Live Science', url: 'https://www.livescience.com/feeds.xml', level: 'beginner', category: 'general' },
  { name: 'Nat Geo Education Blog', url: 'https://blog.education.nationalgeographic.org/feed/', level: 'beginner', category: 'general' },
  { name: 'Positive News', url: 'https://www.positive.news/feed/', level: 'beginner', category: 'general' },
  { name: 'Oddity Central', url: 'https://feeds.feedburner.com/OddityCentral', level: 'beginner', category: 'culture' },
  { name: 'Bored Panda', url: 'https://www.boredpanda.com/feed/', level: 'beginner', category: 'culture' },
  { name: 'Upworthy', url: 'https://www.upworthy.com/feed', level: 'beginner', category: 'general' },
  { name: 'Earth Touch News', url: 'https://www.earthtouchnews.com/feed/', level: 'beginner', category: 'science' },
  { name: 'The Conversation Arts', url: 'https://theconversation.com/us/arts/articles.atom', level: 'beginner', category: 'culture' },
  { name: 'BBC Newsround', url: 'https://www.bbc.co.uk/newsround/rss.xml', level: 'beginner', category: 'general' },
  { name: 'NatGeo Kids UK', url: 'https://www.natgeokids.com/uk/feed/', level: 'beginner', category: 'general' },
  // ── 中级：内容有趣，语言中等难度 ──
  { name: 'Mental Floss', url: 'https://www.mentalfloss.com/rss.xml', level: 'intermediate', category: 'general' },
  { name: 'BBC Health', url: 'https://feeds.bbci.co.uk/news/health/rss.xml', level: 'intermediate', category: 'general' },
  { name: 'ScienceDaily', url: 'https://www.sciencedaily.com/rss/top/science.xml', level: 'intermediate', category: 'general' },
  { name: 'Atlas Obscura', url: 'https://www.atlasobscura.com/feeds/latest', level: 'intermediate', category: 'general' },
  // ── 高级：原汁原味英文媒体，长句多、词汇丰富 ──
  { name: 'Nautilus', url: 'https://nautil.us/feed/', level: 'advanced', category: 'general' },
  { name: 'Aeon', url: 'https://aeon.co/feed.rss', level: 'advanced', category: 'general' },
  { name: 'Listverse', url: 'https://listverse.com/feed/', level: 'advanced', category: 'general' },
  { name: 'Cool Green Science', url: 'https://blog.nature.org/feed/', level: 'advanced', category: 'general' },
  { name: 'The Marginalian', url: 'https://www.themarginalian.org/feed/', level: 'advanced', category: 'general' },
  { name: 'Longreads', url: 'https://longreads.com/feed/', level: 'advanced', category: 'general' },
  { name: 'Guardian Food', url: 'https://www.theguardian.com/food/rss', level: 'advanced', category: 'general' },
  { name: 'Guardian Travel', url: 'https://www.theguardian.com/travel/rss', level: 'advanced', category: 'general' },
  { name: 'Guardian Books', url: 'https://www.theguardian.com/books/rss', level: 'advanced', category: 'general' },
  { name: 'Dezeen', url: 'https://www.dezeen.com/feed/', level: 'advanced', category: 'general' },
  { name: 'The Conversation Health', url: 'https://theconversation.com/us/health/articles.atom', level: 'advanced', category: 'general' },
  { name: 'The Conversation Env', url: 'https://theconversation.com/us/environment/articles.atom', level: 'advanced', category: 'general' },
  { name: 'New Scientist', url: 'https://www.newscientist.com/feed/home/', level: 'advanced', category: 'general' },
  { name: 'The Conversation Tech', url: 'https://theconversation.com/us/technology/articles.atom', level: 'advanced', category: 'general' },
  { name: 'Ars Technica Science', url: 'https://feeds.arstechnica.com/arstechnica/science', level: 'advanced', category: 'general' },
  { name: 'The Atlantic', url: 'https://www.theatlantic.com/feed/all/', level: 'advanced', category: 'general' },
  { name: 'Quanta Magazine', url: 'https://www.quantamagazine.org/feed/', level: 'advanced', category: 'general' },
  { name: 'Literary Hub', url: 'https://lithub.com/feed/', level: 'advanced', category: 'general' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', level: 'advanced', category: 'general' },
  { name: 'Psyche', url: 'https://psyche.co/feed', level: 'advanced', category: 'general' },
  { name: 'The Walrus', url: 'https://thewalrus.ca/feed/', level: 'advanced', category: 'general' },
  { name: 'NPR Science', url: 'https://feeds.npr.org/1007/rss.xml', level: 'advanced', category: 'general' },
  { name: 'Guardian Science', url: 'https://www.theguardian.com/science/rss', level: 'advanced', category: 'general' },
  { name: 'BBC Future', url: 'https://www.bbc.com/future/feed.rss', level: 'advanced', category: 'general' },
  { name: 'BBC Culture', url: 'https://www.bbc.com/culture/feed.rss', level: 'advanced', category: 'general' },
];

/** source 标识符 → 可读名称映射（自动从 RSS_SOURCES 生成 + 已移除源的历史映射） */
export const SOURCE_DISPLAY_MAP: Record<string, string> = {
  // 从当前 RSS_SOURCES 自动生成
  ...Object.fromEntries(
    RSS_SOURCES.map(s => [
      `rss_${s.name.toLowerCase().replace(/\s+/g, '_')}`,
      s.name,
    ]),
  ),
  // 已移除的源（历史文章仍需显示可读名称）
  'rss_hakai_magazine': 'Hakai Magazine',
  'rss_voa_american_stories': 'VOA American Stories',
  'rss_the_new_yorker': 'The New Yorker',
  'rss_bbc_travel': 'BBC Travel',
  'rss_interesting_engineering': 'Interesting Engineering',
  'rss_popular_science': 'Popular Science',
  'rss_the_conversation_edu': 'The Conversation Edu',
  'rss_news_for_kids': 'News for Kids',
  'rss_kiwi_kids_news': 'Kiwi Kids News',
  'rss_science_journal_for_kids': 'Science Journal for Kids',
  'rss_nat_geo_kids': 'Nat Geo Kids',
};

/** 每源最多抓取条目数 */
const MAX_ITEMS_PER_SOURCE = 50;

/** 文章词数范围 */
const MIN_WORDS = 200;
const MAX_WORDS = 1500;

/** 抓取全文的超时时间 */
const FETCH_TIMEOUT_MS = 15_000;

// ─── 工具函数 ──────────────────────────────────────────

const parser = new Parser({ timeout: FETCH_TIMEOUT_MS });

/** 计算词数 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** 使用 Readability 从网页提取正文（保留段落结构）+ 封面图 */
async function fetchFullText(url: string): Promise<{ text: string; imageUrl: string | null } | null> {
  try {
    const resp = await axios.get(url, {
      timeout: FETCH_TIMEOUT_MS,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LittleGrapeBot/1.0)' },
      maxRedirects: 3,
    });
    if (typeof resp.data !== 'string') return null;

    const virtualConsole = new VirtualConsole();
    const dom = new JSDOM(resp.data, { url, virtualConsole });
    const doc = dom.window.document;

    // 提取封面图：og:image > twitter:image
    const imageUrl =
      doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
      doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
      null;

    const reader = new Readability(doc);
    const article = reader.parse();
    if (!article?.content) return null;

    // 从 Readability 的 HTML 输出中提取段落
    const paragraphs: string[] = [];
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let match;
    while ((match = pRegex.exec(article.content)) !== null) {
      const text = match[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
      if (text.length > 30) {
        paragraphs.push(text);
      }
    }

    if (paragraphs.length === 0) return null;
    return { text: paragraphs.join('\n\n'), imageUrl };
  } catch {
    return null;
  }
}

/** 下载图片并上传到 OSS，返回 CDN URL；失败返回 null */
async function uploadImageToOSS(sourceUrl: string, articleTitle: string): Promise<string | null> {
  try {
    const resp = await axios.get(sourceUrl, {
      timeout: FETCH_TIMEOUT_MS,
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LittleGrapeBot/1.0)' },
      maxRedirects: 3,
    });

    const contentType = resp.headers['content-type'] || 'image/jpeg';
    if (!contentType.startsWith('image/')) return null;

    let buffer = Buffer.from(resp.data);
    // 跳过过小的图片（可能是占位符/图标）
    if (buffer.length < 5_000) return null;

    // 大图压缩：宽度限 800px + JPEG quality 80
    if (buffer.length > 500_000) {
      buffer = await sharp(buffer)
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    const filename = `reading_cover_${Date.now()}.jpg`;

    const result = await OSSService.uploadFile(buffer, filename, 'image/jpeg', { folder: 'images' });
    if (!result.success || !result.cdnUrl) return null;

    logger.info(`[RSS] 封面图上传 OSS: ${articleTitle}`);
    return result.cdnUrl;
  } catch {
    return null;
  }
}

// ─── 核心逻辑 ──────────────────────────────────────────

interface FetchResult {
  imported: number;
  skipped: number;
  failed: number;
}

/** 抓取所有 RSS 源并导入文章（全并发） */
export async function fetchAndImportArticles(options?: {
  levels?: string[];
}): Promise<FetchResult> {
  const sources = options?.levels
    ? RSS_SOURCES.filter(s => options.levels!.includes(s.level))
    : RSS_SOURCES;

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const results = await Promise.allSettled(
    sources.map(source => fetchFromSource(source))
  );

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      imported += result.value.imported;
      skipped += result.value.skipped;
      failed += result.value.failed;
    } else {
      logger.error(`[RSS] 源 ${sources[i].name} 整体失败:`, result.reason);
      failed++;
    }
  });

  logger.info(`[RSS] 抓取完成: imported=${imported}, skipped=${skipped}, failed=${failed}`);
  return { imported, skipped, failed };
}

/** 从单个源抓取文章（全量去重，最多 MAX_ITEMS_PER_SOURCE 条） */
async function fetchFromSource(source: RssSource): Promise<FetchResult> {
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const feed = await parser.parseURL(source.url);
  const items = (feed.items || []).slice(0, MAX_ITEMS_PER_SOURCE);

  // 批量查询已存在的 sourceUrl 和 title，减少逐条查询
  const links = items
    .map(item => item.link)
    .filter((link): link is string => !!link);
  const titles = items
    .map(item => item.title)
    .filter((title): title is string => !!title);
  const existingArticles = await prisma.readingArticle.findMany({
    where: { OR: [{ sourceUrl: { in: links } }, { title: { in: titles } }] },
    select: { sourceUrl: true, title: true },
  });
  const existingUrls = new Set(existingArticles.map(a => a.sourceUrl));
  const existingTitles = new Set(existingArticles.map(a => a.title));

  for (const item of items) {
    try {
      const link = item.link;
      if (!link) { skipped++; continue; }

      // 标题过滤（如 News in Levels 只取 level 1）
      if (source.titleFilter && !source.titleFilter.test(item.title || '')) {
        skipped++;
        continue;
      }

      // 去重：URL 或标题已存在则跳过（同一文章不同年级版本等）
      if (existingUrls.has(link) || (item.title && existingTitles.has(item.title))) { skipped++; continue; }

      // 用 Readability 提取全文 + 封面图
      const extracted = await fetchFullText(link);
      if (!extracted || countWords(extracted.text) < MIN_WORDS) {
        skipped++;
        continue;
      }

      // 超长文章按段落截断到 MAX_WORDS
      let text = extracted.text;
      let wordCount = countWords(extracted.text);
      if (wordCount > MAX_WORDS) {
        const paragraphs = text.split(/\n\s*\n/);
        const kept: string[] = [];
        let total = 0;
        for (const p of paragraphs) {
          const pWords = countWords(p);
          if (total + pWords > MAX_WORDS && kept.length > 0) break;
          kept.push(p);
          total += pWords;
        }
        text = kept.join('\n\n');
        wordCount = total;
      }

      const title = item.title || 'Untitled';

      // 封面图优先级：RSS enclosure > og:image → 下载并上传 OSS
      const rawImageUrl = (item.enclosure as any)?.url || extracted.imageUrl || null;
      const imageUrl = rawImageUrl ? await uploadImageToOSS(rawImageUrl, title) : null;

      // 解析 RSS 条目的发布日期
      const sourcePublishedAt = item.isoDate ? new Date(item.isoDate)
        : item.pubDate ? new Date(item.pubDate) : null;

      try {
        await prisma.readingArticle.create({
          data: {
            title,
            content: text,
            level: source.level,
            category: source.category,
            wordCount,
            imageUrl,
            source: `rss_${source.name.toLowerCase().replace(/\s+/g, '_')}`,
            sourceUrl: link,
            sourcePublishedAt: sourcePublishedAt instanceof Date && !isNaN(sourcePublishedAt.getTime()) ? sourcePublishedAt : null,
            pipelineStatus: 'pending',
            isPublished: false,
          },
        });
        imported++;
      } catch (e: any) {
        if (e?.code === 'P2002') {
          logger.info(`[RSS] 跳过重复文章: ${title} (${link})`);
        } else {
          throw e;
        }
      }

      // 加入去重集合，防止同源内重复链接/标题
      existingUrls.add(link);
      existingTitles.add(title);
      logger.info(`[RSS] 导入: ${title} (${source.name}, ${wordCount} words)`);
    } catch (error: any) {
      // P2002 唯一冲突 = 跨源重复文章，当 skip 处理
      if (error?.code === 'P2002') {
        skipped++;
      } else {
        logger.error(`[RSS] 文章导入失败 (${source.name}):`, error);
        failed++;
      }
    }
  }

  return { imported, skipped, failed };
}

/** 回填已有文章的 sourcePublishedAt（从 RSS feed 重新解析 pubDate，按 sourceUrl 匹配） */
export async function backfillSourcePublishedAt(): Promise<{ updated: number; skipped: number; failed: number }> {
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  // 查询所有 sourcePublishedAt 为空的文章 URL
  const articles = await prisma.readingArticle.findMany({
    where: { sourcePublishedAt: null, sourceUrl: { not: null } },
    select: { id: true, sourceUrl: true },
  });
  const urlToId = new Map(articles.map(a => [a.sourceUrl!, a.id]));

  if (urlToId.size === 0) {
    logger.info('[RSS-backfill] 无需回填');
    return { updated: 0, skipped: 0, failed: 0 };
  }

  logger.info(`[RSS-backfill] ${urlToId.size} 篇文章待回填 sourcePublishedAt`);

  // 遍历所有 RSS 源，解析 pubDate
  await Promise.allSettled(
    RSS_SOURCES.map(async (source) => {
      try {
        const feed = await parser.parseURL(source.url);
        const items = (feed.items || []).slice(0, MAX_ITEMS_PER_SOURCE);
        for (const item of items) {
          const link = item.link;
          if (!link) continue;
          const articleId = urlToId.get(link);
          if (!articleId) continue;

          const pubDate = item.isoDate ? new Date(item.isoDate)
            : item.pubDate ? new Date(item.pubDate) : null;
          if (!pubDate || isNaN(pubDate.getTime())) { skipped++; continue; }

          await prisma.readingArticle.update({
            where: { id: articleId },
            data: { sourcePublishedAt: pubDate },
          });
          urlToId.delete(link);
          updated++;
        }
      } catch (error) {
        logger.error(`[RSS-backfill] 源 ${source.name} 解析失败:`, error);
        failed++;
      }
    })
  );

  logger.info(`[RSS-backfill] 完成: updated=${updated}, skipped=${skipped}, failed=${failed}, unmatched=${urlToId.size}`);
  return { updated, skipped, failed };
}
