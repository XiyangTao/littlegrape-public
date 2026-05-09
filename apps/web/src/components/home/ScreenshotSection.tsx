import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { SCREENSHOTS } from '@/lib/constants';

export function ScreenshotSection() {
  return (
    <section className="py-24 md:py-32 overflow-hidden">
      <Container>
        {/* 标题 */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[var(--primary-100)] text-[var(--primary-700)] text-sm font-medium mb-4">应用预览</span>
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--foreground)]">
            精心设计的<span className="gradient-text">用户体验</span>
          </h2>
          <p className="mt-4 text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            简洁优雅的界面设计，让学习成为一种享受
          </p>
        </div>

        {/* 截图展示 */}
        <div className="relative">
          {/* 背景渐变容器 */}
          <div className="absolute inset-x-0 top-1/4 bottom-1/4 bg-gradient-to-r from-[var(--primary-50)] via-[var(--primary-100)] to-[var(--primary-50)] rounded-3xl -z-10 blur-sm" />

          <div className="flex justify-center gap-5 md:gap-10 py-8 px-4">
            {SCREENSHOTS.map((screenshot, index) => (
              <div
                key={screenshot.alt}
                className="group relative flex-shrink-0"
                style={{
                  transform: `translateY(${index % 2 === 0 ? '0' : '24px'})`,
                }}
              >
                {/* 手机框架 */}
                <div className="relative w-[180px] md:w-[240px] transition-all duration-500 group-hover:scale-105 group-hover:-translate-y-2">
                  {/* 光晕 */}
                  <div className="absolute -inset-2 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--secondary)]/20 rounded-[2.5rem] md:rounded-[3rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative bg-[#1a1a1a] rounded-[2rem] md:rounded-[2.5rem] p-2 md:p-2.5 shadow-xl group-hover:shadow-2xl transition-shadow duration-500">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 md:w-24 h-5 md:h-6 bg-[#1a1a1a] rounded-b-xl z-10" />
                    <div className="relative rounded-[1.6rem] md:rounded-[2rem] overflow-hidden bg-white aspect-[9/19.5]">
                      <Image
                        src={screenshot.src}
                        alt={screenshot.alt}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* 标签 */}
                <div className="mt-5 text-center">
                  <span className="text-sm md:text-base font-medium text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors">
                    {screenshot.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
