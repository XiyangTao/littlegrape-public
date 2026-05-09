import Link from 'next/link';
import { DOWNLOAD_LINKS, APP_INFO } from '@/lib/constants';

export function PlatformCard() {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-[var(--border-light)] hover:border-[var(--primary-200)] hover:shadow-lg transition-all">
      <div className="text-center">
        {/* 平台图标 */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--background-secondary)] text-[var(--foreground)] mb-4">
          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.523 15.341c-.5 0-.908.406-.908.908 0 .5.408.908.908.908.5 0 .908-.408.908-.908 0-.502-.408-.908-.908-.908zm-11.046 0c-.5 0-.908.406-.908.908 0 .5.408.908.908.908.5 0 .908-.408.908-.908 0-.502-.408-.908-.908-.908zm11.4-6.155l1.94-3.36a.4.4 0 00-.693-.4l-1.963 3.4C15.418 8.107 13.78 7.632 12 7.632s-3.418.475-5.161 1.194l-1.963-3.4a.4.4 0 00-.693.4l1.94 3.36C3.187 10.876 1 13.953 1 17.523h22c0-3.57-2.187-6.647-5.123-8.337zM6.477 15.341c-.5 0-.908.406-.908.908 0 .5.408.908.908.908.5 0 .908-.408.908-.908 0-.502-.408-.908-.908-.908zm11.046 0c-.5 0-.908.406-.908.908 0 .5.408.908.908.908.5 0 .908-.408.908-.908 0-.502-.408-.908-.908-.908z"/>
          </svg>
        </div>

        {/* 平台名称 */}
        <h3 className="text-xl font-semibold text-[var(--foreground)]">
          Android 版
        </h3>

        {/* 系统要求 */}
        <p className="mt-2 text-sm text-[var(--text-tertiary)]">
          需要 Android 8.0 或更高版本
        </p>

        {/* 版本信息 */}
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          版本 {APP_INFO.version} · 约 196 MB
        </p>

        {/* 下载按钮 */}
        <Link
          href={DOWNLOAD_LINKS.androidApk}
          className="mt-6 inline-flex items-center justify-center w-full px-6 py-3 bg-[var(--primary)] text-white font-medium rounded-full hover:bg-[var(--primary-dark)] transition-colors"
          download
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          下载 APK 安装包
        </Link>
      </div>
    </div>
  );
}
