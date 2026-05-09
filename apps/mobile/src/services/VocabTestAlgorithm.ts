/**
 * 词汇量测试算法模块 - IRT-CAT 核心算法函数
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

// ==================== 配置常量 ====================

/**
 * IRT-CAT 测试配置
 */
export const CAT_CONFIG = {
  minQuestions: 50,              // 最小题数
  maxQuestions: 80,              // 最大题数
  initialTheta: -2.25,           // 初始 θ（对应约 4000 词汇量）
  minTheta: -3.225,              // θ 下限（对应 100 词汇量）
  maxTheta: 3.0,                 // θ 上限（对应 25000 词汇量）
  seThreshold: 0.25,             // 标准误差阈值
  guessingParam: 0.25,           // 4选1 猜测概率
};

/**
 * 词汇量等级划分（对应 CEFR + 中国考试体系）
 *
 * 参考标准：
 * - 中考：1,600-2,000 词（2024年新教材）
 * - 高考：3,500 词（含派生词约4,000）
 * - 四级 CET4：4,200-4,500 词
 * - 六级 CET6：5,500-6,000 词
 * - 雅思 6分：~6,500 词
 * - 雅思 7分：8,000+ 词
 * - 专八 TEM8：13,000 词（核心8,000）
 * - 母语者：17,000-20,000 词族
 */
export const VOCABULARY_LEVELS = [
  {
    min: 0,
    max: 2000,
    level: 'A1',
    description: '入门·中考',
    detail: '能理解基础日常词汇，进行简单的日常交流',
  },
  {
    min: 2000,
    max: 3500,
    level: 'A2',
    description: '基础·高考',
    detail: '能理解简单的日常对话，阅读简单文章',
  },
  {
    min: 3500,
    max: 5000,
    level: 'B1',
    description: '进阶·四级',
    detail: '能阅读一般性文章，进行日常英语交流',
  },
  {
    min: 5000,
    max: 6500,
    level: 'B2',
    description: '中级·六级',
    detail: '能流畅阅读英文文章，理解大部分影视内容',
  },
  {
    min: 6500,
    max: 8000,
    level: 'B2+',
    description: '中高·雅思6',
    detail: '能阅读英文原著，进行较复杂的英语交流',
  },
  {
    min: 8000,
    max: 10000,
    level: 'C1',
    description: '高级·雅思7',
    detail: '能无障碍阅读各类英语材料',
  },
  {
    min: 10000,
    max: 13000,
    level: 'C2',
    description: '专业·专八',
    detail: '能阅读学术文献，词汇量接近受过教育的母语者',
  },
  {
    min: 13000,
    max: 20000,
    level: 'C2+',
    description: '精通·母语',
    detail: '词汇量达到或接近受过高等教育的母语者水平',
  },
];

// ==================== IRT 核心算法 ====================

/**
 * BNC Level 到 IRT 难度参数 b 的转换
 * b = (bncLevel - 13) / 4
 * 这样 Level 1 → b = -3.0, Level 13 → b = 0, Level 25 → b = +3.0
 */
export function bncLevelToDifficulty(bncLevel: number): number {
  return (bncLevel - 13) / 4;
}

/**
 * IRT 难度参数 b 到 BNC Level 的转换
 */
export function difficultyToBncLevel(b: number): number {
  const level = b * 4 + 13;
  return Math.max(1, Math.min(25, Math.round(level)));
}

/**
 * θ 转换为词汇量
 * 词汇量 = BNC Level × 1000（保留小数精度）
 */
export function thetaToVocabulary(theta: number): number {
  // 不四舍五入，保留精度
  const bncLevel = theta * 4 + 13;
  const clampedLevel = Math.max(0.1, Math.min(25, bncLevel));  // 最小 0.1 对应 100 词汇量
  // 词汇量四舍五入到百位
  return Math.round(clampedLevel * 100) * 10;
}

/**
 * Rasch 模型：计算答对概率
 * P(correct | θ, b) = 1 / (1 + e^(-(θ - b)))
 */
export function raschProbability(theta: number, difficulty: number): number {
  return 1 / (1 + Math.exp(-(theta - difficulty)));
}

/**
 * Fisher 信息量：衡量该题目对当前 θ 估计的信息贡献
 * I(θ) = P(θ) × (1 - P(θ))
 * 当 θ = b 时信息量最大（= 0.25）
 */
export function fisherInformation(theta: number, difficulty: number): number {
  const p = raschProbability(theta, difficulty);
  return p * (1 - p);
}

/**
 * 使用简化 MLE 估计 θ（Rasch 模型）
 *
 * 公式：θ = H/L + ln(R/W)
 * 其中：
 * - H = 已答题目难度之和
 * - L = 已答题目数
 * - R = 正确数
 * - W = 错误数
 *
 * 特殊情况处理：
 * - 全对：使用 (R - 0.5) / 0.5
 * - 全错：使用 0.5 / (W - 0.5)
 */
export function estimateTheta(
  difficultySum: number,
  totalQuestions: number,
  correctCount: number
): number {
  if (totalQuestions === 0) {
    return CAT_CONFIG.initialTheta;
  }

  const wrongCount = totalQuestions - correctCount;
  const avgDifficulty = difficultySum / totalQuestions;

  let logOdds: number;
  if (wrongCount === 0) {
    // 全对：使用校正公式
    logOdds = Math.log((correctCount - 0.5) / 0.5);
  } else if (correctCount === 0) {
    // 全错：使用校正公式
    logOdds = Math.log(0.5 / (wrongCount - 0.5));
  } else {
    logOdds = Math.log(correctCount / wrongCount);
  }

  let theta = avgDifficulty + logOdds;

  // 限制 θ 在有效范围内
  theta = Math.max(CAT_CONFIG.minTheta, Math.min(CAT_CONFIG.maxTheta, theta));

  return theta;
}

/**
 * 计算标准误差
 * SE = sqrt(1 / Σ I(θ))
 * 其中 I(θ) 是每道题的 Fisher 信息量
 */
export function calculateStandardError(
  theta: number,
  difficulties: number[]
): number {
  if (difficulties.length === 0) {
    return Infinity;
  }

  const totalInfo = difficulties.reduce((sum, b) => {
    return sum + fisherInformation(theta, b);
  }, 0);

  if (totalInfo === 0) {
    return Infinity;
  }

  return Math.sqrt(1 / totalInfo);
}

/**
 * 选择最优 BNC Level（最大信息量原则）
 * 选择难度最接近当前 θ 的级别
 */
export function selectOptimalBncLevel(theta: number): number {
  const optimalLevel = difficultyToBncLevel(theta);
  // 添加少量随机性，避免总是选同一级别的词
  const randomOffset = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
  const level = optimalLevel + randomOffset;
  return Math.max(1, Math.min(25, level));
}

/**
 * Fisher-Yates 洗牌算法
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
