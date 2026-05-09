/**
 * 精读内容管道
 * RSS 抓取 → AI 处理 → 标记发布
 */

import { prisma } from '@/config/database';
import { aiServiceClient } from '@/clients/aiServiceClient';
import { speechServiceClient } from '@/clients/speechServiceClient';
import { OSSService } from '@/services/ossService';
import { logger } from '@/utils/logger';

/** 质量筛选 + 压缩单篇文章 */
export async function compressArticle(articleId: string): Promise<void> {
  const article = await prisma.readingArticle.findUnique({ where: { id: articleId } });
  if (!article) throw new Error(`文章不存在: ${articleId}`);

  // 幂等守卫：已压缩或更后续的状态直接跳过
  if (['compressed', 'processing', 'processed', 'ready'].includes(article.pipelineStatus)) {
    logger.info(`文章已压缩或更后续状态，跳过 compress: ${article.title} (${article.pipelineStatus})`);
    return;
  }

  const wordCount = article.content.split(/\s+/).filter(Boolean).length;

  // 低于 200 词直接标记不合格
  if (wordCount < 200) {
    logger.info(`文章词数不足 (${wordCount} < 200)，标记 rejected: ${article.title}`);
    await prisma.readingArticle.update({
      where: { id: articleId },
      data: { pipelineStatus: 'rejected' },
    });
    return;
  }

  await prisma.readingArticle.update({
    where: { id: articleId },
    data: { pipelineStatus: 'compressing' },
  });

  try {
    const result = await aiServiceClient.compressReadingArticle(article.title, article.content, true);

    if (!result.qualified) {
      logger.info(`文章不合格: ${article.title} - ${result.rejectReason}`);
      await prisma.readingArticle.update({
        where: { id: articleId },
        data: { pipelineStatus: 'rejected' },
      });
      return;
    }

    // 压缩后词数不在 200-400 范围的直接 reject（AI 目标 250-350，允许一定偏差）
    const compressedWordCount = result.compressed
      ? result.compressed.split(/\s+/).filter(Boolean).length
      : 0;

    if (compressedWordCount < 200 || compressedWordCount > 400) {
      logger.info(`压缩后词数不达标 (${compressedWordCount} 词)，标记 rejected: ${article.title}`);
      await prisma.readingArticle.update({
        where: { id: articleId },
        data: { pipelineStatus: 'rejected' },
      });
      return;
    }

    await prisma.readingArticle.update({
      where: { id: articleId },
      data: {
        contentCompressed: result.compressed,
        pipelineStatus: 'compressed',
      },
    });

    logger.info(`文章精炼完成: ${article.title} (${wordCount} → ${compressedWordCount} 词, level=${result.level})`);
  } catch (error) {
    logger.error(`文章压缩失败: ${article.title}`, error);
    await prisma.readingArticle.update({
      where: { id: articleId },
      data: { pipelineStatus: 'compress_failed' },
    });
    throw error;
  }
}

/** 处理单篇文章：调用 AI Service 生成结构化内容（基于压缩后的内容） */
export async function processArticle(articleId: string): Promise<void> {
  const article = await prisma.readingArticle.findUnique({ where: { id: articleId } });
  if (!article) throw new Error(`文章不存在: ${articleId}`);
  if (article.pipelineStatus === 'ready' || article.pipelineStatus === 'processed') {
    logger.info(`文章已处理完成，跳过: ${article.title}`);
    return;
  }

  // 被 reject 的文章不应进入精读处理
  if (article.pipelineStatus === 'rejected') {
    logger.info(`文章已被 rejected，跳过: ${article.title}`);
    return;
  }

  // 使用压缩后的内容，没有则用原文
  const content = article.contentCompressed || article.content;

  await prisma.readingArticle.update({
    where: { id: articleId },
    data: { pipelineStatus: 'processing' },
  });

  try {
    // 用 djb2 hash 做教师轮换（分布均匀，稳定，不依赖 count 变化）
    const articleIndex = article.id.split('').reduce((hash, c) => ((hash << 5) + hash + c.charCodeAt(0)) >>> 0, 5381);

    const result = await aiServiceClient.processReadingArticle(
      article.title,
      content,
      article.level,
      articleIndex,
    );

    await prisma.readingArticle.update({
      where: { id: articleId },
      data: {
        titleZh: result.titleZh || article.titleZh,
        contentZh: result.paragraphs.map((p: any) => p.zh).join('\n\n'),
        summary: result.summary,
        summaryZh: result.summaryZh,
        paragraphs: result.paragraphs,
        keyVocabulary: result.keyVocabulary,
        quiz: result.quiz,
        explanationScript: result.explanationScript,
        teacherId: result.teacherId,
        pipelineVersion: result.pipelineVersion ?? 2,
        pipelineStatus: 'processed',
        processedAt: new Date(),
      },
    });

    logger.info(`文章 AI 处理完成 (v2): ${article.title}, teacher=${result.teacherId}`);
  } catch (error) {
    logger.error(`文章 AI 处理失败: ${article.title}`, error);
    await prisma.readingArticle.update({
      where: { id: articleId },
      data: { pipelineStatus: 'failed' },
    });
    throw error;
  }
}


import { getReadingTeachers } from '@/config/characters';

/** 清洗文本中不适合 TTS 朗读的符号 */
function sanitizeForTTS(text: string): string {
  return text
    // 移除 markdown 格式标记
    .replace(/[*_~`#]/g, '')
    // 移除各种引号包裹（保留引号内的内容）
    .replace(/["""''「」『』【】]/g, '')
    // 移除括号注释（中文括号 + 英文括号，连同内容移除仅当是纯注释时）
    .replace(/（注[：:].*?）/g, '')
    // 移除单独的括号符号（保留内容）
    .replace(/[（）()]/g, '')
    // 移除序号标记如 "1." "1、" "①"
    .replace(/^\s*\d+[.、)）]\s*/gm, '')
    .replace(/[①②③④⑤⑥⑦⑧⑨⑩]/g, '')
    // 转义 SSML 特殊字符（& 必须转义，否则 Azure TTS 报错）
    .replace(/&/g, ' and ')
    // 移除多余空行
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 按段落边界拆分长文本，每段不超过 maxLen 字符 */
function splitTextForTTS(text: string, maxLen = 3000): string[] {
  if (text.length <= maxLen) return [text];

  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if (current && (current.length + para.length + 2) > maxLen) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

/** TTS 合成并上传 OSS，返回 CDN URL（长文本自动分段合成再拼接） */
async function synthesizeAndUpload(
  text: string,
  voice: string,
  filename: string,
): Promise<string> {
  const sanitized = sanitizeForTTS(text);
  const chunks = splitTextForTTS(sanitized);

  // 逐段合成（串行避免并发限制）
  // 注意：MP3 帧级拼接在大部分播放器可用，但可能导致时长元数据不准确
  const buffers: Buffer[] = [];
  for (const chunk of chunks) {
    const response = await speechServiceClient.synthesizeSpeech({
      text: chunk,
      voice,
      format: 'mp3',
      quality: 'premium',
    });
    buffers.push(Buffer.from(response.data));
  }

  const audioBuffer = Buffer.concat(buffers);
  const result = await OSSService.uploadFile(
    audioBuffer,
    filename,
    'audio/mpeg',
    { folder: 'audio' },
  );

  if (!result.success || !result.cdnUrl) {
    throw new Error(`OSS 上传失败: ${result.error}`);
  }

  return result.cdnUrl;
}

/** 首词匹配：在 wordBoundary 序列中找每句话的 startMs（两词验证法） */
function matchSentencesToWordBoundary(
  chineseSentences: string[],
  aiMapping: Array<{ chineseSentence: string; englishSentence: string; paragraphIndex: number }>,
  wordBounds: Array<{ text: string; audioOffsetMs: number; durationMs: number }>,
): Array<{ sentence: string; englishSentence: string; paragraphIndex: number; startMs: number; endMs: number }> {
  const result: Array<{ sentence: string; englishSentence: string; paragraphIndex: number; startMs: number; endMs: number }> = [];
  let wbIdx = 0;

  for (let i = 0; i < chineseSentences.length; i++) {
    const ch = chineseSentences[i];
    const ai = aiMapping[i] || { englishSentence: '', paragraphIndex: -1 };
    const sanitizedCh = sanitizeForTTS(ch);

    let startMs = -1;
    for (let j = wbIdx; j < wordBounds.length; j++) {
      const word1 = wordBounds[j].text;

      // 第一个词必须出现在句子开头（位置 0）
      if (sanitizedCh.indexOf(word1) !== 0) continue;

      // 如果只有一个词（最后一个），直接匹配
      if (j + 1 >= wordBounds.length) {
        startMs = wordBounds[j].audioOffsetMs;
        wbIdx = j + 1;
        break;
      }

      // 两词验证：第二个词应紧跟第一个词出现在句子中（允许中间有标点/空格，最多 3 字符间隔）
      const word2 = wordBounds[j + 1].text;
      const searchFrom = word1.length;
      const idx2 = sanitizedCh.indexOf(word2, searchFrom);
      if (idx2 >= 0 && idx2 <= searchFrom + 3) {
        startMs = wordBounds[j].audioOffsetMs;
        wbIdx = j + 1;
        break;
      }

      // 第二个词验证失败，但第一个词够长（≥3字符），也接受
      if (word1.length >= 3) {
        startMs = wordBounds[j].audioOffsetMs;
        wbIdx = j + 1;
        break;
      }
    }

    if (startMs < 0) {
      // 没找到匹配，用上一句的 startMs 顺延
      startMs = result.length > 0 ? result[result.length - 1].startMs : 0;
      logger.warn(`句子首词匹配失败，降级处理: "${sanitizedCh.substring(0, 20)}..."`);
    }

    result.push({
      sentence: ch,
      englishSentence: ai.englishSentence,
      paragraphIndex: ai.paragraphIndex,
      startMs,
      endMs: 0, // 后面回填
    });
  }

  // 回填 endMs：下一句的 startMs 或音频末尾
  const lastWb = wordBounds[wordBounds.length - 1];
  const audioEndMs = lastWb ? lastWb.audioOffsetMs + lastWb.durationMs : 0;
  for (let i = 0; i < result.length; i++) {
    result[i].endMs = i + 1 < result.length ? result[i + 1].startMs : audioEndMs;
  }

  return result;
}

/** 将句子列表按字符数分段，每段不超过 maxChars */
function splitSentencesIntoChunks(sentences: string[], maxChars = 2000): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentLen = 0;

  for (const s of sentences) {
    if (current.length > 0 && currentLen + s.length > maxChars) {
      chunks.push(current);
      current = [s];
      currentLen = s.length;
    } else {
      current.push(s);
      currentLen += s.length;
    }
  }
  if (current.length > 0) chunks.push(current);

  return chunks;
}

/** 用 Bookmark 方式分段合成句子列表并上传 OSS，返回 CDN URL + 每句的 startMs */
async function synthesizeWithBookmarksAndUpload(
  sentences: string[],
  voice: string,
  filename: string,
  lang?: string,
): Promise<{ url: string; sentenceTimings: Array<{ startMs: number; endMs: number }> }> {
  const sanitizedSentences = sentences.map(s => sanitizeForTTS(s));

  // 分段合成（每段不超过 500 字符，确保 bookmark 偏差 < 1 秒）
  const chunks = splitSentencesIntoChunks(sanitizedSentences, 500);
  logger.info(`Bookmark 合成分段: ${chunks.length} 段, 共 ${sanitizedSentences.length} 句`);

  const audioBuffers: Buffer[] = [];
  const globalBookmarkMap = new Map<number, number>();
  let audioOffsetAccMs = 0;
  let sentenceIndexAcc = 0;

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];

    const result = await speechServiceClient.synthesizeWithBookmarks({
      sentences: chunk,
      voice,
      format: 'mp3',
      lang,
    });

    audioBuffers.push(result.audio);

    // 将本段的 bookmark 映射到全局索引，累加音频偏移
    for (const bm of result.bookmarks) {
      const match = bm.name.match(/^s(\d+)$/);
      if (match) {
        const localIdx = parseInt(match[1]);
        globalBookmarkMap.set(sentenceIndexAcc + localIdx, bm.audioOffsetMs + audioOffsetAccMs);
      }
    }

    // 优先用 API 返回的精确时长，降级用字节估算（兼容 Azure）
    const chunkDurationMs = result.durationMs != null && result.durationMs > 0
      ? result.durationMs
      : Math.round(result.audio.length / 4);
    audioOffsetAccMs += chunkDurationMs;
    sentenceIndexAcc += chunk.length;

    logger.info(`Bookmark 合成第 ${ci + 1}/${chunks.length} 段: ${chunk.length} 句, ${chunkDurationMs}ms, bookmarks=${result.bookmarks.length}`);
  }

  const audioBuffer = Buffer.concat(audioBuffers);
  const totalDurationMs = audioOffsetAccMs > 0 ? audioOffsetAccMs : Math.round(audioBuffer.length / 4);

  // 计算每句的 startMs/endMs
  const sentenceTimings: Array<{ startMs: number; endMs: number }> = [];
  for (let i = 0; i < sentences.length; i++) {
    const startMs = globalBookmarkMap.get(i) ?? (sentenceTimings.length > 0 ? sentenceTimings[sentenceTimings.length - 1].endMs : 0);
    const endMs = globalBookmarkMap.get(i + 1) ?? (i === sentences.length - 1 ? totalDurationMs : startMs);
    sentenceTimings.push({ startMs, endMs });
  }

  const uploadResult = await OSSService.uploadFile(
    audioBuffer,
    filename,
    'audio/mpeg',
    { folder: 'audio' },
  );

  if (!uploadResult.success || !uploadResult.cdnUrl) {
    throw new Error(`OSS 上传失败: ${uploadResult.error}`);
  }

  return { url: uploadResult.cdnUrl, sentenceTimings };
}

/** 为已处理的文章生成 TTS 音频并上传 OSS（3 类音频：全文朗读 + 整篇讲解 + 核心生词） */
export async function generateArticleAudio(articleId: string): Promise<void> {
  const article = await prisma.readingArticle.findUnique({ where: { id: articleId } });
  if (!article) throw new Error(`文章不存在: ${articleId}`);

  const paragraphs = (article.paragraphs || []) as any[];
  if (paragraphs.length === 0) throw new Error(`文章无段落数据: ${articleId}`);

  // 角色 ID = 声音 ID（来自 characters.json）
  const defaultTeacherId = getReadingTeachers()[0]?.id;
  const voice = article.teacherId || defaultTeacherId;

  logger.info(`开始生成文章音频: ${article.title}, 教师=${article.teacherId}, voice=${voice}`);

  // 0. AI 分析（拆英文句子 + 拆中文讲解 + 映射）— 在所有 TTS 之前
  let aiResult: {
    englishSentences: string[][];
    chineseSentences: string[];
    explanationMapping: Array<{ chineseSentence: string; englishSentence: string; paragraphIndex: number }>;
  } | null = null;

  if (article.explanationScript) {
    try {
      aiResult = await aiServiceClient.analyzeExplanationMapping(
        article.explanationScript,
        paragraphs.map((p: any, i: number) => ({ index: i, en: p.en })),
        article.title,
      );
      logger.info(`AI 分析完成: ${article.title}, ${aiResult.chineseSentences.length} 句讲解, ${aiResult.englishSentences.reduce((sum, s) => sum + s.length, 0)} 句英文`);
    } catch (error) {
      logger.error(`AI 分析失败（不阻塞）: ${article.title}`, error);
    }
  }

  // 1. 全文朗读（用 AI 拆好的英文句子 + bookmark 精确定位）
  if (!article.audioUrl) {
    if (aiResult && aiResult.englishSentences.length > 0) {
      // 用 bookmark 方式：每句有精确 timing
      const allSentences: Array<{ paragraphIndex: number; sentence: string }> = [];
      for (let pi = 0; pi < aiResult.englishSentences.length; pi++) {
        for (const sent of aiResult.englishSentences[pi]) {
          allSentences.push({ paragraphIndex: pi, sentence: sent });
        }
      }

      const { url: audioUrl, sentenceTimings } = await synthesizeWithBookmarksAndUpload(
        allSentences.map(s => s.sentence),
        voice,
        `reading_${articleId}_full.mp3`,
        'en-GB',
      );

      const audioTimestamps = allSentences.map((s, i) => ({
        paragraphIndex: s.paragraphIndex,
        sentence: s.sentence,
        startMs: sentenceTimings[i].startMs,
        endMs: sentenceTimings[i].endMs,
      }));

      await prisma.readingArticle.update({
        where: { id: articleId },
        data: { audioUrl, audioTimestamps },
      });
    } else {
      // 降级：无 AI 结果时用旧方式
      const fullText = paragraphs.map((p: any) => p.en).join('\n\n');
      const audioUrl = await synthesizeAndUpload(fullText, voice, `reading_${articleId}_full.mp3`);
      await prisma.readingArticle.update({ where: { id: articleId }, data: { audioUrl } });
    }
  } else {
    logger.info(`跳过全文朗读（已有）: ${article.title}`);
  }

  // 2. 讲解音频（分段合成 + wordBoundary + 首词匹配精确定位）
  if (!article.explanationAudioUrl && article.explanationScript) {
    if (aiResult && aiResult.chineseSentences.length > 0) {
      // 分段合成讲解音频（每段 ≤ 3000 字符，确保 < 10 分钟）
      const sanitizedScript = sanitizeForTTS(article.explanationScript);
      const chunks = splitTextForTTS(sanitizedScript, 1500);
      logger.info(`讲解音频分段合成: ${chunks.length} 段, 总长 ${sanitizedScript.length} 字符`);

      const audioBuffers: Buffer[] = [];
      const allWordBounds: Array<{ text: string; audioOffsetMs: number; durationMs: number; boundaryType: string }> = [];
      let audioOffsetAccMs = 0;

      for (let ci = 0; ci < chunks.length; ci++) {
        const wbResult = await speechServiceClient.synthesizeWithWordBoundary({
          text: chunks[ci],
          voice,
          format: 'mp3',
          lang: 'en-GB',
        });
        audioBuffers.push(wbResult.audio);

        // 累加 wordBoundary 偏移量
        for (const wb of wbResult.wordBoundaries) {
          allWordBounds.push({
            ...wb,
            audioOffsetMs: wb.audioOffsetMs + audioOffsetAccMs,
          });
        }

        // 优先用 API 返回的精确时长，降级用字节估算（兼容 Azure）
        const chunkDurationMs = wbResult.durationMs != null && wbResult.durationMs > 0
          ? wbResult.durationMs
          : Math.round(wbResult.audio.length / 4);
        audioOffsetAccMs += chunkDurationMs;
        logger.info(`讲解合成第 ${ci + 1}/${chunks.length} 段: ${chunkDurationMs}ms, wordBounds=${wbResult.wordBoundaries.length}`);
      }

      // 拼接上传
      const audioBuffer = Buffer.concat(audioBuffers);
      const uploadResult = await OSSService.uploadFile(
        audioBuffer,
        `reading_${articleId}_explanation.mp3`,
        'audio/mpeg',
        { folder: 'audio' },
      );
      if (!uploadResult.success || !uploadResult.cdnUrl) {
        throw new Error(`OSS 上传失败: ${uploadResult.error}`);
      }
      const explanationAudioUrl = uploadResult.cdnUrl;

      // 用首词匹配法从 wordBoundary 中找每句的 startMs
      const wordBounds = allWordBounds.filter(wb => wb.boundaryType === 'WordBoundary');
      const explanationMapping = matchSentencesToWordBoundary(
        aiResult.chineseSentences,
        aiResult.explanationMapping,
        wordBounds,
      );

      await prisma.readingArticle.update({
        where: { id: articleId },
        data: { explanationAudioUrl, explanationMapping },
      });
      logger.info(`讲解映射生成完成: ${article.title}, ${explanationMapping.length} 句`);
    } else {
      // 降级：无 AI 结果时用旧方式（仅生成音频，无 mapping）
      const explanationAudioUrl = await synthesizeAndUpload(article.explanationScript, voice, `reading_${articleId}_explanation.mp3`);
      await prisma.readingArticle.update({ where: { id: articleId }, data: { explanationAudioUrl } });
    }
  } else {
    logger.info(`跳过讲解音频（已有）: ${article.title}`);
  }

  // 3. 核心生词音频（检查每个词是否已有 audioUrl，单个失败不阻塞）
  const keyVocabulary = (article.keyVocabulary || []) as any[];
  const needsVocabAudio = keyVocabulary.length > 0 && keyVocabulary.some((v: any) => !v.audioUrl);
  if (needsVocabAudio) {
    const missingCount = keyVocabulary.filter((v: any) => !v.audioUrl).length;
    logger.info(`开始生成生词音频: ${article.title}, ${missingCount}/${keyVocabulary.length} 个待生成`);
    const updatedVocabulary = await generateVocabularyAudios(articleId, keyVocabulary, voice);
    await prisma.readingArticle.update({ where: { id: articleId }, data: { keyVocabulary: updatedVocabulary } });
    logger.info(`生词音频生成完成: ${article.title}, ${updatedVocabulary.filter((v: any) => v.audioUrl).length}/${keyVocabulary.length} 个`);
  } else {
    logger.info(`跳过生词音频（已有）: ${article.title}`);
  }

  // 4. 校验所有必要产物齐全，才标记 ready + 发布
  const final = await prisma.readingArticle.findUnique({ where: { id: articleId } });
  const missing: string[] = [];
  if (!final?.audioUrl) missing.push('audioUrl');
  if (!final?.explanationAudioUrl && final?.explanationScript) missing.push('explanationAudioUrl');
  if (!final?.paragraphs) missing.push('paragraphs');
  if (!final?.keyVocabulary) missing.push('keyVocabulary');
  if (!final?.quiz) missing.push('quiz');

  if (missing.length > 0) {
    throw new Error(`文章产物不完整，缺少: ${missing.join(', ')}`);
  }

  await prisma.readingArticle.update({
    where: { id: articleId },
    data: { pipelineStatus: 'ready', isPublished: true },
  });

  logger.info(`文章音频生成完成，已标记 ready: ${article.title}`);
}

/** 为核心生词逐个生成 TTS 音频（朗读单词 + 中文释义），返回带 audioUrl 的 keyVocabulary */
async function generateVocabularyAudios(
  articleId: string,
  vocabulary: any[],
  voice: string,
): Promise<any[]> {
  // 串行生成，避免并发 TTS 请求过多导致超时
  const results: any[] = [];
  for (let index = 0; index < vocabulary.length; index++) {
    const word = vocabulary[index];
    if (word.audioUrl) { results.push(word); continue; } // 已有音频，跳过
    try {
      const ttsText = `${word.word}. ${word.meaningCn}`;
      const filename = `reading_${articleId}_vocab_${index}.mp3`;
      const audioUrl = await synthesizeVocabWord(ttsText, voice, filename);
      results.push({ ...word, audioUrl });
    } catch (error) {
      logger.error(`生词音频生成失败: ${word.word}`, error);
      results.push(word); // 失败保留原数据，不阻塞
    }
  }
  return results;
}

/** 单词级 TTS：短文本直接合成，15s 超时，失败重试 1 次 */
async function synthesizeVocabWord(text: string, voice: string, filename: string): Promise<string> {
  const doSynth = async () => {
    const response = await speechServiceClient.synthesizeSpeech({
      text,
      voice,
      format: 'mp3',
      quality: 'premium',
    });
    return Buffer.from(response.data);
  };

  let buffer: Buffer;
  try {
    buffer = await Promise.race([
      doSynth(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('vocab TTS timeout 15s')), 15_000)),
    ]);
  } catch {
    // 重试一次
    buffer = await Promise.race([
      doSynth(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('vocab TTS retry timeout 15s')), 15_000)),
    ]);
  }

  const result = await OSSService.uploadFile(buffer, filename, 'audio/mpeg', { folder: 'audio' });
  if (!result.success || !result.cdnUrl) throw new Error(`OSS 上传失败: ${result.error}`);
  return result.cdnUrl;
}

/** 仅质量筛选（不改写），通过后标记 qualified 并写入 level */
export async function qualifyArticle(articleId: string): Promise<void> {
  const article = await prisma.readingArticle.findUnique({ where: { id: articleId } });
  if (!article) throw new Error(`文章不存在: ${articleId}`);

  // 幂等守卫：非 pending 状态不应重新筛选
  if (article.pipelineStatus !== 'pending') {
    logger.info(`文章非 pending 状态，跳过 qualify: ${article.title} (${article.pipelineStatus})`);
    return;
  }

  const wordCount = article.content.split(/\s+/).filter(Boolean).length;

  // 词数不足直接 rejected
  if (wordCount < 200) {
    logger.info(`文章词数不足 (${wordCount} < 200)，标记 rejected: ${article.title}`);
    await prisma.readingArticle.update({
      where: { id: articleId },
      data: { pipelineStatus: 'rejected' },
    });
    return;
  }

  try {
    const result = await aiServiceClient.qualityCheckArticle(article.title, article.content);

    if (!result.qualified) {
      logger.info(`文章不合格: ${article.title} - ${result.rejectReason}`);
      await prisma.readingArticle.update({
        where: { id: articleId },
        data: { pipelineStatus: 'rejected' },
      });
      return;
    }

    await prisma.readingArticle.update({
      where: { id: articleId },
      data: {
        level: result.level || 'intermediate',
        category: result.category || article.category,
        pipelineStatus: 'qualified',
      },
    });

    logger.info(`文章质量筛选通过: ${article.title}, level=${result.level}, category=${result.category}`);
  } catch (error) {
    // 保持 pending 状态，下次管道运行时重试（避免 AI 服务临时故障导致文章不可恢复）
    logger.error(`文章质量筛选失败（保持 pending 待重试）: ${article.title}`, error);
  }
}

/** AI 清洗文章内容：去除图片标注、作者信息等无关内容 */
export async function cleanArticle(articleId: string): Promise<void> {
  const article = await prisma.readingArticle.findUnique({ where: { id: articleId } });
  if (!article) throw new Error(`文章不存在: ${articleId}`);

  // 幂等守卫：只对 pending 文章做清洗，后续状态的 content 不应再被修改
  if (article.pipelineStatus !== 'pending') {
    logger.info(`文章非 pending 状态，跳过 clean: ${article.title} (${article.pipelineStatus})`);
    return;
  }

  try {
    const result = await aiServiceClient.cleanArticle(article.title, article.content);

    if (result.changed) {
      const newWordCount = result.cleanedContent.split(/\s+/).filter(Boolean).length;

      // 清洗后词数不足则 reject（与 compressArticle 的 200 词阈值一致）
      if (newWordCount < 200) {
        logger.info(`文章清洗后词数不足 (${newWordCount} < 200)，标记 rejected: ${article.title}`);
        await prisma.readingArticle.update({
          where: { id: articleId },
          data: { pipelineStatus: 'rejected' },
        });
        return;
      }

      await prisma.readingArticle.update({
        where: { id: articleId },
        data: {
          content: result.cleanedContent,
          wordCount: newWordCount,
        },
      });
      logger.info(`文章清洗完成: ${article.title}, ${article.wordCount} → ${newWordCount} 词`);
    } else {
      logger.info(`文章无需清洗: ${article.title}`);
    }
  } catch (error) {
    logger.error(`文章清洗失败（不阻塞流程）: ${article.title}`, error);
  }
}

/** 从 qualified 池中选择指定 level 的文章（类别均衡优先），设置 publishDate */
export async function selectDailyArticle(level: string, publishDate: string): Promise<string | null> {
  // 1. 统计已发布文章各 category 的数量，找出数量少的类别优先选取
  const publishedCounts = await prisma.readingArticle.groupBy({
    by: ['category'],
    where: { pipelineStatus: 'ready', isPublished: true },
    _count: true,
  });
  const countMap = new Map(publishedCounts.map(r => [r.category, r._count]));

  // 2. 获取 qualified 池中该 level 可用的所有 category
  const availableCategories = await prisma.readingArticle.groupBy({
    by: ['category'],
    where: {
      pipelineStatus: 'qualified',
      level,
      publishDate: null,
      pipelineFailCount: { lt: 1 },
    },
    _count: true,
  });

  if (availableCategories.length === 0) {
    logger.info(`[selectDailyArticle] 无可用 ${level} 文章`);
    return null;
  }

  // 3. 按已发布数量升序排列，优先选数量最少的类别
  const sortedCategories = availableCategories
    .map(r => ({ category: r.category, publishedCount: countMap.get(r.category) || 0 }))
    .sort((a, b) => a.publishedCount - b.publishedCount);

  // 4. 从数量最少的类别中选最新文章（优先选有图片的）
  let article: { id: string; title: string; category: string } | null = null;
  const baseWhere = {
    pipelineStatus: 'qualified' as const,
    level,
    publishDate: null,
    pipelineFailCount: { lt: 1 },
  };
  // 第一轮：优先选有图片的文章
  for (const { category } of sortedCategories) {
    article = await prisma.readingArticle.findFirst({
      where: { ...baseWhere, category, imageUrl: { not: null } },
      select: { id: true, title: true, category: true },
      orderBy: [
        { sourcePublishedAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
    });
    if (article) break;
  }
  // 第二轮：无图片文章兜底
  if (!article) {
    for (const { category } of sortedCategories) {
      article = await prisma.readingArticle.findFirst({
        where: { ...baseWhere, category },
        select: { id: true, title: true, category: true },
        orderBy: [
          { sourcePublishedAt: { sort: 'desc', nulls: 'last' } },
          { createdAt: 'desc' },
        ],
      });
      if (article) break;
    }
  }

  if (!article) {
    logger.info(`[selectDailyArticle] 无可用 ${level} 文章`);
    return null;
  }

  await prisma.readingArticle.update({
    where: { id: article.id },
    data: { publishDate },
  });

  const publishedCount = countMap.get(article.category) || 0;
  logger.info(`[selectDailyArticle] 选中 ${level} 文章: ${article.title} (category=${article.category}, 已发布=${publishedCount}篇)`);
  return article.id;
}

/** 选中文章的完整处理：改写 → 精读 → 音频 */
export async function processDailyArticle(articleId: string): Promise<void> {
  // 1. 改写精炼
  await compressArticle(articleId);

  // 验证 compress 结果（compress 可能 reject 而不抛异常）
  const afterCompress = await prisma.readingArticle.findUnique({
    where: { id: articleId },
    select: { pipelineStatus: true },
  });
  if (afterCompress?.pipelineStatus !== 'compressed') {
    throw new Error(`文章压缩未成功，当前状态: ${afterCompress?.pipelineStatus}`);
  }

  // 2. AI 精读处理
  await processArticle(articleId);

  // 3. TTS 音频（重试 1 次，仍失败则标记 failed）
  try {
    await generateArticleAudio(articleId);
  } catch (error) {
    logger.error(`文章音频生成失败，重试一次: ${articleId}`, error);
    try {
      await generateArticleAudio(articleId);
    } catch (retryError) {
      logger.error(`文章音频重试仍失败，标记 failed: ${articleId}`, retryError);
      await prisma.readingArticle.update({
        where: { id: articleId },
        data: { pipelineStatus: 'failed', isPublished: false },
      });
      throw retryError;
    }
  }
}

/** 恢复卡在中间状态超过 30 分钟的文章
 *  compressing/processing → 回退 qualified | processed（有 publishDate）→ 保持 processed，清 publishDate
 *  注意：compress_failed / failed 是确定性失败，不自动回退，避免无限重试循环 */
export async function recoverStuckArticles(): Promise<number> {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

  // compressing 超时 → 回退到 qualified，清除 publishDate 避免脏数据
  const stuckCompressing = await prisma.readingArticle.updateMany({
    where: { pipelineStatus: 'compressing', updatedAt: { lt: thirtyMinAgo } },
    data: { pipelineStatus: 'qualified', publishDate: null, pipelineFailCount: { increment: 1 } },
  });

  // processing 超时 → 回退到 qualified（而非 compressed，避免 compressed+publishDate=null 成为孤儿）
  const stuckProcessing = await prisma.readingArticle.updateMany({
    where: { pipelineStatus: 'processing', updatedAt: { lt: thirtyMinAgo } },
    data: { pipelineStatus: 'qualified', publishDate: null, pipelineFailCount: { increment: 1 } },
  });

  // processed 超时（AI 处理完成但音频生成卡住）→ 保持 processed，仅清 publishDate
  // 不回退到 qualified：AI 产物（paragraphs/keyVocabulary/quiz）已生成，重走会浪费
  // 只恢复有 publishDate 的（管道中卡住），不碰孤儿（publishDate=null 等待复用）
  const stuckProcessed = await prisma.readingArticle.updateMany({
    where: { pipelineStatus: 'processed', publishDate: { not: null }, updatedAt: { lt: thirtyMinAgo } },
    data: { publishDate: null, pipelineFailCount: { increment: 1 } },
  });

  const total = stuckCompressing.count + stuckProcessing.count + stuckProcessed.count;
  if (total > 0) {
    logger.info(
      `[Recovery] 恢复卡住文章: compressing=${stuckCompressing.count}, processing=${stuckProcessing.count}, processed=${stuckProcessed.count}`,
    );
  }
  return total;
}

/** 手动导入文章并处理 */
export async function importAndProcess(data: {
  title: string;
  content: string;
  level?: string;
  category?: string;
  source?: string;
  sourceUrl?: string;
  publishDate?: string;
}): Promise<string> {
  const wordCount = data.content.split(/\s+/).filter(Boolean).length;

  const article = await prisma.readingArticle.create({
    data: {
      title: data.title,
      content: data.content,
      level: data.level || 'intermediate',
      category: data.category || 'general',
      wordCount,
      source: data.source || 'manual',
      sourceUrl: data.sourceUrl,
      publishDate: data.publishDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }),
      pipelineStatus: 'pending',
      isPublished: false,
    },
  });

  // 异步处理：先质量筛选+清洗，再完整处理（改写+精读+音频）
  (async () => {
    await qualifyArticle(article.id);
    const qualified = await prisma.readingArticle.findUnique({
      where: { id: article.id },
      select: { pipelineStatus: true },
    });
    if (qualified?.pipelineStatus !== 'qualified') {
      logger.info(`手动导入文章未通过质量筛选: ${article.title}`);
      return;
    }
    await cleanArticle(article.id);
    await processDailyArticle(article.id);
  })().catch(err =>
    logger.error(`后台处理文章失败: ${article.title}`, err)
  );

  return article.id;
}
