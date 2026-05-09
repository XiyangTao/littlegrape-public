import { WordData, WordTag } from '@/types/word';
import { Client } from '../client';
import { ENDPOINTS, buildQuery } from '../endpoints';

// 点词查义结果（公共字典 + AI 兜底）
// AI 兜底首次命中时，服务端会异步合成 TTS 写入 WordLookupCache，下次查同一词就有音频 URL
export interface LookupResult {
  text: string;
  found: boolean;
  lemma: string | null;
  phonetic: string | null;
  partOfSpeech: string | null;
  meaning: string | null;
  meanings: Array<{ pos: string | null; definition: string }>;
  notes: string | null;
  source: 'dict' | 'ai' | 'none';
  wordId: string | null;
  audioUrlUs: string | null;
  audioUrlUk: string | null;
}

// 批量详情返回类型（包含音频URL等完整字段）
export interface WordDetailBatchItem {
  id: string;
  word: string;
  phoneticUs: string | null;
  phoneticUk: string | null;
  audioUsUrl: string | null;
  audioUkUrl: string | null;
  audioAiExplanationUrl: string | null;
  pos: string | null;
  meaningCn: string;
  meaningEn: string | null;
  meanings: Array<{
    pos: string;
    meaningCn: string;
    meaningEn: string | null;
    exampleEn: string | null;
    exampleCn: string | null;
    register?: string | null;
  }>;
  examples: Array<{ en: string; cn: string }>;
  etymology: {
    root: string | null;
    rootMeaning: string | null;
    prefix: string | null;
    prefixMeaning: string | null;
    suffix: string | null;
    suffixMeaning: string | null;
    analysis: string | null;
  } | null;
  collocations: Array<{
    pattern: string;
    examples: string[];
    meaningCn: string | null;
  }>;
  inflections: Array<{
    inflection: string;
    type: string;
  }>;
  tags: string[];
}

declare module '../client' {
  interface Client {
    getWordsForLearning(tag: string, limit?: number): Promise<{
      success: boolean;
      data: WordData[];
      total: number;
    }>;
    getWordDetail(wordId: string): Promise<{
      success: boolean;
      data: WordData;
    }>;
    getWordDetailsBatch(ids: string[]): Promise<{
      success: boolean;
      data: WordDetailBatchItem[];
    }>;
    getWordTags(): Promise<{
      success: boolean;
      data: WordTag[];
    }>;
    getTodayWords(tag: string, limit?: number): Promise<{
      success: boolean;
      data: WordData[];
      total: number;
      message?: string;
      needSelectLibrary?: boolean;
      allLearned?: boolean;
    }>;
    markWordLearned(wordId: string): Promise<{
      success: boolean;
      message: string;
    }>;
    markWordMastered(wordId: string, isSkipped?: boolean): Promise<{
      success: boolean;
      message: string;
    }>;
    downloadWords(tag: string, offset?: number, limit?: number): Promise<{
      success: boolean;
      data: any[];
      pagination: {
        tag: string;
        offset: number;
        limit: number;
        count: number;
        totalCount: number;
        hasMore: boolean;
      };
    }>;
    getFavorites(): Promise<{
      success: boolean;
      data: WordData[];
      total: number;
    }>;
    getFavoriteCount(): Promise<{
      success: boolean;
      data: { count: number };
    }>;
    checkFavorite(wordId: string): Promise<{
      success: boolean;
      data: { isFavorited: boolean };
    }>;
    addFavorite(wordId: string): Promise<{
      success: boolean;
      message: string;
    }>;
    removeFavorite(wordId: string): Promise<{
      success: boolean;
      message: string;
    }>;
    getDifficultWords(): Promise<{
      success: boolean;
      data: Array<WordData & {
        wrongCount: number;
        correctCount: number;
        lastWrongAt: string;
      }>;
      total: number;
    }>;
    getDifficultCount(): Promise<{
      success: boolean;
      data: { count: number };
    }>;
    recordWrongAnswer(wordId: string): Promise<{
      success: boolean;
      message: string;
    }>;
    recordCorrectAnswer(wordId: string): Promise<{
      success: boolean;
      message: string;
      removed: boolean;
      correctCount?: number;
    }>;
    removeDifficultWord(wordId: string): Promise<{
      success: boolean;
      message: string;
    }>;
    clearAllDifficultWords(): Promise<{
      success: boolean;
      message: string;
      data: { count: number };
    }>;
    getWordPracticesBatch(wordIds: string[], questionsPerWord?: number): Promise<{
      success: boolean;
      data: Record<string, Array<{ id: string; type: string; [key: string]: any }>>;
    }>;
    lookupWord(text: string): Promise<{ success: boolean; data: LookupResult }>;
  }
}

// ==================== Words API ====================

// 获取学习单词列表
Client.prototype.getWordsForLearning = async function(tag: string, limit: number = 10): Promise<{
  success: boolean;
  data: WordData[];
  total: number;
}> {
  return this.api.get(ENDPOINTS.WORDS_LEARN, {
    params: { tag, limit }
  });
};

// 获取单词详情
Client.prototype.getWordDetail = async function(wordId: string): Promise<{
  success: boolean;
  data: WordData;
}> {
  return this.api.get(`${ENDPOINTS.WORDS_DETAIL}/${wordId}`);
};

// 批量获取单词详情（最多50个）
Client.prototype.getWordDetailsBatch = async function(ids: string[]): Promise<{
  success: boolean;
  data: WordDetailBatchItem[];
}> {
  return this.api.post(ENDPOINTS.WORDS_DETAILS_BATCH, { ids });
};

// 获取标签列表
Client.prototype.getWordTags = async function(): Promise<{
  success: boolean;
  data: WordTag[];
}> {
  return this.api.get(ENDPOINTS.WORDS_TAGS);
};

// 获取今日学习单词
Client.prototype.getTodayWords = async function(tag: string, limit: number = 10): Promise<{
  success: boolean;
  data: WordData[];
  total: number;
  message?: string;
  needSelectLibrary?: boolean;
  allLearned?: boolean;
}> {
  return this.api.get(ENDPOINTS.WORDS_TODAY, { params: { tag, limit } });
};

// 标记单词为已学习
Client.prototype.markWordLearned = async function(wordId: string): Promise<{
  success: boolean;
  message: string;
}> {
  return this.api.post(ENDPOINTS.WORDS_PROGRESS_LEARNED, { wordId });
};

// 标记单词为已掌握
Client.prototype.markWordMastered = async function(wordId: string, isSkipped?: boolean): Promise<{
  success: boolean;
  message: string;
}> {
  return this.api.post(ENDPOINTS.WORDS_PROGRESS_MASTERED, { wordId, isSkipped });
};

// 下载词库数据（分页，支持断点续传）
Client.prototype.downloadWords = async function(tag: string, offset: number = 0, limit: number = 100): Promise<{
  success: boolean;
  data: any[];
  pagination: {
    tag: string;
    offset: number;
    limit: number;
    count: number;
    totalCount: number;
    hasMore: boolean;
  };
}> {
  return this.api.get(ENDPOINTS.WORDS_DOWNLOAD, {
    params: { tag, offset, limit }
  });
};

// ==================== 收藏功能 ====================

// 获取收藏列表
Client.prototype.getFavorites = async function(): Promise<{
  success: boolean;
  data: WordData[];
  total: number;
}> {
  return this.api.get(ENDPOINTS.WORDS_FAVORITES);
};

// 获取收藏数量
Client.prototype.getFavoriteCount = async function(): Promise<{
  success: boolean;
  data: { count: number };
}> {
  return this.api.get(ENDPOINTS.WORDS_FAVORITES_COUNT);
};

// 检查单词是否已收藏
Client.prototype.checkFavorite = async function(wordId: string): Promise<{
  success: boolean;
  data: { isFavorited: boolean };
}> {
  return this.api.get(`${ENDPOINTS.WORDS_FAVORITES_CHECK}/${wordId}`);
};

// 添加收藏
Client.prototype.addFavorite = async function(wordId: string): Promise<{
  success: boolean;
  message: string;
}> {
  return this.api.post(ENDPOINTS.WORDS_FAVORITES, { wordId });
};

// 取消收藏
Client.prototype.removeFavorite = async function(wordId: string): Promise<{
  success: boolean;
  message: string;
}> {
  return this.api.delete(`${ENDPOINTS.WORDS_FAVORITES}/${wordId}`);
};

// ==================== 生词本功能 ====================

// 获取生词本列表
Client.prototype.getDifficultWords = async function(): Promise<{
  success: boolean;
  data: Array<WordData & {
    wrongCount: number;
    correctCount: number;
    lastWrongAt: string;
  }>;
  total: number;
}> {
  return this.api.get(ENDPOINTS.WORDS_DIFFICULT);
};

// 获取生词本数量
Client.prototype.getDifficultCount = async function(): Promise<{
  success: boolean;
  data: { count: number };
}> {
  return this.api.get(ENDPOINTS.WORDS_DIFFICULT_COUNT);
};

// 记录答错（自动加入生词本）
Client.prototype.recordWrongAnswer = async function(wordId: string): Promise<{
  success: boolean;
  message: string;
}> {
  return this.api.post(ENDPOINTS.WORDS_DIFFICULT_WRONG, { wordId });
};

// 记录答对（连续答对后自动移出生词本）
Client.prototype.recordCorrectAnswer = async function(wordId: string): Promise<{
  success: boolean;
  message: string;
  removed: boolean;
  correctCount?: number;
}> {
  return this.api.post(ENDPOINTS.WORDS_DIFFICULT_CORRECT, { wordId });
};

// 移除单个生词
Client.prototype.removeDifficultWord = async function(wordId: string): Promise<{
  success: boolean;
  message: string;
}> {
  return this.api.delete(`${ENDPOINTS.WORDS_DIFFICULT_REMOVE}/${wordId}`);
};

// 清空用户所有生词
Client.prototype.clearAllDifficultWords = async function(): Promise<{
  success: boolean;
  message: string;
  data: { count: number };
}> {
  return this.api.delete(ENDPOINTS.WORDS_DIFFICULT_CLEAR);
};

// ==================== 单词练习题 ====================

// 批量获取单词练习题
Client.prototype.getWordPracticesBatch = async function(wordIds: string[], questionsPerWord: number = 3): Promise<{
  success: boolean;
  data: Record<string, Array<{ id: string; type: string; [key: string]: any }>>;
}> {
  return this.api.post(ENDPOINTS.WORDS_PRACTICES_BATCH, { wordIds, questionsPerWord });
};

// ==================== 点词查义 ====================

// 点词查义 — 公共字典 + AI 兜底，不计用户配额
// 请求带 skipQuotaPrompt，避免意外 429 时触发全局配额弹窗
Client.prototype.lookupWord = async function (text: string) {
  return this.api.get(`${ENDPOINTS.WORDS_LOOKUP}${buildQuery({ text })}`, {
    metadata: { skipQuotaPrompt: true },
  } as any);
};
