'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { NAV_LINKS, APP_INFO } from '@/lib/constants';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  // 禁止背景滚动
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 菜单面板 */}
      <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-light)]">
            <div className="flex items-center gap-2">
              <Image
                src="/images/logo.png"
                alt={APP_INFO.name}
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="font-bold text-[var(--foreground)]">
                {APP_INFO.name}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2"
              aria-label="关闭菜单"
            >
              <svg
                className="w-6 h-6 text-[var(--foreground)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 导航链接 */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block px-4 py-3 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--primary-50)] hover:text-[var(--primary)] transition-colors"
                    onClick={onClose}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 底部按钮 */}
          <div className="p-4 border-t border-[var(--border-light)]">
            <Button href="/download" className="w-full" onClick={onClose}>
              立即下载
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
