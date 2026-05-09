import { Client } from '../client';
import { ENDPOINTS } from '../endpoints';

declare module '../client' {
  interface Client {
    pullWordProgress(params: {
      afterServerTime?: number;
      cursor?: string;
      limit?: number;
    }): Promise<{
      success: boolean;
      data?: {
        progress: Array<{
          id: string;
          wordId: string;
          status: string;
          learnedAt: number | null;
          masteredAt: number | null;
          updatedAt: number;
        }>;
        nextCursor: string | null;
        serverTime: number;
      };
      error?: string;
    }>;
    pullFavorites(params: {
      afterServerTime?: number;
      cursor?: string;
      limit?: number;
    }): Promise<{
      success: boolean;
      data?: {
        favorites: Array<{
          id: string;
          wordId: string;
          createdAt: number;
        }>;
        nextCursor: string | null;
        serverTime: number;
      };
      error?: string;
    }>;
    pullDifficultWords(params: {
      afterServerTime?: number;
      cursor?: string;
      limit?: number;
    }): Promise<{
      success: boolean;
      data?: {
        words: Array<{
          id: string;
          wordId: string;
          wrongCount: number;
          correctCount: number;
          lastWrongAt: number;
          createdAt: number;
          updatedAt: number;
        }>;
        nextCursor: string | null;
        serverTime: number;
      };
      error?: string;
    }>;
    pullSyncData(params: {
      lastSyncAt?: number;
      today?: string;
    }): Promise<{
      success: boolean;
      data?: {
        dailyStats: Array<{
          date: string;
          learnedCount: number;
          masteredCount: number;
          reviewedCount: number;
          updatedAt: number;
        }>;
        todayEvents: Array<{
          id: string;
          eventType: string;
          entityType: string | null;
          entityId: string | null;
          quantity: number;
          eventDate: string;
          eventTime: number;
        }>;
        serverTime: number;
      };
      error?: string;
    }>;
    pushLearningData(data: {
      events: Array<{
        id: string;
        eventType: string;
        entityType: string | null;
        entityId: string | null;
        quantity: number;
        eventDate: string;
        eventTime: number;
      }>;
      dailyStats: Array<{
        date: string;
        learnedCount: number;
        masteredCount: number;
        reviewedCount: number;
        grammarPracticedCount: number;
        grammarMasteredCount: number;
        phonemePracticedCount: number;
      }>;
    }): Promise<{
      success: boolean;
      data?: {
        eventsSynced: number;
        statsSynced: number;
      };
      error?: string;
    }>;
    fetchEventsForDate(date: string): Promise<{
      success: boolean;
      data?: {
        date: string;
        events: Array<{
          id: string;
          eventType: string;
          entityType: string | null;
          entityId: string | null;
          quantity: number;
          createdAt: number;
        }>;
      };
      error?: string;
    }>;
    pullDailyStats(params: {
      afterServerTime?: number;
      cursor?: string;
      limit?: number;
    }): Promise<{
      success: boolean;
      data?: {
        dailyStats: Array<{
          date: string;
          learnedCount: number;
          masteredCount: number;
          reviewedCount: number;
          grammarPracticedCount: number;
          grammarMasteredCount: number;
          phonemePracticedCount: number;
          updatedAt: number;
        }>;
        nextCursor: string | null;
        serverTime: number;
      };
      error?: string;
    }>;
    pullTodayEvents(params: {
      date: string;
      afterServerTime?: number;
      cursor?: string;
      limit?: number;
    }): Promise<{
      success: boolean;
      data?: {
        events: Array<{
          id: string;
          eventType: string;
          entityType: string | null;
          entityId: string | null;
          quantity: number;
          eventDate: string;
          eventTime: number;
        }>;
        nextCursor: string | null;
        serverTime: number;
      };
      error?: string;
    }>;
    pullVocabularyTests(params: {
      afterServerTime?: number;
      cursor?: string;
      limit?: number;
    }): Promise<{
      success: boolean;
      data?: {
        tests: Array<{
          id: string;
          estimatedVocabulary: number;
          totalQuestions: number;
          correctCount: number;
          duration: number;
          level: string;
          levelDescription: string;
          confidenceLower: number;
          confidenceUpper: number;
          eventTime: number;
        }>;
        nextCursor: string | null;
        serverTime: number;
      };
      error?: string;
    }>;
    pushVocabularyTests(data: {
      tests: Array<{
        id: string;
        estimatedVocabulary: number;
        totalQuestions: number;
        correctCount: number;
        duration: number;
        level: string;
        levelDescription: string;
        confidenceLower: number;
        confidenceUpper: number;
        eventTime: number;
      }>;
    }): Promise<{
      success: boolean;
      data?: {
        testsSynced: number;
      };
      error?: string;
    }>;
    pullPhonemeProgress(params: {
      afterServerTime?: number;
      cursor?: string;
      limit?: number;
    }): Promise<{
      success: boolean;
      data?: {
        progress: Array<{
          id: string;
          phonemeSymbol: string;
          practiceCount: number;
          totalWordCount: number;
          avgScore: number;
          bestScore: number;
          lastScore: number;
          masteryLevel: string;
          listenCorrectCount: number;
          listenTotalCount: number;
          lastPracticedAt: number | null;
          updatedAt: number;
        }>;
        nextCursor: string | null;
        serverTime: number;
      };
      error?: string;
    }>;
    pushPhonemeProgress(data: {
      progress: Array<{
        phonemeSymbol: string;
        practiceCount: number;
        totalWordCount: number;
        avgScore: number;
        bestScore: number;
        lastScore: number;
        masteryLevel: string;
        listenCorrectCount: number;
        listenTotalCount: number;
        lastPracticedAt: number | null;
        updatedAt: number;
      }>;
    }): Promise<{
      success: boolean;
      data?: {
        syncedCount: number;
        serverTime: number;
      };
      error?: string;
    }>;
  }
}

// ==================== Word Progress Sync API ====================

// 拉取学习进度（增量同步 + 游标分页）
Client.prototype.pullWordProgress = async function(params: {
  afterServerTime?: number;
  cursor?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: {
    progress: Array<{
      id: string;
      wordId: string;
      status: string;
      learnedAt: number | null;
      masteredAt: number | null;
      updatedAt: number;
    }>;
    nextCursor: string | null;
    serverTime: number;
  };
  error?: string;
}> {
  return this.api.post(ENDPOINTS.WORD_PROGRESS_SYNC, params);
};

// ==================== Favorites Sync API ====================

// 拉取收藏数据（增量同步 + 游标分页）
Client.prototype.pullFavorites = async function(params: {
  afterServerTime?: number;
  cursor?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: {
    favorites: Array<{
      id: string;
      wordId: string;
      createdAt: number;
    }>;
    nextCursor: string | null;
    serverTime: number;
  };
  error?: string;
}> {
  return this.api.post(ENDPOINTS.FAVORITES_SYNC, params);
};

// ==================== Difficult Words Sync API ====================

// 拉取生词本数据（增量同步 + 游标分页）
Client.prototype.pullDifficultWords = async function(params: {
  afterServerTime?: number;
  cursor?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: {
    words: Array<{
      id: string;
      wordId: string;
      wrongCount: number;
      correctCount: number;
      lastWrongAt: number;
      createdAt: number;
      updatedAt: number;
    }>;
    nextCursor: string | null;
    serverTime: number;
  };
  error?: string;
}> {
  return this.api.post(ENDPOINTS.DIFFICULT_SYNC, params);
};

// ==================== Stats API ====================

// 拉取同步数据（Pull）
Client.prototype.pullSyncData = async function(params: {
  lastSyncAt?: number;
  /** 客户端"今天"的日期字符串 YYYY-MM-DD */
  today?: string;
}): Promise<{
  success: boolean;
  data?: {
    dailyStats: Array<{
      date: string;
      learnedCount: number;
      masteredCount: number;
      reviewedCount: number;
      updatedAt: number;
    }>;
    todayEvents: Array<{
      id: string;
      eventType: string;
      entityType: string | null;
      entityId: string | null;
      quantity: number;
      eventDate: string;
      eventTime: number;
    }>;
    serverTime: number;
  };
  error?: string;
}> {
  return this.api.post(ENDPOINTS.STATS_SYNC, params);
};

// 推送学习数据（Push）
Client.prototype.pushLearningData = async function(data: {
  events: Array<{
    id: string;
    eventType: string;
    entityType: string | null;
    entityId: string | null;
    quantity: number;
    eventDate: string;
    eventTime: number;
  }>;
  dailyStats: Array<{
    date: string;
    learnedCount: number;
    masteredCount: number;
    reviewedCount: number;
    grammarPracticedCount: number;
    grammarMasteredCount: number;
  }>;
}): Promise<{
  success: boolean;
  data?: {
    eventsSynced: number;
    statsSynced: number;
  };
  error?: string;
}> {
  return this.api.post(ENDPOINTS.STATS_PUSH, data);
};

// 获取某天的学习事件详情（按需加载）
Client.prototype.fetchEventsForDate = async function(date: string): Promise<{
  success: boolean;
  data?: {
    date: string;
    events: Array<{
      id: string;
      eventType: string;
      entityType: string | null;
      entityId: string | null;
      quantity: number;
      createdAt: number;
    }>;
  };
  error?: string;
}> {
  return this.api.get(`${ENDPOINTS.STATS_EVENTS}/${date}`);
};

// 拉取每日统计数据（增量同步 + 游标分页）
Client.prototype.pullDailyStats = async function(params: {
  afterServerTime?: number;
  cursor?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: {
    dailyStats: Array<{
      date: string;
      learnedCount: number;
      masteredCount: number;
      reviewedCount: number;
      grammarPracticedCount: number;
      grammarMasteredCount: number;
      phonemePracticedCount: number;
      updatedAt: number;
    }>;
    nextCursor: string | null;
    serverTime: number;
  };
  error?: string;
}> {
  return this.api.post(ENDPOINTS.DAILY_STATS_SYNC, params);
};

// 拉取指定日期的学习事件（增量同步 + 游标分页）
Client.prototype.pullTodayEvents = async function(params: {
  date: string;
  afterServerTime?: number;
  cursor?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: {
    events: Array<{
      id: string;
      eventType: string;
      entityType: string | null;
      entityId: string | null;
      quantity: number;
      eventDate: string;
      eventTime: number;
    }>;
    nextCursor: string | null;
    serverTime: number;
  };
  error?: string;
}> {
  return this.api.post(ENDPOINTS.TODAY_EVENTS_SYNC, params);
};

// ==================== 词汇量测试同步 API ====================

// 拉取词汇量测试记录（增量同步 + 游标分页）
Client.prototype.pullVocabularyTests = async function(params: {
  afterServerTime?: number;
  cursor?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: {
    tests: Array<{
      id: string;
      estimatedVocabulary: number;
      totalQuestions: number;
      correctCount: number;
      duration: number;
      level: string;
      levelDescription: string;
      confidenceLower: number;
      confidenceUpper: number;
      eventTime: number;
    }>;
    nextCursor: string | null;
    serverTime: number;
  };
  error?: string;
}> {
  return this.api.post(ENDPOINTS.VOCABULARY_TESTS_SYNC, params);
};

// 推送词汇量测试记录
Client.prototype.pushVocabularyTests = async function(data: {
  tests: Array<{
    id: string;
    estimatedVocabulary: number;
    totalQuestions: number;
    correctCount: number;
    duration: number;
    level: string;
    levelDescription: string;
    confidenceLower: number;
    confidenceUpper: number;
    eventTime: number;
  }>;
}): Promise<{
  success: boolean;
  data?: {
    testsSynced: number;
  };
  error?: string;
}> {
  return this.api.post(ENDPOINTS.VOCABULARY_TESTS_PUSH, data);
};

// ==================== Phoneme Progress Sync API ====================

// 拉取音素进度（增量同步 + 游标分页）
Client.prototype.pullPhonemeProgress = async function(params: {
  afterServerTime?: number;
  cursor?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: {
    progress: Array<{
      id: string;
      phonemeSymbol: string;
      practiceCount: number;
      totalWordCount: number;
      avgScore: number;
      bestScore: number;
      lastScore: number;
      masteryLevel: string;
      listenCorrectCount: number;
      listenTotalCount: number;
      lastPracticedAt: number | null;
      updatedAt: number;
    }>;
    nextCursor: string | null;
    serverTime: number;
  };
  error?: string;
}> {
  return this.api.post(ENDPOINTS.PHONEME_PROGRESS_SYNC, params);
};

// 推送音素进度
Client.prototype.pushPhonemeProgress = async function(data: {
  progress: Array<{
    phonemeSymbol: string;
    practiceCount: number;
    totalWordCount: number;
    avgScore: number;
    bestScore: number;
    lastScore: number;
    masteryLevel: string;
    listenCorrectCount: number;
    listenTotalCount: number;
    lastPracticedAt: number | null;
    updatedAt: number;
  }>;
}): Promise<{
  success: boolean;
  data?: {
    syncedCount: number;
    serverTime: number;
  };
  error?: string;
}> {
  return this.api.post(ENDPOINTS.PHONEME_PROGRESS_PUSH, data);
};
