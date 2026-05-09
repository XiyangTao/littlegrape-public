/**
 * 词汇量测试服务 - 基于 IRT-CAT 自适应测试算法
 *
 * 核心原理：
 * 1. 使用 Rasch 模型（单参数 IRT）估算用户能力 θ
 * 2. 单词难度 b 由 BNC/COCA Level 决定（每级约 1000 词族）
 * 3. CAT 自适应选题：选择难度接近当前 θ 的单词，最大化信息量
 * 4. 最终 θ 转换为词汇量：词汇量 = BNC Level × 1000
 *
 * 算法参数：
 * - 最小题数：50 题
 * - 最大题数：80 题
 * - 初始 θ = -2.25（对应约 4000 词汇量，高考水平）
 * - θ 范围：-3.225 到 +3.0（对应 100 到 25000 词汇量）
 *
 * 参考：
 * - Rasch Model: P(correct) = 1 / (1 + e^(-(θ - b)))
 * - BNC/COCA 25K Word Family Lists (Paul Nation)
 */

import {
  getWordForVocabularyTest,
  getDistractorMeanings,
  VocabularyTestWord,
} from '@/db/WordDB';
import {
  CAT_CONFIG,
  VOCABULARY_LEVELS,
  bncLevelToDifficulty,
  difficultyToBncLevel,
  thetaToVocabulary,
  raschProbability,
  fisherInformation,
  estimateTheta,
  calculateStandardError,
  selectOptimalBncLevel,
  shuffleArray,
} from './VocabTestAlgorithm';

export { CAT_CONFIG, VOCABULARY_LEVELS } from './VocabTestAlgorithm';

// ==================== 类型定义 ====================

/**
 * 选项
 */
export interface QuestionOption {
  id: string;              // 选项ID (A, B, C, D)
  text: string;            // 选项文本（中文释义）
  isCorrect: boolean;      // 是否正确答案
}

/**
 * 单个测试题目（4选1）
 */
export interface TestQuestion {
  id: string;
  word: string;
  phoneticUs?: string;     // 美式音标
  pos?: string;            // 词性
  meaningCn: string;       // 正确释义（内部使用）
  bncLevel: number;        // BNC/COCA 级别 1-25
  difficulty: number;      // IRT 难度参数 b
  options: QuestionOption[]; // 4个选项
  correctOptionId: string; // 正确选项ID
}

/**
 * 用户作答记录
 */
export interface TestResponse {
  questionId: string;
  word: string;
  bncLevel: number;
  difficulty: number;      // 该题难度 b
  selectedOptionId: string;
  isCorrect: boolean;
  responseTime: number;    // 响应时间（毫秒）
  thetaAfter: number;      // 答题后的 θ 估计值
}

/**
 * IRT-CAT 测试会话状态
 */
export interface VocabTestSession {
  // 基本信息
  startTime: number;
  currentQuestionIndex: number;

  // 题目和作答
  questions: TestQuestion[];
  responses: TestResponse[];
  usedWordIds: Set<string>;

  // IRT 参数
  theta: number;           // 当前能力估计值
  standardError: number;   // 标准误差

  // 统计信息
  totalCorrect: number;
  totalWrong: number;
  difficultySum: number;   // 已答题目难度之和（用于 MLE 估计）

  // 当前估算的词汇量（实时更新，供 UI 显示）
  currentEstimate: number;

  // 测试状态
  isComplete: boolean;
}

/**
 * 完整的测试结果
 */
export interface VocabularyTestResult {
  estimatedVocabulary: number;    // 估算总词汇量
  theta: number;                  // 最终能力值
  standardError: number;          // 标准误差
  confidenceInterval: {           // 95% 置信区间
    lower: number;
    upper: number;
  };
  totalQuestions: number;
  totalCorrect: number;
  accuracy: number;
  vocabularyLevel: string;        // 词汇等级 (A1-C2)
  levelDescription: string;       // 等级详细说明
  testDuration: number;           // 测试时长（毫秒）
  responseHistory: {              // 答题历史（用于可视化）
    questionIndex: number;
    bncLevel: number;
    isCorrect: boolean;
    thetaAfter: number;
  }[];
}

// ==================== 核心服务函数 ====================

/**
 * 初始化测试会话
 */
export async function initVocabTestSession(): Promise<VocabTestSession> {
  return {
    startTime: Date.now(),
    currentQuestionIndex: 0,
    questions: [],
    responses: [],
    usedWordIds: new Set(),
    theta: CAT_CONFIG.initialTheta,
    standardError: Infinity,
    totalCorrect: 0,
    totalWrong: 0,
    difficultySum: 0,
    currentEstimate: thetaToVocabulary(CAT_CONFIG.initialTheta),
    isComplete: false,
  };
}

/**
 * 获取下一道测试题
 */
export async function getNextQuestion(
  session: VocabTestSession
): Promise<TestQuestion | null> {
  const questionCount = session.responses.length;

  // 检查是否达到最大题数
  if (questionCount >= CAT_CONFIG.maxQuestions) {
    session.isComplete = true;
    return null;
  }

  // 检查是否达到最小题数且精度足够
  if (
    questionCount >= CAT_CONFIG.minQuestions &&
    session.standardError < CAT_CONFIG.seThreshold
  ) {
    session.isComplete = true;
    return null;
  }

  // 选择最优难度级别
  const targetLevel = selectOptimalBncLevel(session.theta);

  // 从数据库获取该级别的单词
  const excludeIds = Array.from(session.usedWordIds);
  let word = await getWordForVocabularyTest(targetLevel, excludeIds);

  // 如果该级别没有可用单词，尝试相邻级别
  if (!word) {
    for (let offset = 1; offset <= 5; offset++) {
      // 先尝试更高级别
      if (targetLevel + offset <= 25) {
        word = await getWordForVocabularyTest(targetLevel + offset, excludeIds);
        if (word) break;
      }
      // 再尝试更低级别
      if (targetLevel - offset >= 1) {
        word = await getWordForVocabularyTest(targetLevel - offset, excludeIds);
        if (word) break;
      }
    }
  }

  if (!word) {
    session.isComplete = true;
    return null;
  }

  // 创建题目
  const question = await createQuestion(word, Array.from(session.usedWordIds));
  session.questions.push(question);
  session.usedWordIds.add(word.id);

  return question;
}

/**
 * 创建题目对象（4选1）
 */
async function createQuestion(
  word: VocabularyTestWord,
  usedWordIds: string[]
): Promise<TestQuestion> {
  const difficulty = bncLevelToDifficulty(word.level);

  // 获取3个干扰项
  const distractors = await getDistractorMeanings(
    word.level,
    [...usedWordIds, word.id],
    word.pos,
    word.meaningCn,
    3
  );

  // 创建选项数组
  const optionIds = ['A', 'B', 'C', 'D'];
  const allMeanings = [word.meaningCn, ...distractors];

  // 随机打乱顺序
  const shuffledMeanings = shuffleArray([...allMeanings]);

  // 找到正确答案的位置
  const correctIndex = shuffledMeanings.indexOf(word.meaningCn);
  const correctOptionId = optionIds[correctIndex];

  // 创建选项
  const options: QuestionOption[] = shuffledMeanings.map((meaning, index) => ({
    id: optionIds[index],
    text: meaning,
    isCorrect: meaning === word.meaningCn,
  }));

  return {
    id: word.id,
    word: word.word,
    phoneticUs: word.phoneticUs,
    pos: word.pos,
    meaningCn: word.meaningCn,
    bncLevel: word.level,
    difficulty,
    options,
    correctOptionId,
  };
}

/**
 * 记录用户作答并更新 θ 估计
 * selectedOptionId: A/B/C/D 或 'SKIP'（不认识）
 */
export function recordResponse(
  session: VocabTestSession,
  questionId: string,
  selectedOptionId: string,
  responseTime: number
): void {
  const question = session.questions.find(q => q.id === questionId);
  if (!question) {
    console.warn('[VocabularyTestService] 题目未找到:', questionId);
    return;
  }

  // 判断是否正确（SKIP 视为答错）
  const isCorrect = selectedOptionId !== 'SKIP' && selectedOptionId === question.correctOptionId;

  // 更新统计
  if (isCorrect) {
    session.totalCorrect++;
  } else {
    session.totalWrong++;
  }
  session.difficultySum += question.difficulty;

  // 更新 θ 估计
  const totalQuestions = session.totalCorrect + session.totalWrong;
  session.theta = estimateTheta(
    session.difficultySum,
    totalQuestions,
    session.totalCorrect
  );

  // 更新标准误差
  const difficulties = session.responses.map(r => r.difficulty);
  difficulties.push(question.difficulty);
  session.standardError = calculateStandardError(session.theta, difficulties);

  // 更新词汇量估计
  session.currentEstimate = thetaToVocabulary(session.theta);

  // 记录作答
  const response: TestResponse = {
    questionId,
    word: question.word,
    bncLevel: question.bncLevel,
    difficulty: question.difficulty,
    selectedOptionId,
    isCorrect,
    responseTime,
    thetaAfter: session.theta,
  };
  session.responses.push(response);

  session.currentQuestionIndex++;
}

/**
 * 计算最终测试结果
 */
export function calculateResult(session: VocabTestSession): VocabularyTestResult {
  const testDuration = Date.now() - session.startTime;

  // 计算词汇量
  const estimatedVocabulary = thetaToVocabulary(session.theta);

  // 95% 置信区间（θ ± 1.96 × SE）
  const thetaLower = session.theta - 1.96 * session.standardError;
  const thetaUpper = session.theta + 1.96 * session.standardError;
  const confidenceInterval = {
    lower: thetaToVocabulary(Math.max(CAT_CONFIG.minTheta, thetaLower)),
    upper: thetaToVocabulary(Math.min(CAT_CONFIG.maxTheta, thetaUpper)),
  };

  // 统计
  const totalQuestions = session.responses.length;
  const totalCorrect = session.totalCorrect;
  const accuracy = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;

  // 四舍五入到百位
  const roundedVocabulary = Math.round(estimatedVocabulary / 100) * 100;

  // 确定词汇等级
  const levelInfo = VOCABULARY_LEVELS.find(
    l => roundedVocabulary >= l.min && roundedVocabulary < l.max
  ) || VOCABULARY_LEVELS[0];

  // 答题历史
  const responseHistory = session.responses.map((r, index) => ({
    questionIndex: index + 1,
    bncLevel: r.bncLevel,
    isCorrect: r.isCorrect,
    thetaAfter: r.thetaAfter,
  }));

  return {
    estimatedVocabulary: roundedVocabulary,
    theta: session.theta,
    standardError: session.standardError,
    confidenceInterval,
    totalQuestions,
    totalCorrect,
    accuracy,
    vocabularyLevel: levelInfo.level,
    levelDescription: levelInfo.description,
    testDuration,
    responseHistory,
  };
}

/**
 * 获取当前测试进度信息
 */
export function getProgress(session: VocabTestSession): {
  currentQuestion: number;
  minQuestions: number;
  maxQuestions: number;
  currentEstimate: number;
  theta: number;
  standardError: number;
  canFinishEarly: boolean;
  progressPercent: number;
} {
  const questionCount = session.responses.length;
  const canFinishEarly =
    questionCount >= CAT_CONFIG.minQuestions &&
    session.standardError < CAT_CONFIG.seThreshold;

  return {
    currentQuestion: questionCount,
    minQuestions: CAT_CONFIG.minQuestions,
    maxQuestions: CAT_CONFIG.maxQuestions,
    currentEstimate: session.currentEstimate,
    theta: session.theta,
    standardError: session.standardError,
    canFinishEarly,
    progressPercent: (questionCount / CAT_CONFIG.maxQuestions) * 100,
  };
}

/**
 * 获取词汇量对应的等级信息
 */
export function getVocabularyLevelInfo(vocabulary: number): {
  level: string;
  description: string;
  detail: string;
  progress: number;
  nextLevel: { name: string; required: number } | null;
} {
  const levelInfo = VOCABULARY_LEVELS.find(
    l => vocabulary >= l.min && vocabulary < l.max
  ) || VOCABULARY_LEVELS[0];

  const currentIndex = VOCABULARY_LEVELS.indexOf(levelInfo);
  const nextLevelInfo = currentIndex < VOCABULARY_LEVELS.length - 1
    ? VOCABULARY_LEVELS[currentIndex + 1]
    : null;

  const progress = levelInfo.max === Infinity
    ? 1
    : (vocabulary - levelInfo.min) / (levelInfo.max - levelInfo.min);

  return {
    level: levelInfo.level,
    description: levelInfo.description,
    detail: levelInfo.detail,
    progress: Math.min(1, Math.max(0, progress)),
    nextLevel: nextLevelInfo
      ? { name: nextLevelInfo.level, required: nextLevelInfo.min }
      : null,
  };
}

/**
 * 格式化测试时长
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}分${seconds.toString().padStart(2, '0')}秒`;
}

// ==================== 兼容旧接口 ====================

/**
 * @deprecated 使用 initVocabTestSession 代替
 */
export async function initCATSession(): Promise<VocabTestSession> {
  return initVocabTestSession();
}

/**
 * @deprecated 使用 VocabTestSession 代替
 */
export type CATSession = VocabTestSession;

// 导出旧的类型以保持兼容
export type { TestQuestion as Question };
