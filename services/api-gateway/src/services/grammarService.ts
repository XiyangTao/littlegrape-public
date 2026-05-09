/**
 * 语法学习服务
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { aiServiceClient } from '@/clients';

// ==================== 等级定义 ====================

export const GRAMMAR_LEVELS = [
  { level: 1, nameZh: '入门基础', nameEn: 'Foundations', color: '#10B981' },
  { level: 2, nameZh: '进阶表达', nameEn: 'Building Up', color: '#3B82F6' },
  { level: 3, nameZh: '中级突破', nameEn: 'Intermediate', color: '#8B5CF6' },
  { level: 4, nameZh: '高级应用', nameEn: 'Advanced', color: '#F59E0B' },
  { level: 5, nameZh: '高阶精通', nameEn: 'Mastery', color: '#EF4444' },
];

// ==================== 种子数据（5 等级 × 19 单元 × 69 语法点） ====================
// 优化原则：砍掉低频学术点，补充高频实用点，合并过细的点，拆分过粗的点

const GRAMMAR_SEED_DATA = [
  // ===== Level 1: 入门基础（16 点）=====
  {
    code: 'be_verb_nouns', nameZh: 'be 动词与名词', nameEn: 'Be Verb & Nouns',
    icon: 'article', color: '#10B981', level: 1, sortOrder: 1,
    points: [
      { code: 'be_verb', nameZh: 'be 动词的用法', nameEn: 'Be Verb (am/is/are/was/were)', difficulty: 'basic', sortOrder: 1 },
      { code: 'noun_plurals', nameZh: '名词复数变化', nameEn: 'Noun Plurals', difficulty: 'basic', sortOrder: 2 },
      { code: 'countable_uncountable', nameZh: '可数与不可数名词', nameEn: 'Countable & Uncountable Nouns', difficulty: 'basic', sortOrder: 3 },
      { code: 'articles_a_an_the', nameZh: '冠词 a/an/the', nameEn: 'Articles: a/an/the', difficulty: 'basic', sortOrder: 4 },
    ],
  },
  {
    code: 'basic_tenses', nameZh: '基础时态', nameEn: 'Basic Tenses',
    icon: 'schedule', color: '#0D9488', level: 1, sortOrder: 2,
    points: [
      { code: 'simple_present', nameZh: '一般现在时', nameEn: 'Simple Present', difficulty: 'basic', sortOrder: 1 },
      { code: 'simple_past', nameZh: '一般过去时', nameEn: 'Simple Past', difficulty: 'basic', sortOrder: 2 },
      { code: 'present_continuous', nameZh: '现在进行时', nameEn: 'Present Continuous', difficulty: 'basic', sortOrder: 3 },
      { code: 'simple_future', nameZh: '一般将来时', nameEn: 'Simple Future (will / be going to)', difficulty: 'basic', sortOrder: 4 },
    ],
  },
  {
    code: 'describing_things', nameZh: '描述与修饰', nameEn: 'Describing Things',
    icon: 'tune', color: '#059669', level: 1, sortOrder: 3,
    points: [
      { code: 'adjective_usage', nameZh: '形容词用法与位置', nameEn: 'Adjective Usage & Position', difficulty: 'basic', sortOrder: 1 },
      { code: 'comparative_superlative', nameZh: '比较级与最高级', nameEn: 'Comparative & Superlative', difficulty: 'basic', sortOrder: 2 },
      { code: 'prepositions_time', nameZh: '时间介词 at/on/in', nameEn: 'Prepositions of Time', difficulty: 'basic', sortOrder: 3 },
      { code: 'prepositions_place', nameZh: '地点与方向介词', nameEn: 'Prepositions of Place & Direction', difficulty: 'basic', sortOrder: 4 },
    ],
  },
  {
    code: 'making_sentences', nameZh: '造句基础', nameEn: 'Making Sentences',
    icon: 'format-list-numbered', color: '#16A34A', level: 1, sortOrder: 4,
    points: [
      { code: 'basic_sentence_patterns', nameZh: '基本句型', nameEn: 'Basic Sentence Patterns (SVO/SVC/SVOO)', difficulty: 'basic', sortOrder: 1 },
      { code: 'questions_formation', nameZh: '疑问句的构成', nameEn: 'Forming Questions', difficulty: 'basic', sortOrder: 2 },
      { code: 'imperative', nameZh: '祈使句', nameEn: 'Imperative Sentences', difficulty: 'basic', sortOrder: 3 },
      { code: 'there_be', nameZh: 'There be 句型', nameEn: 'There be Structure', difficulty: 'basic', sortOrder: 4 },
    ],
  },

  // ===== Level 2: 进阶表达（16 点）=====
  {
    code: 'pronouns_determiners', nameZh: '代词与限定词', nameEn: 'Pronouns & Determiners',
    icon: 'person-outline', color: '#3B82F6', level: 2, sortOrder: 1,
    points: [
      { code: 'personal_possessive_pronouns', nameZh: '人称代词与物主代词', nameEn: 'Personal & Possessive Pronouns', difficulty: 'basic', sortOrder: 1 },
      { code: 'reflexive_demonstrative', nameZh: '反身代词与指示代词', nameEn: 'Reflexive & Demonstrative Pronouns', difficulty: 'basic', sortOrder: 2 },
      { code: 'quantifiers', nameZh: '限定词 some/any/much/many/few/little', nameEn: 'Quantifiers & Determiners', difficulty: 'basic', sortOrder: 3 },
      { code: 'it_usage', nameZh: 'It 的特殊用法', nameEn: 'Special Uses of "It"', difficulty: 'intermediate', sortOrder: 4 },
    ],
  },
  {
    code: 'modal_verbs', nameZh: '情态动词', nameEn: 'Modal Verbs',
    icon: 'help-outline', color: '#6366F1', level: 2, sortOrder: 2,
    points: [
      { code: 'can_could', nameZh: 'can/could 能力与许可', nameEn: 'can/could: Ability & Permission', difficulty: 'basic', sortOrder: 1 },
      { code: 'must_have_to', nameZh: 'must/have to 必须与义务', nameEn: 'must/have to: Obligation', difficulty: 'basic', sortOrder: 2 },
      { code: 'should_may_might', nameZh: 'should/may/might 建议与可能', nameEn: 'should/may/might: Advice & Possibility', difficulty: 'intermediate', sortOrder: 3 },
      { code: 'will_would', nameZh: 'will/would 意愿与推测', nameEn: 'will/would: Willingness & Prediction', difficulty: 'intermediate', sortOrder: 4 },
    ],
  },
  {
    code: 'connecting_ideas', nameZh: '连接与表达', nameEn: 'Connecting Ideas',
    icon: 'link', color: '#2563EB', level: 2, sortOrder: 3,
    points: [
      { code: 'coordinating_conjunctions', nameZh: '并列连词 and/but/or/so', nameEn: 'Coordinating Conjunctions', difficulty: 'basic', sortOrder: 1 },
      { code: 'subordinating_conjunctions', nameZh: '从属连词 because/although/if', nameEn: 'Subordinating Conjunctions', difficulty: 'intermediate', sortOrder: 2 },
      { code: 'correlative_conjunctions', nameZh: '关联连词 not only...but also', nameEn: 'Correlative Conjunctions', difficulty: 'intermediate', sortOrder: 3 },
      { code: 'adverbs', nameZh: '副词的分类与位置', nameEn: 'Adverbs: Types & Position', difficulty: 'intermediate', sortOrder: 4 },
    ],
  },
  {
    code: 'more_tenses', nameZh: '进阶时态', nameEn: 'More Tenses',
    icon: 'update', color: '#4F46E5', level: 2, sortOrder: 4,
    points: [
      { code: 'past_continuous', nameZh: '过去进行时', nameEn: 'Past Continuous', difficulty: 'intermediate', sortOrder: 1 },
      { code: 'present_perfect', nameZh: '现在完成时', nameEn: 'Present Perfect', difficulty: 'intermediate', sortOrder: 2 },
      { code: 'present_perfect_vs_past', nameZh: '现在完成时 vs 一般过去时', nameEn: 'Present Perfect vs Simple Past', difficulty: 'intermediate', sortOrder: 3 },
      { code: 'past_perfect', nameZh: '过去完成时', nameEn: 'Past Perfect', difficulty: 'intermediate', sortOrder: 4 },
    ],
  },

  // ===== Level 3: 中级突破（17 点）=====
  {
    code: 'passive_voice', nameZh: '被动语态', nameEn: 'Passive Voice',
    icon: 'swap-horiz', color: '#8B5CF6', level: 3, sortOrder: 1,
    points: [
      { code: 'passive_basic', nameZh: '被动语态基础', nameEn: 'Passive Voice Basics', difficulty: 'intermediate', sortOrder: 1 },
      { code: 'passive_tenses', nameZh: '各时态的被动语态', nameEn: 'Passive in Different Tenses', difficulty: 'intermediate', sortOrder: 2 },
      { code: 'have_something_done', nameZh: '使役结构 have/get sth done', nameEn: 'Causative: have/get sth done', difficulty: 'intermediate', sortOrder: 3 },
    ],
  },
  {
    code: 'relative_clauses', nameZh: '定语从句', nameEn: 'Relative Clauses',
    icon: 'account-tree', color: '#A855F7', level: 3, sortOrder: 2,
    points: [
      { code: 'relative_pronouns', nameZh: '关系代词 who/which/that', nameEn: 'Relative Pronouns: who/which/that', difficulty: 'intermediate', sortOrder: 1 },
      { code: 'relative_adverbs', nameZh: '关系副词 where/when/why', nameEn: 'Relative Adverbs: where/when/why', difficulty: 'intermediate', sortOrder: 2 },
      { code: 'restrictive_non_restrictive', nameZh: '限制性与非限制性定语从句', nameEn: 'Restrictive vs Non-restrictive', difficulty: 'advanced', sortOrder: 3 },
      { code: 'subject_verb_agreement', nameZh: '主谓一致', nameEn: 'Subject-Verb Agreement', difficulty: 'intermediate', sortOrder: 4 },
    ],
  },
  {
    code: 'reported_sentence_variety', nameZh: '转述与句式', nameEn: 'Reported Speech & Variety',
    icon: 'record-voice-over', color: '#7C3AED', level: 3, sortOrder: 3,
    points: [
      { code: 'reported_speech', nameZh: '间接引语与转述', nameEn: 'Reported Speech', difficulty: 'intermediate', sortOrder: 1 },
      { code: 'question_tags', nameZh: '反意疑问句', nameEn: 'Question Tags', difficulty: 'intermediate', sortOrder: 2 },
      { code: 'exclamatory', nameZh: '感叹句', nameEn: 'Exclamatory Sentences', difficulty: 'intermediate', sortOrder: 3 },
    ],
  },
  {
    code: 'noun_clauses', nameZh: '名词性从句', nameEn: 'Noun Clauses',
    icon: 'layers', color: '#9333EA', level: 3, sortOrder: 4,
    points: [
      { code: 'object_clause', nameZh: '宾语从句', nameEn: 'Object Clauses', difficulty: 'intermediate', sortOrder: 1 },
      { code: 'subject_predicative_clause', nameZh: '主语从句与表语从句', nameEn: 'Subject & Predicative Clauses', difficulty: 'advanced', sortOrder: 2 },
      { code: 'so_neither', nameZh: 'so do I / neither 附和结构', nameEn: 'so do I / neither do I', difficulty: 'intermediate', sortOrder: 3 },
    ],
  },
  {
    code: 'adverbial_clauses', nameZh: '状语从句', nameEn: 'Adverbial Clauses',
    icon: 'call-split', color: '#6D28D9', level: 3, sortOrder: 5,
    points: [
      { code: 'adverbial_time_condition', nameZh: '时间与条件状语从句', nameEn: 'Adverbial Clauses of Time & Condition', difficulty: 'intermediate', sortOrder: 1 },
      { code: 'adverbial_reason_result', nameZh: '原因与结果状语从句', nameEn: 'Adverbial Clauses of Reason & Result', difficulty: 'intermediate', sortOrder: 2 },
      { code: 'adverbial_concession_purpose', nameZh: '让步与目的状语从句', nameEn: 'Adverbial Clauses of Concession & Purpose', difficulty: 'advanced', sortOrder: 3 },
      { code: 'real_conditional', nameZh: '真实条件句', nameEn: 'Real Conditionals (Zero & First)', difficulty: 'intermediate', sortOrder: 4 },
    ],
  },

  // ===== Level 4: 高级应用（14 点）=====
  {
    code: 'infinitives_gerunds', nameZh: '不定式与动名词', nameEn: 'Infinitives & Gerunds',
    icon: 'merge-type', color: '#F59E0B', level: 4, sortOrder: 1,
    points: [
      { code: 'infinitive_usage', nameZh: '不定式的用法', nameEn: 'Infinitive Usage', difficulty: 'intermediate', sortOrder: 1 },
      { code: 'gerund_usage', nameZh: '动名词的用法', nameEn: 'Gerund Usage', difficulty: 'intermediate', sortOrder: 2 },
      { code: 'gerund_vs_infinitive', nameZh: '动名词 vs 不定式', nameEn: 'Gerund vs Infinitive', difficulty: 'advanced', sortOrder: 3 },
      { code: 'phrasal_verbs', nameZh: '短语动词基础', nameEn: 'Phrasal Verbs Basics', difficulty: 'intermediate', sortOrder: 4 },
    ],
  },
  {
    code: 'participles', nameZh: '分词', nameEn: 'Participles',
    icon: 'settings-input-component', color: '#D97706', level: 4, sortOrder: 2,
    points: [
      { code: 'present_participle', nameZh: '现在分词的用法', nameEn: 'Present Participle', difficulty: 'advanced', sortOrder: 1 },
      { code: 'past_participle', nameZh: '过去分词的用法', nameEn: 'Past Participle', difficulty: 'advanced', sortOrder: 2 },
      { code: 'participle_as_modifier', nameZh: '分词作定语与状语', nameEn: 'Participle as Modifier', difficulty: 'advanced', sortOrder: 3 },
    ],
  },
  {
    code: 'subjunctive_mood', nameZh: '虚拟语气', nameEn: 'Subjunctive Mood',
    icon: 'lightbulb', color: '#EA580C', level: 4, sortOrder: 3,
    points: [
      { code: 'unreal_conditional', nameZh: '虚拟条件句', nameEn: 'Unreal Conditionals (Second & Third)', difficulty: 'advanced', sortOrder: 1 },
      { code: 'wish_if_only', nameZh: 'wish/if only 虚拟语气', nameEn: 'wish / if only', difficulty: 'advanced', sortOrder: 2 },
      { code: 'modal_perfect', nameZh: '情态动词 + have done', nameEn: 'Modal + Have Done', difficulty: 'advanced', sortOrder: 3 },
    ],
  },
  {
    code: 'practical_advanced', nameZh: '实用进阶', nameEn: 'Practical Advanced',
    icon: 'trending-up', color: '#DC2626', level: 4, sortOrder: 4,
    points: [
      { code: 'used_to', nameZh: 'used to / be used to / get used to', nameEn: 'used to / be used to / get used to', difficulty: 'intermediate', sortOrder: 1 },
      { code: 'future_continuous_perfect', nameZh: '将来进行时与完成时', nameEn: 'Future Continuous & Future Perfect', difficulty: 'advanced', sortOrder: 2 },
      { code: 'perfect_continuous', nameZh: '完成进行时', nameEn: 'Perfect Continuous Tenses', difficulty: 'advanced', sortOrder: 3 },
      { code: 'zero_article', nameZh: '零冠词与冠词进阶', nameEn: 'Zero Article & Advanced Articles', difficulty: 'intermediate', sortOrder: 4 },
    ],
  },

  // ===== Level 5: 高阶精通（6 点）=====
  {
    code: 'special_structures', nameZh: '特殊句式', nameEn: 'Special Structures',
    icon: 'swap-vert', color: '#EF4444', level: 5, sortOrder: 1,
    points: [
      { code: 'inversion', nameZh: '倒装句', nameEn: 'Inversion', difficulty: 'advanced', sortOrder: 1 },
      { code: 'cleft_sentence', nameZh: '强调句', nameEn: 'Cleft Sentences (It is...that)', difficulty: 'advanced', sortOrder: 2 },
      { code: 'comparison_structures', nameZh: '高级比较结构', nameEn: 'Advanced Comparison (as...as / the more...the more)', difficulty: 'advanced', sortOrder: 3 },
    ],
  },
  {
    code: 'advanced_expression', nameZh: '高阶表达', nameEn: 'Advanced Expression',
    icon: 'auto-awesome', color: '#EC4899', level: 5, sortOrder: 2,
    points: [
      { code: 'result_purpose_clauses', nameZh: '结果与目的结构', nameEn: 'Result & Purpose Structures', difficulty: 'advanced', sortOrder: 1 },
      { code: 'compound_complex', nameZh: '并列句与复合句', nameEn: 'Compound & Complex Sentences', difficulty: 'advanced', sortOrder: 2 },
      { code: 'formal_subjunctive', nameZh: '正式虚拟语气', nameEn: 'Formal Subjunctive (suggest/demand that...)', difficulty: 'advanced', sortOrder: 3 },
    ],
  },
];

// ==================== 种子初始化 ====================

export async function seedGrammarData() {
  // 检查是否已经是新版 69 点结构（通过新增的 be_verb_nouns 单元判断）
  const hasNewStructure = await prisma.grammarCategory.findFirst({
    where: { code: 'be_verb_nouns' },
  });
  if (hasNewStructure) {
    const count = await prisma.grammarPoint.count();
    logger.info(`语法数据已是最新结构 (${count} 个语法点)，跳过`);
    return;
  }

  // 清空旧数据并重建（开发阶段无用户进度数据，AI 讲解按需重新生成）
  logger.info('重建语法种子数据（5 等级 × 19 单元 × 69 语法点）...');

  // 级联删除：删分类会自动删关联的语法点、缓存的讲解和练习
  const deleted = await prisma.grammarCategory.deleteMany();
  logger.info(`  清理旧数据: 删除 ${deleted.count} 个分类`);

  // 播种新数据
  for (const unitData of GRAMMAR_SEED_DATA) {
    const { points, ...unitFields } = unitData;
    const unit = await prisma.grammarCategory.create({
      data: { ...unitFields, points: { create: points } },
    });
    logger.info(`  创建单元: L${unit.level} ${unit.nameZh} (${points.length} 个语法点)`);
  }

  const totalPoints = await prisma.grammarPoint.count();
  logger.info(`语法种子数据重建完成: ${GRAMMAR_SEED_DATA.length} 个单元, ${totalPoints} 个语法点`);
}

// ==================== 查询函数 ====================

/**
 * 获取所有语法单元（含语法点数量、用户进度、等级信息）
 */
export async function getCategories(userId?: string) {
  const categories = await prisma.grammarCategory.findMany({
    orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
    include: {
      _count: { select: { points: true } },
    },
  });

  // 获取用户进度统计
  let progressByCategory: Record<string, number> = {};
  if (userId) {
    const progress = await prisma.userGrammarProgress.findMany({
      where: { userId, status: 'mastered' },
      include: { point: { select: { categoryId: true } } },
    });
    for (const p of progress) {
      const catId = p.point.categoryId;
      progressByCategory[catId] = (progressByCategory[catId] || 0) + 1;
    }
  }

  return categories.map(cat => ({
    id: cat.id,
    code: cat.code,
    nameZh: cat.nameZh,
    nameEn: cat.nameEn,
    icon: cat.icon,
    color: cat.color,
    description: cat.description,
    level: cat.level,
    pointCount: cat._count.points,
    learnedCount: progressByCategory[cat.id] || 0,
  }));
}

/**
 * 获取分类下的语法点列表（含用户进度）
 */
export async function getCategoryPoints(categoryCode: string, userId?: string) {
  const category = await prisma.grammarCategory.findUnique({
    where: { code: categoryCode },
    include: {
      points: {
        orderBy: { sortOrder: 'asc' },
        include: {
          userProgress: userId ? {
            where: { userId },
            take: 1,
          } : false,
        },
      },
    },
  });

  if (!category) return null;

  return {
    category: {
      code: category.code,
      nameZh: category.nameZh,
      nameEn: category.nameEn,
      icon: category.icon,
      color: category.color,
    },
    points: category.points.map(point => ({
      id: point.id,
      code: point.code,
      nameZh: point.nameZh,
      nameEn: point.nameEn,
      difficulty: point.difficulty,
      status: userId && point.userProgress?.[0]?.status || 'not_started',
      practiceScore: userId && point.userProgress?.[0]?.practiceScore || null,
      starRating: userId && point.userProgress?.[0]?.starRating || null,
      bestStarRating: userId && point.userProgress?.[0]?.bestStarRating || null,
    })),
  };
}

/**
 * 解析 explanation 字段：尝试 JSON 解析，失败则视为旧版 Markdown
 */
function parseExplanation(raw: string | null) {
  if (!raw) return { explanation: null, audioSummary: null, audioUrl: null };
  try {
    const parsed = JSON.parse(raw);
    if (parsed.sections) {
      return {
        explanation: parsed,
        audioSummary: parsed.audioSummary || null,
        audioUrl: parsed.audioUrl || null,
      };
    }
  } catch {
    // JSON 解析失败，视为旧版 Markdown 文本
  }
  return { explanation: raw, audioSummary: null, audioUrl: null };
}

/**
 * 获取语法点 AI 讲解（缓存策略）
 */
export async function getPointExplanation(pointIdentifier: string) {
  const point = await findPointByIdentifier(pointIdentifier);

  if (!point) return null;

  // 有缓存直接返回
  if (point.explanation && point.explanationGeneratedAt) {
    const { explanation, audioSummary, audioUrl } = parseExplanation(point.explanation);
    return {
      id: point.id,
      code: point.code,
      nameZh: point.nameZh,
      nameEn: point.nameEn,
      difficulty: point.difficulty,
      explanation,
      audioSummary,
      audioUrl,
      examples: point.examples || [],
    };
  }

  // 调用 AI Service 生成讲解
  try {
    logger.info(`生成语法讲解: ${point.nameZh} (${point.code})`);
    const aiResult = await aiServiceClient.generateGrammarExplanation(
      point.nameZh,
      point.nameEn,
      point.difficulty,
    );

    // 缓存到数据库
    await prisma.grammarPoint.update({
      where: { id: point.id },
      data: {
        explanation: aiResult.explanation,
        examples: aiResult.examples || [],
        explanationGeneratedAt: new Date(),
      },
    });

    const { explanation, audioSummary, audioUrl } = parseExplanation(aiResult.explanation);
    return {
      id: point.id,
      code: point.code,
      nameZh: point.nameZh,
      nameEn: point.nameEn,
      difficulty: point.difficulty,
      explanation,
      audioSummary,
      audioUrl,
      examples: aiResult.examples || [],
    };
  } catch (error) {
    logger.error(`生成语法讲解失败 (${point.code}):`, error);
    throw error;
  }
}

/**
 * 获取语法练习题（缓存 + AI 生成）
 * 池子目标 POOL_SIZE 道题，每次返回 count 道随机题目
 */
const PRACTICE_POOL_SIZE = 20;

export async function getPointPractice(pointIdentifier: string, count: number = 10) {
  const point = await findPointByIdentifier(pointIdentifier);

  if (!point) return null;

  // 检查已有缓存题目
  const existingPractices = await prisma.grammarPractice.findMany({
    where: { pointId: point.id },
  });

  // 题目不足池子目标，生成补足
  if (existingPractices.length < PRACTICE_POOL_SIZE) {
    const needed = PRACTICE_POOL_SIZE - existingPractices.length;
    try {
      logger.info(`生成语法练习题: ${point.nameZh} (${point.code}), 需补充 ${needed} 题`);
      const aiResult = await aiServiceClient.generateGrammarPractice(
        point.nameZh,
        point.nameEn,
        point.difficulty,
        needed,
      );

      // 存入数据库
      await Promise.all(
        aiResult.questions.map((q: any) =>
          prisma.grammarPractice.create({
            data: {
              pointId: point.id,
              type: q.type,
              question: q.question,
              options: q.options || null,
              answer: q.answer,
              explanation: q.explanation || '',
              difficulty: point.difficulty,
            },
          })
        )
      );
    } catch (error) {
      logger.error(`生成语法练习题失败 (${point.code}):`, error);
      // 如果已有部分题目，继续返回已有的
      if (existingPractices.length === 0) throw error;
    }
  }

  // 从全部题目中随机取 count 道返回（过滤掉无 options 的 fill_blank 题）
  const allPractices = await prisma.grammarPractice.findMany({
    where: { pointId: point.id },
  });
  const validPractices = allPractices.filter(
    (p) => !(p.type === 'fill_blank' && !p.options),
  );
  const shuffled = validPractices.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(formatPractice);
}

/**
 * 提交练习结果
 */
export async function submitPracticeResult(
  userId: string,
  pointId: string,
  data: { score: number; totalCount: number; correctCount: number },
) {
  // 先查询现有记录以获取 bestScore
  const existing = await prisma.userGrammarProgress.findUnique({
    where: { userId_pointId: { userId, pointId } },
  });

  const newBestScore = existing
    ? Math.max(existing.bestScore || 0, data.score)
    : data.score;

  const progress = await prisma.userGrammarProgress.upsert({
    where: { userId_pointId: { userId, pointId } },
    create: {
      userId,
      pointId,
      status: data.score >= 80 ? 'mastered' : 'practiced',
      practiceScore: data.score,
      bestScore: data.score,
      practiceCount: 1,
      lastPracticedAt: new Date(),
    },
    update: {
      status: data.score >= 80 ? 'mastered' : 'practiced',
      practiceScore: data.score,
      bestScore: newBestScore,
      practiceCount: { increment: 1 },
      lastPracticedAt: new Date(),
    },
  });

  return progress;
}

/**
 * 记录用户阅读讲解
 */
export async function markPointRead(userId: string, pointId: string) {
  // 先查询现有记录，避免降级状态
  const existing = await prisma.userGrammarProgress.findUnique({
    where: { userId_pointId: { userId, pointId } },
  });

  // 已有更高状态（practiced/mastered）时，只更新 readAt，不降级 status
  if (existing && existing.status !== 'not_started') {
    return prisma.userGrammarProgress.update({
      where: { userId_pointId: { userId, pointId } },
      data: { readAt: new Date() },
    });
  }

  return prisma.userGrammarProgress.upsert({
    where: { userId_pointId: { userId, pointId } },
    create: {
      userId,
      pointId,
      status: 'learning',
      readAt: new Date(),
    },
    update: {
      readAt: new Date(),
      status: 'learning',
    },
  });
}

/**
 * 获取用户所有语法进度
 */
export async function getUserProgress(userId: string) {
  const progress = await prisma.userGrammarProgress.findMany({
    where: { userId },
    include: {
      point: {
        select: { code: true, nameZh: true, categoryId: true },
      },
    },
  });

  const totalPoints = await prisma.grammarPoint.count();

  return {
    totalPoints,
    learnedCount: progress.filter(p => p.status !== 'not_started').length,
    practicedCount: progress.filter(p => ['practiced', 'mastered'].includes(p.status)).length,
    masteredCount: progress.filter(p => p.status === 'mastered').length,
    details: progress.map(p => ({
      pointCode: p.point.code,
      pointName: p.point.nameZh,
      status: p.status,
      practiceScore: p.practiceScore,
      bestScore: p.bestScore,
      practiceCount: p.practiceCount,
      lastPracticedAt: p.lastPracticedAt,
    })),
  };
}

// ==================== 课程式练习 ====================

/**
 * 获取课程式练习数据（Quick Rule + 分阶段题目）
 * 先检查缓存，不足则调用 AI 生成
 */
export async function getPointLesson(pointIdentifier: string) {
  const point = await findPointByIdentifier(pointIdentifier);
  if (!point) return null;

  // 检查是否已有课程式题目缓存（按 cognitiveLevel 分组）
  const existingQuestions = await prisma.grammarPractice.findMany({
    where: {
      pointId: point.id,
      cognitiveLevel: { not: 'recognition' },  // 有非默认值说明是课程式题目
    },
  });

  // 也获取所有课程式题目（包含 recognition）
  const allLessonQuestions = existingQuestions.length > 0
    ? await prisma.grammarPractice.findMany({
        where: {
          pointId: point.id,
          type: { in: ['error_judgment', 'dual_blank', 'table_fill', 'sentence_reorder', 'word_assembly'] },
        },
      })
    : [];

  let questions: any[];

  if (allLessonQuestions.length >= 6) {
    // 已有足够的课程式题目，随机选取
    const excludeType = { not: 'error_correction' };
    const recognition = await prisma.grammarPractice.findMany({
      where: { pointId: point.id, cognitiveLevel: 'recognition', type: excludeType },
    });
    const understanding = await prisma.grammarPractice.findMany({
      where: { pointId: point.id, cognitiveLevel: 'understanding', type: excludeType },
    });
    const production = await prisma.grammarPractice.findMany({
      where: { pointId: point.id, cognitiveLevel: 'production', type: excludeType },
    });

    const shuffle = (arr: any[]) => arr.sort(() => Math.random() - 0.5);
    questions = [
      ...shuffle(recognition).slice(0, 3),
      ...shuffle(understanding).slice(0, 4),
      ...shuffle(production).slice(0, 3),
    ].map(formatLessonPractice);
  } else {
    // 调用 AI 生成课程式题目
    try {
      logger.info(`生成课程练习题: ${point.nameZh} (${point.code})`);
      const aiResult = await aiServiceClient.generateGrammarLessonPractice(
        point.nameZh,
        point.nameEn,
        point.difficulty,
      );

      // 存入数据库
      await Promise.all(
        aiResult.questions.map((q: any) =>
          prisma.grammarPractice.create({
            data: {
              pointId: point.id,
              type: q.type,
              cognitiveLevel: q.cognitiveLevel || 'recognition',
              question: q.question || '',
              options: q.options || null,
              answer: q.answer,
              explanation: q.explanation || '',
              difficulty: point.difficulty,
              smartTip: q.smartTip || null,
              errorPart: q.errorPart || null,
              correctVersion: q.correctVersion || null,
              sentence1: q.sentence1 || null,
              sentence2: q.sentence2 || null,
              answer2: q.answer2 || null,
              tableData: q.tableData || null,
              words: q.words || null,
              distractors: q.distractors || null,
              chineseTranslation: q.question || null,
              structureHint: q.structureHint || null,
              acceptableAnswers: q.acceptableAnswers || null,
            },
          })
        )
      );

      questions = aiResult.questions;
    } catch (error) {
      logger.error(`生成课程练习题失败 (${point.code}):`, error);
      throw error;
    }
  }

  // 获取讲解数据（用于 Quick Rule 和深入讲解阶段）
  let explanation = null;
  if (point.explanation && point.explanationGeneratedAt) {
    const parsed = parseExplanation(point.explanation);
    explanation = parsed.explanation;
  }

  return {
    point: {
      id: point.id,
      code: point.code,
      nameZh: point.nameZh,
      nameEn: point.nameEn,
      difficulty: point.difficulty,
    },
    explanation,
    questions,
  };
}

/**
 * 提交课程练习结果（5 星制）
 */
export async function submitLessonResult(
  userId: string,
  pointId: string,
  data: {
    score: number;
    totalCount: number;
    correctCount: number;
    starRating: number;
    phaseResults?: { phase: string; correctRate: number }[];
  },
) {
  const existing = await prisma.userGrammarProgress.findUnique({
    where: { userId_pointId: { userId, pointId } },
  });

  const newBestScore = existing
    ? Math.max(existing.bestScore || 0, data.score)
    : data.score;

  const newBestStar = existing
    ? Math.max(existing.bestStarRating || 0, data.starRating)
    : data.starRating;

  // 5 星制状态映射
  let status: string;
  if (data.starRating >= 4) {
    status = 'mastered';
  } else if (data.starRating >= 3) {
    status = 'practiced';
  } else {
    status = 'learning';
  }

  // 不降级已有的更高状态
  if (existing) {
    const statusOrder = { not_started: 0, learning: 1, practiced: 2, mastered: 3 };
    const currentOrder = statusOrder[existing.status as keyof typeof statusOrder] || 0;
    const newOrder = statusOrder[status as keyof typeof statusOrder] || 0;
    if (newOrder < currentOrder) {
      status = existing.status;
    }
  }

  const progress = await prisma.userGrammarProgress.upsert({
    where: { userId_pointId: { userId, pointId } },
    create: {
      userId,
      pointId,
      status,
      practiceScore: data.score,
      bestScore: data.score,
      starRating: data.starRating,
      bestStarRating: data.starRating,
      practiceCount: 1,
      lastPracticedAt: new Date(),
    },
    update: {
      status,
      practiceScore: data.score,
      bestScore: newBestScore,
      starRating: data.starRating,
      bestStarRating: newBestStar,
      practiceCount: { increment: 1 },
      lastPracticedAt: new Date(),
    },
  });

  return progress;
}

/**
 * 计算星级评分
 */
export function calculateStarRating(correctRate: number): number {
  if (correctRate >= 0.9) return 5;
  if (correctRate >= 0.8) return 4;
  if (correctRate >= 0.6) return 3;
  if (correctRate >= 0.4) return 2;
  return 1;
}

// ==================== 辅助函数 ====================

/**
 * 根据 id 或 code 查找语法点
 */
async function findPointByIdentifier(identifier: string) {
  let point = await prisma.grammarPoint.findUnique({ where: { id: identifier } });
  if (!point) {
    point = await prisma.grammarPoint.findUnique({ where: { code: identifier } });
  }
  return point;
}

function formatPractice(practice: any) {
  return {
    id: practice.id,
    type: practice.type,
    question: practice.question,
    options: practice.options,
    answer: practice.answer,
    explanation: practice.explanation,
  };
}

function formatLessonPractice(practice: any) {
  return {
    id: practice.id,
    type: practice.type,
    cognitiveLevel: practice.cognitiveLevel,
    question: practice.question,
    options: practice.options,
    answer: practice.answer,
    explanation: practice.explanation,
    smartTip: practice.smartTip,
    errorPart: practice.errorPart,
    correctVersion: practice.correctVersion,
    sentence1: practice.sentence1,
    sentence2: practice.sentence2,
    answer2: practice.answer2,
    tableData: practice.tableData,
    words: practice.words,
    distractors: practice.distractors,
    chineseTranslation: practice.chineseTranslation,
    structureHint: practice.structureHint,
    acceptableAnswers: practice.acceptableAnswers,
  };
}
