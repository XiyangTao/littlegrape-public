import { Router, Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * 获取指定标签的单词列表（用于学习）
 * GET /api/words/learn?tag=小学&limit=10
 */
router.get('/learn', async (req: Request, res: Response) => {
  try {
    const { tag, limit = '10' } = req.query;

    if (!tag || typeof tag !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: tag',
      });
      return;
    }

    const words = await prisma.word.findMany({
      where: {
        tags: {
          some: {
            tag: tag,
          },
        },
        // 只返回已处理的单词（有中文释义）
        meaningCn: {
          not: '',
        },
      },
      include: {
        meanings: {
          orderBy: { orderIndex: 'asc' },
        },
        etymology: true,
        collocations: true,
        inflections: true,
        tags: true,
      },
      take: parseInt(limit as string, 10),
      orderBy: {
        word: 'asc',
      },
    });

    // 转换为前端需要的格式
    const formattedWords = words.map((word) => ({
      id: word.id,
      word: word.word,
      phoneticUs: word.phoneticUs,
      phoneticUk: word.phoneticUk,
      pos: word.pos,
      meaningCn: word.meaningCn,
      meaningEn: word.meaningEn,
      meanings: word.meanings.map((m) => ({
        pos: m.pos,
        meaningCn: m.meaningCn,
        meaningEn: m.meaningEn,
        exampleEn: m.exampleEn,
        exampleCn: m.exampleCn,
        register: m.register,
      })),
      etymology: word.etymology
        ? {
            root: word.etymology.root,
            rootMeaning: word.etymology.rootMeaning,
            prefix: word.etymology.prefix,
            prefixMeaning: word.etymology.prefixMeaning,
            suffix: word.etymology.suffix,
            suffixMeaning: word.etymology.suffixMeaning,
            analysis: word.etymology.analysis,
          }
        : null,
      collocations: word.collocations.map((c) => ({
        pattern: c.pattern,
        examples: c.examples,
        meaningCn: c.meaningCn,
      })),
      inflections: word.inflections.map((i) => ({
        inflection: i.inflection,
        type: i.type,
      })),
      tags: word.tags.map((t) => t.tag),
    }));

    res.json({
      success: true,
      data: formattedWords,
      total: formattedWords.length,
    });
  } catch (error) {
    logger.error('Failed to fetch words for learning:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch words',
    });
  }
});

/**
 * 批量获取单词详情
 * POST /api/words/details/batch
 * Body: { ids: string[] } (最多 50 个)
 */
router.post('/details/batch', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid parameter: ids (non-empty array required)',
      });
      return;
    }

    if (ids.length > 50) {
      res.status(400).json({
        success: false,
        error: 'Too many ids (max 50)',
      });
      return;
    }

    const words = await prisma.word.findMany({
      where: { id: { in: ids } },
      include: {
        meanings: {
          orderBy: { orderIndex: 'asc' },
        },
        examples: {
          orderBy: { orderIndex: 'asc' },
        },
        etymology: true,
        collocations: true,
        inflections: true,
        tags: true,
      },
    });

    const data = words.map((word) => ({
      id: word.id,
      word: word.word,
      phoneticUs: word.phoneticUs,
      phoneticUk: word.phoneticUk,
      audioUsUrl: word.audioUsUrl,
      audioUkUrl: word.audioUkUrl,
      audioAiExplanationUrl: word.audioAiExplanationUrl,
      pos: word.pos,
      meaningCn: word.meaningCn,
      meaningEn: word.meaningEn,
      meanings: word.meanings.map((m) => ({
        pos: m.pos,
        meaningCn: m.meaningCn,
        meaningEn: m.meaningEn,
        exampleEn: m.exampleEn,
        exampleCn: m.exampleCn,
        register: m.register,
      })),
      examples: word.examples.map((e) => ({
        en: e.en,
        cn: e.cn,
      })),
      etymology: word.etymology
        ? {
            root: word.etymology.root,
            rootMeaning: word.etymology.rootMeaning,
            prefix: word.etymology.prefix,
            prefixMeaning: word.etymology.prefixMeaning,
            suffix: word.etymology.suffix,
            suffixMeaning: word.etymology.suffixMeaning,
            analysis: word.etymology.analysis,
          }
        : null,
      collocations: word.collocations.map((c) => ({
        pattern: c.pattern,
        examples: c.examples,
        meaningCn: c.meaningCn,
      })),
      inflections: word.inflections.map((i) => ({
        inflection: i.inflection,
        type: i.type,
      })),
      tags: word.tags.map((t) => t.tag),
    }));

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Failed to fetch word details batch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch word details',
    });
  }
});

/**
 * 获取单个单词详情
 * GET /api/words/detail/:id
 */
router.get('/detail/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const word = await prisma.word.findUnique({
      where: { id },
      include: {
        meanings: {
          orderBy: { orderIndex: 'asc' },
        },
        examples: {
          orderBy: { orderIndex: 'asc' },
        },
        etymology: true,
        collocations: true,
        inflections: true,
        tags: true,
      },
    });

    if (!word) {
      res.status(404).json({
        success: false,
        error: 'Word not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: word.id,
        word: word.word,
        phoneticUs: word.phoneticUs,
        phoneticUk: word.phoneticUk,
        pos: word.pos,
        meaningCn: word.meaningCn,
        meaningEn: word.meaningEn,
        meanings: word.meanings.map((m) => ({
          pos: m.pos,
          meaningCn: m.meaningCn,
          meaningEn: m.meaningEn,
          exampleEn: m.exampleEn,
          exampleCn: m.exampleCn,
          register: m.register,
        })),
        examples: word.examples.map((e) => ({
          en: e.en,
          cn: e.cn,
        })),
        etymology: word.etymology
          ? {
              root: word.etymology.root,
              rootMeaning: word.etymology.rootMeaning,
              prefix: word.etymology.prefix,
              prefixMeaning: word.etymology.prefixMeaning,
              suffix: word.etymology.suffix,
              suffixMeaning: word.etymology.suffixMeaning,
              analysis: word.etymology.analysis,
            }
          : null,
        collocations: word.collocations.map((c) => ({
          pattern: c.pattern,
          examples: c.examples,
          meaningCn: c.meaningCn,
        })),
        inflections: word.inflections.map((i) => ({
          inflection: i.inflection,
          type: i.type,
        })),
        tags: word.tags.map((t) => t.tag),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch word detail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch word',
    });
  }
});

/**
 * 获取可用的标签列表（所有词库）
 * GET /api/words/tags/list
 */
router.get('/tags/list', async (req: Request, res: Response) => {
  try {
    const tags = await prisma.wordTag.groupBy({
      by: ['tag'],
      _count: {
        tag: true,
      },
      orderBy: {
        _count: {
          tag: 'desc',
        },
      },
    });

    res.json({
      success: true,
      data: tags.map((t) => ({
        tag: t.tag,
        count: t._count.tag,
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tags',
    });
  }
});

// ==================== 词库下载（离线存储）====================

/**
 * 下载词库数据（分页，支持断点续传）
 * GET /api/words/download?tag=四级&offset=0&limit=100
 *
 * 返回完整的单词数据，用于客户端本地存储
 */
router.get('/download', async (req: Request, res: Response) => {
  try {
    const { tag, offset = '0', limit = '100' } = req.query;

    if (!tag || typeof tag !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: tag',
      });
      return;
    }

    const offsetNum = parseInt(offset as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 200); // 最大200条

    // 获取该标签的总单词数
    const totalCount = await prisma.wordTag.count({
      where: { tag },
    });

    // 获取该批次的单词ID
    const wordTags = await prisma.wordTag.findMany({
      where: { tag },
      select: { wordId: true },
      orderBy: { wordId: 'asc' },
      skip: offsetNum,
      take: limitNum,
    });

    const wordIds = wordTags.map((wt) => wt.wordId);

    // 获取完整的单词数据
    const words = await prisma.word.findMany({
      where: {
        id: { in: wordIds },
      },
      include: {
        meanings: {
          orderBy: { orderIndex: 'asc' },
        },
        examples: {
          orderBy: { orderIndex: 'asc' },
        },
        etymology: true,
        collocations: true,
        inflections: true,
        tags: true,
      },
      orderBy: { id: 'asc' },
    });

    // 转换为下载格式（包含所有数据）
    const downloadData = words.map((word) => ({
      id: word.id,
      word: word.word,
      phoneticUs: word.phoneticUs,
      phoneticUk: word.phoneticUk,
      audioUrlUs: word.audioUsUrl,
      audioUrlUk: word.audioUkUrl,
      audioAiExplanationUrl: word.audioAiExplanationUrl,
      pos: word.pos,
      meaningCn: word.meaningCn,
      meaningEn: word.meaningEn,
      level: word.level,
      bncCocaLevel: word.bncCocaLevel,
      isHeadword: word.isHeadword,
      headwordId: word.headwordId,
      meanings: word.meanings.map((m) => ({
        id: m.id,
        pos: m.pos,
        meaningCn: m.meaningCn,
        meaningEn: m.meaningEn,
        exampleEn: m.exampleEn,
        exampleCn: m.exampleCn,
        register: m.register,
        orderIndex: m.orderIndex,
      })),
      examples: word.examples.map((e) => ({
        id: e.id,
        en: e.en,
        cn: e.cn,
        audioUrl: e.audioUrl,
        orderIndex: e.orderIndex,
      })),
      etymology: word.etymology
        ? {
            id: word.etymology.id,
            root: word.etymology.root,
            rootMeaning: word.etymology.rootMeaning,
            prefix: word.etymology.prefix,
            prefixMeaning: word.etymology.prefixMeaning,
            suffix: word.etymology.suffix,
            suffixMeaning: word.etymology.suffixMeaning,
            analysis: word.etymology.analysis,
          }
        : null,
      collocations: word.collocations.map((c) => ({
        id: c.id,
        pattern: c.pattern,
        examples: c.examples,
        meaningCn: c.meaningCn,
      })),
      inflections: word.inflections.map((i) => ({
        id: i.id,
        inflection: i.inflection,
        type: i.type,
      })),
      tags: word.tags.map((t) => t.tag),
    }));

    res.json({
      success: true,
      data: downloadData,
      pagination: {
        tag,
        offset: offsetNum,
        limit: limitNum,
        count: downloadData.length,
        totalCount,
        hasMore: offsetNum + downloadData.length < totalCount,
      },
    });
  } catch (error) {
    logger.error('Failed to download words:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download words',
    });
  }
});

// ==================== 今日学习 ====================

/**
 * 获取今日学习单词（未学过的单词）
 * GET /api/words/today?tag=四级&limit=10
 */
router.get('/today', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { limit = '10', tag } = req.query;

    if (!tag || typeof tag !== 'string') {
      res.json({
        success: true,
        data: [],
        total: 0,
        message: 'No tag specified',
        needSelectLibrary: true,
      });
      return;
    }

    // 获取用户已学过的单词ID
    const learnedWords = await prisma.userWordProgress.findMany({
      where: { userId },
      select: { wordId: true },
    });
    const learnedWordIds = learnedWords.map((w) => w.wordId);

    // 获取未学过的单词
    const words = await prisma.word.findMany({
      where: {
        tags: {
          some: {
            tag,
          },
        },
        meaningCn: { not: '' },
        id: { notIn: learnedWordIds },
      },
      include: {
        meanings: { orderBy: { orderIndex: 'asc' } },
        etymology: true,
        collocations: true,
        inflections: true,
        tags: true,
      },
      take: parseInt(limit as string, 10),
      orderBy: { word: 'asc' },
    });

    // 检查是否所有单词都学完了
    if (words.length === 0) {
      res.json({
        success: true,
        data: [],
        total: 0,
        message: 'All words learned',
        allLearned: true,
      });
      return;
    }

    // 格式化返回数据
    const formattedWords = words.map((word) => ({
      id: word.id,
      word: word.word,
      phoneticUs: word.phoneticUs,
      phoneticUk: word.phoneticUk,
      pos: word.pos,
      meaningCn: word.meaningCn,
      meaningEn: word.meaningEn,
      meanings: word.meanings.map((m) => ({
        pos: m.pos,
        meaningCn: m.meaningCn,
        meaningEn: m.meaningEn,
        exampleEn: m.exampleEn,
        exampleCn: m.exampleCn,
        register: m.register,
      })),
      etymology: word.etymology
        ? {
            root: word.etymology.root,
            rootMeaning: word.etymology.rootMeaning,
            prefix: word.etymology.prefix,
            prefixMeaning: word.etymology.prefixMeaning,
            suffix: word.etymology.suffix,
            suffixMeaning: word.etymology.suffixMeaning,
            analysis: word.etymology.analysis,
          }
        : null,
      collocations: word.collocations.map((c) => ({
        pattern: c.pattern,
        examples: c.examples,
        meaningCn: c.meaningCn,
      })),
      inflections: word.inflections.map((i) => ({
        inflection: i.inflection,
        type: i.type,
      })),
      tags: word.tags.map((t) => t.tag),
    }));

    res.json({
      success: true,
      data: formattedWords,
      total: formattedWords.length,
    });
  } catch (error) {
    logger.error('Failed to fetch today words:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch words',
    });
  }
});

export default router;
