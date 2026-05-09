/**
 * 考试专题服务
 * 按考试类型生成模拟题，支持四六级、雅思、托福等
 */

import { prisma } from '@/config/database';

// ==================== 考试类型定义 ====================

export interface ExamType {
  id: string;
  name: string;
  nameZh: string;
  tag: string; // 对应 WordTag 中的 tag
  description: string;
  descriptionZh: string;
  questionCount: number; // 默认题数
  timeLimit: number; // 限时（分钟）
  sections: ExamSection[];
}

interface ExamSection {
  type: 'vocabulary' | 'cloze' | 'reading_choice';
  name: string;
  nameZh: string;
  count: number;
}

const EXAM_TYPES: ExamType[] = [
  {
    id: 'cet4', name: 'CET-4', nameZh: '大学英语四级',
    tag: '四级',
    description: 'College English Test Band 4',
    descriptionZh: '四级高频词汇与真题练习',
    questionCount: 30, timeLimit: 20,
    sections: [
      { type: 'vocabulary', name: 'Vocabulary', nameZh: '词汇选择', count: 20 },
      { type: 'cloze', name: 'Cloze', nameZh: '完形填空', count: 10 },
    ],
  },
  {
    id: 'cet6', name: 'CET-6', nameZh: '大学英语六级',
    tag: '六级',
    description: 'College English Test Band 6',
    descriptionZh: '六级核心词汇与真题演练',
    questionCount: 30, timeLimit: 20,
    sections: [
      { type: 'vocabulary', name: 'Vocabulary', nameZh: '词汇选择', count: 20 },
      { type: 'cloze', name: 'Cloze', nameZh: '完形填空', count: 10 },
    ],
  },
  {
    id: 'kaoyan', name: 'Postgrad', nameZh: '考研英语',
    tag: '考研',
    description: 'Graduate Entrance English',
    descriptionZh: '考研英语核心词汇精练',
    questionCount: 30, timeLimit: 25,
    sections: [
      { type: 'vocabulary', name: 'Vocabulary', nameZh: '词汇选择', count: 20 },
      { type: 'cloze', name: 'Cloze', nameZh: '完形填空', count: 10 },
    ],
  },
  {
    id: 'ielts', name: 'IELTS', nameZh: '雅思',
    tag: '雅思',
    description: 'International English Language Testing System',
    descriptionZh: '雅思核心词汇与题型训练',
    questionCount: 25, timeLimit: 20,
    sections: [
      { type: 'vocabulary', name: 'Vocabulary', nameZh: '词汇选择', count: 15 },
      { type: 'cloze', name: 'Cloze', nameZh: '完形填空', count: 10 },
    ],
  },
  {
    id: 'toefl', name: 'TOEFL', nameZh: '托福',
    tag: '托福',
    description: 'Test of English as a Foreign Language',
    descriptionZh: '托福核心词汇与题型训练',
    questionCount: 25, timeLimit: 20,
    sections: [
      { type: 'vocabulary', name: 'Vocabulary', nameZh: '词汇选择', count: 15 },
      { type: 'cloze', name: 'Cloze', nameZh: '完形填空', count: 10 },
    ],
  },
  {
    id: 'tem4', name: 'TEM-4', nameZh: '专业四级',
    tag: '专四',
    description: 'Test for English Majors Band 4',
    descriptionZh: '英语专业四级词汇训练',
    questionCount: 25, timeLimit: 20,
    sections: [
      { type: 'vocabulary', name: 'Vocabulary', nameZh: '词汇选择', count: 15 },
      { type: 'cloze', name: 'Cloze', nameZh: '完形填空', count: 10 },
    ],
  },
  {
    id: 'tem8', name: 'TEM-8', nameZh: '专业八级',
    tag: '专八',
    description: 'Test for English Majors Band 8',
    descriptionZh: '英语专业八级词汇训练',
    questionCount: 25, timeLimit: 20,
    sections: [
      { type: 'vocabulary', name: 'Vocabulary', nameZh: '词汇选择', count: 15 },
      { type: 'cloze', name: 'Cloze', nameZh: '完形填空', count: 10 },
    ],
  },
];

// ==================== 题目生成 ====================

export interface ExamQuestion {
  id: string;
  section: string;
  type: 'vocabulary' | 'cloze';
  question: string;
  options: string[];
  answer: number; // 正确答案索引 0-3
  wordId?: string;
  explanation?: string;
}

interface GeneratedExam {
  examType: ExamType;
  questions: ExamQuestion[];
  totalQuestions: number;
  timeLimit: number;
}

/**
 * 获取考试类型列表
 */
export function getExamTypes(): ExamType[] {
  return EXAM_TYPES;
}

/**
 * 获取用户的考试记录统计
 */
export async function getUserExamStats(userId: string) {
  const records = await prisma.userExamRecord.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  // 按考试类型分组统计
  const statsByType: Record<string, { attempts: number; bestScore: number; lastScore: number }> = {};
  for (const r of records) {
    if (!statsByType[r.examTypeId]) {
      statsByType[r.examTypeId] = { attempts: 0, bestScore: 0, lastScore: 0 };
    }
    statsByType[r.examTypeId].attempts++;
    statsByType[r.examTypeId].bestScore = Math.max(statsByType[r.examTypeId].bestScore, r.score);
    statsByType[r.examTypeId].lastScore = r.score;
  }

  return statsByType;
}

/**
 * 生成模拟考试题
 */
export async function generateExam(examTypeId: string): Promise<GeneratedExam> {
  const examType = EXAM_TYPES.find(e => e.id === examTypeId);
  if (!examType) throw new Error(`未知的考试类型: ${examTypeId}`);

  const questions: ExamQuestion[] = [];
  let questionIndex = 0;

  for (const section of examType.sections) {
    if (section.type === 'vocabulary') {
      const vocabQuestions = await generateVocabularyQuestions(examType.tag, section.count);
      questions.push(...vocabQuestions.map(q => ({ ...q, id: `q${questionIndex++}`, section: section.nameZh })));
    } else if (section.type === 'cloze') {
      const clozeQuestions = await generateClozeQuestions(examType.tag, section.count);
      questions.push(...clozeQuestions.map(q => ({ ...q, id: `q${questionIndex++}`, section: section.nameZh })));
    }
  }

  return {
    examType,
    questions,
    totalQuestions: questions.length,
    timeLimit: examType.timeLimit,
  };
}

/**
 * 生成词汇选择题：给出英文单词，选择正确中文释义
 */
async function generateVocabularyQuestions(tag: string, count: number): Promise<Omit<ExamQuestion, 'id' | 'section'>[]> {
  // 查找属于该标签的单词
  const words = await prisma.word.findMany({
    where: { tags: { some: { tag } } },
    select: { id: true, word: true, meaningCn: true },
    take: count * 3, // 多取一些以便随机选
  });

  if (words.length < 4) return [];

  // 随机选取 count 个
  const shuffled = words.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  return selected.map(word => {
    // 生成干扰项：从其他单词中随机选3个释义
    const distractors = shuffled
      .filter(w => w.id !== word.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => w.meaningCn);

    // 随机插入正确答案
    const answerIndex = Math.floor(Math.random() * 4);
    const options = [...distractors];
    options.splice(answerIndex, 0, word.meaningCn);

    return {
      type: 'vocabulary' as const,
      question: word.word,
      options: options.slice(0, 4),
      answer: answerIndex,
      wordId: word.id,
    };
  });
}

/**
 * 生成完形填空题：给出例句，从句中挖掉目标单词
 */
async function generateClozeQuestions(tag: string, count: number): Promise<Omit<ExamQuestion, 'id' | 'section'>[]> {
  // 找有例句的单词
  const wordsWithExamples = await prisma.word.findMany({
    where: {
      tags: { some: { tag } },
      examples: { some: {} },
    },
    include: {
      examples: { take: 1 },
    },
    take: count * 3,
  });

  if (wordsWithExamples.length < 4) return [];

  const shuffled = wordsWithExamples.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  return selected.map(word => {
    const example = word.examples[0];
    // 将句子中的目标词替换为 ______
    const regex = new RegExp(`\\b${word.word}\\b`, 'gi');
    const questionSentence = example.en.replace(regex, '______');

    // 如果替换失败（例如句子中没有原形词），跳过
    if (questionSentence === example.en) {
      return {
        type: 'cloze' as const,
        question: `Fill in: "${example.cn}" → The word means "${word.meaningCn}"`,
        options: generateWordOptions(word.word, shuffled.map(w => w.word)),
        answer: 0,
        wordId: word.id,
        explanation: example.en,
      };
    }

    const options = generateWordOptions(word.word, shuffled.map(w => w.word));
    const answerIndex = options.indexOf(word.word);

    return {
      type: 'cloze' as const,
      question: questionSentence,
      options,
      answer: answerIndex,
      wordId: word.id,
      explanation: example.en,
    };
  });
}

function generateWordOptions(correctWord: string, allWords: string[]): string[] {
  const distractors = allWords
    .filter(w => w !== correctWord)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const answerIndex = Math.floor(Math.random() * 4);
  const options = [...distractors];
  options.splice(answerIndex, 0, correctWord);
  return options.slice(0, 4);
}

/**
 * 提交考试成绩
 */
export async function submitExamResult(
  userId: string,
  examTypeId: string,
  score: number,
  totalQuestions: number,
  correctCount: number,
  duration: number, // 秒
  answers: Record<string, number> // questionId → selectedOption
) {
  return prisma.userExamRecord.create({
    data: {
      userId,
      examTypeId,
      score,
      totalQuestions,
      correctCount,
      duration,
      answers: answers as any,
    },
  });
}

/**
 * 获取用户考试记录
 */
export async function getUserExamRecords(userId: string, examTypeId?: string) {
  return prisma.userExamRecord.findMany({
    where: {
      userId,
      ...(examTypeId ? { examTypeId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}
