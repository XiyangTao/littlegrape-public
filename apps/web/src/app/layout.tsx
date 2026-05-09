import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "小葡萄 - 会读、会说、会用的 AI 英语学习应用",
  description: "小葡萄是一款 AI 驱动的英语学习应用，提供音素级发音评估、AI 对话练习、智能单词学习等功能，帮助你真正掌握英语。",
  keywords: ["英语学习", "AI英语", "发音评估", "口语练习", "背单词", "小葡萄"],
  authors: [{ name: "CodeRhythm" }],
  openGraph: {
    title: "小葡萄 - 会读、会说、会用的 AI 英语学习应用",
    description: "音素级发音纠正 · AI 教练式学习 · 完整学习闭环",
    url: "https://littlegrape.app",
    siteName: "小葡萄",
    locale: "zh_CN",
    type: "website",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/images/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
