// 类型导出
export type {
  LocalWord,
  WordStatusFilter,
  LocalProgress,
  WordMeaning,
  WordExample,
  WordEtymology,
  WordCollocation,
  WordInflection,
  LocalFavorite,
  LocalDifficultWord,
  LearnWordWithProgress,
  SelectWordsOptions,
  VocabularyTestWord,
  VocabularyTestRecord,
  ParsedWord,
} from './types';

// 工具函数
export { rowToLocalWord, rowToLocalProgress, parseLocalWord } from './helpers';
export type { DifficultWordDetail } from './helpers';

// 词库操作
export {
  initWordDatabase,
  getAllAvailableLibraries,
} from './LibraryDB';

// 单词查询
export {
  getWordByText,
  getWordsByTag,
  getWordCountByTag,
  getWordsByTags,
  getWordCountByTags,
  getUnlearnedWordIds,
  searchWords,
  searchAllWords,
  searchWordsInTags,
  searchWordCountInTags,
  searchWordsByLetter,
  searchWordCountByLetter,
  getWordById,
  getWordsByLetter,
  getWordCountByLetter,
  getAvailableLetters,
  getRandomWords,
  getRandomMeanings,
  getSmartDistractorWords,
  getSmartDistractorMeanings,
  getWordAudioByTexts,
} from './WordQueryDB';

// 学习进度
export {
  getWordProgress,
  getWordProgressBatch,
  updateWordProgress,
  markWordAsLearned,
  markWordAsMastered,
  getLibraryStats,
  getLibraryStatsByTags,
  getUnsyncedProgress,
  markProgressSynced,
  getWordProgressLastSyncTime,
  upsertWordProgressFromServer,
} from './WordProgressDB';

// 收藏
export {
  addFavorite,
  removeFavorite,
  isFavorited,
  getFavoriteWords,
  getFavoriteWordsPaged,
  getFavoriteCount,
  getFavoritedWordIds,
  getUnsyncedFavorites,
  markFavoritesSynced,
  getFavoritesLastSyncTime,
  upsertFavoritesFromServer,
  importFavorites,
} from './FavoritesDB';

// 生词本
export {
  recordWrongAnswer,
  recordCorrectAnswer,
  getDifficultWords,
  getDifficultWordsPaged,
  getDifficultCount,
  isInDifficultList,
  removeDifficultWord,
  clearAllDifficultWords,
  getUnsyncedDifficultWords,
  markDifficultWordsSynced,
  getDifficultLastSyncTime,
  upsertDifficultFromServer,
  importDifficultWords,
} from './DifficultDB';

// 学习会话
export {
  resetLearningSessionWords,
  addLearningSessionWords,
  selectWordsForLearning,
} from './LearningSessionDB';

// 练习
export {
  getPracticeWordCount,
  getReviewWordCount,
  getReviewCandidates,
} from './PracticeDB';
export type { ReviewCandidate } from './PracticeDB';

// 关卡系统
export {
  generateLevelsForTag,
  getLevelsForTag,
  getLevelByIndex,
  getLevelCountForTag,
  getUserLevelProgressForTag,
  getUserLevelProgress,
  getCurrentLevelIndex,
  saveUserLevelProgress,
  getTotalStarsForTag,
  getWordsByIds,
  getBossLevelWordIds,
} from './LevelDB';
export type { WordLevel, UserLevelProgress } from './LevelDB';

// 词根系统
export {
  buildRootIndex,
  buildAllRootIndexes,
  getAllRoots,
  searchRoots,
  getRootById,
  getRootWords,
  getUserRootProgressList,
  updateUserRootProgress,
  updateAllRootProgress,
} from './RootDB';
export type { RootEntry, UserRootProgress, RootWordItem } from './RootDB';

// AI 造句系统
export {
  saveSentenceChallenge,
  getSentenceHistory,
  getSentenceStats,
} from './SentenceChallengeDB';
export type { SentenceChallengeRecord, SentenceEvalResult } from './SentenceChallengeDB';

// 详情缓存
export {
  ensureWordDetails,
  getCachedWordDetails,
  cacheWordDetails,
  getFullWords,
} from './WordDetailCacheDB';

// 遭遇系统
export {
  recordEncounter,
  getRecentLearnedWords,
  getLearnedWordsWithExamples,
  getEncounterStats,
} from './EncounterDB';
export type { EncounterSource, EncounterRecord } from './EncounterDB';

// 词汇量测试
export {
  getWordForVocabularyTest,
  getWordsByBncCocaLevel,
  getHeadwordCountByLevel,
  getDistractorMeanings,
  getVocabularyTestResult,
  saveVocabularyTestResult,
  deleteVocabularyTestResult,
  getUnsyncedVocabularyTests,
  markVocabularyTestsSynced,
  getVocabularyTestLastSyncTime,
  insertVocabularyTestsFromServer,
} from './VocabTestDB';
