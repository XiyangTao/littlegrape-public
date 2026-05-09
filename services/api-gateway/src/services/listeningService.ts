/**
 * 听力训练服务
 * 管理听力材料、逐句数据、理解题、用户进度
 */

import { prisma } from '@/config/database';

// ==================== 内置听力材料 ====================

interface Sentence {
  en: string;
  zh: string;
}

interface Question {
  question: string;
  questionZh: string;
  options: string[];
  answer: number; // 正确选项索引
}

const SEED_MATERIALS = [
  {
    title: 'Ordering Coffee at a Café',
    titleZh: '在咖啡馆点咖啡',
    level: 'beginner',
    category: 'daily',
    totalWords: 89,
    duration: 45,
    sentences: [
      { en: 'Good morning! Welcome to the café.', zh: '早上好！欢迎来到咖啡馆。' },
      { en: 'What can I get for you today?', zh: '今天想要点什么？' },
      { en: 'I would like a medium cappuccino, please.', zh: '请给我一杯中杯卡布奇诺。' },
      { en: 'Would you like that hot or iced?', zh: '您想要热的还是冰的？' },
      { en: 'Hot, please. And can I also have a blueberry muffin?', zh: '热的，谢谢。我还可以要一个蓝莓松饼吗？' },
      { en: 'Of course! That will be six dollars and fifty cents.', zh: '当然可以！一共六美元五十美分。' },
      { en: 'Here you go. Thank you!', zh: '给你。谢谢！' },
      { en: 'Your order will be ready in a few minutes.', zh: '您的订单几分钟后就好。' },
    ] as Sentence[],
    questions: [
      {
        question: 'What drink did the customer order?',
        questionZh: '顾客点了什么饮品？',
        options: ['A latte', 'A cappuccino', 'An espresso', 'A mocha'],
        answer: 1,
      },
      {
        question: 'How much was the total?',
        questionZh: '一共多少钱？',
        options: ['$5.50', '$6.00', '$6.50', '$7.00'],
        answer: 2,
      },
      {
        question: 'What food item was also ordered?',
        questionZh: '还点了什么食物？',
        options: ['A croissant', 'A cookie', 'A blueberry muffin', 'A sandwich'],
        answer: 2,
      },
    ] as Question[],
  },
  {
    title: 'A Job Interview',
    titleZh: '一场工作面试',
    level: 'intermediate',
    category: 'business',
    totalWords: 142,
    duration: 70,
    sentences: [
      { en: 'Thank you for coming in today. Please have a seat.', zh: '感谢你今天来面试。请坐。' },
      { en: 'Thank you. I\'m really excited about this opportunity.', zh: '谢谢。我对这个机会非常兴奋。' },
      { en: 'Can you tell me about your previous work experience?', zh: '能介绍一下你之前的工作经历吗？' },
      { en: 'I worked as a marketing manager for three years at a technology company.', zh: '我在一家科技公司担任市场营销经理三年。' },
      { en: 'I was responsible for developing and executing digital marketing strategies.', zh: '我负责制定和执行数字营销策略。' },
      { en: 'That sounds impressive. What would you say is your greatest strength?', zh: '听起来很棒。你认为你最大的优势是什么？' },
      { en: 'I would say my ability to analyze data and turn it into actionable insights.', zh: '我认为是我分析数据并将其转化为可行洞察的能力。' },
      { en: 'I also work well under pressure and enjoy collaborating with cross-functional teams.', zh: '我在压力下也能很好地工作，并且喜欢与跨部门团队协作。' },
      { en: 'Very good. We will be in touch within the next week.', zh: '非常好。我们将在下周内联系你。' },
    ] as Sentence[],
    questions: [
      {
        question: 'How long did the candidate work at the technology company?',
        questionZh: '候选人在科技公司工作了多久？',
        options: ['One year', 'Two years', 'Three years', 'Five years'],
        answer: 2,
      },
      {
        question: 'What was the candidate\'s previous role?',
        questionZh: '候选人之前的职位是什么？',
        options: ['Software engineer', 'Marketing manager', 'Sales director', 'Product designer'],
        answer: 1,
      },
      {
        question: 'What did the candidate say was their greatest strength?',
        questionZh: '候选人说自己最大的优势是什么？',
        options: ['Public speaking', 'Data analysis', 'Time management', 'Leadership'],
        answer: 1,
      },
    ] as Question[],
  },
  {
    title: 'Climate Change and Our Planet',
    titleZh: '气候变化与我们的星球',
    level: 'advanced',
    category: 'science',
    totalWords: 168,
    duration: 85,
    sentences: [
      { en: 'Climate change is one of the most pressing challenges facing humanity today.', zh: '气候变化是当今人类面临的最紧迫的挑战之一。' },
      { en: 'Global temperatures have risen by approximately one point one degrees Celsius since pre-industrial times.', zh: '自工业化前时代以来，全球气温已上升了约1.1摄氏度。' },
      { en: 'This may seem small, but even minor temperature changes can have devastating effects on ecosystems.', zh: '这看起来很小，但即使是微小的温度变化也会对生态系统产生毁灭性影响。' },
      { en: 'Rising sea levels threaten coastal communities around the world.', zh: '海平面上升威胁着世界各地的沿海社区。' },
      { en: 'Extreme weather events, such as hurricanes and droughts, are becoming more frequent and severe.', zh: '飓风和干旱等极端天气事件正变得更加频繁和严重。' },
      { en: 'Scientists agree that reducing carbon emissions is essential to slowing global warming.', zh: '科学家们一致认为，减少碳排放对于减缓全球变暖至关重要。' },
      { en: 'Renewable energy sources like solar and wind power offer promising alternatives to fossil fuels.', zh: '太阳能和风能等可再生能源为化石燃料提供了有前途的替代方案。' },
      { en: 'Individual actions, such as using public transportation and reducing waste, also make a difference.', zh: '个人行动，如使用公共交通和减少浪费，也能产生影响。' },
      { en: 'The future of our planet depends on the collective effort of governments, businesses, and individuals.', zh: '我们星球的未来取决于政府、企业和个人的共同努力。' },
    ] as Sentence[],
    questions: [
      {
        question: 'How much have global temperatures risen since pre-industrial times?',
        questionZh: '自工业化前时代以来，全球气温上升了多少？',
        options: ['0.5°C', '1.1°C', '1.5°C', '2.0°C'],
        answer: 1,
      },
      {
        question: 'Which of the following is mentioned as a renewable energy source?',
        questionZh: '以下哪项被提到是可再生能源？',
        options: ['Natural gas', 'Nuclear power', 'Solar power', 'Coal'],
        answer: 2,
      },
      {
        question: 'According to the passage, what individual action can help?',
        questionZh: '根据文章，什么个人行动可以帮助？',
        options: ['Buying more products', 'Using public transportation', 'Driving more often', 'Using more electricity'],
        answer: 1,
      },
      {
        question: 'What do scientists agree is essential?',
        questionZh: '科学家们一致认为什么是必要的？',
        options: ['Building more factories', 'Reducing carbon emissions', 'Increasing energy consumption', 'Expanding urban areas'],
        answer: 1,
      },
    ] as Question[],
  },
];

// ==================== 核心功能 ====================

/** 获取听力材料列表（支持按用户学过的词加权排序） */
export async function getMaterialList(params?: { level?: string; category?: string; userId?: string }) {
  const where: any = { isPublished: true };
  if (params?.level) where.level = params.level;
  if (params?.category) where.category = params.category;

  const materials = await prisma.listeningMaterial.findMany({
    where,
    select: {
      id: true,
      title: true,
      titleZh: true,
      level: true,
      category: true,
      totalWords: true,
      duration: true,
      sentences: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // 如果没有 userId，直接返回（不含 sentences 原始数据）
  if (!params?.userId) {
    return materials.map(({ sentences, ...rest }) => ({ ...rest, learnedWordCount: 0 }));
  }

  // 查询用户近 30 天学过的词
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const learnedWords = await prisma.userWordProgress.findMany({
    where: {
      userId: params.userId,
      learnedAt: { gte: thirtyDaysAgo },
    },
    select: {
      word: { select: { word: true } },
    },
  });

  // 构建学过词的 Set（全部小写以便匹配）
  const learnedWordSet = new Set(learnedWords.map(lw => lw.word.word.toLowerCase()));

  if (learnedWordSet.size === 0) {
    return materials.map(({ sentences, ...rest }) => ({ ...rest, learnedWordCount: 0 }));
  }

  // 为每个材料计算包含学过词的数量
  const materialsWithCount = materials.map(material => {
    const { sentences, ...rest } = material;
    let learnedWordCount = 0;

    // sentences 是 JSON 数组 [{en: "...", zh: "..."}]
    const sentenceList = (sentences as unknown as Sentence[]) || [];
    // 提取所有英文句子中的单词（去重后统计）
    const wordsInMaterial = new Set<string>();
    for (const s of sentenceList) {
      if (s.en) {
        // 提取英文单词，转小写
        const words = s.en.toLowerCase().match(/[a-z']+/g);
        if (words) {
          words.forEach(w => wordsInMaterial.add(w));
        }
      }
    }

    // 统计交集数量
    for (const w of wordsInMaterial) {
      if (learnedWordSet.has(w)) {
        learnedWordCount++;
      }
    }

    return { ...rest, learnedWordCount };
  });

  // 按 learnedWordCount 降序排序（有匹配词的排前面），相同数量按创建时间降序
  materialsWithCount.sort((a, b) => {
    if (b.learnedWordCount !== a.learnedWordCount) {
      return b.learnedWordCount - a.learnedWordCount;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return materialsWithCount;
}

/** 获取听力材料详情（含句子和理解题） */
export async function getMaterialDetail(materialId: string) {
  return prisma.listeningMaterial.findUnique({
    where: { id: materialId },
  });
}

/** 获取用户听力进度 */
export async function getUserListeningProgress(userId: string) {
  return prisma.userListeningProgress.findMany({
    where: { userId },
  });
}

/** 更新听力进度 */
export async function updateListeningProgress(
  userId: string,
  materialId: string,
  data: { mode: string; dictationScore?: number; quizScore?: number }
) {
  const updateData: any = {
    listenCount: { increment: 1 },
  };
  if (data.dictationScore !== undefined) {
    updateData.dictationScore = data.dictationScore;
    updateData.completedAt = new Date();
  }
  if (data.quizScore !== undefined) {
    updateData.quizScore = data.quizScore;
    updateData.completedAt = new Date();
  }

  return prisma.userListeningProgress.upsert({
    where: {
      userId_materialId_mode: { userId, materialId, mode: data.mode },
    },
    create: {
      userId,
      materialId,
      mode: data.mode,
      dictationScore: data.dictationScore,
      quizScore: data.quizScore,
      listenCount: 1,
      completedAt: data.dictationScore !== undefined || data.quizScore !== undefined ? new Date() : null,
    },
    update: updateData,
  });
}

/** 初始化种子数据 */
export async function seedListeningMaterials() {
  const count = await prisma.listeningMaterial.count();
  if (count > 0) return;

  for (const material of SEED_MATERIALS) {
    await prisma.listeningMaterial.create({ data: material as any });
  }
}
