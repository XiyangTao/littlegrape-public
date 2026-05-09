import { Container } from '@/components/ui/Container';

const features = [
  {
    title: 'AI 对话伙伴',
    description: '8 位性格各异的 AI 角色，模拟真实场景对话，在聊天中自然提升口语',
    icon: '💬',
    gradient: 'from-violet-500 to-purple-600',
    highlights: ['多场景对话模拟', '实时语音交互', '个性化学习路径'],
    size: 'large' as const,
  },
  {
    title: '剧情式学习',
    description: '沉浸式互动故事，像追剧一样学英语，在剧情中自然掌握口语表达',
    icon: '🎭',
    gradient: 'from-pink-500 to-rose-600',
    size: 'medium' as const,
  },
  {
    title: '音素级发音',
    description: '精准到 44 个音素的评估反馈，告诉你哪里读错、如何改进',
    icon: '🎤',
    gradient: 'from-orange-500 to-amber-600',
    size: 'medium' as const,
  },
  {
    title: '智能单词本',
    description: '遗忘曲线算法 + AI 出题，3 种题型覆盖读写用',
    icon: '📚',
    gradient: 'from-emerald-500 to-teal-600',
    size: 'small' as const,
  },
  {
    title: '文章精读',
    description: 'AI 智能讲解，生词一键收藏，边读边学更高效',
    icon: '📖',
    gradient: 'from-blue-500 to-cyan-600',
    size: 'small' as const,
  },
  {
    title: '语音翻译',
    description: '实时语音识别和翻译，随时随地练听力和口语',
    icon: '🌐',
    gradient: 'from-indigo-500 to-violet-600',
    size: 'small' as const,
  },
  {
    title: '专业词典',
    description: '21,944 词库，音标、释义、例句、搭配一应俱全',
    icon: '📕',
    gradient: 'from-rose-500 to-pink-600',
    size: 'small' as const,
  },
];

export function FeatureSection() {
  const largeFeature = features[0];
  const mediumFeatures = features.filter(f => f.size === 'medium');
  const smallFeatures = features.filter(f => f.size === 'small');

  return (
    <section id="features" className="py-24 md:py-32 bg-[var(--background-secondary)]">
      <Container>
        {/* 标题 */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[var(--primary-100)] text-[var(--primary-700)] text-sm font-medium mb-4">核心功能</span>
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--foreground)]">
            为什么选择<span className="gradient-text">小葡萄</span>
          </h2>
          <p className="mt-4 text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            我们专注于解决英语学习的核心痛点，让每一分钟的学习都有价值
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* 大卡片 - AI 对话 */}
          <div className="lg:col-span-2 lg:row-span-2 bento-card group">
            <div className={`h-full p-8 md:p-10 bg-gradient-to-br ${largeFeature.gradient} rounded-3xl text-white relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10 h-full flex flex-col">
                <div className="text-4xl mb-6">{largeFeature.icon}</div>
                <h3 className="text-2xl md:text-3xl font-bold mb-3">{largeFeature.title}</h3>
                <p className="text-lg text-white/80 mb-6">{largeFeature.description}</p>

                <div className="mt-auto space-y-3">
                  {largeFeature.highlights?.map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-white/90">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 中卡片 */}
          {mediumFeatures.map((feature) => (
            <div key={feature.title} className="bento-card group">
              <div className={`h-full p-6 md:p-8 bg-gradient-to-br ${feature.gradient} rounded-3xl text-white relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <div className="text-3xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-white/80 text-sm">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}

          {/* 小卡片 */}
          {smallFeatures.map((feature) => (
            <div key={feature.title} className="bento-card">
              <div className="h-full p-6 bg-white rounded-3xl border border-[var(--border-light)] hover:border-[var(--primary-200)] transition-colors">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-xl mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">{feature.title}</h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
