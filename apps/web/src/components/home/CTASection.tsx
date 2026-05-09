import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { DOWNLOAD_LINKS, APP_INFO } from '@/lib/constants';

export function CTASection() {
  return (
    <section className="py-24 md:py-32">
      <Container>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[var(--primary)] via-[var(--primary-dark)] to-[var(--primary-800)] p-12 md:p-20 text-center">
          {/* 背景装饰 */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-[var(--secondary)]/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              开启你的
              <br />
              英语学习之旅
            </h2>
            <p className="text-lg md:text-xl text-white/80 mb-10 max-w-xl mx-auto">
              立即下载小葡萄，体验音素级发音评估和 AI 教练式学习
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={DOWNLOAD_LINKS.androidApk}
                className="group inline-flex items-center justify-center gap-3 px-10 py-5 bg-white text-[var(--primary-dark)] font-semibold text-lg rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-white/20 hover:scale-105"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.523 15.341c-.5 0-.908.406-.908.908 0 .5.408.908.908.908.5 0 .908-.408.908-.908 0-.502-.408-.908-.908-.908zm-11.046 0c-.5 0-.908.406-.908.908 0 .5.408.908.908.908.5 0 .908-.408.908-.908 0-.502-.408-.908-.908-.908zm11.4-6.155l1.94-3.36a.4.4 0 00-.693-.4l-1.963 3.4C15.418 8.107 13.78 7.632 12 7.632s-3.418.475-5.161 1.194l-1.963-3.4a.4.4 0 00-.693.4l1.94 3.36C3.187 10.876 1 13.953 1 17.523h22c0-3.57-2.187-6.647-5.123-8.337z"/>
                </svg>
                下载 Android 版
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href="/download"
                className="inline-flex items-center gap-2 px-8 py-5 text-white/90 font-medium text-lg hover:text-white transition-colors"
              >
                查看更多下载方式
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <p className="mt-6 text-sm text-white/50">
              v{APP_INFO.version} · 需要 Android 8.0 或更高版本 · 约 196 MB
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
