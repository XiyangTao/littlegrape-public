import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { DOWNLOAD_LINKS, STATS } from '@/lib/constants';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* 背景 */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--primary-50)] via-white to-white" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-[var(--primary-100)] to-transparent rounded-full blur-3xl opacity-60 translate-x-1/4 -translate-y-1/4 animate-pulse-soft" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-[var(--secondary)]/10 to-transparent rounded-full blur-3xl opacity-40 -translate-x-1/4 translate-y-1/4" />
      </div>

      <Container className="py-20">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
          {/* 左侧内容 */}
          <div className="flex-1 text-center lg:text-left max-w-2xl">
            <div className="animate-fade-in-up opacity-0">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--primary-100)] text-[var(--primary-700)] text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
                AI 驱动的英语学习
              </span>
            </div>

            <h1 className="mt-8 text-5xl md:text-6xl lg:text-7xl font-bold leading-tight animate-fade-in-up opacity-0 delay-100">
              <span className="text-[var(--foreground)]">让英语学习</span>
              <br />
              <span className="gradient-text">自然而高效</span>
            </h1>

            <p className="mt-6 text-xl text-[var(--text-secondary)] leading-relaxed animate-fade-in-up opacity-0 delay-200">
              音素级发音纠正 · AI 教练式对话 · 智能复习系统
              <br className="hidden md:block" />
              真正做到「会读、会说、会用」
            </p>

            {/* CTA */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-fade-in-up opacity-0 delay-300">
              <Link
                href={DOWNLOAD_LINKS.androidApk}
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-[var(--primary)] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-[var(--primary)]/30 hover:scale-105"
              >
                <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="relative z-10">下载 Android 版</span>
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary-dark)] to-[var(--secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center gap-2 px-8 py-4 text-lg font-medium text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
              >
                了解更多
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Link>
            </div>

            {/* 数据亮点 */}
            <div className="mt-12 grid grid-cols-4 gap-6 animate-fade-in-up opacity-0 delay-400">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center lg:text-left">
                  <div className="text-2xl md:text-3xl font-bold text-[var(--foreground)]">{stat.value}<span className="text-base font-normal text-[var(--text-tertiary)]">{stat.suffix ? ` ${stat.suffix}` : ''}</span></div>
                  <div className="text-xs md:text-sm text-[var(--text-tertiary)] mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧手机展示 */}
          <div className="flex-shrink-0 animate-fade-in opacity-0 delay-400">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[var(--primary)] via-[var(--primary-light)] to-[var(--secondary)] rounded-[3rem] blur-2xl opacity-20 animate-pulse-soft" />
              <div className="relative w-[280px] md:w-[320px] animate-float">
                <div className="relative bg-[#1a1a1a] rounded-[3rem] p-3 shadow-2xl">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#1a1a1a] rounded-b-2xl z-10" />
                  <div className="relative rounded-[2.3rem] overflow-hidden bg-white aspect-[9/19.5]">
                    <Image
                      src="/images/screenshots/home.jpg"
                      alt="小葡萄 APP"
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* 滚动指示器 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-[var(--border-medium)] flex items-start justify-center p-2">
          <div className="w-1.5 h-3 rounded-full bg-[var(--primary)] animate-pulse" />
        </div>
      </div>
    </section>
  );
}
