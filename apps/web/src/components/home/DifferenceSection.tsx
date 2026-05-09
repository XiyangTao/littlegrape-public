import { Container } from '@/components/ui/Container';

export function DifferenceSection() {
  return (
    <section className="py-16 md:py-24 bg-[var(--background-secondary)]">
      <Container>
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--foreground)]">
            为什么选择小葡萄？
          </h2>
          <p className="mt-4 text-lg text-[var(--text-secondary)]">
            告别死记硬背，真正掌握英语
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* 传统方式 */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[var(--border-light)]">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">😔</span>
              <h3 className="text-lg font-semibold text-[var(--text-tertiary)]">传统背单词</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-[var(--text-tertiary)]">
              <span className="px-3 py-1 bg-gray-100 rounded-full">看</span>
              <span>→</span>
              <span className="px-3 py-1 bg-gray-100 rounded-full">记</span>
              <span>→</span>
              <span className="px-3 py-1 bg-gray-100 rounded-full">复习</span>
              <span>→</span>
              <span className="px-3 py-1 bg-red-50 text-red-500 rounded-full">遗忘</span>
              <span>→</span>
              <span className="px-3 py-1 bg-gray-100 rounded-full">再记</span>
              <span className="text-red-500">...</span>
            </div>
          </div>

          {/* 分隔线 */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-[var(--border-light)]" />
            <span className="text-[var(--primary)] font-medium">VS</span>
            <div className="flex-1 h-px bg-[var(--border-light)]" />
          </div>

          {/* 小葡萄方式 */}
          <div className="bg-gradient-to-br from-[var(--primary-50)] to-white rounded-2xl p-6 md:p-8 shadow-sm border border-[var(--primary-200)]">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🍇</span>
              <h3 className="text-lg font-semibold text-[var(--primary-dark)]">小葡萄学习法</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              <span className="px-3 py-1 bg-[var(--primary-100)] text-[var(--primary-dark)] rounded-full">看</span>
              <span className="text-[var(--primary)]">→</span>
              <span className="px-3 py-1 bg-[var(--primary-100)] text-[var(--primary-dark)] rounded-full">听</span>
              <span className="text-[var(--primary)]">→</span>
              <span className="px-3 py-1 bg-[var(--primary-100)] text-[var(--primary-dark)] rounded-full">说</span>
              <span className="text-[var(--primary)]">→</span>
              <span className="px-3 py-1 bg-[var(--primary-100)] text-[var(--primary-dark)] rounded-full">用</span>
              <span className="text-[var(--primary)]">→</span>
              <span className="px-3 py-1 bg-[var(--success)] text-white rounded-full font-medium">真正掌握</span>
            </div>

            {/* 特色说明 */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <span className="w-6 h-6 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs">✓</span>
                音素级发音纠正
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <span className="w-6 h-6 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs">✓</span>
                AI 教练实时指导
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <span className="w-6 h-6 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs">✓</span>
                场景化应用练习
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
